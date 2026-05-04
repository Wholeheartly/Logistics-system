# 部署后系统维护指南

## 1. 文档概述与目的

本文档为物流管理系统（Logistics System）部署后的日常维护操作指南，涵盖前端、后端及数据库三大模块的修改流程、操作步骤、注意事项和最佳实践。

**适用对象**：开发工程师、运维工程师、系统管理员

**系统架构概览**：

```
用户请求 → Nginx (frontend:80) → React SPA 静态资源
                                → /api/* → FastAPI (backend:8000) → PostgreSQL (db:5432)
                                → /uploads/* → FastAPI 静态文件服务
```

**部署环境信息**：

| 组件 | 技术栈 | 容器名 | 端口 |
|------|--------|--------|------|
| 前端 | React + Vite + Nginx | logistics-system-frontend-1 | 80 |
| 后端 | FastAPI + Gunicorn + Uvicorn | logistics-system-backend-1 | 8000 |
| 数据库 | PostgreSQL 16 Alpine | logistics-system-db-1 | 5432 |

**服务器信息**：

| 项目 | 值 |
|------|-----|
| 云平台 | 阿里云 ECS |
| 公网IP | 47.114.80.214 |
| 项目目录 | /opt/logistics-system |
| 环境变量文件 | /opt/logistics-system/deploy/.env.production |

---

## 2. 前置条件与准备工作

### 2.1 权限要求

| 操作 | 所需权限 | 获取方式 |
|------|---------|---------|
| SSH登录服务器 | root 或 sudo 权限 | 联系系统管理员 |
| Docker操作 | docker group 或 root | `usermod -aG docker $USER` |
| 数据库操作 | logistics 用户（读写） | 通过 `docker compose exec db psql` |
| Nginx配置修改 | root 权限 | 通过 `docker compose exec frontend` |

### 2.2 环境配置

```bash
# SSH连接服务器
ssh root@47.114.80.214

# 进入项目目录
cd /opt/logistics-system

# 确认Docker服务状态
docker compose ps

# 确认环境变量
cat deploy/.env.production
```

### 2.3 工具清单

| 工具 | 用途 | 安装验证 |
|------|------|---------|
| Docker Compose | 容器编排 | `docker compose version` |
| psql | 数据库操作 | 通过容器内执行 |
| curl | API测试 | `curl --version` |
| git | 版本控制 | `git --version` |
| SSH | 远程连接 | 本地终端 |

### 2.4 关键文件路径

| 文件 | 服务器路径 | 说明 |
|------|-----------|------|
| docker-compose.yml | /opt/logistics-system/docker-compose.yml | 容器编排配置 |
| 环境变量 | /opt/logistics-system/deploy/.env.production | 生产环境变量 |
| Nginx配置 | /opt/logistics-system/deploy/nginx/default.conf | 反向代理配置 |
| 备份脚本 | /opt/logistics-system/deploy/scripts/backup.sh | 数据库备份 |
| 健康检查脚本 | /opt/logistics-system/deploy/scripts/health-check.sh | 系统监控 |
| 后端日志 | /opt/logistics-system/deploy/logs/backend/ | Gunicorn访问/错误日志 |
| Nginx日志 | /opt/logistics-system/deploy/logs/nginx/ | 访问/错误日志 |
| 数据库备份 | /opt/logistics-system/deploy/backup/ | pg_dump备份文件 |

---

## 3. 前端文件修改流程

### 3.1 代码修改步骤

```bash
# 1. 在本地开发环境修改代码
cd frontend

# 2. 本地开发验证
npm run dev

# 3. 确认生产环境变量
cat .env.production
# VITE_API_BASE=http://47.114.80.214

# 4. 本地构建测试
npm run build
```

**注意事项**：
- 修改API地址时，编辑 `frontend/.env.production` 中的 `VITE_API_BASE`
- 修改后必须重新构建才能生效（Vite在构建时注入环境变量）
- 不要修改 `frontend/.env.development` 中的配置用于生产环境

### 3.2 构建与打包方法

