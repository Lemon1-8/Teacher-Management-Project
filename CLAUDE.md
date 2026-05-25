# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

高校教师培训管理系统，基于 Vue 3 + TypeScript + Vite 前端和 Node.js + Express 5 + Sequelize + MySQL 后端的全栈应用。支持三种角色：admin（管理员）、trainer（讲师）、teacher（教师/学员）。

后端使用 CommonJS（`require`），前端使用 ES 模块（`import`）。

## 环境配置

- 后端配置位于 `server/.env`（数据库连接、JWT 密钥、Redis、MinIO、AI 等）
- 默认管理员账号: `admin` / `admin123`（由 `server/seeders/init.seeder.js` 自动创建）
- AI 配置通过 `AI_API_KEY` / `AI_BASE_URL` / `AI_MODEL` 三个环境变量控制，默认使用 DeepSeek，可替换为任何 OpenAI 兼容接口
- 开发时 Vite 自动将 `/api` 请求代理到 `http://127.0.0.1:3000`（见 `vite.config.ts`），前端无需单独设置 `VITE_API_URL`
- **Docker Compose**（`server/docker-compose.yml`）可一键启动 MySQL 8.0、Redis 7.0、MinIO 三个本地服务，需先手动创建 external volume：`docker volume create server_mysql_data server_redis_data server_minio_data`

## 开发命令

### 前端 (项目根目录)
- `npm run dev` — 启动开发服务器 (localhost:5173)
- `npm run build` — TypeScript 类型检查 + Vite 生产构建
- `npm run preview` — 预览构建产物

### 后端 (server/ 目录)
- `npm start` — 启动生产服务器 (localhost:3000)
- `npm run dev` — nodemon 热重载开发

### 数据库
- `server/database.sql` — 数据库初始化脚本
- 启动时自动执行 `sequelize.sync({ alter: false })`，当前跳过表结构变更（详见 `server/app.js` 注释）

## 架构和数据流

### 前端

```
src/
├── api/          # Axios 请求封装 (auth, exam, training, user 等)
├── stores/       # Pinia 状态管理 (user.ts — token 和角色信息)
├── router/       # Vue Router 路由配置 + 全局前置守卫 (角色权限校验)
├── layouts/      # MainLayout.vue — 主导航布局 (侧边栏 + 顶部通知)
├── views/        # 页面组件
│   ├── dashboard/    # 仪表盘 (ECharts 数据可视化)
│   ├── exam/         # 考试管理 (题库、在线答题、成绩)
│   ├── training/     # 培训管理 (计划、详情、报名审核)
│   ├── user/         # 登录、个人信息、我的报名、我的学时
│   ├── message/      # 消息中心 (即时通讯)
│   └── system/      # 系统设置 (用户管理, admin 专属)
├── utils/        # request.ts — Axios 实例 (拦截器统一处理 token 和错误)
└── components/   # ParentView.vue — 路由嵌套占位组件
```

**前端约定**:
- 所有 Vue 组件使用 `<script setup lang="ts">` 语法
- UI 框架为 Element Plus，图标使用 `@element-plus/icons-vue`
- 富文本编辑器使用 wangEditor（培训计划详情等场景）
- 日期处理使用 dayjs，拖拽排序使用 vuedraggable（题目管理）

关键数据流: 路由守卫 (`router/index.ts`) → 按角色过滤菜单 → 页面通过 `src/api/` 调用后端。

**API 调用与响应格式**: 后端统一返回 `{ code, message, data }` JSON（见 `server/utils/response.js`）。前端 Axios 实例（`src/utils/request.ts`）在响应拦截器中检查 `code` 是否为 0/200/201，否则弹出错误提示；401 时自动清除 token 并跳转登录页。

**路由约定**（`src/router/index.ts`）:
- `meta.roles: string[]` — 允许访问的角色列表（路由守卫在 `beforeEach` 中校验）
- `meta.hidden: true` — 侧边栏不显示该菜单项
- `meta.guest: true` — 仅未登录可访问（如登录页）
- `meta.icon` / `meta.title` — 侧边栏图标和页面标题

**状态管理**（`src/stores/user.ts`）: token 持久化在 `localStorage`；刷新页面后路由守卫调用 `GET /api/auth/me` 恢复用户信息，再执行角色权限检查。

### 后端

```
server/
├── app.js               # Express 入口 (安全中间件、限流、路由挂载)
├── config/              # 配置 (app, db, auth)
├── routes/              # 路由定义 (routes/index.js 统一挂载)
├── middleware/          # 中间件
│   ├── auth.middleware.js   — JWT 验证 + Redis token 校验 (单点登录)
│   ├── role.middleware.js   — 角色权限检查 (isAdmin / isTrainerOrAdmin)
│   ├── upload.middleware.js — Multer 文件上传
│   └── validator.middleware.js — 请求参数校验
├── controllers/         # 业务逻辑层
├── models/              # Sequelize 模型 + 关联关系定义 (models/index.js)
├── services/            # 复杂业务服务层 (exam, training, user)
├── seeders/             # 初始化数据种子 (init.seeder.js 创建默认角色和管理员)
└── utils/               # 工具 (helper, logger, redis, minio, response)
```

**API 路由前缀**: 所有路由通过 `server/routes/index.js` 统一注册，前缀为 `/api/<模块>`:

