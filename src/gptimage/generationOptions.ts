export interface GenerationOptions {
  size: 'auto' | '1024x1024' | '1536x1024' | '1024x1536'
  quality: 'auto' | 'low' | 'medium' | 'high'
  n: number
  background: 'auto' | 'opaque' | 'transparent'
  output_format: 'png' | 'jpeg' | 'webp'
  output_compression: number
  moderation: 'auto' | 'low'
  input_fidelity: 'default' | 'low' | 'high'
}

export const defaultGenerationOptions: GenerationOptions = {
  size: 'auto',
  quality: 'auto',
  n: 1,
  background: 'auto',
  output_format: 'png',
  output_compression: 100,
  moderation: 'auto',
  input_fidelity: 'default',
}

/** 接收生成参数和是否使用参考图；校验组合并返回接口参数，默认选项尽量省略以兼容服务商。 */
export function generationParameters(
  options: GenerationOptions,
  hasReferences: boolean,
) {
  if (!Number.isInteger(options.n) || options.n < 1 || options.n > 10)
    throw new Error('生成数量必须是 1 到 10 的整数')
  if (options.background === 'transparent' && options.output_format === 'jpeg')
    throw new Error('透明背景需要 PNG 或 WebP 格式')
  const compressed = options.output_format !== 'png'
  if (
    compressed &&
    (!Number.isInteger(options.output_compression) ||
      options.output_compression < 0 ||
      options.output_compression > 100)
  )
    throw new Error('压缩质量必须是 0 到 100 的整数')
  return {
    n: options.n,
    ...(options.size !== 'auto' && { size: options.size }),
    ...(options.quality !== 'auto' && { quality: options.quality }),
    ...(options.background !== 'auto' && { background: options.background }),
    // 透明背景明确传递格式，避免兼容服务的默认格式不支持透明度。
    ...(compressed || options.background === 'transparent'
      ? { output_format: options.output_format }
      : {}),
    ...(compressed && { output_compression: options.output_compression }),
    ...(options.moderation !== 'auto' && { moderation: options.moderation }),
    ...(hasReferences &&
      options.input_fidelity !== 'default' && {
        input_fidelity: options.input_fidelity,
      }),
  }
}
