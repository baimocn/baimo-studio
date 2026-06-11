# baimo Studio

基于 [Agnes AI](https://agnes-ai.com) 模型的图片与视频生成平台，支持文生图、图生图、多图合成、文生视频、图生视频、Prompt 智能优化等全链路 AI 创作功能。

## 功能一览

| 功能 | 说明 |
|------|------|
| 文生图 | 输入 Prompt 生成高质量图片，支持多种尺寸和模型选择 |
| 图生图 | 上传参考图 + Prompt，进行风格转换或编辑 |
| 多图合成 | 上传多张参考图，AI 将它们合成为一张新图 |
| 批量生成 | 一次生成多张图片，快速挑选最佳结果 |
| 文生视频 | 输入描述，AI 生成视频片段 |
| 图生视频 | 上传图片，让静态画面动起来 |
| 关键帧动画 | 定义关键帧，AI 生成过渡动画 |
| Prompt 优化 | AI 辅助优化你的 Prompt（支持流式输出） |
| 智能工作流 | 上传图片 → AI 分析 → 自动优化 Prompt → 一键生成 |
| 生成历史 | 查看、搜索、管理所有生成记录 |
| 收藏管理 | 收藏喜欢的作品，方便回顾 |

## 技术栈

- **前端**: Next.js 16 + React 19 + Tailwind CSS + SWR
- **后端**: Python + FastAPI + SQLAlchemy + aiosqlite
- **桌面**: pywebview（系统原生 WebView）
- **AI 模型**: Agnes AI（图片 / 视频 / LLM）

## 快速开始

### 方式一：Docker（推荐）

```bash
# 1. 克隆仓库
git clone https://github.com/baimocn/baimo-studio.git
cd baimo-studio

# 2. 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的 Agnes API Key

# 3. 启动
docker compose up -d

# 4. 访问 http://localhost:5180
```

### 方式二：本地运行

**环境要求**: Python 3.11+ / Node.js 20+

```bash
# 1. 克隆仓库
git clone https://github.com/baimocn/baimo-studio.git
cd baimo-studio

# 2. 后端
cd backend
pip install -r requirements.txt
cp .env.example .env
# 编辑 .env，填入你的 Agnes API Key
cd ..

# 3. 前端
cd frontend
npm install
npm run build
cp -r out ../backend/static
cd ..

# 4. 启动
cd backend
python run.py
# 访问 http://localhost:5180
```

### 方式三：打包为桌面客户端

```bash
# 完成"方式二"的步骤后
pip install pyinstaller
pyinstaller --noconfirm build_exe.spec
# 生成 dist/baimo-studio.exe
```

## 配置说明

复制 `.env.example` 为 `.env`，按需修改：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `AGNES_API_KEY` | Agnes AI API 密钥（必填） | `sk-your-key-here` |
| `AGNES_API_BASE` | Agnes API 地址 | `https://apihub.agnes-ai.com` |
| `DATABASE_URL` | 数据库连接字符串 | `sqlite+aiosqlite:///./data/agnes.db` |
| `CORS_ORIGINS` | 允许的跨域来源 | `http://localhost:5180` |

## 项目结构

```
baimo-studio/
├── backend/
│   ├── app/
│   │   ├── api/          # API 路由（image, video, prompt, ...）
│   │   ├── core/         # 配置、依赖注入
│   │   ├── models/       # 数据库模型
│   │   ├── schemas/      # Pydantic 请求/响应模型
│   │   ├── services/     # AI 服务封装（Agnes API 调用）
│   │   └── main.py       # FastAPI 应用入口
│   ├── run.py            # 开发服务器入口
│   ├── desktop.py        # 桌面客户端入口（pywebview）
│   └── requirements.txt  # Python 依赖
├── frontend/
│   ├── src/
│   │   ├── app/          # Next.js 页面（App Router）
│   │   ├── components/   # React 组件
│   │   ├── hooks/        # 自定义 Hooks
│   │   └── lib/          # 工具函数、API 客户端
│   └── package.json      # Node.js 依赖
├── docker-compose.yml    # Docker 部署
├── Dockerfile            # 多阶段构建
├── build_exe.spec        # PyInstaller 打包配置
└── LICENSE               # MIT 许可证
```

## API 端点

<details>
<summary>点击展开完整 API 列表</summary>

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/image/generate` | 文生图 |
| POST | `/api/image/edit` | 图生图 |
| POST | `/api/image/compose` | 多图合成 |
| POST | `/api/image/batch-generate` | 批量生成 |
| GET | `/api/image/download` | 下载图片 |
| POST | `/api/video/create` | 创建视频 |
| GET | `/api/video/status/{id}` | 查询视频状态 |
| GET | `/api/video/download` | 下载视频 |
| POST | `/api/prompt/optimize` | Prompt 优化 |
| POST | `/api/prompt/optimize-stream` | Prompt 优化（流式） |
| POST | `/api/prompt/analyze-image` | 图片分析 |
| GET | `/api/settings/api-key` | 获取 API Key |
| PUT | `/api/settings/api-key` | 更新 API Key |
| GET | `/api/models` | 获取模型列表 |
| GET | `/api/generations` | 生成历史 |
| GET | `/api/generations/favorites` | 收藏列表 |
| PUT | `/api/generations/{id}/favorite` | 切换收藏 |
| DELETE | `/api/generations/{id}` | 删除记录 |
| GET | `/api/stats` | 用量统计 |
| POST | `/api/workflow/analyze-and-generate` | 智能工作流 |
| GET | `/api/health` | 健康检查 |
| WS | `/ws/video/{id}` | 视频状态推送 |

</details>

## 许可证

[MIT License](LICENSE)

## 致谢

- [Agnes AI](https://agnes-ai.com) — 提供图片、视频和 LLM 模型 API
- [FastAPI](https://fastapi.tiangolo.com/) — 后端框架
- [Next.js](https://nextjs.org/) — 前端框架
- [pywebview](https://pywebview.flowrl.com/) — 桌面窗口
