# GptImage

基于 React、TypeScript、Vite、Ant Design 和 Motion 的前端项目。首页提供 GPT Image 图片生成及组件与动画介绍入口。

## 页面与功能

首页通过“查看介绍”或“探索组件与动画”按钮进入合并的组件与动画介绍页，介绍页提供“返回首页”入口。页面使用 hash 地址：`#/` 为首页，`#/introduction` 为介绍页，支持直接访问、刷新和浏览器前进后退。介绍页按需加载，主题在页面切换时保留。

介绍页包含：

- 技术栈说明：区分 UI 组件框架、界面开发库和构建工具。
- Ant Design 示例：按钮、标签、提示、弹窗、表单、下拉选择、开关和分页表格。表单可添加本地演示记录，刷新页面或离开介绍页后重置。
- Motion 动画：依次入场（支持重播）、悬停与按压、列表重排、拖拽回弹、展开与退出。使用 `motion/react`，遵循系统的减少动态效果偏好。
- 明暗主题：通过顶部按钮切换，页面导航时保留，刷新后恢复浅色。

### GPT Image 图片生成

首页点击“进入 GPT Image”，或直接访问 `#/gptimage`。填写 Base URL、API Key、模型名称和图片描述后点击“生成图片”，结果支持放大预览。

- Base URL 默认为 `https://api.openai.com/v1`；裸域名会补充 `/v1`，自定义路径会保留，并追加 `/images/generations`。不要填写完整生成端点、查询参数或 URL 片段。
- 模型名称可自由填写 GPT Image 系列名称或服务商的模型别名，默认为 `gpt-image-1`。
- Base URL、API Key、模型名称修改后自动保存至当前站点的 `localStorage`，刷新或下次进入会自动回填。API Key 以明文缓存，仅在可信设备使用；“清除缓存配置”可删除三项缓存并恢复默认值。提示词和生成图片不持久化。
- 服务需兼容 [OpenAI 图片生成接口](https://developers.openai.com/api/reference/resources/images/methods/generate)。`npm run dev` 下浏览器请求同源 `/api/gptimage/generations`，由本机 Vite 服务转发到填写的 Base URL，解决浏览器跨域限制；密钥仅随请求转发，不写入服务端文件或日志。开发代理只允许本机访问。
- 构建后的静态页面（包括 `npm run preview`）仍直接请求模型服务，需要上游允许 CORS（包含 Authorization 和 Content-Type 请求头）；HTTPS 页面应连接 HTTPS 服务。开发代理不会打包到静态资源中。
- 页面处理生成中、接口失败、网络失败、空结果与存储不可用状态；离开页面会取消浏览器请求，但服务端可能仍继续生成。

项目包含本机开发代理，不包含生产后端服务。

## 运行环境

- Node.js 24 LTS（24.x）
- npm 11 或以上

## 本地开发

```sh
npm ci
npm run dev
```

打开终端显示的本地地址，默认是 http://localhost:5173。

如果模型服务需要通过本地网络代理访问，在 PowerShell 中设置后启动开发服务（Node.js 24.5 或以上）：

```powershell
$env:NODE_USE_ENV_PROXY = '1'
$env:HTTP_PROXY = 'http://127.0.0.1:7897'
$env:HTTPS_PROXY = 'http://127.0.0.1:7897'
$env:NO_PROXY = 'localhost,127.0.0.1,::1'
npm run dev
```

更改环境变量后需重启开发服务。本地转发失败返回 502，超过十分钟返回 504，上游鉴权等错误保留原始状态码。

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

- `src/main.tsx`：React 入口
- `src/app/`：应用壳、共享主题、导航、页面按需加载及全局样式
- `src/home/`：首页与功能入口
- `src/gptimage/`：图片生成页面、配置缓存、接口调用与预览
- `src/introduction/`：组件与动画介绍页、表单表格示例及 Motion 动画实验室
- `server/gptimage/`：仅在开发模式启用的本机图片请求转发
- `tests/`：按 `app/`、`gptimage/`、`introduction/`、`server/gptimage/` 对应组织测试，公共初始化位于 `tests/setup.ts`
- `assets/`：原样复制到构建目录的静态资源，通过 `/文件名` 引用
- 根目录：Vite、TypeScript、ESLint、Prettier 配置

各功能的专用样式保留在对应目录的 `styles.css`，全局布局和主题样式位于 `src/app/styles.css`。仅在存在实际跨功能复用时创建 `src/shared/`。

## 配置

当前无需环境变量。用户在生成页填写自己的服务配置。不要在前端代码或 `VITE_*` 环境变量中存放 API 密钥；部署方的私密凭据应由后端管理。
