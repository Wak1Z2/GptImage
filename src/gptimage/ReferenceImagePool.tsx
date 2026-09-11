import { PlusOutlined } from '@ant-design/icons'
import {
  maxReferenceImageBytes,
  referencePoolError,
  type ReferenceImage,
} from './gptImage'
import {
  Alert,
  Button,
  Checkbox,
  Image,
  Spin,
  Tag,
  Typography,
  Upload,
} from 'antd'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'

interface ReferenceImagePoolProps {
  images: ReferenceImage[]
  disabled: boolean
  onChange: (images: ReferenceImage[]) => void
  onBusyChange: (busy: boolean) => void
}

/** 接收图片文件；读取为 data URL，返回读取结果，失败时拒绝 Promise。 */
function readImage(file: File): Promise<string> {
  return new Promise(
    /** 接收完成与失败回调；启动本地文件读取，无返回值。 */
    (resolve, reject) => {
      const reader = new FileReader()
      /** 无参数；返回读取内容给调用方，无返回值。 */
      reader.onload = () => resolve(String(reader.result))
      /** 无参数；报告文件读取失败，无返回值。 */
      reader.onerror = () => reject(new Error(`无法读取 ${file.name}，请重试`))
      reader.readAsDataURL(file)
    },
  )
}

/** 接收参考图、禁用状态及变更回调；返回本地上传、预览、勾选和移除区域。 */
export default function ReferenceImagePool({
  images,
  disabled,
  onChange,
  onBusyChange,
}: ReferenceImagePoolProps) {
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const reduced = useReducedMotion()
  const reading = useRef(false)

  /** 接收文件列表；校验并读取本地图片加入选择池，返回异步完成状态。 */
  async function upload(files: File[]) {
    if (!files.length || reading.current || disabled) return
    setError('')
    if (images.length + files.length > 16) {
      setError('参考图池最多保留 16 张图片，请先移除部分图片')
      return
    }
    for (const file of files) {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
        setError(`${file.name} 格式不支持，请选择 PNG、JPEG 或 WebP 图片`)
        return
      }
      if (!file.size || file.size > maxReferenceImageBytes) {
        setError(`${file.name} 为空或超过 20 MB，请重新选择`)
        return
      }
    }
    reading.current = true
    setBusy(true)
    onBusyChange(true)
    try {
      const added: ReferenceImage[] = []
      for (const file of files) {
        added.push({
          id: crypto.randomUUID(),
          name: file.name,
          src: await readImage(file),
          selected: true,
        })
        const message = referencePoolError([...images, ...added])
        if (message) throw new Error(message)
      }
      onChange([...images, ...added])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '图片读取失败，请重试')
    } finally {
      reading.current = false
      setBusy(false)
      onBusyChange(false)
    }
  }

  return (
    <div className="reference-pool">
      <div className="reference-heading">
        <Typography.Text strong>参考图池</Typography.Text>
        <Tag>可选 · {images.length} / 16</Tag>
      </div>
      <Upload.Dragger
        accept="image/png,image/jpeg,image/webp"
        multiple
        disabled={disabled || busy}
        showUploadList={false}
        aria-label="上传参考图片"
        beforeUpload={
          /** 接收当前文件与整批文件；仅启动一次本地读取并阻止自动上传，返回忽略标记。 */
          (file, files) => {
            if (file === files[0]) void upload(files)
            return Upload.LIST_IGNORE
          }
        }
      >
        <div className="upload-symbol" aria-hidden="true">
          {busy ? <Spin /> : <PlusOutlined />}
        </div>
        <Typography.Text strong>
          {busy ? '正在读取参考图片…' : '点击或拖拽图片到这里'}
        </Typography.Text>
        <div className="upload-caption">
          <Typography.Text type="secondary">
            PNG、JPEG、WebP · 单张 ≤ 20 MB
          </Typography.Text>
        </div>
      </Upload.Dragger>
      {error && <Alert type="error" title={error} showIcon />}
      <motion.div
        layout={reduced ? false : 'position'}
        className="reference-grid"
      >
        <AnimatePresence initial={false}>
          {images.map(
            /** 接收参考图；返回带选择和移除操作的预览卡片。 */
            (image) => (
              <motion.div
                className={`reference-item${image.selected ? ' is-selected' : ''}`}
                key={image.id}
                layout={!reduced}
                initial={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduced ? 1 : 0.96 }}
                transition={{ duration: reduced ? 0 : 0.2 }}
              >
                <Image
                  src={image.src}
                  alt={`参考图：${image.name}`}
                  width="100%"
                  height={112}
                  className="reference-thumbnail"
                />
                <Checkbox
                  checked={image.selected}
                  disabled={disabled}
                  onChange={
                    /** 接收勾选事件；更新对应图片的选择状态，无返回值。 */
                    (event) =>
                      onChange(
                        images.map(
                          /** 接收池中图片；返回更新后的图片状态。 */
                          (item) =>
                            item.id === image.id
                              ? { ...item, selected: event.target.checked }
                              : item,
                        ),
                      )
                  }
                >
                  <span className="reference-name" title={image.name}>
                    {image.name}
                  </span>
                </Checkbox>
                <Button
                  size="small"
                  type="text"
                  disabled={disabled}
                  onClick={
                    /** 无参数；从参考池移除该图片，无返回值。 */
                    () =>
                      onChange(
                        images.filter(
                          /** 接收池中图片；返回是否保留。 */
                          (item) => item.id !== image.id,
                        ),
                      )
                  }
                  aria-label={`移除 ${image.name}`}
                >
                  移除
                </Button>
              </motion.div>
            ),
          )}
        </AnimatePresence>
      </motion.div>
      <Typography.Paragraph type="secondary" className="reference-help">
        已选择{' '}
        {
          images.filter(
            /** 接收图片；返回是否已勾选。 */
            (image) => image.selected,
          ).length
        }{' '}
        张参考图；仅使用勾选图片，离开页面后清空。
      </Typography.Paragraph>
    </div>
  )
}
