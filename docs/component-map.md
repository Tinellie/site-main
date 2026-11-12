# 测试页面组件与调用层级

以下层级以业务页面组件为第 1 层，只统计项目自己定义的 React 组件，不计算 Next.js 路由入口、全站 Provider 和 MUI 内置组件。括号说明自行选择的命名原因。

## 共用组件

- `PageBackground`：固定全窗口背景，支持 `backgroundImage`、`backgroundColor`、`overlayColor`；通过 MUI Portal 挂在隔离层叠的 `SiteShell` 内，不随正文滚动、不受正文宽度限制、不拦截交互，随所属页面卸载。className 为 `page-background`；与 `PageScreen` 的滚动分页背景独立。

- `SiteShell`：全站外壳与正文滚动恢复，使用 React `ViewTransition` 统一实现 350ms 全屏交叉淡化，包含导航、正文、背景和 footer；不新增包装 DOM，尊重减少动态效果设置。
- `AuthProvider`：维护客户端登录状态，在加载、窗口聚焦和每分钟查询服务端会话；写入权限仍由服务端独立判断。
- `AuthControls`：footer 的登录、账号、退出和认证错误提示。
- `PageScrollbar`：全站主滚动区的悬浮滚动条，支持拖动、轨道点击和键盘操作；DOM ID 为 `ss-scrollbar`，滑块 className 为 `psb-thumb`。不占正文宽度，弹窗打开时随正文滚动一起禁用。`PageTemplate hideScrollbar`（默认 false）通过页面数据属性与外壳 CSS 隐藏它，不禁用滚动，也不影响局部滚动条；Home 已启用。
- `PageTemplate`：main 页面骨架，页面标题和 children 容器；`maxWidth` 支持 MUI 断点、像素数字或 false，可按页面独立设置，默认保留普通页面 lg、分页页面全宽的行为。
- `PageScreen`：固定一窗口高度的分页容器，独立背景、可选 `overlayColor` 背景遮罩、内部溢出滚动；作为 `PageTemplate paginated` 的直接子元素使用。`ignoreNav=false` 时首屏自动扣除实际导航高度，true 时正文与导航重叠。
- `PageSection`（带小标题的页面分区，使用常见 Section 命名）：接收 `title`、`children` 和可选 `actions` 标题操作区，无额外外边距；标题行使用 `ps-heading`，标题独立居中，分类按钮绝对定位在标题右侧，不占文本布局；xs 窄屏时按钮放到标题下方并预留高度。悬浮或键盘聚焦时显示分类操作。
- `ResponsiveCardGrid`（响应式卡片矩阵）：使用 MUI Grid，xs/sm/md/lg 分别每行 1/2/3/4 张。
- `CardLinkAction`（可导航的卡片操作区）：复用 MUI CardActionArea 的 hover、focus 和点击涟漪，内链使用 Next Link，HTTP(S) 外链新标签页打开并设置 rel。
- `CardRevealGroup` / `CardReveal`：以下 Connect、Works、Blog 主列表与推荐列表、Gallery 卡片集合的公共入场层（不在下方原业务层级逐一展开）。组不产生 DOM；每张卡片增加 `card-reveal` 占位层，图片并行加载及解码后按 DOM 顺序以 100ms 间隔淡入、上浮 12px，动画 320ms。失败或 8 秒超时显示警告并继续；隐藏卡片不可聚焦，减少动态效果时立即显示已就绪卡片。Gallery 预览弹窗不参与。
  Works 的 Projects、Articles 分别使用独立组，分部间不等待，分部内保留顺序；数据请求仍共用 `CardCollection`。
  入场前 320ms 卡片采用实心背景，抵达后以 500ms 淡入磨砂玻璃；减少动态效果时直接显示最终效果，不支持 backdrop-filter 时保持实心背景。样式统一位于 theme 的 `MuiCssBaseline`。

## 登录

`/login` 路由调用 `LoginPage`，复用 `PageTemplate`，提供账号、密码、提交状态与失败提示。成功后仅跳转站内路径；不开放注册或网页重设密码。账号通过 `npm run auth:admin` 在服务器终端管理。

关键 ID：`login-form`、`login-username`、`login-password`；footer 为 `site-footer`。

## Home：最多 3 层

1. `HomePage`
2. `PageTemplate`，`paginated=true`、`ignoreNav=true`、`transparentNav=true`
3. `PageScreen`，首屏图片背景与深色遮罩，第二屏透明背景

关键 ID：`home-intro`、`home-more`；可重复分页使用 className `page-screen`。首屏使用 `/images/backgrounds/bg1.JPG` 与 65% 黑色背景遮罩，中央以响应式大字显示 `siteConfig.title`，采用与导航标题相同的衬线字体和字重；第二屏不指定背景色，保持透明。背景图片通过 `cover` 居中裁剪，footer 排在全部分页之后。分页模式自动去掉模板外边距并视觉隐藏 h1，Home 每屏为完整窗口高度，背景延伸至导航后方并铺满两侧。导航背景不透明度为 60%，不改变文字、按钮透明度。

