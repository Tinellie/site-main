# 测试页面组件与调用层级

以下层级以业务页面组件为第 1 层，只统计项目自己定义的 React 组件，不计算 Next.js 路由入口、全站 Provider 和 MUI 内置组件。括号说明自行选择的命名原因。

## 共用组件

- `PageTemplate`：main 页面骨架，页面标题和 children 容器，沿用已有命名。
- `PageSection`（带小标题的页面分区，使用常见 Section 命名）：只接收 `title`、`children`，无额外外边距。
- `ResponsiveCardGrid`（响应式卡片矩阵）：使用 MUI Grid，xs/sm/md/lg 分别每行 1/2/3/4 张。
- `CardLinkAction`（可导航的卡片操作区）：复用 MUI CardActionArea 的 hover、focus 和点击涟漪，内链使用 Next Link，HTTP(S) 外链新标签页打开并设置 rel。

## Connect：最多 6 层

1. `ConnectPage`
2. `PageTemplate`
3. `SocialLinkGrid`（社交链接集合的矩阵容器）
4. `ResponsiveCardGrid`
5. `SocialLinkCard`（卡片代表一个社交平台链接）
6. `CardLinkAction`

关键 DOM className：根 `social-link-card`；内部 `slc-action`、`slc-content`、`slc-identity`、`slc-icon`、`slc-text`、`slc-platform`、`slc-id`。

`SocialLinkCard` 属性：`image?`（icons 内相对地址）、`iconName?`、`platform`、`socialId`、`href`。图片优先于图标；不提供图片与名称时使用 Language 图标。名称支持 Email、GitHub、Instagram、Language、LinkedIn、YouTube，通过静态导入避免打包完整图标库。

测试常数 `debugSocialLinks` 位于 ConnectPage 下方，示例账号和地址不是网站主的真实资料。

## Works：最多 7 层

Projects 分支：

1. `WorksPage`
2. `PageTemplate`
3. `PageSection`：Projects
4. `ProjectGrid`（项目作品矩阵）
5. `ResponsiveCardGrid`
6. `ProjectCard`（展示独立项目的作品卡片）
7. `CardLinkAction`

Articles 分支：

1. `WorksPage`
2. `PageTemplate`
3. `PageSection`：Articles
4. `ArticleList`（按顺序排列文章作品的列表）
5. `ArticleCard`（区别于博客 PostCard 的文章作品卡片）
6. `CardLinkAction`

两个卡片共享 `WorkCardProps`：`image`、`title`、`description`、`href`。

项目卡片固定 320px 高，图片 176px 高；宽度根据矩阵响应式变化，内容为空也不坍塌。描述最多三行，超出省略，并通过原生 HTML title 展示全文。文章作品卡片为长条，背景图片 opacity 0.15，描述一行省略。

关键 className：根 `page-section`、`responsive-card-grid`、`project-card`、`article-list`、`article-card`；内部使用 `ps-title`、`rcg-item`、`prc-action/image/content/title/description`、`ac-background/action/content/title/description`（斜杠表示多个后缀，实际 className 使用连字符）。

`debugProjects`、`debugArticles` 均位于 WorksPage 下方。

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

桌面使用主列表 8/12 或 9/12、侧栏 4/12 或 3/12 的 Grid。侧栏使用 sticky，滚动后距视口顶部 16px；高度不超过视口减 32px，内容过多时内部滚动。手机宽度下改为主列表在上、侧栏在下，避免过窄双列。

关键 ID：根 `blog-explorer`、`post-list`、`blog-sidebar`、`post-filter-panel`、`recommended-post-list`；内部 `be-post-column`、`be-sidebar-column`、`pl-empty`、`pfp-title`、`pfp-search`、`pfp-date-from`、`pfp-date-to`、`pfp-tags`、`pfp-tags-label`、`pfp-reset`、`rpl-title`。

关键 className：根 `post-card`；内部及修饰符 `poc-compact`、`poc-action`、`poc-image`、`poc-content`、`poc-title`、`poc-description`、`poc-date`、`pfp-tag-chip`。

详情：第 1 层 `PostDetailPage`（让测试卡片有实际可访问的详情页），第 2 层 `PageTemplate`。目前仅显示封面、日期和摘要，不包含真实正文或数据库读取。未知 ID 返回 404。关键 ID：根 `post-detail`；内部 `pd-image`、`pd-date`、`pd-description`、`pd-debug-note`。

## DOM 标识缩写约定

根组件保留完整名称；内部标识使用组件首字母缩写和完整职责后缀。例如 `slc-icon`、`ac-title`、`pfp-search`。ProjectCard 和 PostCard 会产生相同首字母，因此用 `prc` 与 `poc` 区分。单词前缀使用开首音节，例如 Works 的内部区域为 `wo-sections`。

公共布局内部标识：`ss-page`、`sn-container/nav/left/right/title/home-link`、`pt-title`、`pt-content`。编辑器内部标识：`me-loading`、`me-mount`、`ve-instance`。生成的 MUI className 和 useId 标识保持原样；ARIA 引用同步使用新 ID。

## 图片索引

所有八张临时图片已移入 public/images；proj-icon.png 在 icons，其他在 assets。原空临时文件夹已移除。

- `proj.png` → `/images/assets/proj.png`
- `@images/assets/proj.png` → `/images/assets/proj.png`
- `@images/icons/proj-icon.png` → `/images/icons/proj-icon.png`
- 社交卡片 `image="proj-icon.png"` → `/images/icons/proj-icon.png`

`resolveImagePath` 会拒绝绝对路径、协议地址、空路径片段、`.`、`..`、反斜杠和编码后的越级路径。图标接口只允许 icons 内相对路径。

这只是受限 URL 索引，不是访问权限系统：public 内资源本来就是公开的，不应放凭据或私密文件。将来处理上传文件还需要独立的服务端文件校验与鉴权。