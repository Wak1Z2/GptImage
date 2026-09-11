import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import './styles.css'
import GenerationHistory from './HistoryStream'
import {
  clearGenerationHistory,
  createGenerationRecord,
  readGenerationHistory,
  saveGenerationRecord,
  type GenerationRecord,
} from './generationHistory'
import GenerationOptionsFields from './GenerationOptionsFields'
import {
  defaultGenerationOptions,
  type GenerationOptions,
} from './generationOptions'
import ReferenceImagePool from './ReferenceImagePool'
import { referencePoolError, type ReferenceImage } from './gptImage'
import { Alert, Button, Card, theme, Form, Input, Typography } from 'antd'
import {
  defaultSettings,
  generateImage,
  generationEndpoint,
  readSettings,
  settingsKey,
  type ImageSettings,
} from './gptImage'

interface GenerationForm extends ImageSettings, GenerationOptions {
  prompt: string
}

/** 无 props；返回含浏览器配置缓存、提示词输入及图片结果的生成页面。 */
export default function GptImagePage() {
  const reduced = useReducedMotion()
  const { token } = theme.useToken()
  const [initial] = useState(readSettings)
  const [connectionVisible, setConnectionVisible] = useState(
    !initial.settings.baseUrl.trim() ||
      !initial.settings.model.trim() ||
      !initial.settings.apiKey.trim(),
  )
  const [optionsVisible, setOptionsVisible] = useState(false)
  const [form] = Form.useForm<GenerationForm>()
  const [storageNotice, setStorageNotice] = useState(initial.warning)
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<GenerationRecord[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyNotice, setHistoryNotice] = useState('')
  const [clearingHistory, setClearingHistory] = useState(false)
  const clearing = useRef(false)
  const savingCount = useRef(0)
  const mounted = useRef(false)
  const [references, setReferences] = useState<ReferenceImage[]>([])
  const [readingImages, setReadingImages] = useState(false)
  const [referenceNotice, setReferenceNotice] = useState('')
  const request = useRef<AbortController | null>(null)

  /** 无参数；恢复本地创作记录并注册卸载清理，返回清理函数。 */
  useEffect(() => {
    let active = true
    mounted.current = true
    readGenerationHistory()
      .then(
        /** 接收历史记录；恢复结果流，无返回值。 */
        (saved) => {
          if (active) setRecords(saved)
        },
        /** 无参数；报告恢复失败，保留本次生成能力，无返回值。 */
        () => {
          if (active)
            setHistoryNotice(
              '无法读取本地历史；本次仍可创作，请检查浏览器存储权限。',
            )
        },
      )
      .finally(
        /** 无参数；结束恢复状态，无返回值。 */
        () => {
          if (active) setHistoryLoading(false)
        },
      )
    /** 无参数；阻止卸载后的状态更新并取消生成请求，无返回值。 */
    return () => {
      active = false
      mounted.current = false
      request.current?.abort()
    }
  }, [])

  /** 接收更新后的轮次；按 ID 更新记录，保留原有顺序，无返回值。 */
  function updateRecord(record: GenerationRecord) {
    if (!mounted.current) return
    setRecords(
      /** 接收当前结果流；仅替换对应轮次，返回新数组。 */
      (current) =>
        current.map(
          /** 接收历史记录；返回对应的最新状态。 */
          (item) => (item.id === record.id ? record : item),
        ),
    )
  }

  /** 接收已完成轮次；保存独立快照，保存失败时保留结果并提供重试，返回异步完成状态。 */
  async function persistRecord(record: GenerationRecord) {
    if (clearing.current) return
    savingCount.current += 1
    updateRecord({ ...record, persistence: 'saving' })
    try {
      updateRecord(await saveGenerationRecord(record))
    } catch {
      updateRecord({ ...record, persistence: 'error' })
    } finally {
      savingCount.current -= 1
    }
  }

  /** 无参数；清空数据库中的聊天记录，成功后更新界面；失败保留记录，返回异步完成状态。 */
  async function clearHistory() {
    if (
      clearing.current ||
      request.current ||
      historyLoading ||
      savingCount.current
    )
      return
    clearing.current = true
    setClearingHistory(true)
    try {
      await clearGenerationHistory()
      if (mounted.current) {
        setRecords([])
        setHistoryNotice('')
        setReferenceNotice('')
      }
    } catch {
      if (mounted.current)
        setHistoryNotice('清空记录失败，原记录已保留，请重试。')
    } finally {
      clearing.current = false
      if (mounted.current) setClearingHistory(false)
    }
  }

  /** 接收历史轮次；恢复描述、模型、生成参数及已使用参考图，保留当前地址与密钥，无返回值。 */
  function reuseRecord(record: GenerationRecord) {
    const next = record.references.map(
      /** 接收历史参考图；返回可独立编辑的参考池条目。 */
      (image) => ({ ...image }),
    )
    const message = referencePoolError(next)
    if (message) {
      setReferenceNotice(message)
      return
    }
    form.setFieldsValue({
      prompt: record.prompt,
      model: record.model,
      ...record.options,
    })
    setReferences(next)
    saveSettings({ model: record.model }, form.getFieldsValue())
    setReferenceNotice('已回填本轮描述、参数和参考图，可修改后继续生成。')
    window.scrollTo({ top: 0, behavior: reduced ? 'instant' : 'auto' })
  }

  /** 接收变更字段和完整表单值；协调透明背景格式并仅缓存三项连接配置，无返回值。 */
  function saveSettings(
    changed: Partial<GenerationForm>,
    values: GenerationForm,
  ) {
    if (
      changed.background === 'transparent' &&
      values.output_format === 'jpeg'
    ) {
      form.setFieldValue('output_format', 'png')
    }
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

  /** 接收已校验表单；立即追加一轮快照，更新本轮结果并归档，返回异步完成状态。 */
  async function submit(values: GenerationForm) {
    if (request.current || readingImages || historyLoading || clearing.current)
      return
    const controller = new AbortController()
    const snapshot = createGenerationRecord(values, references)
    request.current = controller
    setLoading(true)
    setReferenceNotice('')
    setRecords(
      /** 接收已有记录；将新轮次追加到底部，返回新数组。 */
      (current) => [...current, snapshot],
    )
    let completed: GenerationRecord
    try {
      const result = await generateImage(
        values,
        snapshot.prompt,
        controller.signal,
        snapshot.references.map(
          /** 接收本轮参考图；返回图片地址。 */
          (image) => image.src,
        ),
        snapshot.options,
      )
      completed = { ...snapshot, images: result, status: 'success' }
    } catch (cause) {
      completed = {
        ...snapshot,
        status: 'error',
        error:
          cause instanceof TypeError
            ? import.meta.env.DEV
              ? '无法连接本地开发服务，请确认 npm run dev 正在运行，刷新页面后重试。'
              : '无法连接服务，请检查 Base URL、网络，以及服务端是否允许跨域请求（CORS）。'
            : cause instanceof Error
              ? cause.message
              : '图片生成失败，请重试',
      }
    }
    if (!controller.signal.aborted) {
      updateRecord(completed)
      void persistRecord(completed)
      setLoading(false)
    }
    request.current = null
  }

  /** 接收生成结果地址和索引；将结果加入参考池并默认选中，无返回值。 */
  function addGeneratedImage(src: string, index: number) {
    if (
      references.some(
        /** 接收参考图；返回是否与生成结果相同。 */
        (image) => image.src === src,
      )
    ) {
      setReferenceNotice('该图片已在参考图池中，可勾选后继续生成。')
      return
    }
    const next = [
      ...references,
      {
        id: crypto.randomUUID(),
        src,
        name: `生成结果 ${index + 1}`,
        selected: true,
      },
    ]
    const message = referencePoolError(next)
    if (message) {
      setReferenceNotice(message)
      return
    }
    setReferences(next)
    setReferenceNotice('已加入参考图池并选中，可修改描述后继续生成。')
  }

  return (
    <section
      className="image-studio"
      aria-labelledby="gptimage-title"
      style={
        {
          '--studio-accent': token.colorPrimary,
          '--studio-soft': token.colorPrimaryBg,
          '--studio-border': token.colorBorderSecondary,
          '--studio-surface': token.colorFillQuaternary,
          '--studio-text': token.colorText,
          '--studio-muted': token.colorTextSecondary,
        } as CSSProperties
      }
    >
      <div className="studio-header">
        <Typography.Text className="studio-eyebrow" type="secondary">
          创作工作台 / IMAGE STUDIO
        </Typography.Text>
        <Typography.Title id="gptimage-title" level={2}>
          GPT Image 图片生成
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          从一句描述开始，让灵感逐渐清晰。
        </Typography.Paragraph>
      </div>
      <div className="image-workspace">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ ...initial.settings, ...defaultGenerationOptions }}
          onValuesChange={saveSettings}
          onFinish={submit}
          onFinishFailed={
            /** 接收校验失败字段；展开有错误的配置区域，无返回值。 */
            ({ errorFields }) => {
              if (
                errorFields.some(
                  /** 接收错误字段；返回是否属于连接配置。 */
                  ({ name }) =>
                    ['baseUrl', 'apiKey', 'model'].includes(String(name[0])),
                )
              )
                setConnectionVisible(true)
              if (
                errorFields.some(
                  /** 接收错误字段；返回是否属于生成参数。 */
                  ({ name }) => String(name[0]) in defaultGenerationOptions,
                )
              )
                setOptionsVisible(true)
            }
          }
          disabled={loading}
          className="studio-controls"
        >
          <Card
            title="创作设置"
            extra={
              <Typography.Text type="secondary">01 / 构思</Typography.Text>
            }
          >
            <ReferenceImagePool
              images={references}
              disabled={loading || readingImages}
              onChange={setReferences}
              onBusyChange={setReadingImages}
            />
            {readingImages && <p role="status">正在读取参考图片…</p>}
            <Form.Item
              label="图片描述"
              name="prompt"
              rules={[
                { required: true, whitespace: true, message: '请输入图片描述' },
              ]}
            >
              <Input.TextArea
                autoSize={{ minRows: 5, maxRows: 12 }}
                placeholder="描述主体、环境、光线与风格。例如：一间被午后阳光照亮的花店，胶片摄影，柔和暖色调…"
              />
            </Form.Item>
            <div className="generation-options">
              <div className="reference-heading">
                <Typography.Text strong>生成参数</Typography.Text>
                <Button
                  type="text"
                  size="small"
                  disabled={false}
                  aria-expanded={optionsVisible}
                  aria-controls="generation-fields"
                  onClick={
                    /** 无参数；切换参数可见性并保留字段值，无返回值。 */
                    () => setOptionsVisible(!optionsVisible)
                  }
                >
                  {optionsVisible ? '隐藏生成参数' : '显示生成参数'}
                </Button>
              </div>
              <motion.div
                id="generation-fields"
                initial={false}
                aria-hidden={!optionsVisible}
                inert={!optionsVisible}
                animate={{
                  height: optionsVisible ? 'auto' : 0,
                  opacity: optionsVisible ? 1 : 0,
                }}
                transition={{ duration: reduced ? 0 : 0.22 }}
                style={{ overflow: 'hidden' }}
              >
                <GenerationOptionsFields
                  hasReferences={references.some(
                    /** 接收参考图；返回是否选中。 */
                    (image) => image.selected,
                  )}
                />
              </motion.div>
            </div>
            <Button
              type="primary"
              size="large"
              htmlType="submit"
              loading={loading}
              disabled={readingImages || historyLoading || clearingHistory}
              block
            >
              生成图片
            </Button>
          </Card>
          <Card
            title="连接配置"
            size="small"
            className="connection-card"
            extra={
              <Button
                size="small"
                type="text"
                disabled={false}
                aria-expanded={connectionVisible}
                aria-controls="connection-fields"
                onClick={
                  /** 无参数；切换连接字段可见性并保留配置，无返回值。 */
                  () => setConnectionVisible(!connectionVisible)
                }
              >
                {connectionVisible ? '隐藏配置' : '显示配置'}
              </Button>
            }
            styles={{ body: { padding: 0 } }}
          >
            <motion.div
              id="connection-fields"
              initial={false}
              aria-hidden={!connectionVisible}
              inert={!connectionVisible}
              animate={{
                height: connectionVisible ? 'auto' : 0,
                opacity: connectionVisible ? 1 : 0,
              }}
              transition={{ duration: reduced ? 0 : 0.22 }}
              style={{ overflow: 'hidden' }}
            >
              <div className="connection-fields-content">
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
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入 API Key',
                    },
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
                    {
                      required: true,
                      whitespace: true,
                      message: '请输入模型名称',
                    },
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
              </div>
            </motion.div>
            {storageNotice && (
              <Alert type="info" title={storageNotice} showIcon />
            )}
          </Card>
        </Form>
        <div className="history-column">
          {referenceNotice && (
            <Alert type="info" title={referenceNotice} showIcon />
          )}
          <GenerationHistory
            records={records}
            restoring={historyLoading}
            notice={historyNotice}
            disabled={loading || readingImages || clearingHistory}
            onReuse={reuseRecord}
            onAddReference={addGeneratedImage}
            onRetrySave={persistRecord}
            clearing={clearingHistory}
            onClear={clearHistory}
          />
        </div>
      </div>
    </section>
  )
}
