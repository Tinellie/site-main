# 个人博客框架

基于 TypeScript、React、Next.js App Router、MUI、MySQL、Drizzle ORM、Vditor 和 gray-matter。

当前包含 Home、Connect、Works、Blog、Gallery 五个页面；Connect、Works 为测试数据，Blog 已接入本地 Markdown 存储与编辑流程。Home 和 Gallery 仍保留空白正文。没有登录页或完整管理后台。

组件调用层级、属性、测试常数、图片索引与关键 DOM 标识见 [docs/component-map.md](docs/component-map.md)。

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
| [src/components/layout/site-shell.tsx](src/components/layout/site-shell.tsx) | 导航数据常数与全站外壳 |
| [src/components/layout/page-template.tsx](src/components/layout/page-template.tsx) | main 页面模板、标题、内容容器 |
| [src/components/navigation/site-nav.tsx](src/components/navigation/site-nav.tsx) | 数据驱动的双侧导航，通过等宽网格列保持标题居中 |
| [src/features/home/components/home-page.tsx](src/features/home/components/home-page.tsx) | 空白首页内容，后续扩展文章列表 |
| [src/features/editor/components/markdown-editor.tsx](src/features/editor/components/markdown-editor.tsx) | 客户端按需加载的编辑器入口，首页不加载编辑器 |
| [src/features/editor/components/vditor-editor.tsx](src/features/editor/components/vditor-editor.tsx) | Vditor 初始化与生命周期 |
| [src/features/editor/types.ts](src/features/editor/types.ts) | 编辑器属性类型 |
| [src/lib/markdown/parse-markdown.ts](src/lib/markdown/parse-markdown.ts) | gray-matter 解析可信 Markdown 的 front matter |
| [src/db/index.ts](src/db/index.ts) | 仅服务端可用、懒初始化的 MySQL 连接池 |
| [src/db/schema/posts.ts](src/db/schema/posts.ts) | 文章表示例定义与推断类型 |
| [drizzle.config.ts](drizzle.config.ts) | MySQL 迁移配置 |

## 导航与页面模板

`SiteNav` 的 `items` 接收 `{ label: string; href: string }` 数组，前半部分位于标题左侧，其余位于右侧。数据定义在 `SiteShell` 的 `navigationItems` 中。Connect 表示联系方式与社交个人主页。窄屏下同侧按钮换行，标题保持居中；标题暂时使用衬线字体方便区分，并链接到首页。

导航按钮字间距为 `0.08em`；按钮和标题链接均使用左右 12px 内边距，窄屏缩小为 8px，不设置项目间 gap。按钮和标题链接的点击区域填满导航高度，导航按钮无圆角。

`PageTemplate` 输出唯一的 `main`，可传入：

- `title`：顶部居中的 h1，空字符串或未提供时不渲染。
- `hideTitle`：默认 false；通过 MUI `visuallyHidden` 保留 DOM 中的 h1，但不占正常布局空间。它不负责鉴权或后台数据。
- `children`：页面内容。
- `removeMargin`：默认 false；设为 true 时去掉内容容器四周外边距，使内容可使用全部可用宽度。不会自动隐藏导航或让内容高度撑满视口。
- `removeMargin`：默认 false；main 使用 MUI Container 居中，最大宽度为 lg（默认 1200px），通常左右留白各 48px。可用窗口宽度在 336–416px 时内容保持 320px，留白从 8px 增至 48px；小于 336px 时保持各 8px 留白，内容随窗口缩小以避免溢出。内容上下外边距为 24px。设为 true 时取消最大宽度、左右留白和内容上下外边距，使用完整可用宽度。不会自动隐藏导航或移除标题本身的顶部间距。

页面共用的单例节点使用 ID，导航按钮和可重复挂载的编辑器使用 className。Provider、路由和页面组件直接复用子组件的 DOM，不为添加标识额外创建包装元素。

