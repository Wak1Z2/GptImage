import { useState } from 'react'
import { Alert, Button, Card, Modal, Space, Tag, Typography } from 'antd'
import ComponentGallery from './ComponentGallery'
import AnimationGallery from './AnimationGallery'
import './styles.css'

/** 无 props；返回合并的 UI 组件与动画介绍页面。 */
export default function IntroductionPage() {
  const [modalOpen, setModalOpen] = useState(false)
  /** 打开示例弹窗；无参数，无返回值。 */
  function openModal() {
    setModalOpen(true)
  }
  /** 关闭示例弹窗；无参数，无返回值。 */
  function closeModal() {
    setModalOpen(false)
  }
  return (
    <>
      <header className="intro-header">
        <Tag color="purple">探索与体验</Tag>
        <Typography.Title>组件与动画介绍</Typography.Title>
        <Typography.Paragraph type="secondary">
          认识界面的组成，体验 Ant Design 组件与 Motion
          动画。所有示例均可直接操作。
        </Typography.Paragraph>
      </header>
      <section className="stack-grid" aria-label="当前技术栈">
        <Card title="Ant Design">
          <Tag color="geekblue">UI 组件框架 · 6.x</Tag>
          <Typography.Paragraph>
            提供按钮、表单、表格、弹窗等组件，统一界面与交互。
          </Typography.Paragraph>
        </Card>
        <Card title="React">
          <Tag color="blue">界面开发库 · 19.x</Tag>
          <Typography.Paragraph>
            负责组件渲染、状态管理和用户交互。
          </Typography.Paragraph>
        </Card>
        <Card title="TypeScript + Vite">
          <Tag color="purple">语言与构建工具</Tag>
          <Typography.Paragraph>
            提供类型检查、开发热更新及生产构建。
          </Typography.Paragraph>
        </Card>
      </section>
      <AnimationGallery />
      <div className="section-heading">
        <Typography.Title level={2}>组件体验区</Typography.Title>
        <Typography.Text type="secondary">所有数据均为本地演示</Typography.Text>
      </div>
      <section className="gallery-grid" aria-label="组件示例">
        <Card title="按钮与反馈" extra={<Tag>Button / Modal / Alert</Tag>}>
          <Space orientation="vertical" size="large" className="full-width">
            <Typography.Paragraph type="secondary">
              不同层级的操作，适用于主要动作、次要动作与危险操作。
            </Typography.Paragraph>
            <Space wrap>
              <Button type="primary" onClick={openModal}>
                打开示例弹窗
              </Button>
              <Button onClick={openModal}>默认按钮</Button>
              <Button type="dashed" onClick={openModal}>
                虚线按钮
              </Button>
              <Button danger onClick={openModal}>
                危险按钮
              </Button>
              <Button disabled>禁用状态</Button>
            </Space>
            <Alert
              title="组件已就绪"
              description="这是成功提示的展示。表单和表格均可在本地操作。"
              type="success"
              showIcon
            />
            <Space wrap>
              <Tag color="processing">处理中</Tag>
              <Tag color="success">已完成</Tag>
              <Tag color="warning">待确认</Tag>
              <Tag color="error">失败</Tag>
            </Space>
          </Space>
        </Card>
        <ComponentGallery />
      </section>
      <Modal
        title="Ant Design 弹窗"
        open={modalOpen}
        onOk={closeModal}
        onCancel={closeModal}
        okText="知道了"
        cancelText="关闭"
      >
        <Typography.Paragraph>
          弹窗适合确认操作、补充信息或展示详情。本示例不会执行数据删除或网络请求。
        </Typography.Paragraph>
      </Modal>
    </>
  )
}
