import { render, screen, waitFor } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from '../src/App'
import IntroductionPage from '../src/IntroductionPage'

/** 无参数；返回关闭动画的展示页渲染结果，适配 jsdom。 */
function renderGallery() {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <IntroductionPage />
    </ConfigProvider>,
  )
}

/** 验证主题切换与恢复；无参数，返回异步测试完成状态。 */
async function verifyThemeToggle() {
  const user = userEvent.setup()
  render(<App />)
  expect(
    screen.getByRole('heading', { name: '灵感，从这里开始。' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '切换深色主题' }))
  expect(screen.getByRole('main')).toHaveClass('app-shell-dark')
  await user.click(screen.getByRole('button', { name: '切换浅色主题' }))
  expect(screen.getByRole('main')).not.toHaveClass('app-shell-dark')
}

/** 验证空表单校验及添加记录；无参数，返回异步测试完成状态。 */
async function verifyForm() {
  const user = userEvent.setup()
  renderGallery()
  await user.click(screen.getByRole('button', { name: '添加演示记录' }))
  expect(await screen.findByText('请输入示例名称')).toBeInTheDocument()
  await user.type(
    screen.getByRole('textbox', { name: '示例名称' }),
    '雨后的森林',
  )
  await user.click(screen.getByRole('button', { name: '添加演示记录' }))
  expect(
    await screen.findByRole('cell', { name: '雨后的森林' }),
  ).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('共 3 条演示记录')
}

/** 验证弹窗打开与关闭；无参数，返回异步测试完成状态。 */
async function verifyModal() {
  const user = userEvent.setup()
  renderGallery()
  await user.click(screen.getByRole('button', { name: '打开示例弹窗' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '知道了' }))
  await waitFor(
    /** 等待关闭完成；无参数，返回断言结果。 */
    () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
  )
}

test('支持切换并恢复主题', verifyThemeToggle)
test('校验表单并添加演示记录', verifyForm)
test('支持打开和关闭弹窗', verifyModal)

/** 验证首页入口、返回导航及共享主题；无参数，返回异步测试结果。 */
async function verifyNavigation() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(screen.getByRole('button', { name: '切换深色主题' }))
  await user.click(screen.getByRole('link', { name: '查看介绍 →' }))
  expect(
    await screen.findByRole('heading', { name: '组件与动画介绍', level: 1 }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: 'Motion 动画实验室' }),
  ).toBeInTheDocument()
  expect(
    screen.getByRole('heading', { name: '组件体验区' }),
  ).toBeInTheDocument()
  expect(window.location.hash).toBe('#/introduction')
  expect(screen.getByRole('main')).toHaveClass('app-shell-dark')
  await user.click(screen.getByRole('link', { name: '返回首页' }))
  expect(
    await screen.findByRole('heading', { name: '灵感，从这里开始。' }),
  ).toBeInTheDocument()
}

test('从首页进入合并介绍页并返回，保留主题', verifyNavigation)
