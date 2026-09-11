# Repository Guidelines

## Project Structure & Module Organization

This workspace uses React, TypeScript, Vite, Ant Design, and Motion (`motion/react`) for animations. Browser runtime code lives under `src/`, Node-side code under `server/`, tests under `tests/`, and static resources under `assets/` (Vite publicDir). Project configuration and the setup-focused `README.md` live at the repository root. Respect reduced-motion preferences when adding animations.

### 按功能组织源码

- 源码采用 `src/<功能>/<文件>` 结构，功能目录使用简短、稳定的英文名称，例如 `home`、`gptimage`、`introduction`。同一功能的页面、组件、接口调用、状态、类型及局部样式放在一起，禁止将所有业务文件平铺在 `src/` 根目录。
- `src/` 根目录只保留入口文件（如 `main.tsx`）及必要的环境类型声明。应用壳、导航、主题和全局样式放在 `src/app/`。
- 仅被一个功能使用的代码留在该功能目录；确实被多个功能复用的组件或工具再提取到 `src/shared/`，不要提前创建通用抽象，也不要把 `shared` 当作杂物目录。
- 功能目录内优先保持简单平铺；文件数量或职责复杂度增加后，再按需划分 `components/`、`hooks/` 等子目录。不要为单个文件机械地增加目录层级，也不要在顶层按 `components/`、`hooks/`、`services/` 拆散同一功能。
- Node 代理等服务端代码放在 `server/<功能>/`，不得混入浏览器源码或被浏览器模块导入。应用层负责组装各功能，功能之间避免直接依赖彼此的内部实现。
- 测试目录对应被测代码的功能结构，例如 `tests/gptimage/GptImagePage.test.tsx`、`tests/server/gptimage/imageProxy.test.ts`；公共测试初始化保留在 `tests/setup.ts`。
- 新增代码必须遵循此结构；修改已有平铺功能时，逐步将该功能归入对应目录。移动文件时同步更新 import、测试路径和 README 目录说明，避免混入无关功能的整体搬迁。

以下为目标目录示例，按实际需要创建目录，不要求提前建立空目录：

```text
src/
  main.tsx
  app/
    App.tsx
    styles.css
  home/
    HomePage.tsx
  gptimage/
    GptImagePage.tsx
    gptImage.ts
  introduction/
    IntroductionPage.tsx
    ComponentGallery.tsx
    AnimationGallery.tsx
  shared/
server/
  gptimage/
    imageProxy.ts
tests/
  app/
  home/
  gptimage/
  introduction/
  server/
    gptimage/
  setup.ts
```

## Build, Test, and Development Commands

Use Node.js 24 LTS and npm 11+. Install dependencies with `npm ci`, start development with `npm run dev`, run tests with `npm test`, and build with `npm run build`. Run `npm run lint` and `npm run format:check` before submitting changes. Use `npm run preview` to preview production output. Keep `package-lock.json` and README commands current.

## Coding Style & Naming Conventions

Use strict TypeScript, React function components, ESLint, and Prettier. Format with `npm run format`: two-space indentation, single quotes, and no semicolons. Use PascalCase component names and descriptive camelCase function names. Avoid competing style tools or unrelated formatting changes.

## Code Simplicity & Documentation

- Keep code concise and readable; avoid unnecessary logic and duplication.
- Avoid overengineering: implement current requirements without speculative abstractions, extra layers, or unnecessary dependencies.
- Document every function, method, and component with a header comment explaining its purpose, parameters or props, and return value or rendered output. Explicitly note when inputs or return values are absent. Add necessary inline comments for non-obvious logic and keep comments accurate.
- Split large classes and components along clear responsibility boundaries when size or complexity impairs understanding or maintenance. Avoid excessive fragmentation.

## Testing Guidelines

Use Vitest with Testing Library and jsdom. Place `*.test.tsx` component tests and `*.test.ts` logic or server tests under `tests/`, mirroring the feature directories described above. Run `npm test` for a single pass or `npm run test:watch` during development. Test user-visible behavior and bug fixes, and keep tests independent of private credentials. No coverage threshold is configured.

## 提交与 Pull Request 规范

提交信息遵循 Conventional Commits 格式：`<type>(<scope>): <中文描述>`。`type` 使用下表中的小写英文标识；`scope` 可省略，填写时使用简短、稳定的模块名。冒号后保留一个空格。

| 类型       | 用途                           |
| ---------- | ------------------------------ |
| `feat`     | 新增功能                       |
| `fix`      | 修复缺陷                       |
| `docs`     | 修改文档或注释                 |
| `style`    | 调整代码格式，不改变行为       |
| `refactor` | 重构代码，不新增功能或修复缺陷 |
| `perf`     | 优化性能                       |
| `test`     | 新增或修改测试                 |
| `build`    | 修改构建配置或依赖             |
| `ci`       | 修改持续集成配置               |
| `chore`    | 其他维护工作                   |
| `revert`   | 回退已有提交                   |

- 标题、正文及尾注说明使用简体中文；代码标识符、专有名词和规范关键字保留原文。
- 标题用“新增”“修复”“更新”“移除”等动词描述具体变更，保持简短，末尾不加句号，避免“更新代码”等含糊表述。
- 每次提交只包含一个明确目的的改动，避免混入无关修改。必要时在标题后空一行，通过正文说明修改原因、主要变化和验证结果。
- 不兼容变更在类型或作用域后添加 `!`，并在尾注中使用 `BREAKING CHANGE: <中文说明>` 描述影响和迁移方式。
- 关联问题时可使用 `Refs: #123` 或 `Closes: #123`；回退提交在正文中注明原提交哈希及回退原因。

提交示例：

```text
feat(image): 新增图片加载功能
fix(image): 修复透明背景导出异常
docs: 更新中文提交规范
build: 更新项目依赖
feat(api)!: 调整图片生成接口参数

BREAKING CHANGE: 将 size 参数拆分为 width 和 height，调用方需更新请求参数
```

Pull Request 标题和描述使用简体中文，说明修改目的、主要变化、关联问题及验证结果。涉及可见界面变化时附上截图，并明确列出未能执行的检查及原因。

## Security & Configuration

Keep credentials, local environment files, generated output, and installed dependencies out of version control. Add appropriate ignore rules as tooling is introduced. Document required configuration using placeholder values rather than real secrets.

## 本地代理

本地代理地址为 `127.0.0.1:7897`，支持 HTTP、HTTPS 和 SOCKS 协议。需要通过代理安装依赖或访问网络时，使用此地址，并按所用工具选择对应的代理协议。
