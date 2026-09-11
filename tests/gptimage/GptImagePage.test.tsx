import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from '../../src/app/App'
import GptImagePage from '../../src/gptimage/GptImagePage'
import { generationEndpoint, settingsKey } from '../../src/gptimage/gptImage'

import {
  clearGenerationHistory,
  readGenerationHistory,
  saveGenerationRecord,
} from '../../src/gptimage/generationHistory'

/** 接收真实模块加载器；保留快照逻辑并隔离浏览器数据库，返回模块替身。 */
vi.mock('../../src/gptimage/generationHistory', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('../../src/gptimage/generationHistory')
  >()),
  clearGenerationHistory: vi.fn(),
  readGenerationHistory: vi.fn(),
  saveGenerationRecord: vi.fn(),
}))

const settings = {
  baseUrl: 'https://images.example.com/custom/v1/',
  apiKey: 'test-key',
  model: 'gpt-image-custom',
}

/** 无参数；隔离浏览器缓存和页面地址，无返回值。 */
function resetBrowser() {
  vi.mocked(readGenerationHistory).mockReset().mockResolvedValue([])
  vi.mocked(saveGenerationRecord)
    .mockReset()
    .mockImplementation(
      /** 接收完成轮次；模拟保存成功并返回快照。 */
      async (record) => ({ ...record, persistence: 'saved' }),
    )
  vi.mocked(clearGenerationHistory).mockReset().mockResolvedValue(undefined)
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
  await user.click(screen.getByRole('button', { name: '显示配置' }))
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

/** 无参数；验证上传多图、复用结果、去重、取消选择与移除，返回异步测试完成状态。 */
async function verifyReferenceWorkflow() {
  const fetchMock = vi.fn().mockImplementation(
    /** 无参数；返回新的模拟生成响应。 */
    async () =>
      new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
  )
  vi.stubGlobal('fetch', fetchMock)
  prepareGeneration()
  const user = userEvent.setup()
  await user.upload(screen.getByLabelText('上传参考图片'), [
    new File(['first'], '人物.png', { type: 'image/png' }),
    new File(['second'], '场景.webp', { type: 'image/webp' }),
  ])
  expect(
    await screen.findByRole('checkbox', { name: '场景.webp' }),
  ).toBeChecked()
  await user.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('生成图片 1')
  expect(fetchMock.mock.calls[0][0]).toBe('/api/gptimage/edits')
  expect(fetchMock.mock.calls[0][1].headers['X-GptImage-Endpoint']).toBe(
    'https://images.example.com/custom/v1/images/edits',
  )
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    model: settings.model,
    prompt: '一只猫',
    n: 1,
    images: [
      { image_url: 'data:image/png;base64,Zmlyc3Q=' },
      { image_url: 'data:image/webp;base64,c2Vjb25k' },
    ],
  })
  await user.click(screen.getByRole('button', { name: '加入参考图池' }))
  await user.click(screen.getByRole('button', { name: '加入参考图池' }))
  expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  await user.click(screen.getByRole('checkbox', { name: '人物.png' }))
  await user.click(screen.getByRole('button', { name: '移除 场景.webp' }))
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '改成夜晚' },
  })
  await user.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('第 2 轮生成图片 1')
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
    model: settings.model,
    prompt: '改成夜晚',
    n: 1,
    images: [{ image_url: 'data:image/png;base64,dGVzdA==' }],
  })
  await user.click(screen.getByRole('checkbox', { name: '生成结果 1' }))
  await user.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('第 3 轮生成图片 1')
  expect(fetchMock.mock.calls[2][0]).toBe('/api/gptimage/generations')
  expect(JSON.parse(fetchMock.mock.calls[2][1].body)).not.toHaveProperty(
    'images',
  )
}
test('多图上传和生成结果可以选择后用于下一轮生成', verifyReferenceWorkflow)

/** 无参数；验证非法文件、大小和数量限制，返回异步测试完成状态。 */
async function verifyReferenceValidation() {
  prepareGeneration()
  fireEvent.change(screen.getByLabelText('上传参考图片'), {
    target: { files: [new File(['bad'], 'bad.txt', { type: 'text/plain' })] },
  })
  expect(await screen.findByText(/bad.txt 格式不支持/)).toBeInTheDocument()
  const large = new File(['x'], 'large.png', { type: 'image/png' })
  Object.defineProperty(large, 'size', { value: 20 * 1024 * 1024 + 1 })
  fireEvent.change(screen.getByLabelText('上传参考图片'), {
    target: { files: [large] },
  })
  expect(
    await screen.findByText(/large.png 为空或超过 20 MB/),
  ).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('上传参考图片'), {
    target: {
      files: Array(17).fill(
        new File(['x'], 'image.png', { type: 'image/png' }),
      ),
    },
  })
  expect(
    await screen.findByText('参考图池最多保留 16 张图片，请先移除部分图片'),
  ).toBeInTheDocument()
  expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  const allowed = new File(['image'], '20MB.png', { type: 'image/png' })
  Object.defineProperty(allowed, 'size', { value: 20 * 1024 * 1024 })
  fireEvent.change(screen.getByLabelText('上传参考图片'), {
    target: { files: [allowed] },
  })
  expect(
    await screen.findByRole('checkbox', { name: '20MB.png' }),
  ).toBeChecked()
}
test(
  '参考图上传拒绝非法格式、过大文件及超出数量限制',
  verifyReferenceValidation,
)

