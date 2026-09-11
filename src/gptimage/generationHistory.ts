import {
  defaultGenerationOptions,
  type GenerationOptions,
} from './generationOptions'
import type { ImageSettings, ReferenceImage } from './gptImage'

export interface GenerationRecord {
  id: string
  createdAt: number
  prompt: string
  model: string
  baseUrl: string
  options: GenerationOptions
  references: ReferenceImage[]
  images: string[]
  status: 'pending' | 'success' | 'error'
  error?: string
  persistence: 'saving' | 'saved' | 'partial' | 'error'
}

/** 接收表单与参考池；返回独立的请求快照，仅包含选中参考图，不包含 API Key。 */
export function createGenerationRecord(
  values: ImageSettings & GenerationOptions & { prompt: string },
  references: ReferenceImage[],
): GenerationRecord {
  const options = Object.fromEntries(
    Object.keys(defaultGenerationOptions).map(
      /** 接收生成字段名；返回字段值，排除连接配置和密钥。 */
      (key) => [key, values[key as keyof GenerationOptions]],
    ),
  ) as unknown as GenerationOptions
  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    prompt: values.prompt.trim(),
    model: values.model.trim(),
    baseUrl: values.baseUrl.trim(),
    options,
    references: references
      .filter(
        /** 接收参考图；返回是否随本轮提交。 */
        (image) => image.selected,
      )
      .map(
        /** 接收选中参考图；返回独立快照。 */
        (image) => ({ ...image }),
      ),
    images: [],
    status: 'pending',
    persistence: 'saving',
  }
}

/** 无参数；打开历史数据库，返回连接；不可用或被其他页面阻塞时拒绝。 */
function openHistory(): Promise<IDBDatabase> {
  return new Promise(
    /** 接收完成与失败回调；创建数据库和记录表，无返回值。 */
    (resolve, reject) => {
      const request = indexedDB.open('gptimage-history', 1)
      let blocked = false
      /** 无参数；初始化记录表，无返回值。 */
      request.onupgradeneeded = () =>
        request.result.createObjectStore('records', { keyPath: 'id' })
      /** 无参数；返回连接，阻塞后迟到的连接直接关闭，无返回值。 */
      request.onsuccess = () => {
        if (blocked) request.result.close()
        else resolve(request.result)
      }
      /** 无参数；报告打开失败，无返回值。 */
      request.onerror = () => reject(request.error)
      /** 无参数；报告数据库阻塞，无返回值。 */
      request.onblocked = () => {
        blocked = true
        reject(new Error('历史数据库被其他页面占用'))
      }
    },
  )
}

/** 无参数；读取全部历史并按生成时间升序返回。 */
export async function readGenerationHistory(): Promise<GenerationRecord[]> {
  const db = await openHistory()
  try {
    return await new Promise(
      /** 接收完成与失败回调；读取历史，无返回值。 */
      (resolve, reject) => {
        const tx = db.transaction('records', 'readonly')
        const request = tx.objectStore('records').getAll()
        /** 无参数；返回按时间排列的记录，无返回值。 */
        tx.oncomplete = () =>
          resolve(
            (request.result as GenerationRecord[]).sort(
              /** 接收两条记录；返回创建时间差。 */
              (a, b) => a.createdAt - b.createdAt,
            ),
          )
        /** 无参数；报告读取事务失败，无返回值。 */
        tx.onabort = () => reject(tx.error)
        tx.onerror = tx.onabort
      },
    )
  } finally {
    db.close()
  }
}

/** 接收图片 Blob；返回可持久化的 data URL。 */
function imageDataUrl(blob: Blob): Promise<string> {
  return new Promise(
    /** 接收完成与失败回调；读取图片数据，无返回值。 */
    (resolve, reject) => {
      const reader = new FileReader()
      /** 无参数；返回图片 data URL，无返回值。 */
      reader.onload = () => resolve(String(reader.result))
      /** 无参数；报告读取错误，无返回值。 */
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(blob)
    },
  )
}

/** 接收已完成记录；尽量将远程图片归档为本地数据并写入数据库，返回保存后的快照，写入失败时拒绝。 */
export async function saveGenerationRecord(
  record: GenerationRecord,
): Promise<GenerationRecord> {
  let partial = false
  const assets = new Map<string, Promise<string>>()
  /** 接收图片地址；复用本轮下载结果，失败时保留原地址并标记部分归档，返回图片地址。 */
  function archive(src: string): Promise<string> {
    if (src.startsWith('data:')) return Promise.resolve(src)
    const cached = assets.get(src)
    if (cached) return cached
    /** 无参数；下载远程图片并转为本地数据，返回地址。 */
    const download = async () => {
      try {
        const response = await fetch(src, {
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
          signal: AbortSignal.timeout(10000),
        })
        if (!response.ok) throw new Error('图片下载失败')
        const blob = await response.blob()
        if (!blob.type.startsWith('image/')) throw new Error('不是图片响应')
        return await imageDataUrl(blob)
      } catch {
        partial = true
        return src
      }
    }
    const task = download()
    assets.set(src, task)
    return task
  }
  const images = await Promise.all(record.images.map(archive))
  const references = await Promise.all(
    record.references.map(
      /** 接收参考图；返回归档后的独立图片快照。 */
      async (image) => ({ ...image, src: await archive(image.src) }),
    ),
  )
  const saved: GenerationRecord = {
    ...record,
    images,
    references,
    persistence: partial ? 'partial' : 'saved',
  }
  const db = await openHistory()
  try {
    await new Promise<void>(
      /** 接收完成与失败回调；按记录 ID 写入历史，无返回值。 */
      (resolve, reject) => {
        const tx = db.transaction('records', 'readwrite')
        tx.objectStore('records').put(saved)
        /** 无参数；确认事务完成，无返回值。 */
        tx.oncomplete = () => resolve()
        /** 无参数；报告配额或写入错误，无返回值。 */
        tx.onabort = () => reject(tx.error)
        tx.onerror = tx.onabort
      },
    )
    return saved
  } finally {
    db.close()
  }
}

/** 无参数；在单个事务中删除全部持久化轮次，事务成功才完成，失败时拒绝。 */
export async function clearGenerationHistory(): Promise<void> {
  const db = await openHistory()
  try {
    await new Promise<void>(
      /** 接收完成与失败回调；清空记录表，无返回值。 */
      (resolve, reject) => {
        const tx = db.transaction('records', 'readwrite')
        tx.objectStore('records').clear()
        /** 无参数；确认清空已提交，无返回值。 */
        tx.oncomplete = () => resolve()
        /** 无参数；报告事务失败，无返回值。 */
        tx.onabort = () => reject(tx.error)
        tx.onerror = tx.onabort
      },
    )
  } finally {
    db.close()
  }
}
