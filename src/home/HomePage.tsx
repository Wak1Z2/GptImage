import { Button, Card, Space, Tag, Typography } from 'antd'
import './styles.css'

/** 无 props；返回首页欢迎区与当前可用功能入口。 */
export default function HomePage() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="home-hero-copy">
          <Tag color="geekblue">你的创作工作台</Tag>
          <Typography.Title id="home-title">
            灵感，从这里开始。
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            欢迎来到 GptImage。选择一个功能，开始探索你的工作空间。
          </Typography.Paragraph>
          <Button size="large" type="primary" href="#/introduction">
            探索组件与动画
          </Button>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit" />
          <div className="hero-tile hero-tile-back" />
          <div className="hero-tile hero-tile-front">
            <span>G</span>
            <span className="hero-tile-caption">IDEAS INTO MOTION</span>
          </div>
          <div className="hero-dot" />
        </div>
      </section>
      <section aria-labelledby="features-title" className="home-features">
        <div className="section-heading">
          <Typography.Title level={2} id="features-title">
            功能入口
          </Typography.Title>
          <Typography.Text type="secondary">
            从这里进入每个功能页面
          </Typography.Text>
        </div>
        <Card className="feature-card">
          <div className="feature-card-content">
            <div className="feature-symbol" aria-hidden="true">
              GPT<span>↗</span>
            </div>
            <div className="feature-copy">
              <Tag color="geekblue">AI 图片生成</Tag>
              <Typography.Title level={3}>GPT Image</Typography.Title>
              <Typography.Paragraph type="secondary">
                连接你的模型服务，用文字生成图片。服务地址、密钥与模型名称自动保存在此浏览器。
              </Typography.Paragraph>
            </div>
            <Button size="large" type="primary" href="#/gptimage">
              进入 GPT Image →
            </Button>
          </div>
        </Card>
        <Card className="feature-card">
          <div className="feature-card-content">
            <div className="feature-symbol" aria-hidden="true">
              Aa<span>↗</span>
            </div>
            <div className="feature-copy">
              <Space wrap>
                <Tag color="blue">UI 组件</Tag>
                <Tag color="purple">交互动画</Tag>
              </Space>
              <Typography.Title level={3}>组件与动画介绍</Typography.Title>
              <Typography.Paragraph type="secondary">
                一个页面了解界面基础：按钮、表单、表格与弹窗，以及入场、重排、拖拽等五类动画。
              </Typography.Paragraph>
            </div>
            <Button size="large" href="#/introduction">
              查看介绍 →
            </Button>
          </div>
        </Card>
      </section>
    </>
  )
}