## Connect：最多 7 层

页面使用 `PageBackground` 固定全屏显示 `/images/backgrounds/bg2.JPG`，叠加 60% 黑色遮罩；正文布局与导航设置不变。

1. `ConnectPage`
2. `PageTemplate`
3. `CardCollection`（MySQL 卡片读取及认证编辑入口）
4. `ResponsiveCardGrid`
5. `EditableCard`（悬浮编辑／删除按钮，与链接互为兄弟元素）
6. `SocialLinkCard`（卡片代表一个社交平台链接）
7. `CardLinkAction`

关键 DOM className：根 `social-link-card`；内部 `slc-action`、`slc-content`、`slc-identity`、`slc-icon`、`slc-text`、`slc-platform`、`slc-id`。

`SocialLinkCard` 属性：`image?`（assets 内相对地址）、`iconName?`、`platform`、`socialId`、`href`。图片优先于图标；不提供图片与名称时使用 Language 图标。名称支持全部已安装 MUI 图标，通过 `/api/icons/[name]` 请求生成的 SVG，避免打包完整图标库。

Connect 卡片固定高度为 140px，四周保留 8px 外边距。内容内边距与图文间距为 16px，头像为 56px。磨砂玻璃背景由 theme 的 `MuiCard` 统一提供：paper 底色 45% 不透明度、12px 背景模糊、140% 饱和度和细半透明边框，文字与图标不模糊；不支持 backdrop-filter 时使用 90% 不透明底色。Works、Blog、推荐和 Gallery 卡片自动复用同一定义。

数据来自 `content_cards`。迁移一次性导入原示例，账号和地址不是网站主的真实资料。登录后启用 `EditableCard` 及右下角新增 FAB，通过 `CardEditor` 编辑；`IconPicker` 提供搜索和分页。图片上传与重命名规则见 README。

Connect 顶部空分类直接显示卡片，其后按 `connect_categories.position` 排列各分类 `PageSection`，每区拥有独立 `CardRevealGroup`。`CardEditor` 新增模式默认 `card`，切换 `category` 时只显示 Category Name；卡片模式将 Title / UserName 同行显示，Link 下方 Category 选单从现有分类读取。空选项对应 `categoryId=null`。

`CategoryActions` 仅登录后挂在分类标题旁，提供圆形重命名、删除、上移、下移按钮，悬浮标题附近／键盘聚焦显示，触屏常显。重命名／删除使用 Dialog，删除分类通过外键将卡片归回顶部，首尾移动按钮禁用。`0002_big_ego.sql` 添加分类表和卡片可空外键；分类接口沿用卡片的会话及 Origin 校验，顺序通过事务持久化。

## Works：最多 8 层

Projects 分支：

1. `WorksPage`
2. `PageTemplate`
3. `CardCollection`
4. `PageSection`：Projects
5. `ResponsiveCardGrid`（项目作品矩阵）
6. `EditableCard`
7. `ProjectCard`（展示独立项目的作品卡片）
8. `CardLinkAction`

Articles 分支：

1. `WorksPage`
2. `PageTemplate`
3. `CardCollection`
4. `PageSection`：Articles
5. `Stack.article-list`（按顺序排列文章作品的列表）
6. `EditableCard`
7. `ArticleCard`（区别于博客 PostCard 的文章作品卡片）
8. `CardLinkAction`

两个卡片共享 `WorkCardProps`：`image?`、`title`、`description`、`href`。图片为空时不渲染媒体层。

项目卡片固定 320px 高，图片 176px 高；宽度根据矩阵响应式变化，不随内容变化。标题一行、描述最多三行，超出省略，并通过原生 HTML title 展示全文。文章作品卡片固定 88px 高，宽度随容器变化，背景图片 opacity 0.15，标题与描述均一行省略。

关键 className：根 `page-section`、`responsive-card-grid`、`project-card`、`article-list`、`article-card`；内部使用 `ps-title`、`rcg-item`、`prc-action/image/content/title/description`、`ac-background/action/content/title/description`（斜杠表示多个后缀，实际 className 使用连字符）。

数据来自 `content_cards`，按 kind 分到 Projects／Articles。共用一个新增 FAB，`CardEditor` 类型选项决定新建／编辑的 Works 分组；所有写接口服务端校验认证。

## Blog：最多 7 层

主列表分支：

1. `BlogPage`
2. `PageTemplate`
3. `BlogExplorer`（组合浏览列表和交互筛选状态）
4. `PostList`（博客文章列表）
5. `PostCard`（一篇博客文章的卡片）
6. `CardLinkAction`

侧栏筛选分支：

1. `BlogPage`
2. `PageTemplate`
3. `BlogExplorer`
4. `BlogSidebar`（筛选与推荐的侧栏）
5. `PostFilterPanel`（搜索、日期和标签筛选面板）

