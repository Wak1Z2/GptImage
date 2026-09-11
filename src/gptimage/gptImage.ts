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

/** 接收 Base URL；返回生成端点，地址无效时抛错。保留自定义路径，裸域名补充 /v1。 */
export function generationEndpoint(baseUrl: string): string {
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
  url.pathname = `${path}/images/generations`
  return url.toString()
}

/** 接收连接配置、提示词与取消信号；调用图片接口并返回可展示的图片地址，失败时抛错。 */
export async function generateImage(
  settings: ImageSettings,
  prompt: string,
  signal: AbortSignal,
): Promise<string[]> {
  const endpoint = generationEndpoint(settings.baseUrl)
  // 开发时由同源 Node 服务转发，避免浏览器直接访问上游触发 CORS。
  const useLocalProxy = import.meta.env.DEV
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${settings.apiKey.trim()}`,
  }
  if (useLocalProxy) headers['X-GptImage-Endpoint'] = endpoint
  const response = await fetch(
    useLocalProxy ? '/api/gptimage/generations' : endpoint,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: settings.model.trim(),
        prompt: prompt.trim(),
        n: 1,
      }),
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
          payload.output_format === 'jpeg' || payload.output_format === 'webp'
            ? payload.output_format
            : 'png'
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