/** 无参数；验证 URL 结果复用及编辑失败后保留内容，返回异步测试完成状态。 */
async function verifyEditFailure() {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: [{ url: 'https://images.example.com/result.png' }],
        }),
      ),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: '暂时无法编辑' } }), {
        status: 503,
      }),
    )
  vi.stubGlobal('fetch', fetchMock)
  prepareGeneration()
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('生成图片 1')
  await userEvent.click(screen.getByRole('button', { name: '加入参考图池' }))
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(
    await screen.findByText('暂时无法编辑（HTTP 503）'),
  ).toBeInTheDocument()
  expect(screen.getByAltText('生成图片 1')).toBeInTheDocument()
  expect(screen.getByRole('checkbox', { name: '生成结果 1' })).toBeChecked()
  expect(JSON.parse(fetchMock.mock.calls[1][1].body).images).toEqual([
    { image_url: 'https://images.example.com/result.png' },
  ])
}
test('URL 生成结果可复用且编辑失败后保留图片以便重试', verifyEditFailure)

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
  expect(await screen.findByRole('status')).toHaveTextContent('正在生成图片')
  expect(screen.getByLabelText('API Key')).toBeDisabled()
  expect(screen.getByRole('button', { name: '清空聊天记录' })).toBeDisabled()
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

/** 接收字段名称和选项文案；选择 Ant Design 下拉选项，返回异步完成状态。 */
async function selectOption(label: string, option: string) {
  const show = screen.queryByRole('button', { name: '显示生成参数' })
  if (show) await userEvent.click(show)
  await userEvent.click(screen.getByRole('combobox', { name: label }))
  await userEvent.click(screen.getByRole('option', { name: option }))
}

/** 无参数；验证参数提交、透明格式联动以及隐藏配置后仍能生成，返回异步完成状态。 */
async function verifyGenerationOptions() {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
    )
  vi.stubGlobal('fetch', fetchMock)
  prepareGeneration()
  expect(
    screen.queryByRole('combobox', { name: '图片尺寸' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: '显示生成参数' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(screen.getByLabelText('压缩质量')).toBeDisabled()
  await selectOption('图片尺寸', '横向 · 1536 × 1024')
  await selectOption('画质', '高 · 精细细节')
  await selectOption('输出格式', 'JPEG')
  expect(screen.getByLabelText('压缩质量')).not.toBeDisabled()
  await selectOption('背景', '透明')
  expect(screen.getByLabelText('压缩质量')).toBeDisabled()
  await selectOption('输出格式', 'WebP')
  fireEvent.change(screen.getByLabelText('生成数量'), {
    target: { value: '2' },
  })
  fireEvent.change(screen.getByLabelText('压缩质量'), {
    target: { value: '80' },
  })
  await userEvent.click(screen.getByRole('button', { name: '隐藏生成参数' }))
  expect(screen.getByRole('button', { name: '显示配置' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(
    screen.queryByRole('textbox', { name: 'Base URL' }),
  ).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(await screen.findByAltText('生成图片 1')).toHaveAttribute(
    'src',
    'data:image/webp;base64,dGVzdA==',
  )
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    model: settings.model,
    prompt: '一只猫',
    n: 2,
    size: '1536x1024',
    quality: 'high',
    background: 'transparent',
    output_format: 'webp',
    output_compression: 80,
  })
  await userEvent.click(screen.getByRole('button', { name: '显示配置' }))
  expect(screen.getByLabelText('API Key')).toHaveValue(settings.apiKey)
  expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(settings)
}
test('生成参数联动并在隐藏连接配置后完整提交', verifyGenerationOptions)

/** 无参数；验证隐藏的无效连接会展开并阻止提交，返回异步完成状态。 */
async function verifyHiddenValidation() {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  render(<GptImagePage />)
  await userEvent.click(screen.getByRole('button', { name: '隐藏配置' }))
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  expect(await screen.findByText('请输入 API Key')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '隐藏配置' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(fetchMock).not.toHaveBeenCalled()
}
test('隐藏配置的校验失败时自动展开', verifyHiddenValidation)

/** 无参数；验证追加顺序、不可变上下文、重新进入恢复及回填，返回异步完成状态。 */
async function verifyHistoryFlow() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      /** 无参数；返回新图片响应。 */
      async () =>
        new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
    ),
  )
  localStorage.setItem(settingsKey, JSON.stringify(settings))
  const view = render(<GptImagePage />)
  await userEvent.upload(
    screen.getByLabelText('上传参考图片'),
    new File(['ref'], '原始参考.png', { type: 'image/png' }),
  )
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '第一轮描述' },
  })
  await selectOption('图片尺寸', '横向 · 1536 × 1024')
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('生成图片 1')
  await userEvent.click(
    screen.getByRole('button', { name: '移除 原始参考.png' }),
  )
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '第二轮描述' },
  })
  await selectOption('图片尺寸', '正方形 · 1024 × 1024')
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('第 2 轮生成图片 1')
  expect(
    screen.getAllByRole('article').map(
      /** 接收轮次节点；返回其可访问标签。 */
      (node) => node.getAttribute('aria-label'),
    ),
  ).toEqual(['第 2 轮创作', '第 1 轮创作'])
  const saved = vi.mocked(saveGenerationRecord).mock.calls.map(
    /** 接收保存调用；返回已保存快照。 */
    ([record]) => ({ ...record, persistence: 'saved' as const }),
  )
  expect(saved[0].prompt).toBe('第一轮描述')
  expect(saved[0].options.size).toBe('1536x1024')
  expect(saved[0].references[0].name).toBe('原始参考.png')
  expect(saved[1].references).toHaveLength(0)
  expect(JSON.stringify(saved)).not.toContain(settings.apiKey)
  expect(JSON.stringify(saved)).not.toContain('apiKey')
  view.unmount()
  vi.mocked(readGenerationHistory).mockResolvedValue(saved)
  render(<GptImagePage />)
  const first = await screen.findByRole('article', { name: '第 1 轮创作' })
  expect(await screen.findByAltText('第 2 轮生成图片 1')).toBeInTheDocument()
  await userEvent.click(
    within(first).getByRole('button', { name: '沿用本轮配置' }),
  )
  expect(screen.getByLabelText('图片描述')).toHaveValue('第一轮描述')
  expect(screen.getByRole('checkbox', { name: '原始参考.png' })).toBeChecked()
  expect(screen.getByLabelText('API Key')).toHaveValue(settings.apiKey)
}
test('按轮次追加、保存上下文并在重新进入后恢复', verifyHistoryFlow)

