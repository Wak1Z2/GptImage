import { useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from 'antd'

type DemoTask = {
  key: string
  name: string
  size: string
  highQuality: boolean
}
const initialTasks: DemoTask[] = [
  { key: '1', name: '山间日落', size: '1024 × 1024', highQuality: true },
  { key: '2', name: '城市夜景', size: '1536 × 1024', highQuality: false },
]
const columns = [
  { title: '名称', dataIndex: 'name' },
  { title: '尺寸', dataIndex: 'size' },
  {
    title: '画质',
    dataIndex: 'highQuality',
    /** 根据 highQuality 布尔值返回画质标签。 */
    render: (highQuality: boolean) => (
      <Tag color={highQuality ? 'geekblue' : 'default'}>
        {highQuality ? '高画质' : '标准'}
      </Tag>
    ),
  },
]

/** 无 props；返回可添加本地示例记录的表单与分页表格。 */
export default function ComponentGallery() {
  const [tasks, setTasks] = useState(initialTasks)
  const [form] = Form.useForm<Omit<DemoTask, 'key'>>()

  /** 接收校验后的表单值，添加演示记录并重置表单；无返回值。 */
  function addTask(values: Omit<DemoTask, 'key'>) {
    setTasks([
      { ...values, name: values.name.trim(), key: crypto.randomUUID() },
      ...tasks,
    ])
    form.resetFields()
  }

  return (
    <>
      <Card title="表单输入" extra={<Tag>Form / Input / Select / Switch</Tag>}>
        <Form
          form={form}
          layout="vertical"
          onFinish={addTask}
          initialValues={{ size: '1024 × 1024', highQuality: true }}
        >
          <Form.Item
            label="示例名称"
            name="name"
            rules={[
              { required: true, whitespace: true, message: '请输入示例名称' },
            ]}
          >
            <Input placeholder="例如：雨后的森林" maxLength={40} />
          </Form.Item>
          <Form.Item label="图片尺寸" name="size">
            <Select
              options={['1024 × 1024', '1536 × 1024', '1024 × 1536'].map(
                /** 接收尺寸字符串，返回下拉选项。 */
                (size) => ({ value: size, label: size }),
              )}
            />
          </Form.Item>
          <Form.Item label="高画质" name="highQuality" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit">
              添加演示记录
            </Button>
            <Typography.Text type="secondary">
              仅保存在当前页面，刷新后重置
            </Typography.Text>
          </Space>
        </Form>
      </Card>
      <Card
        className="table-card"
        title="数据展示"
        extra={<Tag>Table / Pagination</Tag>}
      >
        <Typography.Paragraph type="secondary" role="status">
          共 {tasks.length} 条演示记录，可通过上方表单添加。
        </Typography.Paragraph>
        <Table
          columns={columns}
          dataSource={tasks}
          pagination={{ pageSize: 5, showSizeChanger: false }}
          scroll={{ x: 480 }}
        />
      </Card>
    </>
  )
}
