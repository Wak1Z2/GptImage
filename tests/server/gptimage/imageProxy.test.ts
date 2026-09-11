import { createServer, type Server } from 'node:http'
import { afterEach, beforeEach, expect, test } from 'vitest'
import { forwardImageRequest } from '../../../server/gptimage/imageProxy'

let proxy: Server
let upstream: Server
let proxyUrl: string
let upstreamUrl: string
let received: { path?: string; authorization?: string; body?: string }

/** 接收 HTTP 服务；监听本机空闲端口并返回基础地址。 */
async function listen(server: Server): Promise<string> {
  await new Promise<void>(
    /** 接收完成回调；启动本机监听，无返回值。 */
    (resolve) => {
      server.listen(0, '127.0.0.1', resolve)
    },
  )
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Missing port')
  return `http://127.0.0.1:${address.port}`
}

/** 无参数；启动不提供 CORS 响应头的模拟上游及本地代理，返回异步完成状态。 */
async function startServers() {
  received = {}
  upstream = createServer(
    /** 接收请求和响应；记录请求并模拟图片或鉴权错误，返回异步完成状态。 */
    async (request, response) => {
      const chunks: Buffer[] = []
      for await (const chunk of request) chunks.push(Buffer.from(chunk))
      received = {
        path: request.url,
        authorization: request.headers.authorization,
        body: Buffer.concat(chunks).toString(),
      }
      response.setHeader('Content-Type', 'application/json')
      response.statusCode =
        request.headers.authorization === 'Bearer invalid' ? 401 : 200
      response.end(
        JSON.stringify(
          response.statusCode === 200
            ? { data: [{ b64_json: 'dGVzdA==' }] }
            : { error: { message: '密钥无效' } },
        ),
      )
    },
  )
  proxy = createServer(
    /** 接收请求和响应；交给代理处理，无返回值。 */
    (request, response) => {
      void forwardImageRequest(request, response)
    },
  )
  upstreamUrl = await listen(upstream)
  proxyUrl = await listen(proxy)
}
beforeEach(startServers)

/** 接收服务；关闭监听与连接，返回异步完成状态。 */
async function closeServer(server: Server) {
  await new Promise<void>(
    /** 接收完成回调；关闭服务，无返回值。 */
    (resolve) => {
      server.closeAllConnections()
      server.close(() => resolve())
    },
  )
}

/** 无参数；清理测试服务器，返回异步完成状态。 */
async function stopServers() {
  await closeServer(proxy)
  await closeServer(upstream)
}
afterEach(stopServers)

/** 接收可选请求头覆盖值；返回本地代理响应。 */
async function requestImage(headers: Record<string, string> = {}) {
  return fetch(`${proxyUrl}/api/gptimage/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
      'X-GptImage-Endpoint': `${upstreamUrl}/custom/v1/images/generations`,
      Origin: proxyUrl,
      ...headers,
    },
    body: JSON.stringify({ model: 'gpt-image-1', prompt: '一只猫', n: 1 }),
  })
}

/** 无参数；验证无 CORS 上游的转发、鉴权与图片结果，返回异步完成状态。 */
async function verifyForwarding() {
  const response = await requestImage()
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ data: [{ b64_json: 'dGVzdA==' }] })
  expect(received).toEqual({
    path: '/custom/v1/images/generations',
    authorization: 'Bearer test-key',
    body: JSON.stringify({ model: 'gpt-image-1', prompt: '一只猫', n: 1 }),
  })
  expect(response.headers.get('cache-control')).toBe('no-store')
}
test('本地 HTTP 代理转发到无 CORS 支持的上游并返回图片', verifyForwarding)

/** 无参数；验证多图 JSON 编辑请求超过旧限制后仍可原样转发，返回异步测试完成状态。 */
async function verifyEditForwarding() {
  const body = JSON.stringify({
    model: 'gpt-image-1',
    prompt: '融合两张图',
    n: 1,
    images: [
      { image_url: `data:image/png;base64,${'a'.repeat(300 * 1024)}` },
      { image_url: 'https://example.com/reference.png' },
    ],
  })
  const response = await fetch(`${proxyUrl}/api/gptimage/edits`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer test-key',
      Origin: proxyUrl,
      'X-GptImage-Endpoint': `${upstreamUrl}/custom/v1/images/edits`,
    },
    body,
  })
  expect(response.status).toBe(200)
  expect(received).toEqual({
    path: '/custom/v1/images/edits',
    authorization: 'Bearer test-key',
    body,
  })
}
test('多图编辑请求原样转发且支持图片请求大小', verifyEditForwarding)

/** 无参数；验证编辑路由拒绝转发到生成端点，返回异步测试完成状态。 */
async function verifyMismatchedRoute() {
  const response = await fetch(`${proxyUrl}/api/gptimage/edits`, {
    method: 'POST',
    headers: { 'X-GptImage-Endpoint': `${upstreamUrl}/images/generations` },
    body: '{}',
  })
  expect(response.status).toBe(400)
  expect(received).toEqual({})
}
test('拒绝编辑路由与上游操作不匹配的请求', verifyMismatchedRoute)

/** 无参数；验证保留上游鉴权失败状态，返回异步完成状态。 */
async function verifyUpstreamError() {
  const response = await requestImage({ Authorization: 'Bearer invalid' })
  expect(response.status).toBe(401)
  expect(await response.json()).toEqual({ error: { message: '密钥无效' } })
}
test('保留上游错误响应', verifyUpstreamError)

/** 无参数；验证连接拒绝转为可读错误，返回异步完成状态。 */
async function verifyConnectionError() {
  await closeServer(upstream)
  const response = await requestImage()
  expect(response.status).toBe(502)
  expect((await response.json()).error.message).toContain(
    '本地代理无法连接模型服务',
  )
}
test('连接失败返回明确的 502 错误', verifyConnectionError)

/** 接收覆盖请求头及预期状态；验证非法请求不会发往上游，返回异步完成状态。 */
async function verifyRejectedRequest(
  headers: Record<string, string>,
  status: number,
) {
  const response = await requestImage(headers)
  expect(response.status).toBe(status)
  expect(received).toEqual({})
}
test.each([
  [{ Origin: 'https://unrelated.example.com' }, 403],
  [{ 'X-GptImage-Endpoint': 'file:///images/generations' }, 400],
  [{ 'X-GptImage-Endpoint': 'https://example.com/other' }, 400],
])('拒绝非预期代理请求 %#', verifyRejectedRequest)
