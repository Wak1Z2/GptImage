import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

export const imageProxyPath = '/api/gptimage/generations'
export const imageEditProxyPath = '/api/gptimage/edits'

/** 接收响应、状态码及错误说明；发送 JSON 错误，无返回值。 */
function sendError(response: ServerResponse, status: number, message: string) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  })
  response.end(JSON.stringify({ error: { message } }))
}

/** 接收本机浏览器请求与响应；转发图片生成请求并保留上游状态，返回异步完成状态。 */
export async function forwardImageRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  // 动态目标代理只供本机开发使用，拒绝远程访问及其他站点发起的请求。
  const remote = request.socket.remoteAddress
  if (!remote || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) {
    sendError(response, 403, '图片开发代理仅允许本机访问')
    return
  }
  const origin = request.headers.origin
  if (
    origin &&
    origin !== `http://${request.headers.host}` &&
    origin !== `https://${request.headers.host}`
  ) {
    sendError(response, 403, '图片开发代理不接受跨站请求')
    return
  }
  if (request.method !== 'POST') {
    sendError(response, 405, '图片开发代理仅支持 POST 请求')
    return
  }
  let endpoint: URL
  const operation =
    request.url?.split('?')[0] === imageEditProxyPath ? 'edits' : 'generations'
  try {
    const target = request.headers['x-gptimage-endpoint']
    if (typeof target !== 'string') throw new Error('Missing endpoint')
    endpoint = new URL(target)
    if (
      !['http:', 'https:'].includes(endpoint.protocol) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      !endpoint.pathname.endsWith(`/images/${operation}`)
    )
      throw new Error('Invalid endpoint')
  } catch {
    sendError(response, 400, '图片生成目标地址无效，请检查 Base URL')
    return
  }
  const controller = new AbortController()
  /** 无参数；浏览器断开连接时取消上游请求，无返回值。 */
  function cancelRequest() {
    if (!response.writableEnded) controller.abort()
  }
  response.on('close', cancelRequest)
  try {
    const chunks: Buffer[] = []
    let length = 0
    for await (const chunk of request) {
      const bytes = Buffer.from(chunk)
      length += bytes.length
      if (length > (operation === 'edits' ? 32 * 1024 * 1024 : 256 * 1024)) {
        sendError(response, 413, '提交内容过大，请减少参考图或缩短描述后重试')
        return
      }
      chunks.push(bytes)
    }
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: request.headers.authorization || '',
      },
      body: Buffer.concat(chunks),
      redirect: 'error',
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(10 * 60 * 1000),
      ]),
    })
    // 完整读取后再发送响应头，以便连接中断时仍可返回明确的 JSON 错误。
    const body = Buffer.from(await upstream.arrayBuffer())
    if (response.destroyed) return
    response.writeHead(upstream.status, {
      'Content-Type':
        upstream.headers.get('content-type') || 'application/json',
      'Cache-Control': 'no-store',
    })
    response.end(body)
  } catch (cause) {
    if (response.destroyed || controller.signal.aborted) return
    const timeout = cause instanceof Error && cause.name === 'TimeoutError'
    sendError(
      response,
      timeout ? 504 : 502,
      timeout
        ? '模型服务响应超时，请稍后重试'
        : '本地代理无法连接模型服务，请检查 Base URL 和本机网络；如需网络代理，请为 Node 配置 HTTP_PROXY / HTTPS_PROXY 并启用 NODE_USE_ENV_PROXY=1',
    )
  } finally {
    response.off('close', cancelRequest)
  }
}

/** 无参数；返回仅在 Vite 开发服务器启用的本地图片代理插件。 */
export function imageProxyPlugin(): Plugin {
  return {
    name: 'local-gptimage-proxy',
    /** 接收开发服务器；挂载专用图片代理中间件，无返回值。 */
    configureServer(server) {
      server.middlewares.use(
        /** 接收请求、响应和后续处理器；处理匹配端点，其他请求继续传递，无返回值。 */
        (request, response, next) => {
          if (
            ![imageProxyPath, imageEditProxyPath].includes(
              request.url?.split('?')[0] || '',
            )
          )
            return next()
          void forwardImageRequest(request, response)
        },
      )
    },
  }
}
