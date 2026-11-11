# 个人博客框架

基于 TypeScript、React、Next.js App Router、MUI、MySQL、Drizzle ORM、Vditor 和 gray-matter。

当前包含 Home、Connect、Works、Blog、Gallery 页面；Home 为两屏背景示例，Connect、Works 卡片由 MySQL 保存，Blog 已接入本地 Markdown 存储与编辑流程。`/login` 支持本地管理员账号密码登录；游客只读，管理员可管理卡片、编辑文章、上传和重命名图片。

组件调用层级、属性、测试常数、图片索引与关键 DOM 标识见 [docs/component-map.md](docs/component-map.md)。

## 本地开发

依赖已安装，运行 `npm run dev` 后访问 <http://localhost:3000>。

- `npm run lint`：ESLint 检查。
- `npm run typecheck`：TypeScript 检查。
- `npm run build`：生产构建。
- `npm start`：启动生产构建。
- `npm run test:auth`：运行认证基础单元测试。
- `npm run test:blog`：运行 Blog 时间展示格式单元测试。
- `npm run test:cards`：运行卡片输入验证单元测试。
- `npm run test:theme`：验证统一磨砂玻璃样式、兼容回退及全屏预览豁免。

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
| [src/features/home/components/home-page.tsx](src/features/home/components/home-page.tsx) | 两屏背景与正文示例 |
| [src/features/editor/components/markdown-editor.tsx](src/features/editor/components/markdown-editor.tsx) | 客户端按需加载的编辑器入口，首页不加载编辑器 |
| [src/features/editor/components/vditor-editor.tsx](src/features/editor/components/vditor-editor.tsx) | Vditor 初始化与生命周期 |
| [src/features/editor/types.ts](src/features/editor/types.ts) | 编辑器属性类型 |
| [src/lib/markdown/parse-markdown.ts](src/lib/markdown/parse-markdown.ts) | gray-matter 解析可信 Markdown 的 front matter |
| [src/db/index.ts](src/db/index.ts) | 仅服务端可用、懒初始化的 MySQL 连接池 |
| [src/db/schema/posts.ts](src/db/schema/posts.ts) | 文章表示例定义与推断类型 |
| [src/db/schema/cards.ts](src/db/schema/cards.ts) | Connect／Works 的 content_cards 表 |
| [src/features/cards](src/features/cards) | 卡片列表、认证编辑窗、悬浮操作与图标选择器 |
| [drizzle.config.ts](drizzle.config.ts) | MySQL 迁移配置 |

## 导航与页面模板

`SiteNav` 的 `items` 接收 `{ label: string; href: string }` 数组，前半部分位于标题左侧，其余位于右侧。数据定义在 `SiteShell` 的 `navigationItems` 中。Connect 表示联系方式与社交个人主页。窄屏下同侧按钮换行，标题保持居中；标题暂时使用衬线字体方便区分，并链接到首页。

导航按钮字间距为 `0.08em`；按钮和标题链接均使用左右 12px 内边距，窄屏缩小为 8px，不设置项目间 gap。按钮和标题链接的点击区域填满导航高度，导航按钮无圆角。

`PageTemplate` 输出唯一的 `main`，可传入：

