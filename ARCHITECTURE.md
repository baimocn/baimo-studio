# Agnes 图片/视频生成平台 — 架构文档

> 生成日期：2026-06-06
> 技术栈：Next.js (React) + Python FastAPI + Agnes AI 系列模型

---

## 1. 项目概述

基于 **Agnes AI（Sapiens AI）** 模型系列构建的图片与视频生成 Web 平台。用户可通过自然语言描述生成/编辑图片和视频，平台内置 LLM Prompt 优化引擎提升生成质量。

### 核心价值

- 一站式图片 + 视频生成，无需切换多个平台
- LLM 驱动的智能 Prompt 优化，降低使用门槛
- 基于 Agnes 全系列模型，API 统一、调用链路清晰

---

## 2. 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端框架 | Next.js (React) | App Router, TypeScript |
| 数据获取 | SWR | Next.js 官方推荐，支持轮询 |
| 样式 | Tailwind CSS | 实用优先的样式方案 |
| 后端框架 | Python FastAPI | 高性能异步 API |
| 数据库 | SQLite / PostgreSQL | 用户与元数据存储 |
| 认证 | JWT (PyJWT) | 无状态 Token 认证 |
| AI 模型 | Agnes 系列 | 图片 + 视频 + LLM |

---

## 3. 项目结构

```
agnes-platform/
│
├── frontend/                          # Next.js 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx             # 全局布局（含 AuthGuard）
│   │   │   ├── page.tsx               # 首页：功能选择面板
│   │   │   ├── login/page.tsx         # 登录页
│   │   │   ├── register/page.tsx      # 注册页
│   │   │   ├── image/
│   │   │   │   ├── page.tsx           # 文生图
│   │   │   │   └── edit/page.tsx      # 图生图编辑
│   │   │   ├── video/
│   │   │   │   ├── page.tsx           # 文生视频
│   │   │   │   └── image-to-video/    # 图生视频
│   │   │   │       └── page.tsx
│   │   │   └── history/page.tsx       # 历史记录
│   │   ├── components/
│   │   │   ├── AuthGuard.tsx          # 登录态守卫
│   │   │   ├── PromptInput.tsx        # Prompt 输入（含 LLM 优化按钮）
│   │   │   ├── ImageResult.tsx        # 图片结果展示
│   │   │   ├── VideoResult.tsx        # 视频结果展示
│   │   │   ├── ImageUploader.tsx      # 图片上传组件
│   │   │   ├── SizeSelector.tsx       # 尺寸/时长选择
│   │   │   ├── TaskStatus.tsx         # 异步任务进度条
│   │   │   └── Navbar.tsx             # 导航栏
│   │   ├── lib/
│   │   │   ├── api.ts                 # 后端 API 调用（SWR fetcher）
│   │   │   ├── auth.ts                # Token 管理（localStorage）
│   │   │   └── utils.ts               # 通用工具函数
│   │   └── types/
│   │       └── index.ts               # TypeScript 类型定义
│   ├── middleware.ts                   # 路由保护（Token 校验重定向）
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                           # FastAPI 后端
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                    # FastAPI 应用入口
│   │   ├── database.py                # 数据库连接（SQLAlchemy + SQLite）
│   │   │
│   │   ├── api/                       # API 路由层
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # /api/auth/* 注册与登录
│   │   │   ├── image.py               # /api/image/* 图片生成
│   │   │   ├── video.py               # /api/video/* 视频生成
│   │   │   └── prompt.py              # /api/prompt/* Prompt优化
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM 模型
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # User 表
│   │   │   └── generation.py          # Generation 表（元数据）
│   │   │
│   │   ├── schemas/                   # Pydantic 请求/响应模型
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # 登录/注册 schema
│   │   │   ├── image.py               # 图片请求/响应 schema
│   │   │   ├── video.py               # 视频请求/响应 schema
│   │   │   └── prompt.py              # Prompt 请求/响应 schema
│   │   │
│   │   ├── services/                  # 业务逻辑层
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # 用户注册、登录、密码哈希
│   │   │   ├── agnes_image.py         # Agnes Image API 调用
│   │   │   ├── agnes_video.py         # Agnes Video API 调用 + 轮询
│   │   │   └── agnes_llm.py           # Agnes 2.0 Flash LLM 调用
│   │   │
│   │   └── core/                      # 核心配置
│   │       ├── __init__.py
│   │       ├── config.py              # 环境变量配置
│   │       ├── security.py            # JWT 签发/验证 + 密码工具
│   │       ├── exceptions.py          # 自定义异常
│   │       └── dependencies.py        # FastAPI 依赖注入
│   │
│   ├── tests/                         # 测试
│   │   ├── conftest.py
│   │   ├── test_image.py
│   │   ├── test_video.py
│   │   └── test_auth.py
│   │
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic/                       # 数据库迁移（可选）
│
├── .env.example                       # 环境变量模板
├── .gitignore
├── docker-compose.yml                 # 一键部署
└── README.md
```