`PostFilterPanel` 根节点为 `Card`，与文章卡片共用 theme 磨砂玻璃样式，仅局部设置 16px 内边距；禁止 flex 收缩，避免侧栏高度受限时筛选控件被卡片裁剪。普通 Dialog 和 Popover 也复用相同 theme 样式；Gallery 透明全屏预览除外。

侧栏推荐分支：

1. `BlogPage`
2. `PageTemplate`
3. `BlogExplorer`
4. `BlogSidebar`
5. `RecommendedPostList`（推荐文章列表）
6. `PostCard`，`compact=true`（复用主卡片，避免另写微缩版组件）
7. `CardLinkAction`

`PostCard` 接收 `post`：`id`、`image`、`title`、`description`、`publishedAt`（YYYY-MM-DD）、`tags`。点击进入 `/blog/[id]`。测试数据 `debugPosts` 位于 BlogPage 下方。

筛选规则：搜索标题和描述，不区分大小写；日期为包含两端的范围；选中标签为 OR，不选标签则不限制。搜索、日期、标签三个维度之间使用 AND。推荐列表暂时固定读取测试数据前四篇，不跟随筛选。

桌面使用主列表 8/12 或 9/12、侧栏 4/12 或 3/12 的 Grid。侧栏使用 sticky，滚动后距正文滚动区顶部 16px；高度不超过正文滚动区减 32px，内容过多时内部滚动。手机宽度下改为主列表在上、侧栏在下，避免过窄双列。

关键 ID：根 `blog-explorer`、`post-list`、`blog-sidebar`、`post-filter-panel`、`recommended-post-list`；内部 `be-post-column`、`be-sidebar-column`、`pl-empty`、`pfp-title`、`pfp-search`、`pfp-date-from`、`pfp-date-to`、`pfp-tags`、`pfp-tags-label`、`pfp-reset`、`rpl-title`。

关键 className：根 `post-card`；内部及修饰符 `poc-compact`、`poc-action`、`poc-image`、`poc-content`、`poc-title`、`poc-description`、`poc-date`、`pfp-tag-chip`。

Recommended 中 `compact=true` 的 PostCard 固定高度为 88px；封面区域宽 88px，填满内容高度并通过 `object-fit: cover` 居中裁切，图片比例不影响卡片高度。无封面时保持同样高度。

普通 PostCard 和 Recommended 概述均单行显示，不换行，超出省略，完整概述保留在 title 提示中；详情页不再重复展示概述，文章正文不截断。

列表发布时间、详情页发布时间与更新时间通过 `formatPostTimestamp` 统一显示为 `YYYY-MM-DD HH:mm`，使用 UTC、24 小时制；存储和 `time.dateTime` 仍保留完整 ISO 时间。

详情：第 1 层 `PostDetailPage`，第 2 层 `PageTemplate`。展示封面、标题、标签、时间与 Markdown 正文，不重复展示摘要；文章标题靠左，标签排在标题下方，发布／更新时间在右侧上下排列，采用 MUI `caption` 和 `text.disabled`，窄屏换行后仍右对齐，长标题自动换行。模板保留视觉隐藏的 h1，正文标题为 h2。未知 ID 返回 404。关键 ID：根 `post-detail`；内部 `pd-image`、`pd-title`、`pd-date`、`pd-updated-date`。

## DOM 标识缩写约定

根组件保留完整名称；内部标识使用组件首字母缩写和完整职责后缀。例如 `slc-icon`、`ac-title`、`pfp-search`。ProjectCard 和 PostCard 会产生相同首字母，因此用 `prc` 与 `poc` 区分。单词前缀使用开首音节，例如 Works 的内部区域为 `wo-sections`。

公共布局内部标识：`ss-page`、`sn-container/nav/left/right/title/home-link`、`pt-title`、`pt-content`。编辑器内部标识：`me-loading`、`me-mount`、`ve-instance`。生成的 MUI className 和 useId 标识保持原样；ARIA 引用同步使用新 ID。

## 图片索引

所有八张临时图片已迁移到 public/assets；`proj-icon.png` 仍在 `public/images/icons`。

- `proj.png` → `/assets/proj.png`
- `@images/assets/proj.png` → `/assets/proj.png`
- `@images/icons/proj-icon.png` → `/images/icons/proj-icon.png`
- 社交卡片 `image="proj-icon.png"` → `/images/icons/proj-icon.png`

`resolveImagePath` 会拒绝绝对路径、协议地址、空路径片段、`.`、`..`、反斜杠和编码后的越级路径。其 `directory="icons"` 模式只允许 icons 内相对路径；MUI SVG 接口则仅接受已生成目录中的图标名称。

这只是受限 URL 索引，不是访问权限系统：public 内资源本来就是公开的，不应放凭据或私密文件。将来处理上传文件还需要独立的服务端文件校验与鉴权。