- `title`：顶部居中的 h1，空字符串或未提供时不渲染。
- `hideTitle`：默认 false；通过 MUI `visuallyHidden` 保留 DOM 中的 h1，但不占正常布局空间。它不负责鉴权或后台数据。
- `hideScrollbar`：默认 false；true 时隐藏当前页面右侧的主滚动条，滚轮、触摸、键盘滚动及历史位置恢复不变。只控制 `PageScrollbar`，不影响分页内部、侧栏或弹窗的局部滚动条。Home 已启用，例如 `<PageTemplate title="Home" hideScrollbar>`；切换到未启用的页面时自动恢复。
- `children`：页面内容。
- `removeMargin`：默认 false；main 使用 MUI Container 居中，默认最大宽度为 lg（1200px），通常左右留白各 48px。可用窗口宽度在 336–416px 时内容保持 320px，留白从 8px 增至 48px；小于 336px 时保持各 8px 留白，内容随窗口缩小以避免溢出。内容上下外边距为 24px。设为 true 时去掉这些留白，默认取消最大宽度；不会自动隐藏导航或移除标题本身的顶部间距。
- `maxWidth`：按当前 `PageTemplate` 设置正文容器最大宽度，支持 MUI 断点 `"xs" | "sm" | "md" | "lg" | "xl"`、像素数字（如 `maxWidth={960}`）或 `false`（无最大宽度限制）。默认普通页面为 `"lg"`，`removeMargin` 或 `paginated` 页面为 `false`；显式设置优先于这些默认值。正文仍居中且随窄窗口收缩，原有留白独立保留。该参数不作用于独立的 `PageScreen`，分页页面显式设置它会同时限制分页背景的宽度。
- `ignoreNav`：默认 false，正文从导航下方开始；true 时正文滚动区从窗口顶部开始，导航固定覆盖在正文上，不占正文高度。普通页面和分页页面均可使用。
- `transparentNav`：默认 false；true 时导航背景不透明度为 60%，文字和按钮不受影响。与 `ignoreNav` 独立控制；需要正文背景透过导航显示时同时设置 `ignoreNav=true`。Home 已启用半透明导航与 `ignoreNav=true`，首屏背景为 `/images/backgrounds/bg1.JPG`。
- `paginated`：默认 false；true 时启用下面的固定一屏分页，自动去掉模板外边距与最大宽度，页面 h1 保留但视觉隐藏，避免挤占首屏高度。

### 按窗口高度分页

在 `PageTemplate paginated` 内直接放置多个 `PageScreen`：

```tsx
import { PageScreen } from "@/components/layout/page-screen";
import { PageTemplate } from "@/components/layout/page-template";

<PageTemplate title="Home" paginated ignoreNav={false}>
  <PageScreen
    label="第一屏"
    backgroundImage="/assets/proj.png"
    overlayColor="rgba(0, 0, 0, 0.5)"
  >
    第一屏正文
  </PageScreen>
  <PageScreen label="第二屏" backgroundColor="#1c2938">
    第二屏正文
  </PageScreen>
</PageTemplate>
```

- `ignoreNav=false`：第一屏高度为窗口减去实际导航高度，导航与第一屏合计正好一窗口；后续每屏为 `100dvh`。
- `ignoreNav=true`：第一屏和后续每屏均为 `100dvh`，第一屏顶部在导航后方，不自动为正文添加避让。
- `PageScreen` 固定高度，内容超出时在本屏内部滚动；滚到边界后继续滚动外层正文查看下一屏。不强制吸附或自动翻页。
- 首屏使用正文尺寸容器的 `100cqh`，导航换行、窗口缩放、手机动态视口变化时自动调整，无需测量或硬编码导航高度。
- `backgroundImage` 为图片 URL，默认居中 `cover` 铺满容器，保持比例、允许裁剪；`backgroundColor` 可独立使用或作为图片底色。`id` 支持锚点，`label` 提供无障碍名称，`sx` 可调整内边距等样式（默认 24px），不要覆盖分页高度。
- `overlayColor` 为可选的 CSS 遮罩颜色，例如 `rgba(0, 0, 0, 0.5)`；设置后在背景图片上方叠加一层同色渐变，只影响背景，不改变正文透明度或阻挡交互。不设置时没有遮罩；`backgroundColor` 不设置时默认透明。Home 首屏使用 65% 黑色遮罩，中央大字读取 `siteConfig.title`，采用与导航标题相同的衬线字体和字重，第二屏不设置背景图片或颜色。
- 背景填满正文可用宽度，全站主滚动区不再为滚动条预留两侧空间；footer 仍位于全部分页之后，不计入分页高度。

### 固定全屏页面背景

`PageBackground` 可在当前页面中使用一次，为整个窗口提供固定背景，不占正文空间，也不随正文滚动：

```tsx
import { PageBackground } from "@/components/layout/page-background";
import { PageTemplate } from "@/components/layout/page-template";

<PageTemplate title="文章">
  <PageBackground
    backgroundImage="/images/backgrounds/bg1.JPG"
    backgroundColor="#18232e"
    overlayColor="rgba(0, 0, 0, 0.5)"
  />
  正文内容
</PageTemplate>
```