全站外壳固定为视口高度，顶部导航自身全宽，不随正文滚动；`ss-page` 为可聚焦的独立正文滚动区域，仅在这里使用 `scrollbar-gutter: stable both-edges` 保持正文对称。根页面不滚动，导航背景和阴影无需补齐。正文滚动区也提供尺寸查询容器，Blog 侧栏使用其高度限制内部滚动。打开 MUI 弹窗或弹出菜单时锁定正文滚动，Gallery 使用标准 Dialog 遮罩，不再修改根元素的预留空间或 padding。

切换路径时正文回到顶部，带锚点的链接保留 Next.js 的定位行为；浏览器前进、后退恢复当前会话中按路径记录的正文滚动位置。

全站滚动条使用透明轨道、圆角滑块；Chromium/WebKit 隐藏两端按钮，滑块 hover 时加亮。Firefox 使用原生细滚动条与透明轨道，按钮形态由浏览器决定。滚动条仍占据预留空间，不采用覆盖内容的模拟滚动条。

## 基础样式

优先在 theme 中配置可复用的颜色、字体、间距和组件默认行为；局部布局使用 `sx`。没有额外的应用样式表，也没有 Tailwind。

Card 与 Paper 使用 MUI 默认外观，不设置 outlined variant；各页面保留自己的尺寸与间距。标签和输入框的 variant 独立设置。

MUI 组件、样式工具和类型统一从 `@mui/material` 命名导入，图标从 `@mui/icons-material` 命名导入，可使用 `Add as AddIcon` 等别名。同一模块的导入尽量合并，长列表按相关系列分组换行，不要求每项独占一行。其他库仅在公共导出兼容时采用相同方式；专用子模块和 CSS 副作用导入保持独立。

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

默认支持快捷键、工具栏和即时渲染；`/blog/[id]/edit` 已接入 Vditor 上传与图片重命名。编辑器上传接口为 `/api/blog/assets/upload`，图片写入 `public/assets/`，并支持在编辑器内 hover 图片后打开重命名面板。封面图输入使用相对 `assets` 的路径（不显示 `/assets/` 前缀），保存时由后端自动补齐；封面图与标签都可留空。

编辑器默认会从 Vditor 版本化 CDN 加载语言包、Markdown 引擎和部分增强资源。生产环境可以按官方文档改为自托管，并同步设置 CDN、主题和图片资源路径。

`gray-matter`（不是 `greymatter`）只解析 front matter，不负责渲染 Markdown、HTML 安全处理或自动持久化。当前解析工具仅面向可信作者内容。

文章以 `content/blog/[id].md` 保存，历史版本会在编辑时移动到 `content/blog/history/[id]/`。front matter 包含 `id`、`title`、`coverImage`、`publishedAt`、`updatedAt`、`tags`、`summary`。

封面图栏位填写 `$$` 时，保存会自动采用正文第一张 Markdown 图片（支持内联和引用式图片，忽略代码与注释中的示例）；没有图片则封面留空。元数据保存实际图片地址，而非 `$$`。也支持 HTTP(S) 图片地址。

正文图片使用相对于 `public/assets/` 的路径，例如 `![图片](covers/photo.png)` 会访问 `/assets/covers/photo.png`。Vditor 编辑与文章预览均使用 `/assets/` 作为相对地址基址；上传和图片重命名回写的 Markdown 不包含此前缀。绝对路径与外部图片 URL 保持原样。

## Gallery 文件浏览

`/gallery` 只读展示 `public/assets` 当前目录的全部文件和子目录；`/gallery/a/b` 对应 `public/assets/a/b`。面包屑支持返回上级，搜索仅匹配当前目录名称。支持名称、修改时间、大小、类型排序（文件夹优先），以及列表与方形卡片视图。图片、视频、音频、文本可点击预览，其他格式可打开原文件；媒体播放能力以浏览器为准。无上传、移动、删除等操作，不跟随符号链接；缺失或非法目录返回 404。所有 assets 文件仍为公开资源。

非根目录的文件区始终置顶“..”（不显示其他文本），用于返回上级，不参与搜索、排序或文件计数，两种视图都可使用。图片缩略图使用 Next.js Image 按显示尺寸优化和懒加载，只有打开预览时才加载原图；首次生成缩略图有处理开销，后续请求复用缓存。目录链接关闭预取，避免浏览时提前读取未打开的目录。

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
