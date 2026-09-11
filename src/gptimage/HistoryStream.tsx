import {
  Alert,
  Button,
  Card,
  Collapse,
  Descriptions,
  Empty,
  Image,
  Popconfirm,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { GenerationRecord } from './generationHistory'

interface GenerationHistoryProps {
  records: GenerationRecord[]
  clearing: boolean
  onClear: () => Promise<void>
  restoring: boolean
  notice: string
  disabled: boolean
  onReuse: (record: GenerationRecord) => void
  onAddReference: (src: string, index: number) => void
  onRetrySave: (record: GenerationRecord) => void
}

/** 接收历史记录、恢复状态和操作回调；按新到旧渲染每轮描述、参数、参考图与结果。 */
export default function GenerationHistory({
  records,
  restoring,
  clearing,
  onClear,
  notice,
  disabled,
  onReuse,
  onAddReference,
  onRetrySave,
}: GenerationHistoryProps) {
  const reduced = useReducedMotion()
  const clearDisabled =
    restoring ||
    disabled ||
    clearing ||
    !records.length ||
    records.some(
      /** 接收记录；返回是否仍在生成或保存，避免清空后迟到写入恢复记录。 */
      (record) =>
        record.status === 'pending' || record.persistence === 'saving',
    )
  return (
    <Card
      className="studio-history"
      title="生成结果"
      extra={
        <Space wrap>
          <Tag>{records.length} 轮创作</Tag>
          <Popconfirm
            title="清空全部聊天记录？"
            styles={{ root: { maxWidth: 'calc(100vw - 32px)' } }}
            description="将删除此浏览器中保存的所有轮次及其图片，无法恢复。"
            okText="确认清空"
            cancelText="取消"
            disabled={clearDisabled}
            onConfirm={onClear}
            okButtonProps={{ danger: true, 'aria-label': '确认清空' }}
          >
            <Button
              size="small"
              danger
              disabled={clearDisabled}
              loading={clearing}
              aria-label="清空聊天记录"
            >
              清空聊天记录
            </Button>
          </Popconfirm>
        </Space>
      }
    >
      <Typography.Paragraph type="secondary">
        新记录在上，旧记录在下，每一轮保留独立的创作上下文。
      </Typography.Paragraph>
      {notice && <Alert type="warning" title={notice} showIcon />}
      {restoring && (
        <div className="history-restoring">
          <Spin />
          <Typography.Text>正在读取创作记录…</Typography.Text>
        </div>
      )}
      {!restoring && !records.length && (
        <div className="result-placeholder">
          <div className="studio-art" aria-hidden="true">
            <span>✦</span>
          </div>
          <Typography.Title level={4}>
            你的下一幅作品，从这里开始
          </Typography.Title>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            styles={{ image: { display: 'none' } }}
            description="输入图片描述，开始你的第一次创作"
          />
        </div>
      )}
      <div className="history-stream" aria-label="创作记录">
        <AnimatePresence initial={false}>
          {records
            .map(
              /** 接收记录和位置；返回一轮不可变的创作上下文。 */
              (record, round) => (
                <motion.article
                  key={record.id}
                  aria-label={`第 ${round + 1} 轮创作`}
                  className="history-round"
                  layout={reduced ? false : 'position'}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0, y: reduced ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.22 }}
                >
                  <div className="history-round-heading">
                    <Space wrap>
                      <Typography.Text strong>
                        第 {round + 1} 轮
                      </Typography.Text>
                      <Tag
                        color={
                          record.status === 'success'
                            ? 'success'
                            : record.status === 'error'
                              ? 'error'
                              : 'processing'
                        }
                      >
                        {record.status === 'success'
                          ? '已生成'
                          : record.status === 'error'
                            ? '生成失败'
                            : '生成中'}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      {new Date(record.createdAt).toLocaleString('zh-CN', {
                        hour12: false,
                      })}
                    </Typography.Text>
                  </div>
                  <Typography.Paragraph className="history-prompt">
                    {record.prompt}
                  </Typography.Paragraph>
                  <Space wrap className="history-summary">
                    <Tag>{record.model}</Tag>
                    <Tag>
                      {record.options.size === 'auto'
                        ? '自动尺寸'
                        : record.options.size}
                    </Tag>
                    <Tag>
                      {record.options.quality === 'auto'
                        ? '自动画质'
                        : `${record.options.quality} 画质`}
                    </Tag>
                    <Tag>
                      {record.options.n} 张 ·{' '}
                      {record.options.output_format.toUpperCase()}
                    </Tag>
                  </Space>
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'context',
                        label: `生成参数与参考图（${record.references.length} 张）`,
                        children: (
                          <>
                            <Descriptions
                              size="small"
                              column={1}
                              items={[
                                {
                                  key: 'model',
                                  label: '模型',
                                  children: record.model,
                                },
                                {
                                  key: 'baseUrl',
                                  label: 'Base URL',
                                  children: record.baseUrl,
                                },
                                {
                                  key: 'size',
                                  label: '图片尺寸',
                                  children: record.options.size,
                                },
                                {
                                  key: 'quality',
                                  label: '画质',
                                  children: record.options.quality,
                                },
                                {
                                  key: 'count',
                                  label: '生成数量',
                                  children: record.options.n,
                                },
                                {
                                  key: 'background',
                                  label: '背景',
                                  children: record.options.background,
                                },
                                {
                                  key: 'format',
                                  label: '输出格式',
                                  children: record.options.output_format,
                                },
                                {
                                  key: 'compression',
                                  label: '压缩质量',
                                  children:
                                    record.options.output_format === 'png'
                                      ? '不适用（PNG）'
                                      : `${record.options.output_compression}%`,
                                },
                                {
                                  key: 'moderation',
                                  label: '内容审核',
                                  children: record.options.moderation,
                                },
                                {
                                  key: 'fidelity',
                                  label: '参考图保真度',
                                  children: record.references.length
                                    ? record.options.input_fidelity
                                    : '未使用参考图',
                                },
                              ]}
                            />
                            <Typography.Text type="secondary">
                              参考图按本轮提交顺序排列
                            </Typography.Text>
                            {record.references.length ? (
                              <div className="history-references">
                                <Image.PreviewGroup>
                                  {record.references.map(
                                    /** 接收本轮参考图和序号；返回只读缩略图和文件名。 */
                                    (image, index) => (
                                      <div key={image.id}>
                                        <Image
                                          src={image.src}
                                          width="100%"
                                          height={96}
                                          className="reference-thumbnail"
                                          alt={`第 ${round + 1} 轮参考图 ${index + 1}：${image.name}`}
                                        />
                                        <Typography.Text
                                          className="reference-name"
                                          title={image.name}
                                        >
                                          {index + 1}. {image.name}
                                        </Typography.Text>
                                      </div>
                                    ),
                                  )}
                                </Image.PreviewGroup>
                              </div>
                            ) : (
                              <Typography.Paragraph type="secondary">
                                本轮仅使用文字描述
                              </Typography.Paragraph>
                            )}
                          </>
                        ),
                      },
                    ]}
                  />
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={record.status}
                      className="history-round-output"
                      initial={{ opacity: 0, y: reduced ? 0 : 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: reduced ? 0 : 0.18 }}
                    >
                      {record.status === 'pending' && (
                        <div className="history-pending" role="status">
                          <Spin />
                          <Typography.Text>
                            正在生成图片，请稍候…
                          </Typography.Text>
                        </div>
                      )}
                      {record.error && (
                        <Alert
                          type="error"
                          title="本轮未完成"
                          description={record.error}
                          showIcon
                        />
                      )}
                      <div className="result-gallery">
                        <Image.PreviewGroup>
                          {record.images.map(
                            /** 接收结果和序号；返回预览图片和加入参考池按钮。 */
                            (src, index) => (
                              <div className="result-item" key={index}>
                                <div className="result-image-stage">
                                  <Image
                                    src={src}
                                    alt={
                                      round === 0
                                        ? `生成图片 ${index + 1}`
                                        : `第 ${round + 1} 轮生成图片 ${index + 1}`
                                    }
                                    className="generated-image"
                                  />
                                </div>
                                <div className="result-actions">
                                  <Typography.Text type="secondary">
                                    作品 {index + 1} · 点击放大预览
                                  </Typography.Text>
                                  <Button
                                    disabled={disabled}
                                    onClick={
                                      /** 无参数；将本张历史结果加入参考池，无返回值。 */
                                      () => onAddReference(src, index)
                                    }
                                  >
                                    加入参考图池
                                  </Button>
                                </div>
                              </div>
                            ),
                          )}
                        </Image.PreviewGroup>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                  <div className="history-round-footer">
                    <Typography.Text type="secondary">
                      {record.status === 'pending'
                        ? '完成后自动保存'
                        : record.persistence === 'saved'
                          ? '已保存到此浏览器'
                          : record.persistence === 'partial'
                            ? '部分远程图片仅保存了链接，链接可能失效'
                            : record.persistence === 'error'
                              ? '保存失败，刷新后可能丢失'
                              : '正在保存记录…'}
                    </Typography.Text>
                    <Space wrap>
                      {record.persistence === 'error' && (
                        <Button
                          size="small"
                          onClick={
                            /** 无参数；重试保存本轮记录，无返回值。 */
                            () => onRetrySave(record)
                          }
                        >
                          重试保存
                        </Button>
                      )}
                      <Button
                        size="small"
                        disabled={disabled || record.status === 'pending'}
                        onClick={
                          /** 无参数；将本轮描述、参数和参考图回填到创作区，无返回值。 */
                          () => onReuse(record)
                        }
                      >
                        沿用本轮配置
                      </Button>
                    </Space>
                  </div>
                </motion.article>
              ),
            )
            .reverse()}
        </AnimatePresence>
      </div>
    </Card>
  )
}