三个参数均可选，与 `PageScreen` 同名参数含义一致：图片居中 `cover` 铺满，`backgroundColor` 为底色，`overlayColor` 为背景上方的颜色遮罩，不改变正文透明度。背景覆盖导航后方和正文两侧，导航是否透出背景仍由 `transparentNav` 决定；不受 `maxWidth`、正文留白或 `ignoreNav` 影响。正文中的不透明卡片或分页背景仍会遮住它。

通过 MUI `Portal` 将背景挂到 `SiteShell`，避开正文尺寸容器与裁剪边界；外壳使用隔离层叠上下文，保证背景在正文、导航、滚动条和弹窗下方，同时不落到 body 底色后面。背景不接收点击、不参与无障碍阅读，切换页面卸载后自动移除。不使用该组件的页面保持不变。

`PageBackground` 和 `PageScreen` 共用 `BackgroundMedia`，本地静态背景使用 `next/image` 按视口宽度生成响应式压缩图片，保留居中裁剪和独立遮罩；远程 URL 与 `/api/` 图片仍直连，避免改变远程配置或可替换图片的缓存行为。Works 卡片图片使用原生懒加载和异步解码。卡片编辑器在打开时才加载，访客无需下载编辑表单和图标选择器代码。

页面共用的单例节点使用 ID，导航按钮和可重复挂载的编辑器使用 className。Provider、路由和页面组件直接复用子组件的 DOM，不为添加标识额外创建包装元素。

全站外壳固定为视口高度，使用 Grid 将导航与正文堆叠；`ignoreNav` 模式让正文跨越导航所在网格行。顶部导航自身全宽，不随正文滚动；`ss-page` 为可聚焦的独立正文滚动区域，隐藏原生滚动条且不预留 gutter，内容与背景可以使用完整宽度。根页面不滚动。正文滚动区也提供尺寸查询容器，Blog 侧栏使用其高度限制内部滚动。打开 MUI 弹窗或弹出菜单时锁定正文滚动并隐藏悬浮滚动条，Gallery 使用标准 Dialog 遮罩。

切换路径时正文回到顶部，带锚点的链接保留 Next.js 的定位行为；浏览器前进、后退恢复当前会话中按路径记录的正文滚动位置。滚动恢复在布局阶段完成，早于过渡新画面快照；只在当前 URL 与监听路径一致时保存位置，避免切页时的自动归零覆盖旧记录。

根布局目前直接渲染 `SiteShell`，页面过渡动画已停用。全局 `src/app/loading.tsx` 在等待路由内容时显示加载状态，共用导航保持可交互；卡片的客户端请求继续使用自己的加载、错误与重试提示。

性能评估应使用 `npm run build` 后的 `npm start`；`npm run dev` 包含按需编译、HMR 和开发工具，首次访问尚未编译的路由会更慢。首次请求某个图片尺寸时也需要生成优化结果，后续请求复用图片缓存。

透明 footer 位于正文滚动区末尾，左下角提供 `/login` 登录入口，避开右下角的文章新建和编辑按钮；内容不足一屏时由 main 的弹性高度将其推至底部，超过一屏时排在内容之后，不固定覆盖正文。

全站主滚动区使用 `PageScrollbar`：10px 宽的透明轨道悬浮在正文最右侧，圆角滑块 hover 或键盘聚焦时加亮，不占布局宽度。内容仍由原生滚动容器处理，支持滚轮、触摸、正文键盘滚动与历史位置恢复；悬浮条支持拖动、点击轨道、滚轮及方向键、PageUp/PageDown、Home/End，并提供 ARIA 滚动条语义。窗口、内容尺寸和路由变化会自动更新滑块，没有溢出时不显示。分页内部、侧栏和弹窗等局部滚动区仍使用原生透明轨道滚动条。

## 基础样式

优先在 theme 中配置可复用的颜色、字体、间距和组件默认行为；局部布局使用 `sx`。没有额外的应用样式表，也没有 Tailwind。

磨砂玻璃外观统一定义在 `src/theme/theme.ts` 的 `glassSurface`，通过 `MuiCard`、`MuiPopover.paper` 和普通 `MuiDialog.paper` 自动应用：paper 底色 45% 不透明度、12px 模糊、140% 饱和度、细半透明边框，并移除默认背景渐变。不支持 backdrop-filter 时回退到 90% 不透明底色。Connect、Works、Blog、推荐及 Gallery 卡片共用该定义，各页面只保留自己的尺寸与间距；Blog 筛选面板也使用 Card。普通 Paper、导航以及全屏 Dialog 不受影响，Gallery 全屏预览继续透明。标签和输入框的 variant 独立设置。