**方式一：服务器上重新构建（推荐）**

```bash
# SSH到服务器
ssh root@47.114.80.214
cd /opt/logistics-system

# 仅重建前端容器
docker compose --env-file deploy/.env.production up -d --build frontend

# 查看构建日志
docker compose logs -f frontend
```

**方式二：本地构建后上传**

```bash
# 本地构建
cd frontend
npm run build

# 上传dist到服务器
scp -r dist/* root@47.114.80.214:/opt/logistics-system/frontend/dist/

# 在服务器上重建容器
ssh root@47.114.80.214
cd /opt/logistics-system
docker compose --env-file deploy/.env.production up -d --build frontend
```

### 3.3 部署更新策略

```bash
# 零停机更新（前端容器独立重建，后端不受影响）
cd /opt/logistics-system
docker compose --env-file deploy/.env.production up -d --build frontend

# 验证部署
curl -sI http://localhost/ | head -5
curl -sf http://localhost/api/health
```

**更新检查清单**：
- [ ] 构建成功，无TypeScript错误
- [ ] 容器状态为 `healthy`
- [ ] 首页可正常访问
- [ ] API代理正常（`/api/health` 返回200）
- [ ] 静态资源加载正常（检查浏览器控制台无404）

### 3.4 版本控制要求

```bash
# 修改前创建分支
git checkout -b feature/your-feature

# 修改完成后提交
git add .
git commit -m "feat: 描述修改内容"

# 合并到主分支
git checkout main
git merge feature/your-feature

# 打标签记录版本
git tag -a v1.x.x -m "Release v1.x.x"
git push origin main --tags
```

### 3.5 回滚机制

```bash
# 方式一：Git回滚
git revert HEAD
docker compose --env-file deploy/.env.production up -d --build frontend

# 方式二：回退到指定版本
git checkout v1.0.0
docker compose --env-file deploy/.env.production up -d --build frontend

# 方式三：使用之前的Docker镜像（如果未清理）
docker images | grep logistics
docker tag <previous-image-id> logistics-system-frontend:rollback
# 修改 docker-compose.yml 使用 rollback 镜像
docker compose up -d frontend
```

---

## 4. 后端文件修改流程

### 4.1 代码变更管理

```bash
# 1. 本地修改代码
cd backend

# 2. 本地测试
python -m uvicorn app.api.routes:app --reload

# 3. 运行测试（如有）
pytest

# 4. 提交代码
git add .
git commit -m "feat: 描述修改内容"
```

### 4.2 服务重启/热更新方法

**完整重建（代码变更后）**：

```bash
cd /opt/logistics-system
docker compose --env-file deploy/.env.production up -d --build backend

# 查看启动日志
docker compose logs -f backend --tail 50
```

**仅重启（配置变更，无代码变更）**：

```bash
cd /opt/logistics-system
docker compose restart backend

# 验证
docker compose ps backend
curl -sf http://localhost/api/health
```

**滚动更新（最小化停机）**：

```bash
# 1. 构建新镜像
docker compose --env-file deploy/.env.production build backend

# 2. 停止旧容器并启动新容器
docker compose --env-file deploy/.env.production up -d --no-deps backend

# 3. 验证健康状态
sleep 10
curl -sf http://localhost/api/health
```

### 4.3 依赖更新处理

```bash
# 1. 本地更新依赖
cd backend
pip install new-package==x.y.z
pip freeze > requirements.txt

# 2. 提交更新后的 requirements.txt
git add requirements.txt
git commit -m "deps: update new-package to x.y.z"

# 3. 服务器上重新构建（Dockerfile会自动安装新依赖）
cd /opt/logistics-system
docker compose --env-file deploy/.env.production up -d --build backend
```

**注意事项**：
- 后端使用阿里云PyPI镜像（`mirrors.aliyun.com/pypi/simple/`）
- 新增依赖必须更新 `requirements.txt`
- 生产镜像额外安装 `psycopg2-binary` 和 `gunicorn`

### 4.4 配置文件修改规范

**环境变量修改**：

