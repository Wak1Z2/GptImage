import { useState } from 'react'
import {
  Button,
  Card,
  ConfigProvider,
  Space,
  Tag,
  Typography,
  theme,
} from 'antd'
import zhCN from 'antd/locale/zh_CN'

/** 应用入口，无 props；返回包含主题切换示例的中文初始化页面。 */
export default function App() {
  const [dark, setDark] = useState(false)

  /** 切换明暗主题；无参数，无返回值。 */
  function toggleTheme() {
    setDark(!dark)
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: dark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { colorPrimary: '#5265e5', borderRadius: 12 },
      }}
    >
      <main className={`app-shell${dark ? ' app-shell-dark' : ''}`}>
        <Card className="welcome-card">
          <Space orientation="vertical" size="large">
            <Typography.Text type="secondary">
              GPTIMAGE / WORKSPACE
            </Typography.Text>
            <div>
              <Typography.Title>从这里，开始创造</Typography.Title>
              <Typography.Paragraph type="secondary">
                GptImage 前端已就绪，开始构建你的图片应用。
              </Typography.Paragraph>
            </div>
            <Space wrap>
              <Tag color="blue">React</Tag>
              <Tag color="geekblue">TypeScript</Tag>
              <Tag color="purple">Vite</Tag>
              <Tag color="cyan">Ant Design</Tag>
            </Space>
            <Button type="primary" onClick={toggleTheme}>
              {dark ? '切换浅色主题' : '切换深色主题'}
            </Button>
          </Space>
        </Card>
      </main>
    </ConfigProvider>
  )
}