MUI 组件、样式工具和类型统一从 `@mui/material` 命名导入，图标从 `@mui/icons-material` 命名导入，可使用 `Add as AddIcon` 等别名。同一模块的导入尽量合并，长列表按相关系列分组换行，不要求每项独占一行。其他库仅在公共导出兼容时采用相同方式；专用子模块和 CSS 副作用导入保持独立。

Vditor 组件内部引入其官方必需样式，这不属于应用布局样式；该组件只在使用时加载。应用不使用构建时下载的 Google 字体。

## MySQL 与 Drizzle

1. 准备独立的 MySQL 8.4 LTS 服务，创建 `personal_blog` 数据库和专用账号，推荐使用 `utf8mb4` 字符集。
2. 复制 [.env.example](.env.example) 为本地 `.env`，填写实际 `DATABASE_URL`。不要提交实际凭据。`.env.local` 也受支持，优先级高于 `.env`。
3. 运行 `npm run db:generate` 生成 SQL 迁移，检查后运行 `npm run db:migrate`。生成的迁移应提交到版本控制。
4. 可使用 `npm run db:studio` 在本机查看数据，不要向公网开放 Studio。

服务端通过 `getDb()` 获取 Drizzle 实例。没有数据库配置或数据库服务时，空白首页仍可启动和构建；只有实际访问数据库才需要连接。

数据库结构尚未应用到任何真实数据库。此项目不安装操作系统级 MySQL，也不会修改现有 gateway 项目。数据库应持久化、备份，并限制为应用内部访问。

## 登录认证

不增加 npm 依赖，不使用第三方登录。使用 Next.js Route Handlers、Node.js 内置 `crypto`、现有 MySQL / Drizzle ORM。认证账号由本地命令创建；所有账号都是管理员，不开放网页注册、密码找回或访客写入。

### 首次设置

1. 将 `.env.example` 复制为 `.env.local`，配置真实 `DATABASE_URL` 和 `AUTH_ORIGIN`。本地默认来源为 `http://localhost:3000`；如果使用其他端口，应同步修改。来源不能带路径或末尾斜杠。
2. 在专用数据库执行 `npm run db:migrate`。已有迁移包含 posts 示例表、三个认证表及 content_cards 卡片表；如果曾手动建表，应先核对现有结构及迁移记录，不要直接在有冲突的数据库执行。
3. 在交互式终端执行 `npm run auth:admin -- admin`，输入并确认 9–128 字符的独立密码（不回显）。账号限 3–64 位英文字母、数字、下划线、连字符，统一转为小写。Node.js 需支持 `--experimental-strip-types`（22.6+；建议使用项目推荐的 Node.js 24）。
4. 重启应用，在 footer 点击“登录”。没有数据库配置时本地文章仍可阅读；卡片加载和登录会明确提示服务不可用，写操作不会放行。

生产环境将 `AUTH_ORIGIN` 设为真实 HTTPS 来源，例如 `https://example.com`，由部署平台或反向代理配置 HTTPS。生产登录接口拒绝 HTTP 来源，Cookie 自动启用 `Secure`；本地使用 `npm run dev` 和 HTTP。应用不会替你安装证书或开放数据库端口。

### 已实现的保护