```bash
# 编辑环境变量文件
vi /opt/logistics-system/deploy/.env.production

# 修改后重启backend使配置生效
cd /opt/logistics-system
docker compose --env-file deploy/.env.production up -d backend
```

**关键环境变量说明**：

| 变量 | 当前值 | 修改场景 |
|------|--------|---------|
| SECRET_KEY | LogisticsSecretKey2024... | 安全轮换时修改 |
| ACCESS_TOKEN_EXPIRE_MINUTES | 30 | 调整Token过期时间 |
| CORS_ALLOWED_ORIGINS | 多个域名 | 新增前端域名时修改 |
| AVATAR_BASE_URL | http://47.114.80.214/uploads/avatars | 更换域名时修改 |
| POSTGRES_PASSWORD | LogisticsDB2024Secure! | 数据库密码轮换 |

**Nginx配置修改**：

```bash
# 编辑Nginx配置
vi /opt/logistics-system/deploy/nginx/default.conf

# 重载Nginx（无需重启容器）
docker compose exec frontend nginx -s reload

# 验证配置语法
docker compose exec frontend nginx -t
```

### 4.5 日志记录要求

```bash
# 查看后端实时日志
docker compose logs -f backend --tail 100

# 查看Gunicorn访问日志
tail -f /opt/logistics-system/deploy/logs/backend/access.log

# 查看Gunicorn错误日志
tail -f /opt/logistics-system/deploy/logs/backend/error.log

# 查看Nginx访问日志
tail -f /opt/logistics-system/deploy/logs/nginx/access.log

# 查看Nginx错误日志
tail -f /opt/logistics-system/deploy/logs/nginx/error.log

# 搜索特定错误
docker compose logs backend 2>&1 | grep -i "error\|exception\|traceback"
```

**日志级别规范**：
- `ERROR`：需要立即处理的错误
- `WARNING`：潜在问题，需关注
- `INFO`：关键业务操作（登录、数据修改等）
- `DEBUG`：仅开发环境使用

---

## 5. 数据库修改流程

### 5.1 数据备份策略

**自动备份**（已配置cron，每日凌晨2点）：

```bash
# 手动执行备份
/opt/logistics-system/deploy/scripts/backup.sh

# 查看备份文件
ls -lh /opt/logistics-system/deploy/backup/

# 备份保留策略：30天自动清理
```

**手动备份**：

```bash
# 全库备份
cd /opt/logistics-system
docker compose exec -T db pg_dump -U logistics logistics | gzip > /tmp/manual_backup_$(date +%Y%m%d_%H%M%S).sql.gz

# 单表备份
docker compose exec -T db pg_dump -U logistics -t users logistics > /tmp/users_backup_$(date +%Y%m%d).sql

# 仅备份数据（不含schema）
docker compose exec -T db pg_dump -U logistics --data-only logistics > /tmp/data_only_backup.sql
```

**恢复备份**：

```bash
# 解压并恢复
gunzip -c /opt/logistics-system/deploy/backup/db_20260504_020000.sql.gz | \
  docker compose exec -T db psql -U logistics logistics

# 恢复单表
docker compose exec -T db psql -U logistics logistics < /tmp/users_backup_20260504.sql
```

### 5.2 SQL脚本执行规范

**执行前检查清单**：
- [ ] 已创建数据库备份
- [ ] SQL脚本已在测试环境验证
- [ ] 脚本包含事务控制（BEGIN/COMMIT/ROLLBACK）
- [ ] 评估对生产服务的影响

**执行方式**：

```bash
# 方式一：交互式执行（推荐用于小变更）
docker compose exec db psql -U logistics -d logistics

# 方式二：执行SQL文件
docker compose exec -T db psql -U logistics -d logistics < /path/to/script.sql

# 方式三：执行单条SQL
docker compose exec db psql -U logistics -d logistics -c "SELECT count(*) FROM users;"

# 方式四：遇错即停（推荐用于迁移脚本）
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U logistics -d logistics < /path/to/migration.sql
```

**脚本模板**：

