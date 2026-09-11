# GptImage

基于 React、TypeScript、Vite、Ant Design 和 Motion 的前端项目。首页集中展示功能入口，目前提供一个合并的组件与动画介绍页面。

## 页面与功能

首页通过“查看介绍”或“探索组件与动画”按钮进入合并的组件与动画介绍页，介绍页提供“返回首页”入口。页面使用 hash 地址：`#/` 为首页，`#/introduction` 为介绍页，支持直接访问、刷新和浏览器前进后退。介绍页按需加载，主题在页面切换时保留。

介绍页包含：

- 技术栈说明：区分 UI 组件框架、界面开发库和构建工具。
- Ant Design 示例：按钮、标签、提示、弹窗、表单、下拉选择、开关和分页表格。表单可添加本地演示记录，刷新页面或离开介绍页后重置。
- Motion 动画：依次入场（支持重播）、悬停与按压、列表重排、拖拽回弹、展开与退出。使用 `motion/react`，遵循系统的减少动态效果偏好。
- 明暗主题：通过顶部按钮切换，页面导航时保留，刷新后恢复浅色。

目前为前端演示，不包含图片生成接口或后端服务。

## 运行环境

- Node.js 24 LTS（24.x）
- npm 11 或以上

## 本地开发

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，默认是 http://localhost:5173。

## 检查与构建

```sh
npm run lint
npm run format:check
npm test
npm run build
npm run preview
```

`npm run build` 先检查 TypeScript，再将生产资源输出至 `dist/`。
`npm run preview` 用于本地预览构建结果，不作为生产服务器。
`npm run format` 自动格式化；`npm run test:watch` 启动测试监听。
测试使用 Vitest、Testing Library 和 jsdom，不需要凭据或外部服务。
测试覆盖主题切换、表单校验及添加记录、弹窗开关、首页往返导航，以及动画示例的点击、排序和展开状态。jsdom 不执行真实布局，动画视觉和拖拽手感需在浏览器中验证。

构建已按页面拆分代码，仍可能出现超过 500 kB 的资源体积提示；该提示不阻止构建。

## 目录

- `src/`：React 入口、页面及样式
- `src/App.tsx`：共享主题、导航与页面按需加载
- `src/HomePage.tsx`：首页与功能入口
- `src/IntroductionPage.tsx`：合并的组件与动画介绍页
- `src/ComponentGallery.tsx`：表单与表格示例
- `src/AnimationGallery.tsx`：Motion 动画实验室
- `tests/`：组件测试及测试初始化
- `assets/`：原样复制到构建目录的静态资源，通过 `/文件名` 引用
- 根目录：Vite、TypeScript、ESLint、Prettier 配置

## 配置

当前无需环境变量。不要在前端代码或 `VITE_*` 环境变量中存放 API 密钥，浏览器资源对用户可见；需要私密凭据的接口应由后端调用。
