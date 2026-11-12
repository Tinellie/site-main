# 部署到 suzutsuki.com

命令在 **Linux 服务器**执行，不是在 Windows PowerShell 执行。除域名外，服务器 IP、MySQL 密码、Docker 子网等必须使用服务器实际值。

架构：现有 gateway 项目的 Caddy → `site-main-web:3000` → 单实例 Next.js；通过现有 `vultr_default` 网络复用 **`vultr-db-1` MySQL 容器**，不新增 MySQL 或 Caddy 容器。本仓库的 Compose 不发布任何宿主机端口。app 加入 gateway 和数据库网络；tools 只加入数据库网络，MySQL 不加入 gateway。

## 1. 准备两个仓库的修改

- 先提交并上传 site-main：Dockerfile、Compose、环境变量模板、部署脚本及相关代码。
- gateway 新增 `suzutsuki.com` → `site-main-web:3000` 的路由也需要提交上传，但建议等第 7 步应用健康后再推送：现有 gateway Actions 会在 main/master 推送后自动上线，过早推送会在应用尚未启动时让根域名暂时返回网关错误。
- 不提交真实环境变量、数据库备份、文章或上传图片。

服务器需要 Docker Engine 和 Docker Compose v2；域名 A 记录指向服务器。若有 AAAA，必须同样正确。开放 TCP 80/443；已有网关继续使用原证书卷，不启动第二个网关。

## 2. 拉取代码并填写环境变量

假定项目位于 `/opt/site-main`；现有 gateway Actions 使用 `/opt/site-gateway`，本文沿用该网关路径。若服务器实际位置不同，先核对，不要另建一份网关。

首次：

```bash
git clone git@github.com:Tinellie/site-main.git /opt/site-main
cd /opt/site-main
test -f .env.production || cp .env.production.example .env.production
chmod 600 .env.production
nano .env.production
```

仓库已存在时，确认没有未保存修改，再拉取更新，不重复 clone 或覆盖环境文件。

```dotenv
AUTH_ORIGIN=https://suzutsuki.com
DATABASE_URL=mysql://site_main:URL编码后的密码@vultr-db-1:3306/site_main
```

- `AUTH_ORIGIN` 没有尾部 `/`，不是 HTTP 或带 `www` 的其他来源。
- `vultr-db-1` 是现有数据库容器在 `vultr_default` 中的 DNS 名称，不使用 `host.docker.internal`、`localhost` 或固定容器 IP。现有部署若改变容器名称，需同步更新该值。
- URL 中密码的 `@ : / # ? %` 等保留字符需要百分号编码；MySQL 实际密码仍是原密码。
- 不把真实密码发到聊天、写进 Dockerfile 或构建参数。验证 Compose 时用 `config --quiet`，避免输出完整秘密。

## 3. 检查共享网络并构建

```bash
docker network inspect gateway
docker network inspect vultr_default
docker inspect vultr-db-1 --format '{{json .NetworkSettings.Networks}}'
```

仅当网络不存在，且确认现有网关确实使用该名称时，执行：

```bash
docker network create gateway
```

`vultr_default` 必须是现有数据库所属网络，不要创建同名空网络来掩盖数据库部署缺失。数据库容器应处于运行／健康状态。然后：

```bash
cd /opt/site-main
docker compose --profile tools config --quiet
docker compose --profile tools build app tools
```

构建使用 Linux Node.js 24，不复制 Windows 依赖、环境文件、文章和上传目录。`tools` 是手动调用的一次性工具镜像，不是常驻服务。安装依赖需要访问 npm；Vditor 在浏览器中仍需其 CDN 资源。

## 4. 核对现有 MySQL 的数据库和授权

查询数据库网络的**实际**网段：

```bash
docker network inspect vultr_default --format '{{json .IPAM.Config}}'
docker exec -it vultr-db-1 mysql -uroot -p
```

第二条命令交互输入现有 MySQL 管理员密码，不将密码拼进命令。若使用其他管理员账号，替换 `root`；不修改现有数据库容器或其他站点的账号。

在该 MySQL 实例中：

1. 为本站创建独立数据库和应用用户，不使用 root 或其他站点的库。
2. 允许该用户从 `vultr_default` 实际 Docker IPv4 子网连接，而不只允许 `localhost`。已确认当前网段为 `172.18.0.0/16`，不是 gateway 的 `172.19.0.0/16`。
3. 不新增宿主机 MySQL 服务、不发布数据库 3306 端口、不执行 `ufw allow 3306`；连接走容器共享内网。