```sql
-- 迁移脚本: 001_add_new_column.sql
-- 作者: xxx
-- 日期: 2026-05-04
-- 描述: 为users表添加phone_number字段

BEGIN;

-- 添加列
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);

-- 验证
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        RAISE EXCEPTION 'Column phone_number was not added';
    END IF;
END $$;

COMMIT;
```

### 5.3 Schema变更流程

```bash
# 1. 创建迁移脚本
# 命名规范: NN_description.sql (NN为序号)
# 例: 002_add_user_phone.sql

# 2. 在测试环境验证
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U logistics -d logistics < 002_add_user_phone.sql

# 3. 备份生产数据库
/opt/logistics-system/deploy/scripts/backup.sh

# 4. 在生产环境执行
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U logistics -d logistics < 002_add_user_phone.sql

# 5. 验证变更
docker compose exec db psql -U logistics -d logistics -c "\d users"

# 6. 更新ORM模型
# 编辑 backend/app/models/models.py
# 重建后端容器
docker compose --env-file deploy/.env.production up -d --build backend
```

**常见Schema变更操作**：

```sql
-- 添加列
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_column VARCHAR(100);

-- 删除列（谨慎操作）
ALTER TABLE users DROP COLUMN IF EXISTS deprecated_column;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 添加约束
ALTER TABLE users ADD CONSTRAINT uk_users_phone UNIQUE (phone);

-- 修改列类型
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(20);
```

### 5.4 数据迁移方法

**小批量数据迁移**（<1000行）：

```sql
BEGIN;

-- 直接INSERT
INSERT INTO target_table (col1, col2)
SELECT col1, col2 FROM source_table WHERE condition;

-- 验证
SELECT count(*) FROM target_table WHERE condition;

COMMIT;
```

**大批量数据迁移**（>=1000行）：

```bash
# 1. 生成CSV导出
docker compose exec -T db psql -U logistics -d logistics -c \
  "COPY (SELECT * FROM source_table WHERE condition) TO STDOUT WITH CSV HEADER" \
  > /tmp/export.csv

# 2. 导入到目标表
docker compose exec -T db psql -U logistics -d logistics -c \
  "COPY target_table FROM STDIN WITH CSV HEADER" < /tmp/export.csv
```

**SQLite到PostgreSQL迁移**（如需从本地同步数据）：

```bash
# 使用项目提供的迁移工具
cd /opt/logistics-system

# 1. 在本地生成迁移SQL（含布尔字段转换）
python deploy/generate_migration.py

# 2. 上传SQL文件到服务器
scp deploy/migration_data/*.sql root@47.114.80.214:/opt/logistics-system/deploy/migration_data/

# 3. 复制到容器内并执行
docker cp deploy/migration_data/table_name.sql $(docker ps -q -f name=db):/tmp/
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U logistics -d logistics -f /tmp/table_name.sql
```

**关键兼容性注意**：
- SQLite的 `0/1` 必须转换为PostgreSQL的 `false/true`
- SQLite的 `AUTOINCREMENT` 对应PostgreSQL的 `SERIAL`
- SQLite的 `TEXT` 类型在PostgreSQL中需区分 `TEXT`/`VARCHAR`/`BOOLEAN`

### 5.5 事务处理与一致性保证

```sql
-- 关键数据修改必须使用事务
BEGIN;

-- 操作1
UPDATE users SET status = 'active' WHERE id = 5;

-- 操作2（依赖操作1）
INSERT INTO user_action_logs (action, operator_id, target_user_id, details)
VALUES ('enable', 1, 5, '用户被启用');

-- 验证（在事务内）
SELECT status FROM users WHERE id = 5;

-- 确认无误后提交
COMMIT;

-- 如有问题，立即回滚
-- ROLLBACK;
```

**数据一致性检查命令**：

