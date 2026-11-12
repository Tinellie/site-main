# 个人博客

基于 Next.js、React、MUI 和 MySQL，包含 Home、Connect、Works、Blog、Gallery。游客可浏览，管理员可管理文章、卡片和图片。

## 本地启动

推荐 Node.js 24，并准备 MySQL。

```bash
npm ci
```

复制 [.env.example](.env.example) 为 `.env.local`，填写 `DATABASE_URL`，将 `AUTH_ORIGIN` 设为 `http://localhost:3000`。

```bash
npm run db:migrate
npm run auth:admin -- admin
npm run dev
```

创建管理员只需首次执行。访问 <http://localhost:3000>，通过 `/login` 登录。已有数据库在迁移前先备份。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run lint` | 代码检查 |
| `npm run typecheck` | 类型检查 |
| `npm run build` | 生产构建 |
| `npm start` | 启动生产构建 |
| `npm run auth:admin -- admin --reset` | 重设管理员密码并撤销旧会话 |

测试命令见 [package.json](package.json)；集成测试不要连接生产环境。

## 数据与部署

- 文章及历史版本：`content/blog/`。
- 图片及附件：`public/assets/`，公开可读。
- 账号、卡片、分类及图片引用：MySQL。
- 数据库、文章和图片需一同备份；保持单个网站运行实例。
- 不提交真实环境变量、密码或备份。

## 自动部署

[Deploy Site Main](.github/workflows/deploy.yml) 在推送到 `main` / `master` 或手动触发后，检查代码并通过 SSH 更新 `/opt/site-main`。
构建成功后短暂停站，备份本站数据库及文章、图片，再迁移数据库、启动应用并检查 HTTPS。不会重启共享 MySQL 或 Gateway。

首次启用前，在 **site-main 仓库**配置 `VULTR_SSH_KEY`、`VULTR_SSH_PASSPHRASE`、`VULTR_HOST_FINGERPRINT` 三个 Actions Secrets，
并按[部署指南的自动部署准备](docs/deployment.md#11-github-actions-自动部署)处理 `deploy` 用户权限；gateway 仓库的 Secrets 不会自动共享。
备份保留在服务器 `backups/`，不会自动清理或上传到 GitHub；备份或迁移失败时需人工恢复，不会自动回退数据库。

## 图片与卡片管理

- Gallery、卡片和文章上传支持 PNG、JPEG、GIF、WebP、AVIF、SVG，单张不超过 10MB。
- SVG 以图片显示，不嵌入可执行 HTML；拒绝无效 XML、DOCTYPE、脚本、事件处理器及外部链接引用，不加载外部资源。
- Gallery 编辑面板可上传同一大类的文件进行替换，单个不超过 10MB；图片、视频、音频、文本及其他文件分别匹配。允许同类跨格式替换，原路径和名称不变，卡片及文章引用无需修改。
- 选择替换文件后点击“确认替换”才会提交；修改 Path 后需先保存再替换。服务按实际内容返回媒体格式，Gallery 图片直接读取最新原文件，避免优化缓存保留旧内容。已打开的其他页面需刷新以显示替换结果。
- Gallery 文件夹（不含 `..`）可重命名；重命名及剪切会递归更新文章正文、封面和卡片图片引用。复制不会修改源引用。
- “批量选取”后点击项目进行选择，通过右下角三点菜单剪切、复制、删除。剪切或复制后退出选取并进入目标目录，再粘贴；剪贴板在当前浏览器标签页内保留。
- 文件冲突统一选择跳过、覆盖或编号；文件夹冲突单独选择，还支持递归合并。“覆盖”整体替换同名文件夹，不保留目标内容；“合并”保留无冲突内容，并继续按统一策略处理子项。取消不会执行操作。
- 删除和覆盖导致已有引用失效时需再次确认；普通操作失败会尝试恢复文件及文章引用。请保持单实例写入并备份，进程被强制终止时需人工检查 `.gallery-operation-*` 临时备份。单次最多选择 200 项、处理 10000 个节点及 64 层目录，不支持符号链接。
- 卡片新图片先暂存在浏览器内存，修改 Image 路径时保持预览，保存卡片时才写入 assets；取消或刷新会丢弃暂存图片。保存失败可重试，不会移动其他卡片使用的图片。卡片和文章上传保留原名，只在重名时添加 `(1)`、`(2)` 编号。
- 登录后，Connect 和 Works 卡片的编辑按钮旁显示上移、下移按钮，每次在当前分组内移动一格，顺序保存至数据库。
- Connect 分类各自排序，Works 的 Projects、Articles 分别排序；首尾按钮自动禁用。
- 更新到此版本需先执行 `npm run db:migrate`，迁移会按原卡片 ID 初始化顺序，保留原显示顺序。Docker 部署使用 tools 服务执行迁移，见部署指南。

部署步骤见 [部署指南](docs/deployment.md)，代码入口见 [组件索引](docs/component-map.md)。
