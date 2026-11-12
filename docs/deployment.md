# 部署

以下命令在 Linux 服务器执行，每步成功后再继续。

架构：现有 Caddy → 网站容器 → 宿主机 MySQL。不新建数据库或网关容器。

## 1. 准备

- 安装 Docker Engine 和 Compose v2，域名 `suzutsuki.com` 指向服务器，开放 TCP 80/443。
- 先推送 site-main；等网站健康后再推送 gateway，后者会自动部署。
- MySQL 使用独立数据库和账号，允许实际 Docker 子网连接，并监听容器可达的宿主机地址；不要开放公网 3306。

```bash
git clone git@github.com:Tinellie/site-main.git /opt/site-main
cd /opt/site-main
test -f .env.production || cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

已有仓库不要重复克隆。填写真实账号、密码和库名：

```dotenv
AUTH_ORIGIN=https://suzutsuki.com
DATABASE_URL=mysql://site_main:YOUR_PASSWORD@host.docker.internal:3306/site_main
```

密码中的特殊字符需 URL 编码；容器连接宿主机不能使用 `localhost`。不要提交真实环境文件。

## 2. 网络与构建

```bash
docker network inspect gateway
```

仅当共享网络不存在时执行 `docker network create gateway`。查询实际子网供 MySQL 授权使用：

```bash
docker network inspect gateway --format '{{json .IPAM.Config}}'
docker compose --profile tools config --quiet
docker compose --profile tools build app tools
```

## 3. 数据与初始化

```bash
mkdir -p data/blog data/assets backups
cp -an public/assets/. data/assets/
```

迁移原站时，先备份，再导入原 MySQL 数据库（包含迁移记录），并复制：

- 原 `content/blog/` 全部内容（含 `history/`）→ `data/blog/`。
- 原 `public/assets/` 全部内容 → `data/assets/`。

不要用开发数据覆盖已有线上数据。导入后执行：

```bash
docker compose --profile tools run --rm --no-deps --user 0:0 tools \
  node scripts/prepare-storage.mjs
docker compose --profile tools run --rm --no-deps tools npm run db:migrate
```

尚无管理员时执行，已有账号则跳过：

```bash
docker compose --profile tools run --rm --no-deps tools npm run auth:admin -- admin
```

## 4. 启动

```bash
docker compose up -d --wait --wait-timeout 120 app
docker compose ps
docker compose logs --tail=100 app
```

健康检查失败时先查看日志，检查数据库连接和目录权限，不继续切换网关。

## 5. 接入网关

推送 gateway 改动，等待现有 Actions 成功。它会在 `/opt/site-gateway` 更新 Caddy；无需重复手动部署。

```bash
curl -fsS https://suzutsuki.com/api/health
```

应返回 `{"status":"ok"}`。再检查登录、文章、卡片及图片上传，重启网站后确认文件仍存在。

## 6. 后续更新

暂停写入，将 MySQL、`data/blog`、`data/assets` 成套备份到其他机器，并安全保存环境配置，再执行：

```bash
cd /opt/site-main
docker compose stop app
git pull --ff-only
docker compose --profile tools build app tools
docker compose --profile tools run --rm --no-deps tools npm run db:migrate
docker compose up -d --wait --wait-timeout 120 app
```

保持单个 app 实例。不要删除 `data`、证书卷或执行 `docker compose down -v`。数据库不兼容时，回退需要匹配的程序、数据库和文件备份。
