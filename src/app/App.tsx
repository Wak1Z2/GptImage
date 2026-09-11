import { lazy, Suspense, useEffect, useState } from 'react'
import { Button, ConfigProvider, Space, Spin, Typography, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import HomePage from '../home/HomePage'

/** 无参数；返回介绍页模块，按需加载示例及动画依赖。 */
const IntroductionPage = lazy(() => import('../introduction/IntroductionPage'))

/** 无参数；返回按需加载的图片生成页模块。 */
const GptImagePage = lazy(() => import('../gptimage/GptImagePage'))

/** 无参数；返回 URL 对应的页面，未知地址回退首页。 */
function currentPage() {
  if (window.location.hash === '#/gptimage') return 'gptimage'
  return window.location.hash === '#/introduction' ? 'introduction' : 'home'
}

/** 无 props；返回共享主题、导航及由 URL hash 选择的页面。 */
export default function App() {
  const [dark, setDark] = useState(false)
  const [page, setPage] = useState(currentPage)

  /** 无参数；监听浏览器导航，返回移除监听器的清理函数。 */
  useEffect(() => {
    /** 无参数；同步 URL 页面并回到顶部，无返回值。 */
    function syncPage() {
      setPage(currentPage())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', syncPage)
    /** 无参数；移除导航监听，无返回值。 */
    return () => window.removeEventListener('hashchange', syncPage)
  }, [])

  /** 切换共享明暗主题；无参数，无返回值。 */
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
        <div className="showcase">
          <nav className="app-nav" aria-label="主导航">
            <a className="brand-link" href="#/" aria-label="GptImage 首页">
              <span className="brand-mark">G</span>GptImage
            </a>
            <Space wrap>
              {page !== 'home' && <Button href="#/">返回首页</Button>}
              <Button onClick={toggleTheme}>
                {dark ? '切换浅色主题' : '切换深色主题'}
              </Button>
            </Space>
          </nav>
          <Suspense
            fallback={
              <div className="page-loading" role="status">
                <Spin />
                <span>正在加载页面…</span>
              </div>
            }
          >
            {page === 'home' ? (
              <HomePage />
            ) : page === 'gptimage' ? (
              <GptImagePage />
            ) : (
              <IntroductionPage />
            )}
          </Suspense>
          <footer>
            <Typography.Text type="secondary">
              GptImage · 让灵感成为作品
            </Typography.Text>
          </footer>
        </div>
      </main>
    </ConfigProvider>
  )
}