- 密码使用 `scrypt`、每个密码独立的 16 字节随机盐和 64 字节派生密钥，比较使用 `timingSafeEqual`；不保存明文密码。
- 登录生成 32 字节随机会话令牌，数据库只保存 SHA-256 哈希和 24 小时绝对过期时间；Cookie 为 `HttpOnly`、`SameSite=Lax`、`Path=/`，生产环境使用 `__Host-` 名称与 `Secure`。
- 每次写入校验会话过期及账号是否启用；数据库连接同时将客户端和 MySQL 会话时区设为 UTC。退出登录立即删除当前数据库会话；重新登录轮换当前令牌。
- 登录、退出、保存、上传和重命名均严格校验 `Origin` 与 `AUTH_ORIGIN`，拒绝无 Origin、来源不匹配及跨站 Fetch 请求，配合 SameSite Cookie 防御 CSRF。这里使用来源校验方案，不额外生成 CSRF Token；脚本调用写接口也必须带正确 Origin。
- MySQL 保存共享限流计数，事务中原子计数：每账号每 15 分钟最多 10 次登录尝试，全站最多 100 次（成功登录也计数）；超限返回 `429` 和 `Retry-After`。不信任代理传入的 IP；不永久锁号，但全站额度耗尽时正常登录也需等待。面向大规模公网流量仍建议在入口增加限流。
- 游客隐藏新建／编辑入口；编辑路由服务端跳转登录，登录后仅跳转站内地址。所有现有写接口及存储层写函数校验登录，不依赖按钮隐藏。未认证返回 `401`，来源错误返回 `403`，认证服务故障返回 `503`。
- 登录状态在页面加载、窗口重新聚焦及每分钟刷新；footer 显示账号及退出入口，失败明确提示。会话过期时保存失败但保留编辑器内容，可在新标签页重新登录后重试。
- 文章和 assets 文件仍公开可读；此次不添加 Gallery 文件管理、注册、找回密码、MFA 或完整管理后台。

### 管理和验证

- 重设密码：`npm run auth:admin -- admin --reset`，同时撤销该账号全部旧会话。
- 禁用账号：通过受信任的数据库管理工具将 `auth_users.enabled` 改为 `false`，已有会话立即失去写权限；不要公开数据库管理工具。
- 过期会话在下次成功登录时清理，过期限流记录在登录尝试时清理；过期校验不依赖清理是否执行。
- `npm run test:auth` 验证密码、账号规范、令牌哈希、站内跳转。
- `npm run test:auth:integration` 需显式配置 `AUTH_TEST_DATABASE_URL`（仅接受本机独立的 `auth_validation` 数据库）、`AUTH_TEST_BASE_URL` 和与测试服务匹配的 `AUTH_TEST_ORIGIN`；缺失时跳过。测试服务与测试脚本必须指向同一独立数据库，先应用迁移。生产构建可在本机 HTTP 传输上以显式 HTTPS Origin 和 Cookie 测服务端，不代表浏览器支持 HTTP 生产登录。测试包含真实文章／上传／重命名操作并清理自己创建的文件，不要对实际发布服务运行。

## Connect 与 Works 卡片管理

先备份数据库，然后执行 `npm run db:migrate` 应用 `0001_equal_ultron.sql`。它创建 `content_cards`，并一次性导入之前的 6 个 Connect、4 个 Project、2 个 Article 示例；不是站主的真实资料。数据库不可用时显示错误和重试，不回退到静态测试数据。

- 游客只读。登录后，悬浮／键盘聚焦卡片显示右上角圆形编辑和删除按钮；触摸设备直接显示。删除需要确认。
- 右下角加号打开磨砂玻璃编辑窗。Works 共用一个加号，通过“类型”选择 Project 或 Article，已有 Works 卡片也可切换这两种类型。
- Works 字段为 Title、Link、Description、Image；Connect 为 Title、UserName、Link、Icon、Image。Image 为 `public/assets` 内的相对路径，例如 `folder/photo.png`，不带 `/assets/` 前缀；Connect 的 Image 优先于 Icon。
- Icon 点选器可按英文名称搜索完整的已安装 MUI 图标库，分页加载 SVG。`npm run dev`／`npm run build` 自动运行 `scripts/generate-card-icons.mjs`，在 `.generated/mui-icons.json` 缓存全量图标；不把全库 JS 发给浏览器。standalone 构建包含该缓存，直接调用 `next` 而非 npm 脚本时应先手动运行生成脚本。
- 图片支持 PNG、JPEG、GIF、WebP、AVIF，最大 10MB。上传自动生成无冲突文件名；保存前修改 Image 路径，会移动／重命名**本次上传**的图片（可使用子目录），同名目标返回冲突、不覆盖。修改原有卡片的图片路径仅更换引用，不会移动共享图片。
- 卡片与预览统一通过公开的 `/api/cards/assets/[...path]` 读取图片；数据库仍保存 assets 相对路径。新上传／重命名的文件无需重启生产服务即可显示，不依赖 Next.js 启动时的 public 文件索引。
- 取消编辑、重复上传或删除卡片不会清理图片；未引用文件可在确认无其他用途后人工删除。部署时 `public/assets` 必须可写并持久化，连同 MySQL 一起备份，多实例需共享存储。
- 保存失败保留草稿；会话过期可在另一标签登录后重试。服务器对全部增删改、上传、移动接口独立校验登录和 Origin。

