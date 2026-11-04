# 个人博客框架

基于 TypeScript、React、Next.js App Router、MUI、MySQL、Drizzle ORM、Vditor 和 gray-matter。

当前页面仅包含居中标题导航和空白正文。没有示例文章、登录页、管理后台或公开写入接口。

## 本地开发

依赖已安装，运行 `npm run dev` 后访问 <http://localhost:3000>。

- `npm run lint`：ESLint 检查。
- `npm run typecheck`：TypeScript 检查。
- `npm run build`：生产构建。
- `npm start`：启动生产构建。

Node.js 要求以安装的 Next.js 版本为准；本项目初始化使用 Node.js 24。

## 目录职责

| 路径 | 职责 |
| --- | --- |
| [src/app/layout.tsx](src/app/layout.tsx) | 服务端根布局、SEO Metadata、MUI SSR 样式缓存 |
| [src/app/page.tsx](src/app/page.tsx) | 首页路由入口 |
| [src/config/site.ts](src/config/site.ts) | 博客标题、描述 |
| [src/theme/theme.ts](src/theme/theme.ts) | 颜色、间距、字体、组件默认值及全局基线 |
| [src/theme/app-theme-provider.tsx](src/theme/app-theme-provider.tsx) | ThemeProvider 与 CssBaseline |
| [src/components/layout/site-shell.tsx](src/components/layout/site-shell.tsx) | 导航与正文容器 |
| [src/components/navigation/site-nav.tsx](src/components/navigation/site-nav.tsx) | 顶部导航，标题通过三列网格保持水平居中 |
| [src/features/home/components/home-page.tsx](src/features/home/components/home-page.tsx) | 空白首页内容，后续扩展文章列表 |
| [src/features/editor/components/markdown-editor.tsx](src/features/editor/components/markdown-editor.tsx) | 客户端按需加载的编辑器入口，首页不加载编辑器 |
| [src/features/editor/components/vditor-editor.tsx](src/features/editor/components/vditor-editor.tsx) | Vditor 初始化与生命周期 |
| [src/features/editor/types.ts](src/features/editor/types.ts) | 编辑器属性类型 |
| [src/lib/markdown/parse-markdown.ts](src/lib/markdown/parse-markdown.ts) | gray-matter 解析可信 Markdown 的 front matter |
| [src/db/index.ts](src/db/index.ts) | 仅服务端可用、懒初始化的 MySQL 连接池 |
| [src/db/schema/posts.ts](src/db/schema/posts.ts) | 文章表示例定义与推断类型 |
| [drizzle.config.ts](drizzle.config.ts) | MySQL 迁移配置 |

## 样式约定

优先在 theme 中配置可复用的颜色、字体、间距和组件默认行为；局部布局使用 `sx`。没有额外的应用样式表，也没有 Tailwind。

Vditor 组件内部引入其官方必需样式，这不属于应用布局样式；该组件只在使用时加载。应用不使用构建时下载的 Google 字体。

## MySQL 与 Drizzle

1. 准备独立的 MySQL 8.4 LTS 服务，创建 `personal_blog` 数据库和专用账号，推荐使用 `utf8mb4` 字符集。
2. 复制 [.env.example](.env.example) 为本地 `.env`，填写实际 `DATABASE_URL`。不要提交实际凭据。`.env.local` 也受支持，优先级高于 `.env`。
3. 运行 `npm run db:generate` 生成 SQL 迁移，检查后运行 `npm run db:migrate`。生成的迁移应提交到版本控制。
4. 可使用 `npm run db:studio` 在本机查看数据，不要向公网开放 Studio。

服务端通过 `getDb()` 获取 Drizzle 实例。没有数据库配置或数据库服务时，空白首页仍可启动和构建；只有实际访问数据库才需要连接。

数据库结构尚未应用到任何真实数据库。此项目不安装操作系统级 MySQL，也不会修改现有 gateway 项目。数据库应持久化、备份，并限制为应用内部访问。

## 编辑器与 Markdown

在未来的客户端管理页面中导入 `MarkdownEditor`，传入 `initialValue` 和 `onChange`。切换文章时使用文章 ID 作为 React `key`。

默认支持快捷键、工具栏和即时渲染；未提供 `uploadUrl` 时不启用上传。若提供上传地址，该接口需自行实现登录权限校验、文件大小与内容校验，以及 Vditor 官方上传返回格式。当前没有上传服务，也不会假装已经上传成功。

编辑器默认会从 Vditor 版本化 CDN 加载语言包、Markdown 引擎和部分增强资源。生产环境可以按官方文档改为自托管，并同步设置 CDN、主题和图片资源路径。

`gray-matter`（不是 `greymatter`）只解析 front matter，不负责渲染 Markdown、HTML 安全处理或自动持久化。当前解析工具仅面向可信作者内容。

后续文章展示、草稿保存、认证、上传和缓存失效均需另行实现。不要在未加入服务端鉴权之前公开任何写入接口。

## 部署

Next.js 已配置 `output: 'standalone'`，便于后续容器化；目前未创建 Dockerfile，也未改动 Caddy 路由。

## 依赖安全

初始化时 `npm audit --omit=dev` 未发现生产依赖漏洞。开发工具依赖仍有中等级别审计告警；上线与升级前应重新审计，不要盲目执行 `npm audit fix --force` 降级或破坏工具链。This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
