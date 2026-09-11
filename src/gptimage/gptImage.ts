import {
  defaultGenerationOptions,
  generationParameters,
  type GenerationOptions,
} from './generationOptions'

export const maxReferenceImageBytes = 20 * 1024 * 1024

export interface ReferenceImage {
  id: string
  name: string
  src: string
  selected: boolean
}

/** 接收完整参考图池；返回超限提示，合法时返回空字符串。 */
export function referencePoolError(images: ReferenceImage[]): string {
  if (images.length > 16) return '参考图池最多保留 16 张图片，请先移除部分图片'
  let total = 0
  for (const image of images) {
    // Base64 约比原文件大三分之一，单图检查需包含编码膨胀和 data URL 前缀。
    if (
      image.src.length >
      Math.ceil(maxReferenceImageBytes / 3) * 4 +
        'data:image/jpeg;base64,'.length
    )
      return '单张参考图过大，请压缩后重新上传'
    total += image.src.length
  }
  if (total > 28 * 1024 * 1024)
    return '参考图池容量已满，请移除部分图片或压缩后上传'
  return ''
}

export interface ImageSettings {
  baseUrl: string
  apiKey: string
  model: string
}

export const settingsKey = 'gptimage.settings.v1'
export const defaultSettings: ImageSettings = {
  baseUrl: 'https://api.openai.com/v1',
  apiKey: '',
  model: 'gpt-image-1',
}

/** 无参数；读取并校验本地配置，返回配置及缓存不可用时的提示。 */
export function readSettings(): { settings: ImageSettings; warning: string } {
  try {
    const raw = localStorage.getItem(settingsKey)
    if (!raw) return { settings: { ...defaultSettings }, warning: '' }
    const value = JSON.parse(raw)
    if (
      !value ||
      typeof value.baseUrl !== 'string' ||
      typeof value.apiKey !== 'string' ||
      typeof value.model !== 'string'
    )
      throw new Error('Invalid settings')
    return {
      settings: {
        baseUrl: value.baseUrl,
        apiKey: value.apiKey,
        model: value.model,
      },
      warning: '',
    }
  } catch {
    return {
      settings: { ...defaultSettings },
      warning: '无法读取浏览器配置，已使用默认值。',
    }
  }
}

/** 接收 Base URL 和可选操作；返回对应图片端点，地址无效时抛错，保留自定义路径。 */
export function generationEndpoint(
  baseUrl: string,
  operation: 'generations' | 'edits' = 'generations',
): string {
  let url: URL
  try {
    url = new URL(baseUrl.trim())
  } catch {
    throw new Error('请输入有效的 HTTP 或 HTTPS Base URL')
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Base URL 仅支持 HTTP/HTTPS，且不能包含账号、查询参数或片段',
    )
  }
  const path = url.pathname.replace(/\/+$/, '') || '/v1'
  url.pathname = `${path}/images/${operation}`
  return url.toString()
}

/** 接收连接配置、提示词、取消信号、可选参考图地址及生成参数；按有无图片选择接口，返回结果地址，失败时抛错。 */
export async function generateImage(
  settings: ImageSettings,
  prompt: string,
  signal: AbortSignal,
  referenceImages: string[] = [],
  options: GenerationOptions = defaultGenerationOptions,
): Promise<string[]> {
  if (referenceImages.length > 16) throw new Error('最多选择 16 张参考图')
  const operation = referenceImages.length ? 'edits' : 'generations'
  const endpoint = generationEndpoint(settings.baseUrl, operation)
  const body = JSON.stringify({
    model: settings.model.trim(),
    prompt: prompt.trim(),
    ...generationParameters(options, referenceImages.length > 0),
    ...(referenceImages.length
      ? {
          images: referenceImages.map(
            /** 接收参考图地址；返回编辑接口的图片引用。 */
            (image_url) => ({ image_url }),
          ),
        }
      : {}),
  })
  if (new Blob([body]).size > 32 * 1024 * 1024) {
    throw new Error('本次提交内容超过 32 MB，请减少参考图或压缩图片')
  }
  // 开发时由同源 Node 服务转发，避免浏览器直接访问上游触发 CORS。
  const useLocalProxy = import.meta.env.DEV
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  }
  if (useLocalProxy) headers['X-GptImage-Endpoint'] = endpoint
  const response = await fetch(
    useLocalProxy ? `/api/gptimage/${operation}` : endpoint,
    {
      method: 'POST',
      headers,
      body,
      signal,
    },
  )
  let payload
  try {
    payload = await response.json()
  } catch {
    throw new Error(
      `服务返回了非 JSON 响应（HTTP ${response.status}），请检查 Base URL`,
    )
  }
  if (!response.ok) {
    const detail =
      typeof payload?.error?.message === 'string'
        ? payload.error.message
        : '图片生成请求失败'
    throw new Error(`${detail}（HTTP ${response.status}）`)
  }
  const images: string[] = []
  if (Array.isArray(payload?.data)) {
    for (const item of payload.data) {
      if (typeof item?.b64_json === 'string' && item.b64_json) {
        const format =
          payload.output_format === 'png' ||
          payload.output_format === 'jpeg' ||
          payload.output_format === 'webp'
            ? payload.output_format
            : options.output_format
        images.push(`data:image/${format};base64,${item.b64_json}`)
      } else if (
        typeof item?.url === 'string' &&
        /^https?:\/\//i.test(item.url)
      ) {
        images.push(item.url)
      }
    }
  }
  if (!images.length)
    throw new Error('服务未返回可用图片，请检查模型是否支持图片生成接口')
  return images
}
