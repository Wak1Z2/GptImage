import { afterEach, expect, test, vi } from 'vitest'
import { generateImage, defaultSettings } from '../../src/gptimage/gptImage'
import {
  defaultGenerationOptions,
  generationParameters,
} from '../../src/gptimage/generationOptions'

/** 无参数；恢复网络替身，无返回值。 */
afterEach(() => vi.unstubAllGlobals())

/** 无参数；验证编辑参数和 JPEG 预览类型，返回异步完成状态。 */
async function verifyEditParameters() {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: [{ b64_json: 'dGVzdA==' }] })),
    )
  vi.stubGlobal('fetch', fetchMock)
  const images = await generateImage(
    defaultSettings,
    '编辑',
    new AbortController().signal,
    ['https://example.com/image.png'],
    {
      ...defaultGenerationOptions,
      size: '1024x1536',
      quality: 'medium',
      n: 3,
      output_format: 'jpeg',
      output_compression: 0,
      input_fidelity: 'high',
      moderation: 'low',
    },
  )
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    model: 'gpt-image-1',
    prompt: '编辑',
    images: [{ image_url: 'https://example.com/image.png' }],
    size: '1024x1536',
    quality: 'medium',
    n: 3,
    output_format: 'jpeg',
    output_compression: 0,
    input_fidelity: 'high',
    moderation: 'low',
  })
  expect(images).toEqual(['data:image/jpeg;base64,dGVzdA=='])
}
test('参考图请求传递参数并正确标记输出格式', verifyEditParameters)

/** 无参数；验证无参考图与 PNG 不发送无效参数，无返回值。 */
function verifyInactiveOptions() {
  expect(
    generationParameters(
      {
        ...defaultGenerationOptions,
        input_fidelity: 'high',
        output_compression: 70,
      },
      false,
    ),
  ).toEqual({ n: 1 })
  expect(() =>
    generationParameters(
      {
        ...defaultGenerationOptions,
        background: 'transparent',
        output_format: 'jpeg',
      },
      false,
    ),
  ).toThrow('透明背景需要 PNG 或 WebP 格式')
}
test('省略不适用参数并拒绝冲突格式', verifyInactiveOptions)

/** 接收非法数量；验证请求参数拒绝超限和小数，无返回值。 */
function verifyCount(n: number) {
  expect(() =>
    generationParameters({ ...defaultGenerationOptions, n }, false),
  ).toThrow('生成数量必须是 1 到 10 的整数')
}
test.each([0, 11, 1.5, Number.NaN])('拒绝非法生成数量 %s', verifyCount)
