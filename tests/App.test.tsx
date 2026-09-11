import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import App from '../src/App'

/** 验证用户可以切换并恢复主题；无参数，返回异步测试完成状态。 */
async function verifyThemeToggle() {
  const user = userEvent.setup()
  render(<App />)

  expect(
    screen.getByRole('heading', { name: '从这里，开始创造' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '切换深色主题' }))
  expect(screen.getByRole('main')).toHaveClass('app-shell-dark')
  await user.click(screen.getByRole('button', { name: '切换浅色主题' }))
  expect(screen.getByRole('main')).not.toHaveClass('app-shell-dark')
}

test('支持切换并恢复主题', verifyThemeToggle)