/** 无参数；验证保存失败保留结果且可重试，返回异步完成状态。 */
async function verifyHistorySaveFailure() {
  vi.mocked(saveGenerationRecord).mockRejectedValueOnce(
    new Error('Quota exceeded'),
  )
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
      ),
  )
  prepareGeneration()
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByAltText('生成图片 1')
  await userEvent.click(await screen.findByRole('button', { name: '重试保存' }))
  expect(await screen.findByText('已保存到此浏览器')).toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(saveGenerationRecord).toHaveBeenCalledTimes(2)
}
test('保存失败保留图片并支持重试归档', verifyHistorySaveFailure)

/** 无参数；验证清空取消、失败、重试成功及重新进入后的空状态，返回异步完成状态。 */
async function verifyClearHistory() {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
      ),
  )
  localStorage.setItem(settingsKey, JSON.stringify(settings))
  // jsdom 无法完成 Ant Design 的 CSS 退出动画；此处仅验证交互，动画由浏览器验收。
  const view = render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <GptImagePage />
    </ConfigProvider>,
  )
  expect(screen.getByRole('button', { name: '显示配置' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(
    await screen.findByRole('button', { name: '清空聊天记录' }),
  ).toBeDisabled()
  fireEvent.change(screen.getByLabelText('图片描述'), {
    target: { value: '用于清空的记录' },
  })
  await userEvent.click(screen.getByRole('button', { name: '生成图片' }))
  await screen.findByText('已保存到此浏览器')
  await userEvent.click(
    await screen.findByRole('button', { name: '清空聊天记录' }),
  )
  await userEvent.click(await screen.findByRole('button', { name: /取\s*消/ }))
  expect(clearGenerationHistory).not.toHaveBeenCalled()
  vi.mocked(clearGenerationHistory).mockRejectedValueOnce(
    new Error('Storage unavailable'),
  )
  await userEvent.click(
    await screen.findByRole('button', { name: '清空聊天记录' }),
  )
  await userEvent.click(await screen.findByRole('button', { name: '确认清空' }))
  expect(
    await screen.findByText('清空记录失败，原记录已保留，请重试。'),
  ).toBeInTheDocument()
  expect(screen.getByAltText('生成图片 1')).toBeInTheDocument()
  await waitFor(
    /** 无参数；等待异步确认完成并关闭弹层，无返回值。 */
    () =>
      expect(
        screen.queryByRole('button', { name: '确认清空' }),
      ).not.toBeInTheDocument(),
  )
  await userEvent.click(
    await screen.findByRole('button', { name: '清空聊天记录' }),
  )
  await userEvent.click(await screen.findByRole('button', { name: '确认清空' }))
  await waitFor(
    /** 无参数；断言退出动画后历史已移除，无返回值。 */
    () => expect(screen.queryByRole('article')).not.toBeInTheDocument(),
  )
  expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(settings)
  view.unmount()
  render(<GptImagePage />)
  expect(
    await screen.findByText('输入图片描述，开始你的第一次创作'),
  ).toBeInTheDocument()
  expect(clearGenerationHistory).toHaveBeenCalledTimes(2)
}
test('清空聊天记录可取消、失败重试且保留连接配置', verifyClearHistory)
