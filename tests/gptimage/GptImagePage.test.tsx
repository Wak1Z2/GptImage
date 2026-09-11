import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../../src/app/App'
import GptImagePage from '../../src/gptimage/GptImagePage'
import { generationEndpoint, settingsKey } from '../../src/gptimage/gptImage'

const settings = {
  baseUrl: 'https://images.example.com/custom/v1/',
  apiKey: 'test-key',
  model: 'gpt-image-custom',
}

/** 无参数；隔离浏览器缓存和页面地址，无返回值。 */
function resetBrowser() {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
}
beforeEach(resetBrowser)

/** 无参数；恢复请求与存储替身，无返回值。 */
function restoreMocks() {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
}
afterEach(restoreMocks)

/** 无参数；验证首页入口和返回导航，返回异步测试完成状态。 */
async function verifyEntry() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('link', { name: '进入 GPT Image →' }))
  expect(
    await screen.findByRole('heading', { name: 'GPT Image 图片生成' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('link', { name: '返回首页' }))
  expect(
    await screen.findByRole('heading', { name: '灵感，从这里开始。' }),
  ).toBeInTheDocument()
}
test('首页支持进入图片生成页面并返回', verifyEntry)

/** 无参数；验证编辑即缓存、重新进入回填与清除，返回异步测试完成状态。 */
async function verifyPersistence() {
  const user = userEvent.setup()
  const first = render(<GptImagePage />)
  fireEvent.change(screen.getByLabelText('Base URL'), {
    target: { value: settings.baseUrl },
  })
  fireEvent.change(screen.getByLabelText('API Key'), {
    target: { value: settings.apiKey },
  })
  fireEvent.change(screen.getByLabelText('模型名称'), {
    target: { value: settings.model },
  })
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '不缓存的提示词' },
  })
  expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(settings)
  first.unmount()
  render(<GptImagePage />)
  expect(screen.getByLabelText('Base URL')).toHaveValue(settings.baseUrl)
  expect(screen.getByLabelText('API Key')).toHaveValue(settings.apiKey)
  expect(screen.getByLabelText('模型名称')).toHaveValue(settings.model)
  expect(screen.getByLabelText('图片描述')).toHaveValue('')
  await user.click(screen.getByRole('button', { name: '清除缓存配置' }))
  expect(localStorage.getItem(settingsKey)).toBeNull()
  expect(screen.getByLabelText('API Key')).toHaveValue('')
}
test('连接配置自动缓存、回填并可清除', verifyPersistence)

/** 无参数；渲染已有连接配置的页面并输入提示词，无返回值。 */
function prepareGeneration() {
  localStorage.setItem(settingsKey, JSON.stringify(settings))
  render(<GptImagePage />)
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '一只猫' },
  })
}

/** 无参数；验证真实请求格式与 Base64 图片预览，返回异步测试完成状态。 */
async function verifyGeneration() {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
    )
  vi.stubGlobal('fetch', fetchMock)
  prepareGeneration()
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(await screen.findByAltText('生成图片 1')).toHaveAttribute(
    'src',
    'data:image/png;base64,dGVzdA==',
  )
  expect(fetchMock).toHaveBeenCalledWith(
    '/api/gptimage/generations',
    expect.objectContaining({
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-key',
        'X-GptImage-Endpoint':
          'https://images.example.com/custom/v1/images/generations',
      },
      body: JSON.stringify({ model: settings.model, prompt: '一只猫', n: 1 }),
    }),
  )
}
test('使用自定义连接配置生成并预览图片', verifyGeneration)

/** 接收模拟响应和预期错误；验证失败提示，返回异步测试完成状态。 */
async function verifyFailure(response: Response, message: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
  prepareGeneration()
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(await screen.findByText(message)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '生成图片' })).not.toBeDisabled()
}
test.each([
  [
    new Response(JSON.stringify({ error: { message: '密钥无效' } }), {
      status: 401,
    }),
    '密钥无效（HTTP 401）',
  ],
  [
    new Response('<html>Not found</html>', { status: 404 }),
    '服务返回了非 JSON 响应（HTTP 404），请检查 Base URL',
  ],
  [
    new Response(JSON.stringify({ data: [] })),
    '服务未返回可用图片，请检查模型是否支持图片生成接口',
  ],
])('处理接口失败 %#', verifyFailure)

/** 无参数；验证必填字段与非法地址不会发请求，返回异步测试完成状态。 */
async function verifyValidation() {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<GptImagePage />)
  fireEvent.change(screen.getByLabelText('Base URL'), {
    target: { value: 'invalid' },
  })
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(
    await screen.findByText('请输入有效的 HTTP 或 HTTPS Base URL'),
  ).toBeInTheDocument()
  expect(await screen.findByText('请输入 API Key')).toBeInTheDocument()
  expect(await screen.findByText('请输入图片描述')).toBeInTheDocument()
  expect(fetchMock).not.toHaveBeenCalled()
}
test('校验必填字段和服务地址', verifyValidation)

/** 无参数；验证损坏缓存回退以及存储失败提示，返回异步测试完成状态。 */
async function verifyUnavailableStorage() {
  localStorage.setItem(settingsKey, 'broken')
  render(<GptImagePage />)
  expect(
    screen.getByText('无法读取浏览器配置，已使用默认值。'),
  ).toBeInTheDocument()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(
    /** 无参数；模拟存储权限拒绝，始终抛错，无返回值。 */
    () => {
      throw new Error('Storage unavailable')
    },
  )
  fireEvent.change(screen.getByLabelText('API Key'), {
    target: { value: 'test-key' },
  })
  expect(
    await screen.findByText(
      '浏览器无法保存配置；本次仍可使用，重新进入后需要再次填写。',
    ),
  ).toBeInTheDocument()
  expect(screen.getByLabelText('API Key')).toHaveValue('test-key')
}
test('缓存损坏或不可用时页面仍可使用', verifyUnavailableStorage)

/** 无参数；验证生成时禁用重复操作并在离开时取消请求，返回异步测试完成状态。 */
async function verifyPendingRequest() {
  const fetchMock = vi.fn().mockReturnValue(
    new Promise(
      /** 无参数；保持请求待处理，无返回值。 */
      () => {},
    ),
  )
  vi.stubGlobal('fetch', fetchMock)
  localStorage.setItem(settingsKey, JSON.stringify(settings))
  const view = render(<GptImagePage />)
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '一只猫' },
  })
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await waitFor(
    /** 无参数；断言请求已启动，无返回值。 */
    () => expect(fetchMock).toHaveBeenCalledTimes(1),
  )
  expect(screen.getByRole('status')).toHaveTextContent('正在生成图片')
  expect(screen.getByLabelText('API Key')).toBeDisabled()
  const signal = fetchMock.mock.calls[0][1].signal as AbortSignal
  view.unmount()
  expect(signal.aborted).toBe(true)
}
test('生成中显示状态并在卸载时取消请求', verifyPendingRequest)

/** 接收基础地址和预期端点；验证路径标准化，无返回值。 */
function verifyEndpoint(baseUrl: string, expected: string) {
  expect(generationEndpoint(baseUrl)).toBe(expected)
}
test.each([
  ['https://example.com', 'https://example.com/v1/images/generations'],
  ['https://example.com/v1///', 'https://example.com/v1/images/generations'],
  [
    'http://localhost:8000/proxy',
    'http://localhost:8000/proxy/images/generations',
  ],
])('标准化 Base URL %s', verifyEndpoint)