| 前缀 | 文件 | 说明 |
|------|------|------|
| `/api/auth` | `auth.routes.js` | 登录、注册、token 刷新 |
| `/api/users` | `user.routes.js` | 用户 CRUD、个人信息 |
| `/api/trainings` | `training.routes.js` | 培训计划管理 |
| `/api/exams` | `exam.routes.js` | 考试与题库（含 AI 出题 `POST /:id/generate-questions`） |
| `/api/enrollments` | `enrollment.routes.js` | 报名与审核 |
| `/api/statistics` | `statistic.routes.js` | 数据统计 |
| `/api/training-types` | `training_type.routes.js` | 培训类型 |
| `/api/files` | `file.routes.js` | 文件上传 (MinIO) |
| `/api/notifications` | `notification.routes.js` | 系统通知 |
| `/api/messages` | `message.routes.js` | 即时通讯 |

**认证流程**: 前端将 token 存入 `localStorage`，请求时通过 `Authorization: Bearer <token>` 头发送。后端 `auth.middleware.js` 解析 JWT 后从 Redis 校验 `auth:token:{userId}` 键的一致性——若不一致则视为已在其他地方登录，返回 401。

### AI 智能出题

`server/utils/ai.js` 封装 AI 调用，基于 OpenAI 兼容 SDK，默认指向 DeepSeek，可通过 `.env` 切换模型。

**素材来源**（`POST /api/exams/:id/generate-questions`）：仅支持**上传文件**（xlsx/docx/pdf），后端用 `mammoth`/`pdf-parse`/`xlsx` 解析为文本后送 AI

**关键参数**：
- 前端超时 120s（AI 调用耗时较长，默认 10s 不够）
- `max_tokens: 8192`，输入截断 20000 字
- 路由受 `isTrainerOrAdmin` 保护

**出题流程**：生成 → 逐题预览审核（可丢弃）→ 采用 → 追加到题目列表 → 与现有题目一起"保存所有修改"持久化。AI 生成的题目不会自动保存。

### 数据库模型关系

全部 12 个 Sequelize 模型在 `server/models/index.js` 中定义关联:

| 关联 | 类型 | 外键 |
|------|------|------|
| Role → User | 1:N | `role_id` |
| TrainingType → Training | 1:N | `type_id` |
| User → Training (创建者) | 1:N | `created_by` |
| User → Enrollment | 1:N | `user_id` |
| Training → Enrollment | 1:N | `training_id` |
| Training → Exam | 1:N | `training_id` |
| Exam → Question | 1:N | `exam_id` |
| User → ExamResult | 1:N | `user_id` |
| Exam → ExamResult | 1:N | `exam_id` |
| User → LearningRecord | 1:N | `user_id` |
| Training → LearningRecord | 1:N | `training_id` |
| User → Notification | 1:N | `user_id` |
| User → Message (发送) | 1:N | `sender_id` |
| User → Message (接收) | 1:N | `receiver_id` |
| User → SystemLog | 1:N | (按需) |

全局配置: `define.underscored: true`（数据库字段蛇形）、`define.timestamps: true`（自动管理 `created_at` / `updated_at`）。

### 关键设计决策

- **认证**: JWT（`jsonwebtoken`）+ Redis（`redis` v5）双重校验。登录时生成 token 存入 Redis `auth:token:{userId}` 键，后续请求校验 token 匹配，新登录覆盖旧 token 实现单点登录。Token 支持刷新。
- **权限**: RBAC，三个角色硬编码 — `admin`、`teacher`、`trainer`。后端 `role.middleware.js` 提供 `isAdmin` 和 `isTrainerOrAdmin` 两个中间件。前端 `router/index.ts` 的 `beforeEach` 守卫校验 `meta.roles`。
- **密码加密**: `bcryptjs`，种子数据中默认密码哈希强度为 8 轮。
- **文件存储**: MinIO 对象存储（`minio` v8），bucket 名 `teacher-training`。启动时自动创建 bucket。MinIO 不可用时文件上传功能受影响，但不阻塞应用启动。
- **框架**: Express 5，自动捕获异步路由处理器中的 rejected promise，无需手动 `try-catch` 包裹每个路由。
- **ORM**: Sequelize 6，全局 `underscored: true`（数据库蛇形 ↔ 模型驼峰）。连接池 max 5 / min 0。启动时 `alter: false`（不自动修改表结构），新增字段或索引需手动编写 SQL 迁移。
- **AI**: OpenAI 兼容 SDK（默认 DeepSeek），模型/URL/Key 均通过 `.env` 配置。`server/utils/ai.js` 封装调用，`max_tokens: 8192`，输入截断 20000 字。AI 出题路由 `POST /api/exams/:id/generate-questions`，前端超时 120s。支持从培训内容、上传文件（xlsx/docx/pdf）或手动输入文本三种方式生成题目。
- **安全**: `helmet`（CSP 放宽图片/脚本策略以兼容富文本和外部图片）、`cors`、`hpp`（防参数污染）、`express-rate-limit`（15 分钟 1000 请求）。
- **日志**: `winston`（后端）、`morgan`（HTTP 请求日志）。捕获 `uncaughtException` 和 `unhandledRejection` 防止进程退出。