`npm run test:cards:integration` 需配置 `CARDS_TEST_DATABASE_URL`（仅接受本机独立 `auth_validation` 数据库）、`CARDS_TEST_BASE_URL`、`CARDS_TEST_ORIGIN` 和 `CARDS_TEST_ASSET_ROOT`（测试应用的绝对 `public/assets` 路径）。测试应用须连接同一独立数据库并预先应用迁移；测试会创建账号、卡片、图片并清理自己创建的数据，不应指向实际发布服务。

## 编辑器与 Markdown

在未来的客户端管理页面中导入 `MarkdownEditor`，传入 `initialValue` 和 `onChange`。切换文章时使用文章 ID 作为 React `key`。

默认支持快捷键、工具栏和即时渲染；`/blog/[id]/edit` 已接入 Vditor 上传与图片重命名。编辑器上传接口为 `/api/blog/assets/upload`，图片写入 `public/assets/`，并支持在编辑器内 hover 图片后打开重命名面板。封面图输入使用相对 `assets` 的路径（不显示 `/assets/` 前缀），保存时由后端自动补齐；封面图与标签都可留空。

编辑器默认会从 Vditor 版本化 CDN 加载语言包、Markdown 引擎和部分增强资源。生产环境可以按官方文档改为自托管，并同步设置 CDN、主题和图片资源路径。

`gray-matter`（不是 `greymatter`）只解析 front matter，不负责渲染 Markdown、HTML 安全处理或自动持久化。当前解析工具仅面向可信作者内容。

文章以 `content/blog/[id].md` 保存，历史版本会在编辑时移动到 `content/blog/history/[id]/`。front matter 包含 `id`、`title`、`coverImage`、`publishedAt`、`updatedAt`、`tags`、`summary`。

Blog 列表与详情页时间统一显示为 `YYYY-MM-DD HH:mm`（24 小时制，保持 UTC），不显示秒和毫秒；底层 ISO 时间和 HTML `time` 的 `dateTime` 属性不变。列表及推荐卡片摘要为单行，超出省略，完整摘要保留在 title 提示中；详情页不重复显示摘要。详情页文章标题位于左侧，标签排在标题下方，发布／更新时间在右侧上下排列，使用 MUI `caption` 与 `text.disabled` 低亮度颜色；窄屏可换行但时间仍右对齐，长标题自动换行。

封面图栏位填写 `$$` 时，保存会自动采用正文第一张 Markdown 图片（支持内联和引用式图片，忽略代码与注释中的示例）；没有图片则封面留空。元数据保存实际图片地址，而非 `$$`。也支持 HTTP(S) 图片地址。

正文图片使用相对于 `public/assets/` 的路径，例如 `![图片](covers/photo.png)` 会访问 `/assets/covers/photo.png`。Vditor 编辑与文章预览均使用 `/assets/` 作为相对地址基址；上传和图片重命名回写的 Markdown 不包含此前缀。绝对路径与外部图片 URL 保持原样。

## Gallery 文件浏览

`/gallery` 只读展示 `public/assets` 当前目录的全部文件和子目录；`/gallery/a/b` 对应 `public/assets/a/b`。面包屑支持返回上级，搜索仅匹配当前目录名称。支持名称、修改时间、大小、类型排序（文件夹优先），以及列表与方形卡片视图。图片、视频、音频、文本可点击预览，其他格式显示不支持预览的提示；媒体播放能力以浏览器为准。预览仅保留半透明全屏遮罩，文件名置于屏幕顶部，内容层透明且无阴影；无关闭或打开原文件按钮，点击空白处或按 Esc 关闭，媒体控件和文本区域可正常操作。关闭时保留文件名及预览内容至退场动画结束，再清理选中文件，避免空标题背景残留闪烁。无上传、移动、删除等操作，不跟随符号链接；缺失或非法目录返回 404。所有 assets 文件仍为公开资源。

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