---

## 4. 数据模型

### 4.1 User（用户）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | 自增主键 |
| email | String, Unique | 邮箱，登录凭证 |
| password_hash | String | bcrypt 哈希密码 |
| created_at | DateTime | 注册时间 |
| updated_at | DateTime | 更新时间 |

### 4.2 Generation（生成记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer, PK | 自增主键 |
| user_id | Integer, FK | 关联用户 |
| model | String | 使用的模型名 |
| prompt | String | 用户输入的 prompt |
| type | Enum(image/video) | 生成类型 |
| result_url | String? | 结果 URL |
| status | Enum | pending/completed/failed |
| created_at | DateTime | 创建时间 |

---

## 5. API 路由设计

### 5.1 认证

| 方法 | 路由 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/register` | 注册 | 否 |
| POST | `/api/auth/login` | 登录，返回 JWT | 否 |

### 5.2 图片

| 方法 | 路由 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/image/generate` | 文生图 | 是 |
| POST | `/api/image/edit` | 图生图 | 是 |
| POST | `/api/image/compose` | 多图合成 | 是 |

### 5.3 视频

| 方法 | 路由 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/video/create` | 创建视频任务 | 是 |
| GET | `/api/video/status/{video_id}` | 查询视频状态 | 是 |

### 5.4 Prompt

| 方法 | 路由 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/prompt/optimize` | LLM 优化 Prompt | 是 |
| POST | `/api/prompt/analyze-image` | LLM 分析图片 | 是 |

---

## 6. 业务服务层

### 6.1 `services/agnes_image.py` — 图片生成服务

```python
class AgnesImageService:
    MODEL_2_1_FLASH = "agnes-image-2.1-flash"
    MODEL_2_0_FLASH = "agnes-image-2.0-flash"
    BASE_URL = "https://apihub.agnes-ai.com/v1/images/generations"

    async def generate(prompt: str, size: str, model: str = MODEL_2_1_FLASH) -> str
        # 文生图，返回图片 URL

    async def edit(image_url: str, prompt: str, size: str, model: str = MODEL_2_1_FLASH) -> str
        # 图生图，返回图片 URL

    async def compose(image_urls: list[str], prompt: str, size: str) -> str
        # 多图合成（2.0 Flash），返回图片 URL
```

### 6.2 `services/agnes_video.py` — 视频生成服务

```python
class AgnesVideoService:
    MODEL = "agnes-video-v2.0"
    BASE_URL = "https://apihub.agnes-ai.com/v1/videos"

    async def create(prompt: str, image: str | None = None,
                     mode: str | None = None, **params) -> dict
        # 创建视频任务，返回 { video_id, task_id, status }

    async def poll_status(video_id: str) -> dict
        # 查询视频状态，返回 { status, video_url, progress }
```

### 6.3 `services/agnes_llm.py` — LLM 服务

```python
class AgnesLLMService:
    MODEL = "agnes-2.0-flash"
    BASE_URL = "https://apihub.agnes-ai.com/v1/chat/completions"

    async def optimize_prompt(user_input: str, type: str = "image") -> str
        # 用 LLM 扩写/优化 Prompt（开启 Thinking）

    async def analyze_image(image_url: str, instruction: str = "") -> str
        # 图片理解分析
```

### 6.4 `services/auth.py` — 认证服务

```python
class AuthService:
    async def register(email: str, password: str) -> User
        # 密码 bcrypt 哈希后写入数据库

    async def login(email: str, password: str) -> str
        # 校验密码，签发 JWT（有效期 7 天）

    async def get_current_user(token: str) -> User
        # 解析 JWT，返回用户信息
```

---

## 7. 用户工作流

### 7.1 图片生成

```
用户输入想法
    │
    ├─→ [可选] 点击"优化 Prompt" → LLM 扩写 → 用户确认/修改
    │
    └─→ 选择尺寸 → 选择模型
            │
        2.1 Flash (高质量)      2.0 Flash (快速/编辑/合成)
            │                         │
        POST /api/image/generate → POST /api/image/generate
            │                         │
            └──────→ 展示结果 ←────────┘
```

### 7.2 视频生成

```
用户输入/上传
    │
    ├─→ 文生视频：输入 Prompt
    ├─→ 图生视频：上传图片 + Prompt
    └─→ 关键帧：上传多图 + Prompt
            │
        POST /api/video/create
            │
        { video_id, status: "queued" }
            │
        SWR 每 5s 轮询 /api/video/status/{video_id}
            │
        ┌──── in_progress ────→ 展示进度条
        │
        └──── completed ──────→ 展示视频

```