```sql
-- 检查外键完整性
SELECT 'base_rates→carriers' AS fk, count(*) AS orphans
FROM base_rates WHERE carrier_id NOT IN (SELECT id FROM carriers)
UNION ALL
SELECT 'login_attempts→users', count(*)
FROM login_attempts WHERE username NOT IN (SELECT username FROM users);

-- 检查序列对齐
SELECT sequencename, last_value
FROM pg_sequences WHERE schemaname = 'public';

-- 检查dead tuples
SELECT relname, n_dead_tup, n_live_tup
FROM pg_stat_user_tables WHERE n_dead_tup > 100;

-- 维护操作
VACUUM ANALYZE;                    -- 轻量级，不锁表
REINDEX DATABASE logistics;        -- 重建所有索引
VACUUM FULL table_name;            -- 全表清理（锁表，低峰期执行）
```

---

## 6. 跨模块修改协同流程

### 6.1 全栈更新流程

当修改涉及前端、后端和数据库多个模块时：

```bash
# 1. 备份数据库
/opt/logistics-system/deploy/scripts/backup.sh

# 2. 执行数据库迁移
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U logistics -d logistics < migration.sql

# 3. 更新后端代码和ORM模型
docker compose --env-file deploy/.env.production up -d --build backend

# 4. 等待后端健康检查通过
sleep 15
curl -sf http://localhost/api/health

# 5. 更新前端代码
docker compose --env-file deploy/.env.production up -d --build frontend

# 6. 全面验证
curl -sf http://localhost/api/health
curl -sI http://localhost/
```

### 6.2 修改顺序原则

| 场景 | 推荐顺序 | 原因 |
|------|---------|------|
| 新增字段（向后兼容） | DB → Backend → Frontend | 后端先适配新字段 |
| 删除字段（破坏性变更） | Frontend → Backend → DB | 前端先移除引用 |
| 修改API接口 | Backend → Frontend | 后端先部署新版本 |
| 修改环境变量 | .env → Backend → 验证 | 配置先行 |

### 6.3 API接口变更协同

```
1. 后端新增接口 → 先部署后端 → 前端对接
2. 后端修改接口 → 同时部署前后端（或使用版本化API）
3. 后端删除接口 → 先更新前端移除调用 → 再删除后端接口
```

---

## 7. 安全注意事项

### 7.1 敏感信息管理

| 项目 | 规范 |
|------|------|
| 数据库密码 | 仅存储在 `.env.production`，不提交到Git |
| SECRET_KEY | 至少32字符，定期轮换 |
| API Token | 使用环境变量注入，不硬编码 |
| SSH密钥 | 使用密钥认证，禁用密码登录（推荐） |

### 7.2 数据库安全

```bash
# 数据库端口仅绑定本地
# docker-compose.yml: "127.0.0.1:5432:5432"

# 远程访问需SSH隧道
ssh -L 5432:127.0.0.1:5432 root@47.114.80.214
# 然后通过 localhost:5432 连接

# 定期轮换数据库密码
vi /opt/logistics-system/deploy/.env.production
# 修改 POSTGRES_PASSWORD
docker compose down && docker compose --env-file deploy/.env.production up -d
```

### 7.3 CORS配置

```bash
# 仅允许必要的域名
CORS_ALLOWED_ORIGINS=https://your-domain.com,http://47.114.80.214

# 不要使用通配符
# 错误: CORS_ALLOWED_ORIGINS=*
```

### 7.4 文件上传安全

```nginx
# Nginx已配置上传大小限制
client_max_body_size 50m;

# 上传文件存储在Docker Volume中
# uploads:/app/uploads
```

---

## 8. 常见问题解决方案

### 8.1 容器相关

| 问题 | 诊断命令 | 解决方案 |
|------|---------|---------|
| 容器无法启动 | `docker compose logs <service>` | 检查日志定位错误 |
| 容器频繁重启 | `docker compose ps` 查看状态 | 检查健康检查配置和依赖服务 |
| 端口冲突 | `ss -tlnp \| grep :80` | 修改 `NGINX_PORT` 环境变量 |
| 磁盘空间不足 | `df -h` | 清理Docker镜像：`docker image prune -af` |
| 内存不足 | `free -h` | 重启服务或扩容 |

### 8.2 前端相关

