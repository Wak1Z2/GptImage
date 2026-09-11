import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test } from 'vitest'
import AnimationGallery from '../src/AnimationGallery'

/** 验证反馈按钮与排序后的阅读顺序；无参数，返回异步测试结果。 */
async function verifyAnimationControls() {
  const user = userEvent.setup()
  render(<AnimationGallery />)
  await user.click(screen.getByRole('button', { name: '点击感受弹性' }))
  expect(screen.getByText('已点击 1 次')).toBeInTheDocument()
  const list = screen.getByRole('list', { name: '动画排序示例' })
  expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('山间日落')
  await user.click(screen.getByRole('button', { name: '反转顺序' }))
  expect(within(list).getAllByRole('listitem')[0]).toHaveTextContent('雨后森林')
  await user.click(screen.getByRole('button', { name: '展开详情' }))
  expect(screen.getByRole('button', { name: '收起详情' })).toHaveAttribute(
    'aria-expanded',
    'true',
  )
  expect(
    screen.getByRole('heading', { name: '让内容自然出现' }),
  ).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: '收起详情' }))
  expect(screen.getByRole('button', { name: '展开详情' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
}

test('动画示例支持点击、排序及展开收起', verifyAnimationControls)
