import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom 不提供媒体查询，补充 Ant Design 响应式组件需要的浏览器接口。
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  /** 接收媒体查询字符串，返回无匹配状态的测试替身。 */
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

afterEach(cleanup)

// jsdom 不提供滚动实现，导航与 Motion 的滚动复位在此使用测试替身。
window.scrollTo = vi.fn()

// jsdom 不执行布局；仅补充组件挂载与卸载所需的尺寸监听接口。
class ResizeObserverMock {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock)

const originalGetComputedStyle = window.getComputedStyle.bind(window)
// jsdom 不支持伪元素样式，布局测量使用元素本身的样式。
vi.spyOn(window, 'getComputedStyle').mockImplementation(
  /** 接收待测量元素，返回其计算样式。 */
  (element) => originalGetComputedStyle(element),
)