| 问题 | 诊断命令 | 解决方案 |
|------|---------|---------|
| 白屏 | 浏览器控制台查看错误 | 检查构建是否成功、路由配置 |
| API 404 | `curl http://localhost/api/health` | 检查Nginx代理配置 |
| 静态资源404 | `docker compose exec frontend ls /usr/share/nginx/html` | 重新构建前端 |
| 缓存问题 | 清除浏览器缓存 | 修改Nginx缓存策略或强制刷新 |

### 8.3 后端相关

| 问题 | 诊断命令 | 解决方案 |
|------|---------|---------|
| API超时 | `docker compose logs backend --tail 50` | 检查数据库连接和查询性能 |
| 数据库连接失败 | `docker compose exec db pg_isready` | 检查db容器状态和连接字符串 |
| CORS错误 | 浏览器控制台查看 | 更新 `CORS_ALLOWED_ORIGINS` |
| 依赖缺失 | 构建日志查看 | 更新 `requirements.txt` 并重建 |

### 8.4 数据库相关

| 问题 | 诊断命令 | 解决方案 |
|------|---------|---------|
| 连接被拒绝 | `docker compose exec db pg_isready -U logistics` | 重启db容器 |
| 查询缓慢 | `SELECT * FROM pg_stat_activity WHERE state='active'` | 检查慢查询，添加索引 |
| Dead tuples过多 | `SELECT relname, n_dead_tup FROM pg_stat_user_tables` | 执行 `VACUUM ANALYZE` |
| 序列不同步 | `SELECT sequencename, last_value FROM pg_sequences` | `SELECT setval('seq_name', (SELECT max(id) FROM table))` |
| 锁等待 | `SELECT * FROM pg_locks WHERE NOT granted` | 检查长事务，必要时终止 |

### 8.5 紧急恢复流程

```bash
# 服务完全不可用时的恢复步骤

# 1. 检查所有容器状态
docker compose ps

# 2. 重启所有服务
docker compose --env-file deploy/.env.production down
docker compose --env-file deploy/.env.production up -d

# 3. 如果数据库损坏，从备份恢复
gunzip -c /opt/logistics-system/deploy/backup/db_latest.sql.gz | \
  docker compose exec -T db psql -U logistics logistics

# 4. 如果容器无法启动，重建
docker compose --env-file deploy/.env.production up -d --build

# 5. 最终验证
curl -sf http://localhost/api/health
```

---

## 9. 优化建议与最佳实践

### 9.1 性能优化

**数据库**：
```sql
-- 定期分析查询性能
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;

-- 为常用查询添加索引
CREATE INDEX CONCURRENTLY idx_name ON table(column);

-- 定期维护（低峰期执行）
VACUUM ANALYZE;
```

**后端**：
- Gunicorn已配置4个worker进程，可根据CPU核心数调整
- 超时时间设置为120秒，适配大数据量操作
- 使用连接池管理数据库连接

**前端**：
- Nginx已配置静态资源7天缓存
- SPA路由通过 `try_files` 正确处理
- 启用gzip压缩（Nginx默认开启）

### 9.2 运维最佳实践

1. **变更窗口**：生产变更尽量在业务低峰期（凌晨2:00-5:00）执行
2. **变更审批**：涉及数据库schema变更需经过Code Review
3. **灰度发布**：重大更新先在测试环境验证，再发布到生产
4. **监控告警**：健康检查每5分钟执行一次，异常时发送告警
5. **日志审计**：关键操作记录到 `user_action_logs` 表
6. **定期备份验证**：每月至少一次验证备份可恢复性

### 9.3 数据库维护计划

| 频率 | 操作 | 命令 |
|------|------|------|
| 每日 | 自动备份 | cron已配置 |
| 每周 | 轻量维护 | `VACUUM ANALYZE` |
| 每月 | 索引重建 | `REINDEX DATABASE logistics` |
| 每月 | 备份验证 | 恢复到临时库验证 |
| 每季度 | 密码轮换 | 更新 `.env.production` 中的密码 |