---

## 8. 前端状态管理

### 8.1 SWR 数据获取

```typescript
// api.ts — 统一的 fetcher
const fetcher = (url: string) =>
  fetch(url, {
    headers: { Authorization: `Bearer ${getToken()}` },
  }).then(res => res.json())

// 使用示例
// 图片生成（一次性请求）
const { data, trigger, isMutating } = useSWR(
  ['/api/image/generate', params],
  ([url, params]) => fetcher(url, { method: 'POST', body: params }),
  { revalidateOnFocus: false }
)

// 视频状态轮询
const { data } = useSWR(
  videoId ? `/api/video/status/${videoId}` : null,
  fetcher,
  { refreshInterval: 5000 }
)
```

### 8.2 Token 管理

```typescript
// auth.ts
const TOKEN_KEY = 'agnes_token'

export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token)
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)
export const isLoggedIn = () => !!getToken()
```

### 8.3 路由保护

```typescript
// middleware.ts — Next.js Edge Middleware
export function middleware(request) {
  const token = request.cookies.get('token')
  if (!token && !request.nextUrl.pathname.startsWith('/login')) {
    return Response.redirect(new URL('/login', request.url))
  }
}
```

---

## 9. 认证流程

```
注册 → POST /api/auth/register → 201 Created
登录 → POST /api/auth/login    → { token, user }

前端存储 token 到 localStorage
API 调用时在 Header 携带: Authorization: Bearer <token>

后端依赖注入:
    def get_current_user(token = Depends(oauth2_scheme)) -> User
        解析 JWT → 查库 → 返回 User / 抛 401
```

### JWT 载荷

```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "exp": 1829374592
}
```

---

## 10. 配置与环境变量

```env
# .env
AGNES_API_KEY=sk-xxx
AGNES_API_BASE=https://apihub.agnes-ai.com

DATABASE_URL=sqlite:///./data/agnes.db
# DATABASE_URL=postgresql://user:pass@localhost/agnes

JWT_SECRET=your-jwt-secret-key
JWT_ALGORITHM=HS256
JWT_EXPIRE_DAYS=7

CORS_ORIGINS=http://localhost:3000
```

---

## 11. 安全注意事项

1. **API Key 保护**：后端环境变量存储，不暴露给前端
2. **密码安全**：bcrypt 哈希，不存明文
3. **JWT 时效**：7 天过期，无 refresh token（MVP 简化）
4. **CORS 限制**：仅允许前端域名
5. **输入校验**：Pydantic 校验所有请求参数
6. **视频 URL 过期**：Agnes 返回的 URL 可能有时效性，不做持久化

---

## 12. 模型选择策略

| 场景 | 推荐模型 | 理由 |
|------|---------|------|
| 高质量文生图 | `agnes-image-2.1-flash` | 高信息密度优化，质量最好 |
| 图生图/风格迁移 | `agnes-image-2.1-flash` | 构图保持能力强 |
| 多图合成 | `agnes-image-2.0-flash` | 2.0 支持多图输入 |
| 批量快速出图 | `agnes-image-2.0-flash` | 更快速 |
| 文生视频 | `agnes-video-v2.0` | 唯一视频模型 |
| 图生视频 | `agnes-video-v2.0` + `image` 参数 | 静态图动画化 |
| 关键帧动画 | `agnes-video-v2.0` + `mode: keyframes` | 多图过渡 |
| Prompt 优化 | `agnes-2.0-flash` + Thinking | 提升生成质量 |

---

## 13. 已知的 API 约束

- `response_format` 必须放在 `extra_body` 中，不能放顶层
- 图生图不需要传 `tags: ["img2img"]`
- 输入图片 URL 必须公网可访问
- 视频 `num_frames` 必须 ≤ 441 且满足 `8n + 1`（如 81, 121, 161, 241, 441）
- 视频生成是异步任务，需轮询查询结果
- 客户端超时建议 60s–360s

---

## 14. 部署架构

```
用户浏览器
    │
    ├─ Next.js (Vercel / Docker)
    │   └─ SSR + 静态资源
    │
    ├─ FastAPI (Docker / 云服务器)
    │   ├─ JWT 中间件
    │   └─ Agnes API 代理
    │       └─ https://apihub.agnes-ai.com
    │
    └─ 数据库 (SQLite / PostgreSQL)
        └─ 用户 + 生成记录
```

---

## 15. 后续扩展方向

- [ ] 添加图片/视频结果收藏功能
- [ ] 添加生成参数预设（风格模板）
- [ ] 用量统计与配额限制
- [ ] 批量生成（异步队列）
- [ ] 图片放大/增强后处理
- [ ] 集成更多模型（如 Flux, Runway 等）
- [ ] WebSocket 替代轮询推送视频进度
