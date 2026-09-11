import { expect, test } from 'vitest'
import {
  maxReferenceImageBytes,
  referencePoolError,
} from '../../src/gptimage/gptImage'

/** 无参数；验证 20 MB 原图编码后的 data URL 不被旧限制拦截，并保留单图和总容量校验，无返回值。 */
function verifyEncodedImageLimit() {
  const encoded =
    'data:image/jpeg;base64,' +
    'A'.repeat(Math.ceil(maxReferenceImageBytes / 3) * 4)
  const image = {
    id: 'reference',
    name: '20MB.jpg',
    src: encoded,
    selected: true,
  }
  expect(referencePoolError([image])).toBe('')
  expect(referencePoolError([{ ...image, src: encoded + 'AAAA' }])).toBe(
    '单张参考图过大，请压缩后重新上传',
  )
  expect(referencePoolError([image, { ...image, id: 'second' }])).toBe(
    '参考图池容量已满，请移除部分图片或压缩后上传',
  )
}
test(
  '20 MB 图片编码后仍可加入参考池，同时保留容量上限',
  verifyEncodedImageLimit,
)