### 9.4 容量规划

| 指标 | 当前值 | 建议阈值 | 扩容方案 |
|------|--------|---------|---------|
| 数据库大小 | ~27 MB | >1 GB | 升级存储或迁移到RDS |
| 磁盘使用 | 监控中 | >80% | 扩容云盘 |
| 内存使用 | 监控中 | 可用<500MB | 升级ECS规格 |
| Docker镜像 | 定期清理 | >5 GB | `docker image prune` |

---

## 10. 附录

### 10.1 常用Docker命令

```bash
# 服务管理
docker compose ps                                    # 查看容器状态
docker compose logs -f <service> --tail 100          # 查看实时日志
docker compose restart <service>                     # 重启服务
docker compose --env-file deploy/.env.production up -d --build <service>  # 重建服务
docker compose down                                  # 停止所有服务
docker compose exec <service> bash                   # 进入容器

# 镜像管理
docker images                                        # 列出镜像
docker image prune -af --filter "until=168h"         # 清理旧镜像
docker system df                                     # 查看磁盘使用

# 数据卷管理
docker volume ls                                     # 列出数据卷
docker volume inspect logistics-system_pgdata         # 查看数据卷详情
```

### 10.2 常用数据库命令

```bash
# 连接数据库
docker compose exec db psql -U logistics -d logistics

# 常用查询
\dt                                                  # 列出所有表
\d table_name                                        # 查看表结构
\di                                                  # 列出所有索引
SELECT pg_size_pretty(pg_database_size('logistics')); # 数据库大小
SELECT count(*) FROM table_name;                     # 表行数

# 导出/导入
docker compose exec -T db pg_dump -U logistics logistics | gzip > backup.sql.gz
gunzip -c backup.sql.gz | docker compose exec -T db psql -U logistics logistics
```

### 10.3 常用Nginx命令

```bash
# 配置检查
docker compose exec frontend nginx -t

# 重载配置（无需重启）
docker compose exec frontend nginx -s reload

# 查看配置
docker compose exec frontend cat /etc/nginx/conf.d/default.conf
```

### 10.4 健康检查端点

| 端点 | 方法 | 预期响应 |
|------|------|---------|
| http://47.114.80.214/health | GET | 200 OK |
| http://47.114.80.214/api/health | GET | `{"status":"ok"}` |
| http://47.114.80.214/docs | GET | FastAPI Swagger UI |

### 10.5 数据库表结构速查

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| users | 用户账户 | id, username, role, status |
| carriers | 物流渠道 | id, name, dim_factor, fuel_rate |
| base_rates | 基础运费 | id, carrier_id, weight_lb, zone, rate |
| surcharge_configs | 附加费配置 | id, carrier_id, surcharge_type, zone_group, amount |
| zone_mappings | 邮编分区 | id, warehouse, zip_prefix, zone |
| products | 产品数据 | id, sku, name, warehouse |
| config_items | 系统配置 | id, config_key, category, current_value |
| reconciliation_batches | 对账批次 | id, batch_no, status |
| reconciliation_details | 对账明细 | id, batch_id, has_diff, diff_types |
| login_attempts | 登录日志 | id, username, success, created_at |

### 10.6 环境变量完整参考

```bash
# deploy/.env.production 完整配置
POSTGRES_DB=logistics
POSTGRES_USER=logistics
POSTGRES_PASSWORD=<your-secure-password>

SECRET_KEY=<your-secret-key-at-least-32-chars>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

CORS_ALLOWED_ORIGINS=https://your-domain.com,http://your-ip
AVATAR_BASE_URL=http://your-ip/uploads/avatars

NGINX_PORT=80
```

### 10.7 联系信息

| 角色 | 职责 | 联系方式 |
|------|------|---------|
| 系统管理员 | 服务器、网络、权限 | 按实际填写 |
| 后端开发 | API、数据库、业务逻辑 | 按实际填写 |
| 前端开发 | 界面、交互、构建部署 | 按实际填写 |
| 运维工程师 | 监控、备份、故障处理 | 按实际填写 |