例如，**仅当实际子网为 `172.18.0.0/16` 时**，可以在 MySQL 管理终端执行以下 SQL。替换密码；其他子网必须同步替换主机范围：

```sql
CREATE DATABASE site_main CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'site_main'@'172.18.0.0/255.255.0.0'
  IDENTIFIED BY 'REPLACE_WITH_NEW_PASSWORD';
GRANT ALL PRIVILEGES ON site_main.*
  TO 'site_main'@'172.18.0.0/255.255.0.0';
```

权限只限本站数据库，用于应用和一次性迁移，不授予全局权限。本站库已存在时不重新创建或清空，只核对用户和授权。

若旧版配置出现 `ETIMEDOUT`，更新 Compose 网络配置，并将服务器已有 `.env.production` 中的主机改为 `vultr-db-1`；更新模板不会自动修改已有环境文件。无需重建镜像，新的 tools 容器会使用更新后的网络和环境。不要用临时 `docker network connect` 代替持久化 Compose 配置。

执行只读连接检查，成功后再迁移：

```bash
docker compose --profile tools run --rm --no-deps tools node -e '
const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection(process.env.DATABASE_URL);
  try { await c.query("SELECT 1"); console.log("MySQL OK"); }
  finally { await c.end(); }
})().catch(e => { console.error(e.code || e.name); process.exitCode = 1; });
'
```

## 5. 导入现有数据并准备权限

**GitHub 中的代码不是完整网站备份。** [忽略规则](../.gitignore) 会忽略新产生的文章和上传图片；已经跟踪的图片仍可能在 Git 中，但不能因此省略数据迁移。镜像除默认图标外不会包含这些运行时数据。

```bash
cd /opt/site-main
mkdir -p data/blog data/assets backups
```

迁移本机网站时：

- 暂停原站编辑，完整导出原 MySQL 数据库，包含迁移记录。
- 将本机 `content/blog/` 下的**全部内容**上传至服务器 `data/blog/`，包括 `history/`。
- 将本机 `public/assets/` 下的**全部内容**上传至服务器 `data/assets/`，保留文件名和目录结构。
- 通过现有 MySQL 容器的管理账号，将备份导入本站目标库；核实 SQL 中的 `USE` 等语句不会写入其他站点。
- 已有线上数据时先备份，不用空目录或开发数据库直接覆盖。

即使部分图片已经在 Git 中，也要放入 `data/assets` 才会被运行中的应用看到。可先把服务器仓库里已跟踪的图片补入空缺位置，再合并本机未跟踪的上传文件（不会覆盖已有同名文件）：

```bash
cp -an public/assets/. data/assets/
```

导入完成后：

```bash
docker compose --profile tools run --rm --no-deps --user 0:0 tools \
  node scripts/prepare-storage.mjs
```

命令只处理挂载的文章和上传目录：创建历史目录、补入缺少的默认图标，不覆盖现有同名文件；归属改为应用 UID/GID 1000，目录 750、文件 640，拒绝符号链接。不要使用 `chmod -R 777`。重新导入文件后，在 app 停止时再次执行。

## 6. 迁移数据库；必要时创建管理员

```bash
docker compose --profile tools run --rm --no-deps tools npm run db:migrate
```

迁移成功后再启动应用。服务器运行**已有迁移**，不使用 `db:generate` 代替，不修改历史迁移文件。

全新网站尚无账号时：

```bash
docker compose --profile tools run --rm --no-deps tools npm run auth:admin -- admin
```

保留交互终端，按提示输入两遍密码。已导入原账号时跳过；有意重设密码并撤销会话时才追加 `--reset`。

## 7. 启动并检查应用

```bash
docker compose up -d --wait --wait-timeout 120 app
docker compose ps
docker compose logs --tail=100 app
docker compose exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(async r=>{console.log(r.status,await r.text());if(!r.ok)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"
```

`/api/health` 成功时返回 `200 {"status":"ok"}`，实际检查数据库连接、文章／历史／图片／缓存目录权限和图标文件；失败返回 503，并在日志记录原因。它不替代表结构迁移。失败时不要继续网关切换。

常见原因：

- `ENOTFOUND`：数据库容器名错误、容器未运行，或 app/tools 未加入 `vultr_default`。
- `ECONNREFUSED`：数据库尚未就绪，或端口有误。
- 连接超时：目标地址错误或容器网络被阻断；旧配置连接 `host.docker.internal:3306` 时按第 4 步修正。
- `Access denied`：密码、URL 编码、数据库名或用户来源网段不正确。
- 文件权限错误：导入后未执行目录准备，或绑定了错误目录。

