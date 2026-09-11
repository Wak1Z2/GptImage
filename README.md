# GptImage

基于 React、TypeScript、Vite 和 Ant Design 的前端项目，包含中文欢迎页与明暗主题切换。

## 环境要求

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

## 目录

- `src/`：React 入口、页面及样式
- `tests/`：组件测试及测试初始化
- `assets/`：原样复制到构建目录的静态资源，通过 `/文件名` 引用
- 根目录：Vite、TypeScript、ESLint、Prettier 配置

## 配置

当前无需环境变量。不要在前端代码或 `VITE_*` 环境变量中存放 API 密钥，浏览器资源对用户可见；需要私密凭据的接口应由后端调用。
