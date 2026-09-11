import { useEffect, useRef, useState } from 'react'
import './styles.css'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Image,
  Input,
  Space,
  Typography,
} from 'antd'
import {
  defaultSettings,
  generateImage,
  generationEndpoint,
  readSettings,
  settingsKey,
  type ImageSettings,
} from './gptImage'

interface GenerationForm extends ImageSettings {
  prompt: string
}

/** 无 props；返回含浏览器配置缓存、提示词输入及图片结果的生成页面。 */
export default function GptImagePage() {
  const [initial] = useState(readSettings)
  const [form] = Form.useForm<GenerationForm>()
  const [storageNotice, setStorageNotice] = useState(initial.warning)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const request = useRef<AbortController | null>(null)

  /** 无参数；注册页面卸载时的请求清理，返回清理函数。 */
  useEffect(() => {
    /** 无参数；取消离开页面后的请求，无返回值。 */
    return () => request.current?.abort()
  }, [])

  /** 接收变更字段和完整表单值；仅缓存三项连接配置，无返回值。 */
  function saveSettings(
    changed: Partial<GenerationForm>,
    values: GenerationForm,
  ) {
    if (!('baseUrl' in changed || 'apiKey' in changed || 'model' in changed))
      return
    try {
      const { baseUrl, apiKey, model } = values
      localStorage.setItem(
        settingsKey,
        JSON.stringify({ baseUrl, apiKey, model }),
      )
      setStorageNotice('')
    } catch {
      setStorageNotice(
        '浏览器无法保存配置；本次仍可使用，重新进入后需要再次填写。',
      )
    }
  }

  /** 无参数；删除本地配置并重置连接字段，无返回值。 */
  function clearSettings() {
    try {
      localStorage.removeItem(settingsKey)
      form.setFieldsValue({ ...defaultSettings })
      setStorageNotice('已清除缓存，连接配置已恢复默认值。')
    } catch {
      setStorageNotice('无法清除缓存，请检查浏览器存储权限。')
    }
  }

  /** 接收 Base URL 校验规则及字段值；返回校验 Promise。 */
  async function validateBaseUrl(_: unknown, value: string) {
    generationEndpoint(value || '')
  }

  /** 接收已校验表单；生成并展示图片，返回异步完成状态。 */
  async function submit(values: GenerationForm) {
    if (request.current) return
    const controller = new AbortController()
    request.current = controller
    setLoading(true)
    setError('')
    setImages([])
    try {
      const result = await generateImage(
        values,
        values.prompt,
        controller.signal,
      )
      if (!controller.signal.aborted) setImages(result)
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(
          cause instanceof TypeError
            ? import.meta.env.DEV
              ? '无法连接本地开发服务，请确认 npm run dev 正在运行，刷新页面后重试。'
              : '无法连接服务，请检查 Base URL、网络，以及服务端是否允许跨域请求（CORS）。'
            : cause instanceof Error
              ? cause.message
              : '图片生成失败，请重试',
        )
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
      request.current = null
    }
  }

  return (
    <section aria-labelledby="gptimage-title">
      <div className="intro-header">
        <Typography.Title id="gptimage-title">
          GPT Image 图片生成
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          连接你的 GPT Image 系列模型，将想法变成图片。
        </Typography.Paragraph>
      </div>
      <div className="gallery-grid image-workspace">
        <Card title="创作设置">
          <Form
            form={form}
            layout="vertical"
            initialValues={initial.settings}
            onValuesChange={saveSettings}
            onFinish={submit}
            disabled={loading}
          >
            <Form.Item
              label="Base URL"
              name="baseUrl"
              extra="填写 API 基础地址，如 https://api.openai.com/v1；自定义路径会保留。"
              rules={[{ validator: validateBaseUrl }]}
            >
              <Input
                placeholder="https://api.openai.com/v1"
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              label="API Key"
              name="apiKey"
              rules={[
                { required: true, whitespace: true, message: '请输入 API Key' },
              ]}
            >
              <Input.Password
                placeholder="输入服务提供的 API Key"
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              label="模型名称"
              name="model"
              rules={[
                { required: true, whitespace: true, message: '请输入模型名称' },
              ]}
            >
              <Input placeholder="gpt-image-1" autoComplete="off" />
            </Form.Item>
            <Typography.Paragraph type="secondary">
              以上三项自动保存在当前浏览器，API Key
              以明文存储；下次进入自动回填。
            </Typography.Paragraph>
            <Button onClick={clearSettings} className="clear-settings">
              清除缓存配置
            </Button>
            {storageNotice && <p role="status">{storageNotice}</p>}
            <Form.Item
              label="图片描述"
              name="prompt"
              rules={[
                { required: true, whitespace: true, message: '请输入图片描述' },
              ]}
            >
              <Input.TextArea
                rows={5}
                placeholder="描述想生成的画面、风格、色彩与细节…"
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              生成图片
            </Button>
          </Form>
        </Card>
        <Card title="生成结果">
          <Space orientation="vertical" size="large" className="full-width">
            {error && (
              <Alert
                type="error"
                title="生成失败"
                description={error}
                showIcon
              />
            )}
            {loading ? (
              <Typography.Paragraph role="status">
                正在生成图片，请稍候…
              </Typography.Paragraph>
            ) : images.length ? (
              images.map(
                /** 接收图片地址和索引；返回可放大预览的生成图片。 */
                (src, index) => (
                  <Image
                    key={`${index}-${src.slice(-32)}`}
                    src={src}
                    alt={`生成图片 ${index + 1}`}
                    className="generated-image"
                  />
                ),
              )
            ) : (
              <Empty description="输入图片描述，开始你的第一次创作" />
            )}
          </Space>
        </Card>
      </div>
    </section>
  )
}