不暴露公网 3000/3306，不使用 `network_mode: host`，不将数据库加入 gateway。数据库网络是共享可信网络；本站只使用自己的库和专用账号。

## 8. 更新并重载 gateway

现有 gateway Actions 监听 main/master 推送，会在 `/opt/site-gateway` 自动拉取、校验配置并重建 Caddy。应用健康后，提交并推送 gateway 改动，等待该工作流成功；成功时可以跳过下列手动步骤，直接进入第 9 步。

若自动部署未启用或需要手动应用，确保 DNS 正确、gateway 仓库已上传本次路由，再执行：

```bash
cd /opt/site-gateway
git pull --ff-only
docker compose run --rm --no-deps caddy \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

该一次性校验容器读取当前宿主机文件，避免 git 替换文件后，原容器仍挂着旧 inode 而误校验旧配置。校验成功后，仅重新创建 Caddy：

```bash
docker compose up -d --force-recreate caddy
docker compose logs --tail=100 caddy
```

这会短暂重启网关，但不删除证书卷或重启其他应用容器。以后若确认是原文件内写入、绑定内容已更新，可以使用 gateway 的校验及 reload 流程避免重启。

新增路由：

```caddyfile
suzutsuki.com {
    encode gzip zstd
    reverse_proxy site-main-web:3000
}
```

不新增 `www` 路由、不改动其他站点。包括 `/assets/*` 的所有路径均转发给 Next.js，不能另加静态目录绕过应用。Cloudflare 若启用代理，使用 Full (strict)，不要使用 Flexible。

## 9. 验收

```bash
curl -fsS https://suzutsuki.com/api/health
curl -I https://suzutsuki.com
```

检查原有文章、卡片、分类、图片，然后测试登录／退出、保存文章、Gallery 上传／移动／删除与引用警告。新建一张测试图片，重启 app 后确认仍存在，再删除测试图片。

Blog 列表已改为请求时读取文章，镜像构建时没有文章也不会生成永久空列表；文章和图片不进入镜像。保持**一个 app 实例**，不要配置多副本或 PM2 cluster。

## 10. 更新、备份与回退

每次更新前先备份，数据库和文件必须成套保存。以下命令使用现有 MySQL 容器的管理账号，交互输入密码，不将密码拼进命令：

```bash
cd /opt/site-main
docker compose stop app
umask 077
STAMP=$(date +%Y%m%d-%H%M%S)
docker exec -it vultr-db-1 sh -c "umask 077; exec mysqldump -uroot -p --single-transaction --routines --triggers --result-file=/tmp/site-main-$STAMP.sql site_main"
docker cp "vultr-db-1:/tmp/site-main-$STAMP.sql" "backups/database-$STAMP.sql"
sudo tar -czf - data/blog data/assets > "backups/files-$STAMP.tar.gz"
chmod 600 "backups/database-$STAMP.sql" "backups/files-$STAMP.tar.gz"
docker exec vultr-db-1 rm "/tmp/site-main-$STAMP.sql"
```

逐条执行。任一备份失败就停止更新，不能把空 SQL 当作备份；保留失败日志，按需重新启动旧应用。将成功的备份加密复制到其他机器，定期验证恢复。

先为旧镜像留标签，再更新：

```bash
docker image tag site-main:local "site-main:rollback-$STAMP"
git pull --ff-only
docker compose --profile tools build app tools
docker compose --profile tools run --rm --no-deps tools npm run db:migrate
docker compose up -d --wait --wait-timeout 120 app
```

仅当前一步成功时继续；失败查看日志，不直接部署新版本。不要执行 `docker compose down -v`、清空 data 或重置数据库。

仅代码变更且数据库结构仍兼容时，可重新标记旧镜像为 `site-main:local`，再用 `docker compose up -d --no-build --force-recreate app` 恢复旧程序。数据库迁移不自动反向执行；不兼容变更需要停机恢复匹配的数据库与文件备份，不能只回退镜像。

缓存卷可以重建，但 `data/blog`、`data/assets`、MySQL 和环境变量必须另行持久化及备份。`gateway` 和 MySQL 是已有共享服务，本项目不会自动管理它们的生命周期。

## 11. GitHub Actions 自动部署

[工作流](../.github/workflows/deploy.yml) 监听 `main`、`master` 推送，也可在 Actions → Deploy Site Main → Run workflow 手动执行；手动运行只允许这两个分支。它只负责本站，不部署 gateway 或 Comiket。

### 首次启用前

当前服务器已完成首次部署，但 `/opt/site-main` 的代码及 `.git` 属于 root。用服务器 root 或具备 sudo 权限的用户执行以下一次性准备：

```bash
sudo find /opt/site-main \
  -path /opt/site-main/data -prune -o \
  -path /opt/site-main/backups -prune -o \
  -exec chown deploy:deploy {} +
sudo chmod 600 /opt/site-main/.env.production
sudo install -d -o deploy -g deploy -m 700 /opt/site-main/backups
sudo -u deploy -H git -C /opt/site-main status --short
sudo -u deploy -H git -C /opt/site-main ls-remote origin HEAD
```

此操作保留 `data/` 内应用 UID/GID 1000 的所有权，不要对整个项目无差别递归 chown。确认路径是当前部署目录，没有符号链接。最后一条验证 **deploy 用户自己的 SSH 凭据**能拉取仓库；只有 root 能拉取不够。不要关闭 Git 安全检查或使用 `safe.directory '*'`。

`deploy` 必须能使用 Docker（当前已加入 docker 组）；Docker 权限等同于高权限服务器访问，只向可信部署密钥授予。工作流本身不执行 sudo、不修改文件所有权。

在 **Tinellie/site-main → Settings → Secrets and variables → Actions** 配置：

| Secret | 内容 |
| --- | --- |
| `VULTR_SSH_KEY` | 可登录服务器 `deploy` 用户的 SSH 私钥 |
| `VULTR_SSH_PASSPHRASE` | 该私钥的口令；无口令密钥可不设置 |
| `VULTR_HOST_FINGERPRINT` | 从可信渠道核实的服务器 SSH 主机公钥 SHA256 指纹 |

与 gateway 使用相同命名，但仓库级 Secrets 不会自动共享。不要把秘密写入工作流或 Git。工作流目前固定使用 `139.180.203.201:22`、`deploy` 和 `/opt/site-main`。

首次自动更新前确认：

- 服务器仓库没有未提交或未忽略的临时文件；工作流不会覆盖或删除它们。
- `.env.production`、数据目录、已有 app、`gateway` / `vultr_default` 网络已存在。
- 网站连接 `vultr-db-1` 的 `site_main` 库；工作流会检查地址和库名，避免备份错误的库。
- 数据库容器现有 `MYSQL_ROOT_PASSWORD` 可用于执行备份；工作流在容器内使用它，不打印密码、不增加 GitHub 数据库密码 Secret。
- 磁盘有足够空间容纳构建、新旧镜像和完整备份。服务器约 2GB 内存，构建可能较慢，工作流给远程部署 35 分钟，不并发执行本站部署。

### 每次推送后的流程

1. 在 GitHub runner 安装依赖，执行 Lint、测试，并校验 Compose。
2. 通过 SSH 检查权限、工作区、网络和现有应用，获取服务器文件锁。
3. 为正在运行的旧镜像保留带时间戳的回退标签，将代码快进到本次提交。
4. 构建 app 和 tools；构建失败时旧容器保持运行。
5. 短暂停止本站 app，备份 `site_main` 及文章、历史、图片；不停止共享 MySQL 和其他网站。
6. 执行已提交的数据库迁移，启动新版 app，等待容器健康并验证公网 HTTPS 健康端点。

首次提交此工作流会立即触发，所以先准备权限和 Secrets，再推送。可在 Actions 中查看结果；不需要再手动执行一次部署。手动更新也应避免与工作流同时操作。

### 备份与失败处理

每次备份保存在 `backups/deploy-时间戳-提交前缀/`，目录和文件仅部署用户可访问：

- `database.sql`：本站数据库，不含其他项目的库。
- `files.tar.gz`：归档中包含 `blog/` 和 `assets/`，对应服务器 `data/blog/`、`data/assets/`。
- `previous-commit.txt`、`previous-image.txt`：更新前的提交及镜像标签。

工作流不会自动删除备份、清理旧镜像或上传数据库到 GitHub。定期加密转移备份到其他机器并核验恢复，监控剩余磁盘。

构建前／构建中失败不会主动停止旧 app；**停止 app 后，备份或迁移失败会让网站保持停止**，并输出诊断日志，不自动启动可能与部分迁移不兼容的旧版本。启动或 HTTPS 检查失败也会令 Actions 失败，不代表数据库已回退。

先查看失败阶段，再确认数据库是否变化及备份是否完整。只有确认结构兼容时才恢复旧镜像；不兼容时使用配套数据库和文件备份人工恢复。不要为修复失败执行 `down -v`、清空数据或强制重置 Git。
