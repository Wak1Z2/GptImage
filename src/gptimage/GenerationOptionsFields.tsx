import { Form, InputNumber, Select, Typography } from 'antd'

/** 接收是否已选参考图；返回同一表单内的生成参数，按输出格式启用压缩配置。 */
export default function GenerationOptionsFields({
  hasReferences,
}: {
  hasReferences: boolean
}) {
  const format = Form.useWatch('output_format')
  const background = Form.useWatch('background')
  return (
    <div>
      <div className="generation-options-grid">
        <Form.Item label="图片尺寸" name="size">
          <Select
            virtual={false}
            options={[
              { value: 'auto', label: '自动' },
              { value: '1024x1024', label: '正方形 · 1024 × 1024' },
              { value: '1536x1024', label: '横向 · 1536 × 1024' },
              { value: '1024x1536', label: '纵向 · 1024 × 1536' },
            ]}
          />
        </Form.Item>
        <Form.Item label="画质" name="quality">
          <Select
            virtual={false}
            options={[
              { value: 'auto', label: '自动' },
              { value: 'low', label: '低 · 快速构思' },
              { value: 'medium', label: '中 · 均衡' },
              { value: 'high', label: '高 · 精细细节' },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="生成数量"
          name="n"
          rules={[
            {
              required: true,
              type: 'integer',
              min: 1,
              max: 10,
              message: '请输入 1 到 10 的整数',
            },
          ]}
        >
          <InputNumber min={1} max={10} precision={0} className="full-width" />
        </Form.Item>
        <Form.Item label="背景" name="background">
          <Select
            virtual={false}
            options={[
              { value: 'auto', label: '自动' },
              { value: 'opaque', label: '不透明' },
              { value: 'transparent', label: '透明' },
            ]}
          />
        </Form.Item>
        <Form.Item label="输出格式" name="output_format">
          <Select
            virtual={false}
            options={[
              { value: 'png', label: 'PNG · 无损' },
              {
                value: 'jpeg',
                label: 'JPEG',
                disabled: background === 'transparent',
              },
              { value: 'webp', label: 'WebP' },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="压缩质量"
          name="output_compression"
          extra={
            format === 'png'
              ? 'PNG 无损输出，无需设置'
              : '0–100，越高越清晰，文件越大'
          }
          rules={
            format === 'png'
              ? []
              : [
                  {
                    required: true,
                    type: 'integer',
                    min: 0,
                    max: 100,
                    message: '请输入 0 到 100 的整数',
                  },
                ]
          }
        >
          <InputNumber
            min={0}
            max={100}
            precision={0}
            disabled={format === 'png' ? true : undefined}
            suffix="%"
            className="full-width"
          />
        </Form.Item>
        <Form.Item label="内容审核" name="moderation">
          <Select
            virtual={false}
            options={[
              { value: 'auto', label: '自动' },
              { value: 'low', label: '较宽松' },
            ]}
          />
        </Form.Item>
        <Form.Item
          label="参考图保真度"
          name="input_fidelity"
          extra={
            hasReferences ? '按当前模型支持情况使用' : '选中参考图后可设置'
          }
        >
          <Select
            virtual={false}
            disabled={!hasReferences ? true : undefined}
            options={[
              { value: 'default', label: '模型默认' },
              { value: 'low', label: '低 · 更多变化' },
              { value: 'high', label: '高 · 保留细节' },
            ]}
          />
        </Form.Item>
      </div>
      <Typography.Paragraph
        type="secondary"
        className="generation-options-help"
      >
        透明背景仅支持 PNG /
        WebP；更高画质或更多图片通常需要更长时间。参数支持情况以当前模型服务为准。
      </Typography.Paragraph>
    </div>
  )
}
