import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from '../../src/app/App'

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

test('支持切换并恢复主题', verifyThemeToggle)

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
