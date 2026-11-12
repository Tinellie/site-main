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

部署步骤见 [部署指南](docs/deployment.md)，代码入口见 [组件索引](docs/component-map.md)。
