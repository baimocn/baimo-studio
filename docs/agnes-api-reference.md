# Agnes AI API 完整参考文档

> 来源: https://agnes-ai.com/doc
> 爬取时间: 2026-06-11
> 母公司: Sapiens AI

---

## 目录

1. [概述](#一概述)
2. [快速开始](#二快速开始)
3. [基础信息](#三基础信息)
4. [文本模型 - Agnes 1.5 Flash](#四文本模型---agnes-15-flash)
5. [文本模型 - Agnes 2.0 Flash](#五文本模型---agnes-20-flash)
6. [图像模型 - Agnes Image 2.0 Flash](#六图像模型---agnes-image-20-flash)
7. [图像模型 - Agnes Image 2.1 Flash](#七图像模型---agnes-image-21-flash)
8. [视频模型 - Agnes Video V2.0](#八视频模型---agnes-video-v20)
9. [错误码参考](#九错误码参考)
10. [模型汇总表](#十模型汇总表)
11. [常见问题](#十一常见问题)

---

## 一、概述

### 关于 Sapiens AI

Sapiens AI 是 Agnes AI 的母公司，专注于研发先进的多模态 AI 模型与基础设施，致力于为下一代智能应用、创意应用和交互式产品提供强大的 AI 能力支持。

使命：**让世界级 AI 属于每一个人。**

### Agnes AI API 简介

Agnes AI API 为开发者提供统一、稳定、易接入的多模态 AI 模型服务，支持文本、图像、视频等多种生成与理解能力。

支持的核心能力：
- AI 对话与文本生成
- 逻辑推理与内容理解
- 文生图与图像编辑
- 图生视频与视频生成
- 音视频同步生成
- Agent 工具与自动化工作流
- 创意内容生成与多模态交互应用

**Agnes AI API 兼容 OpenAI 风格接口**，开发者只需修改 Base URL、API Key 和 Model Name 即可完成接入。

---

## 二、快速开始

### 前置条件

- 已激活的 Agnes AI Platform 账户
- 有效的 API Key（可在 Agnes AI 开发者控制台中生成）
- 账户余额（注册赠送 $0.1 初始金额，不充值可享受免费账户权益，调用免费模型不扣费，有 RPM 限制）

### 步骤

**第一步：创建账户**

注册或登录 Agnes AI Platform 账户：https://platform.agnes-ai.com

**第二步：生成 API Key**

进入: Settings -> API Keys -> Create new secret key

**第三步：充值账户余额（可选）**

进入: Billing -> Balance（免费用户可跳过）

**第四步：发送第一个请求**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": "Hello!"
      }
    ]
  }'
```

**第五步：后续探索**

- 在开发者控制台的 Models 页面查看可用模型
- 阅读各 API 接口文档
- 集成流式响应（Streaming）、工具调用（Tool Calling）等高级功能

---

## 三、基础信息

### Base URL

```
https://apihub.agnes-ai.com/v1
```

### 身份认证

所有 API 请求都需要通过 API Key 进行身份认证。

在请求 Header 中携带：

```
Authorization: Bearer YOUR_API_KEY
```

### 接口兼容性

Agnes AI API 兼容 OpenAI 风格接口。接入时只需修改：
- Base URL
- API Key
- Model Name

### 安全提醒

API Key 属于敏感信息，请勿暴露在：
- 公开代码仓库
- 前端客户端代码
- 截图或录屏内容
- 公开文档
- 可被他人访问的配置文件

如发现 API Key 泄露，立即在控制台删除或重置该 Key。

### 相关平台

- API 平台: https://platform.agnes-ai.com
- Agnes 应用: https://app.agnes-ai.com
- Pavo 应用: https://app.pavo-ai.work
- Discord 社区: https://discord.com/invite/buKQPVMW2s

---

## 四、文本模型 - Agnes 1.5 Flash

### 模型概述

Agnes-1.5-Flash 是一款轻量、高效的大语言模型，针对低延迟、高并发和低成本部署场景进行了优化。

特点：
- 采用先进的量化技术，显著降低计算资源需求
- 在模型性能与推理速度之间取得良好平衡
- 支持文本 + 图像的多模态输入
- 兼容 OpenAI Chat Completions API 和 OpenAI Responses API

### 适用场景

- 实时交互类应用
- 高并发服务系统
- 成本敏感型业务负载
- 轻量化智能接口

### API 信息

| 项目 | 说明 |
|------|------|
| API Endpoint | `https://apihub.agnes-ai.com/v1/chat/completions` |
| Request Method | POST |
| Content-Type | application/json |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

### 模型名称

```
agnes-1.5-flash
```

### 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| model | string | 是 | 固定为 `agnes-1.5-flash` |
| messages | array | 是 | 对话消息数组 |
| temperature | number | 否 | 采样温度，控制生成内容的随机性 |
| top_p | number | 否 | 核采样概率 |
| max_tokens | integer | 否 | 最大生成 token 数 |
| frequency_penalty | number | 否 | 频率惩罚，减少重复内容 |
| presence_penalty | number | 否 | 存在惩罚，鼓励引入新话题 |
| repetition_penalty | number | 否 | 重复控制系数 |
| stop | string / array | 否 | 自定义停止序列 |
| seed | integer | 否 | 随机种子，保证结果可复现 |

### 调用示例

**纯文本对话：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-1.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "what is this?"
      }
    ],
    "temperature": 0.5,
    "max_tokens": 1024
  }'
```

**多模态请求（文本 + 图像）：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-1.5-flash",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Describe this image"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

### 响应格式

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1773803415,
  "model": "agnes-1.5-flash",
  "choices": [
    {
      "index": 0,
      "finish_reason": "stop",
      "message": {
        "role": "assistant",
        "content": "This image shows..."
      }
    }
  ],
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 300,
    "total_tokens": 420
  }
}
```

### 模型限制

| 项目 | 数值 |
|------|------|
| Context | 256K |
| Max Output | 65.5K |

### 价格

| 类型 | 原价 | 现价 |
|------|------|------|
| Input Tokens | $0.07 / 1M tokens | **$0 / 1M tokens** (免费) |
| Output Tokens | $0.15 / 1M tokens | **$0 / 1M tokens** (免费) |

---

## 五、文本模型 - Agnes 2.0 Flash

### 模型概述

Agnes-2.0-Flash 是由 Sapiens AI 开发的一款快速、高效的语言模型，面向智能体工作流、工具调用、编程任务、推理、多轮对话、图片理解以及高频生产环境应用场景设计。

在 Claw-Eval 基准测试中 General Leaderboard 排名第 9，Pass^3 分数为 60.9%。

### 支持能力

| 能力 | 说明 |
|------|------|
| Chat Completion | 为对话和应用生成高质量回复 |
| 多轮对话 | 在多轮交互中保持上下文连续性 |
| 图片 URL 输入 | 支持通过公网图片 URL 传入图片内容 |
| 图片理解 | 支持基于图片的内容理解、截图分析和信息提取 |
| 工具调用 | 调用外部工具和函数，支持智能体工作流 |
| 智能体工作流 | 支持规划、执行和多步骤任务完成 |
| 编程任务 | 辅助代码生成、调试、解释和重构 |
| 推理 | 处理结构化推理、任务拆解和决策 |
| 流式输出 | 实时返回响应 |
| Thinking 模式 | 支持 OpenAI 和 Anthropic 兼容的 Thinking 请求 |
| OpenAI 兼容 API | 使用兼容 OpenAI Chat Completions API 的结构 |

### 适用场景

- AI 助手、自主智能体、编程助手
- 工作流自动化、客户支持
- 搜索与问答、内容生成
- 开发者工具、AI 原生应用
- 图片理解

### API 信息

| 项目 | 说明 |
|------|------|
| API Endpoint | `https://apihub.agnes-ai.com/v1/chat/completions` |
| Request Method | POST |
| Content-Type | application/json |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

### 模型名称

```
agnes-2.0-flash
```

### 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| model | string | 是 | 固定为 `agnes-2.0-flash` |
| messages | array | 是 | 对话消息数组，包括 system、user 和 assistant 消息 |
| messages[].content | string / array | 是 | 消息内容。可为纯文本字符串，也可为包含 text、image_url 的内容数组 |
| temperature | number | 否 | 控制输出随机性 |
| top_p | number | 否 | 控制核采样 |
| max_tokens | number | 否 | 响应中最多生成的 token 数 |
| stream | boolean | 否 | 是否启用流式响应输出 |
| tools | array | 否 | 用于工具调用工作流的工具定义 |
| tool_choice | string / object | 否 | 控制模型是否以及如何使用工具 |
| chat_template_kwargs | object | 否 | OpenAI 兼容请求中用于开启 Thinking 等扩展能力 |
| thinking | object | 否 | Anthropic 兼容请求中用于开启 Thinking 模式 |

### 图片 URL 输入

支持通过图片 URL 输入图片内容。messages[].content 可使用数组结构：

```json
{
  "role": "user",
  "content": [
    {
      "type": "text",
      "text": "Describe the content of this image."
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "https://example.com/image.jpg"
      }
    }
  ]
}
```

图片 URL 使用建议：
- 图片 URL 必须可公网访问
- 如果图片 URL 需要登录、鉴权或存在防盗链，模型可能无法读取
- 建议使用标准图片格式：JPG、JPEG、PNG 或 WebP

### 调用示例

**1. 基础 Chat Completion：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful AI assistant."
      },
      {
        "role": "user",
        "content": "Explain how autonomous agents use tools to complete tasks."
      }
    ],
    "temperature": 0.7,
    "max_tokens": 1024
  }'
```

**2. 流式输出：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": "Write a short product introduction for an AI assistant app."
      }
    ],
    "stream": true
  }'
```

**3. 工具调用：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": "What is the weather like in Singapore today?"
      }
    ],
    "tools": [
      {
        "type": "function",
        "function": {
          "name": "get_weather",
          "description": "Get the current weather for a location",
          "parameters": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "The city and country"
              }
            },
            "required": ["location"]
          }
        }
      }
    ]
  }'
```

**4. 图片 URL 输入：**

```bash
curl https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.0-flash",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "Describe the content of this image."
          },
          {
            "type": "image_url",
            "image_url": {
              "url": "https://example.com/image.jpg"
            }
          }
        ]
      }
    ]
  }'
```

### 响应格式

```json
{
  "id": "chatcmpl_xxx",
  "object": "chat.completion",
  "created": 1774432125,
  "model": "agnes-2.0-flash",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Autonomous agents use tools by understanding the user's goal, breaking it into steps, selecting the right tools, executing actions, and using the results to complete the task."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 35,
    "completion_tokens": 58,
    "total_tokens": 93
  }
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 本次补全请求的唯一 ID |
| object | string | 对象类型，通常为 `chat.completion` |
| created | integer | 请求时间戳 |
| model | string | 本次请求使用的模型 |
| choices | array | 生成的响应结果列表 |
| choices[].index | integer | 响应结果的索引 |
| choices[].message | object | Assistant 消息对象 |
| choices[].message.role | string | 消息发送者角色 |
| choices[].message.content | string | 模型生成的响应内容 |
| choices[].finish_reason | string | 生成停止原因 |
| usage | object | Token 使用信息 |
| usage.prompt_tokens | integer | 输入 token 数量 |
| usage.completion_tokens | integer | 输出 token 数量 |
| usage.total_tokens | integer | 使用的 token 总数 |

### Thinking 模式

对于代码编写、调试、推理和 Agent 工作流，建议开启 Thinking 模式。

**OpenAI 兼容请求：**

```json
{
  "model": "agnes-2.0-flash",
  "messages": [
    {
      "role": "user",
      "content": "Help me write a Python script to process a CSV file."
    }
  ],
  "chat_template_kwargs": {
    "enable_thinking": true
  }
}
```

**Anthropic 兼容请求：**

```json
{
  "model": "agnes-2.0-flash",
  "messages": [
    {
      "role": "user",
      "content": "Help me refactor this TypeScript function and explain the changes."
    }
  ],
  "thinking": {
    "type": "enabled",
    "budget_tokens": 2048
  }
}
```

`budget_tokens` 用于控制最大 Thinking token 预算。常见编码任务建议从 2048 开始。

### Prompt 最佳实践

推荐结构：`[Role] + [Task] + [Context] + [Requirements] + [Output Format]`

### 模型限制

| 项目 | 数值 |
|------|------|
| Context | 256K |
| Max Output | 65.5K |

### 价格

| 类型 | 原价 | 现价 |
|------|------|------|
| Input Tokens | $0.03 / 1M tokens | **$0 / 1M tokens** (免费) |
| Output Tokens | $0.15 / 1M tokens | **$0 / 1M tokens** (免费) |

---

## 六、图像模型 - Agnes Image 2.0 Flash

### 模型概述

Agnes-Image-2.0-Flash 是由 Sapiens AI 开发的一款高性能图像生成与图像编辑模型。支持文生图、图生图和多图合成工作流。

在 Artificial Analysis Image Editing Leaderboard 中取得 ELO 1,184 成绩，进入 Top 20 区间。

### 支持能力

| 能力 | 说明 |
|------|------|
| Text-to-Image | 根据文本 Prompt 生成图像 |
| Image-to-Image | 基于输入图像进行编辑、转换或增强 |
| Multi-Image Input | 支持输入多张参考图并合成为一张新图像 |
| Image Editing | 修改构图、风格、对象、背景、场景和视觉细节 |
| Style Control | 调整艺术风格、光照、布局和视觉方向 |
| Fast Generation | 针对快速、低成本的生产工作流进行优化 |
| OpenAI-Compatible API | 使用兼容 OpenAI Images API 的请求结构 |

### 适用场景

- 创意设计（海报、概念艺术、社交媒体视觉图）
- 营销内容（产品广告、活动创意、Banner）
- 文生图、图像编辑
- 角色合成、视觉生产
- 电商（产品图优化、场景化产品图）
- 社交内容（Meme、头像、缩略图）

### API 信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://apihub.agnes-ai.com` |
| Endpoint | `POST https://apihub.agnes-ai.com/v1/images/generations` |
| Method | POST |
| Content-Type | application/json |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

### 模型名称

```
agnes-image-2.0-flash
```

### 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| model | string | 是 | 固定为 `agnes-image-2.0-flash` |
| prompt | string | 是 | 描述目标图像或编辑需求的文本提示词 |
| size | string | 是 | 输出图像尺寸，例如 `1024x768`、`1024x1024`、`768x1024` |
| image | string[] | 图生图必填 | 输入图片数组，支持公网 URL 或 Data URI Base64 |
| return_base64 | boolean | 否 | 文生图返回 Base64 时使用 |
| extra_body.response_format | string | 否 | 输出格式，常用 `url` 或 `b64_json` |

### 重要说明

1. **文生图不需要传 `image`** - 只需 `model`、`prompt`、`size`
2. **图生图需要传 `image`** - 在顶层传入 `image` 数组
3. **图生图不需要传 `tags`** - 不需要 `tags: ["img2img"]`
4. **`response_format` 不要放在顶层** - 应放在 `extra_body` 中，否则返回 400 错误

### 调用示例

**1. 文生图 - URL 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
    "size": "1024x768",
    "extra_body": {
      "response_format": "url"
    }
  }'
```

结果位于：`data[0].url`

**2. 文生图 - Base64 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
    "size": "1024x768",
    "return_base64": true
  }'
```

结果位于：`data[0].b64_json`

**3. 图生图 - URL 输入，URL 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Transform this image into a cinematic cyberpunk style while preserving the main subject and composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "url"
    }
  }'
```

**4. 图生图 - Data URI Base64 输入：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Make the object matte black while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "data:image/png;base64,BASE64_HERE"
      ],
      "response_format": "b64_json"
    }
  }'
```

**5. 多图合成：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Combine the two characters into an intense fantasy battle scene, dynamic lighting, detailed background, cinematic composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/character-1.png",
        "https://example.com/character-2.png"
      ],
      "response_format": "url"
    }
  }'
```

### 响应格式

**URL 输出：**

```json
{
  "created": 1780000000,
  "data": [
    {
      "url": "https://storage.googleapis.com/agnes-aigc/xxx.png",
      "b64_json": null,
      "revised_prompt": null
    }
  ]
}
```

**Base64 输出：**

```json
{
  "created": 1780000000,
  "data": [
    {
      "url": null,
      "b64_json": "iVBORw0KGgoAAAANSUhEUgAA...",
      "revised_prompt": null
    }
  ]
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| created | integer | 请求创建时间戳 |
| data | array | 生成图片结果列表 |
| data[].url | string / null | 生成图片 URL |
| data[].b64_json | string / null | Base64 图片数据 |
| data[].revised_prompt | string / null | 修订后的 Prompt |

### Prompt 最佳实践

**文生图 Prompt 结构：** `[Main subject] + [Scene / background] + [Style] + [Lighting] + [Composition] + [Quality requirements]`

**图生图 Prompt 结构：** `[Editing instruction] + [Elements to preserve] + [Target style / scene] + [Lighting] + [Composition] + [Quality requirements]`

### 价格

| 类型 | 原价 | 现价 |
|------|------|------|
| Generated Images | $0.003 / image | **$0 / image** (免费) |

### 常见问题

- 客户端建议设置较长超时时间：60s - 360s
- 输入图片 URL 必须可公网访问
- 建议使用 HTTPS 图片地址或 Data URI Base64

---

## 七、图像模型 - Agnes Image 2.1 Flash

### 模型概述

Agnes Image 2.1 Flash 是 Sapiens AI 升级推出的图像生成模型，支持文生图和图生图两种工作流。相比之前版本，在**高信息密度图像**生成方面进行了优化，更适合复杂视觉细节、丰富构图、密集元素和清晰语义对齐等场景。

### 核心能力

| 能力 | 说明 |
|------|------|
| 文生图 | 根据自然语言提示词生成高质量图片 |
| 图生图 | 根据提示词对已有图片进行转换、编辑或优化 |
| 高信息密度图像优化 | 更好处理复杂布局、丰富细节和密集视觉元素 |
| 构图保持 | 图生图时可尽量保持原图构图、主体结构和视角 |
| 灵活尺寸控制 | 支持自定义输出尺寸 |
| URL 返回 | 支持将生成结果以可访问图片 URL 返回 |
| Base64 返回 | 支持将生成结果以 Base64 数据返回 |
| URL 或 Data URI 输入 | 图生图支持公网图片 URL 或 Data URI Base64 输入 |

### 适用场景

- 创意设计（概念图、视觉探索、海报草图）
- 营销内容（活动图、产品视觉、社交媒体素材）
- 高密度视觉生成（复杂场景、丰富构图、密集元素画面）
- 图片转换（风格迁移、场景重打光、背景转换）
- 内容生产、产品视觉、社交媒体素材

### API 信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://apihub.agnes-ai.com` |
| Endpoint | `POST https://apihub.agnes-ai.com/v1/images/generations` |
| Method | POST |
| Content-Type | application/json |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

### 模型名称

```
agnes-image-2.1-flash
```

### 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| model | string | 是 | 固定使用 `agnes-image-2.1-flash` |
| prompt | string | 是 | 图片生成或图片编辑提示词 |
| size | string | 是 | 输出图片尺寸，例如 `1024x768` |
| image | string[] | 图生图必填 | 输入图片数组，支持公网 URL 或 Data URI Base64 |
| return_base64 | boolean | 否 | 文生图需要返回 Base64 时使用 |
| extra_body | object | 否 | 高级工作流扩展参数 |
| extra_body.response_format | string | 否 | 输出格式，常用值为 `url` 或 `b64_json` |

### 重要说明

- 文生图请求中，`model`、`prompt`、`size` 为必填参数
- 图生图请求中，请将输入图片放在顶层 `image` 数组中
- **不要将 `response_format` 放在请求体顶层**，否则可能返回 400 错误
- 如需 URL 输出，请将 `"response_format": "url"` 放在 `extra_body` 中
- 如需文生图 Base64 输出，可使用顶层参数 `"return_base64": true`
- 如需图生图 Base64 输出，请在 `extra_body` 中设置 `"response_format": "b64_json"`
- 图生图不需要传 `tags: ["img2img"]`

### 调用示例

**1. 文生图 - URL 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A luminous floating city above a misty canyon at sunrise, cinematic realism",
    "size": "1024x768",
    "extra_body": {
      "response_format": "url"
    }
  }'
```

**2. 文生图 - Base64 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "A clean product photo of a glass cube on a white studio background, soft shadows, high detail",
    "size": "1024x768",
    "return_base64": true
  }'
```

**3. 图生图 - URL 输入，URL 输出：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "Transform the scene into a rain-soaked cyberpunk night with neon reflections while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "url"
    }
  }'
```

**4. 图生图 - Data URI Base64 输入：**

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "Make the object matte black while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "data:image/png;base64,BASE64_HERE"
      ],
      "response_format": "b64_json"
    }
  }'
```

### 返回格式

与 Agnes Image 2.0 Flash 相同，详见上方响应格式。

### Prompt 最佳实践

**文生图：** `[主体] + [场景 / 环境] + [风格] + [光照] + [构图] + [质量要求]`

**图生图：** `[修改要求] + [新风格 / 新场景] + [需要添加或移除的元素] + [需要保留的元素]`

**高信息密度图片建议：** 明确描述视觉层级，包含主体、背景环境、重要次要元素、风格和光照、构图约束。

### 常见错误与排查

1. **`response_format` 放在顶层导致报错** - 应放在 `extra_body` 中
2. **图生图不需要 `tags`** - 只需在 `image` 数组中提供输入图片
3. **输入图片 URL 不可访问** - 使用公网可访问的 HTTPS 地址或 Data URI Base64
4. **请求超时** - 建议客户端超时设置为 60s 到 360s
5. **图生图请求缺少 `image`** - `image` 数组为必填

### 价格

| 类型 | 原价 | 现价 |
|------|------|------|
| 生成图片 | $0.003 / 张 | **$0 / 张** (免费) |

---

## 八、视频模型 - Agnes Video V2.0

### 模型概述

Agnes-Video-V2.0 是一款面向生产环境的视频生成模型，支持文生视频、图生视频、多图视频生成和关键帧动画工作流。

**采用异步任务式 API** - 需要先创建视频生成任务，然后使用返回的 `video_id` 或 `task_id` 查询视频结果。

### 支持能力

| 能力 | 说明 |
|------|------|
| 文生视频 | 根据文本提示词直接生成视频 |
| 图生视频 | 将静态图片动画化为动态视频 |
| 多图视频生成 | 使用多张参考图片指导视频生成 |
| 关键帧动画 | 在多个关键帧之间生成平滑过渡 |
| 场景运动控制 | 通过提示词控制主体动作、镜头运动和场景动态 |
| 视觉一致性 | 在多帧之间保持主体、风格和场景一致 |
| 电影级输出 | 生成高质量电影级视频 |
| 异步 API | 先提交任务，再查询生成结果 |

### 适用场景

- 故事创作（短片、角色场景、叙事片段）
- 营销视频（产品广告、活动视频、推广内容）
- 社交媒体内容（Reels、Shorts、TikTok 风格视频）
- 图像动画化（动画化人像、产品、角色或场景）
- 产品演示、关键帧过渡
- 游戏 / App 素材、沉浸式内容

### API Endpoints

**创建视频任务：**

| 项目 | 说明 |
|------|------|
| Endpoint | `https://apihub.agnes-ai.com/v1/videos` |
| Method | POST |
| Content-Type | application/json |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

**查询视频结果（推荐方式）：**

| 项目 | 说明 |
|------|------|
| Endpoint | `https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>` |
| Method | GET |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

**查询视频结果（兼容旧方式）：**

| 项目 | 说明 |
|------|------|
| Endpoint | `https://apihub.agnes-ai.com/v1/videos/{task_id}` |
| Method | GET |
| Authentication | Bearer Token |
| Header | `Authorization: Bearer YOUR_API_KEY` |

### 模型名称

```
agnes-video-v2.0
```

### 请求参数（创建视频任务）

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| model | string | 是 | 模型名称，使用 `agnes-video-v2.0` |
| prompt | string | 是 | 视频内容的文本描述 |
| image | string / array | 否 | 图片 URL 或图片 URL 数组 |
| mode | string | 否 | 生成模式，例如 `ti2vid` 或 `keyframes` |
| height | integer | 否 | 视频高度，默认值为 768 |
| width | integer | 否 | 视频宽度，默认值为 1152 |
| num_frames | integer | 否 | 视频帧数，必须 <= 441，且满足 8n + 1 |
| frame_rate | number | 否 | 视频 FPS，支持范围为 1-60 |
| num_inference_steps | integer | 否 | 推理步数 |
| seed | integer | 否 | 随机种子，保证结果可复现 |
| negative_prompt | string | 否 | 负向提示词，描述需要避免的内容 |
| extra_body.image | array | 否 | 多图视频或关键帧模式中的输入图片 URL |
| extra_body.mode | string | 否 | 额外模式设置，例如 `keyframes` |

### 视频时长控制

计算公式：`seconds = num_frames / frame_rate`

约束：
- `num_frames` 必须 <= 441
- `num_frames` 必须满足 `8n + 1`（如 81、121、161、241、441）
- `frame_rate` 支持范围为 1-60

**常用时长参数：**

| 目标时长 | 推荐参数 |
|----------|----------|
| 约 3 秒 | num_frames: 81, frame_rate: 24 |
| 约 5 秒 | num_frames: 121, frame_rate: 24 |
| 约 10 秒 | num_frames: 241, frame_rate: 24 |
| 约 18 秒 | num_frames: 441, frame_rate: 24 |

### 调用示例

**1. 文生视频：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "A cinematic shot of a cat walking on the beach at sunset, soft ocean waves, warm golden lighting, realistic motion",
    "height": 768,
    "width": 1152,
    "num_frames": 121,
    "frame_rate": 24
  }'
```

**2. 图生视频：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "The woman slowly turns around and looks back at the camera, natural facial expression, cinematic camera movement",
    "image": "https://example.com/image.png",
    "num_frames": 121,
    "frame_rate": 24
  }'
```

**3. 多图视频生成：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "Create a smooth transformation scene between the two reference images, cinematic lighting, consistent character identity, natural motion",
    "extra_body": {
      "image": [
        "https://example.com/image1.png",
        "https://example.com/image2.png"
      ]
    },
    "num_frames": 121,
    "frame_rate": 24
  }'
```

**4. 关键帧动画：**

```bash
curl -X POST https://apihub.agnes-ai.com/v1/videos \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-video-v2.0",
    "prompt": "Generate a smooth cinematic transition between the keyframes, maintaining visual consistency and natural camera movement",
    "extra_body": {
      "image": [
        "https://example.com/keyframe1.png",
        "https://example.com/keyframe2.png"
      ],
      "mode": "keyframes"
    },
    "num_frames": 121,
    "frame_rate": 24
  }'
```

### 创建任务响应

```json
{
  "id": "task_YOUR_TASK_ID",
  "task_id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "object": "video",
  "model": "agnes-video-v2.0",
  "status": "queued",
  "progress": 0,
  "created_at": 1780457477,
  "seconds": "10.0",
  "size": "1280x768"
}
```

### 查询视频结果

**推荐方式（使用 video_id）：**

```bash
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```

可选参数 `model_name`：

```bash
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>&model_name=<MODEL>' \
  --header 'Authorization: Bearer <API_KEY>'
```

**兼容方式（使用 task_id）：**

```bash
curl --location --request GET 'https://apihub.agnes-ai.com/v1/videos/<TASK_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```

建议轮询间隔：**5 秒**

### 查询结果响应（任务完成时）

```json
{
  "id": "task_YOUR_TASK_ID",
  "video_id": "video_YOUR_VIDEO_ID",
  "model": "agnes-video-v2.0",
  "object": "video",
  "status": "completed",
  "progress": 100,
  "seconds": "10.0",
  "size": "1280x768",
  "remixed_from_video_id": "https://storage.googleapis.com/agnes-aigc/aigc/videos/2026/06/03/video_xxxxxx.mp4",
  "error": null
}
```

### 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | string | 任务 ID |
| task_id | string | 任务 ID，作用与 id 相同 |
| video_id | string | 视频 ID，推荐用于查询视频结果 |
| object | string | 对象类型，通常为 `video` |
| model | string | 当前任务使用的模型 |
| status | string | 当前任务状态 |
| progress | integer | 当前任务进度百分比 |
| created_at | integer | 任务创建时间戳 |
| seconds | string | 视频时长，单位为秒 |
| size | string | 视频分辨率 |
| remixed_from_video_id | string | **最终生成的视频 URL**，仅在 status 为 completed 时可用 |
| error | object / null | 错误信息，任务失败时返回 |

### 任务状态说明

| 状态 | 说明 |
|------|------|
| queued | 任务正在队列中等待 |
| in_progress | 视频正在生成中 |
| completed | 视频已生成完成 |
| failed | 视频生成失败 |

### Prompt 最佳实践

**文生视频：** `[主体] + [动作] + [场景] + [镜头运动] + [光照] + [风格]`

**图生视频：** 描述哪些内容需要运动，同时说明哪些主体元素需要保持稳定。

**多图视频：** 描述输入图片之间的关系，以及画面如何过渡。

**关键帧动画：** 清晰描述关键帧之间的过渡关系。

### 推荐参数

| 使用场景 | 推荐设置 |
|----------|----------|
| 标准视频生成 | width: 1152, height: 768, num_frames: 121, frame_rate: 24 |
| 短视频社交内容 | num_frames: 81 或 121, frame_rate: 24 |
| 更长视频 | 增加 num_frames 或降低 frame_rate |
| 更平滑运动 | 使用 frame_rate: 24 或 30 |
| 可复现结果 | 设置固定 seed |
| 关键帧过渡 | 使用 extra_body.mode: "keyframes" |
| 避免不需要的内容 | 使用 negative_prompt |

### 价格

| 类型 | 原价 | 现价 |
|------|------|------|
| Video Duration | $0.005 / second | **$0 / second** (免费) |

---

## 九、错误码参考

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求无效，请检查请求参数 |
| 401 | 未授权，请检查 API Key |
| 404 | 任务或视频不存在 |
| 500 | 服务器错误 |
| 503 | 服务繁忙，请稍后重试 |

### 图像 API 常见错误

- `response_format` 放在顶层 -> 400 错误（应放在 `extra_body` 中）
- 输入图片 URL 不可访问 -> 请求失败
- 请求超时 -> 建议设置 60s-360s 超时

---

## 十、模型汇总表

### 文本模型

| 模型名称 | 模型 ID | Context | Max Output | 特点 | 输入价格 | 输出价格 |
|----------|---------|---------|------------|------|----------|----------|
| Agnes 1.5 Flash | `agnes-1.5-flash` | 256K | 65.5K | 轻量高效，低延迟 | $0/1M (免费) | $0/1M (免费) |
| Agnes 2.0 Flash | `agnes-2.0-flash` | 256K | 65.5K | 工具调用、图片理解、Thinking | $0/1M (免费) | $0/1M (免费) |

### 图像模型

| 模型名称 | 模型 ID | 特点 | 价格 |
|----------|---------|------|------|
| Agnes Image 2.0 Flash | `agnes-image-2.0-flash` | 文生图、图生图、多图合成 | $0/张 (免费) |
| Agnes Image 2.1 Flash | `agnes-image-2.1-flash` | 高信息密度图像优化 | $0/张 (免费) |

### 视频模型

| 模型名称 | 模型 ID | 特点 | 价格 |
|----------|---------|------|------|
| Agnes Video V2.0 | `agnes-video-v2.0` | 文生视频、图生视频、关键帧动画 | $0/秒 (免费) |

### API Endpoint 汇总

| 功能 | Endpoint | Method |
|------|----------|--------|
| 文本 Chat | `https://apihub.agnes-ai.com/v1/chat/completions` | POST |
| 图像生成 | `https://apihub.agnes-ai.com/v1/images/generations` | POST |
| 视频创建 | `https://apihub.agnes-ai.com/v1/videos` | POST |
| 视频查询（推荐） | `https://apihub.agnes-ai.com/agnesapi?video_id=<ID>` | GET |
| 视频查询（旧版） | `https://apihub.agnes-ai.com/v1/videos/{task_id}` | GET |

---

## 十一、常见问题

### 通用问题

**Q: 如何获取 API Key？**
A: 登录 https://platform.agnes-ai.com，进入 Settings -> API Keys -> Create new secret key

**Q: 免费用户有什么限制？**
A: 注册赠送 $0.1 初始金额，不充值可享受免费账户权益，调用免费模型不扣费，但有 RPM 限制。

**Q: API 兼容什么格式？**
A: 兼容 OpenAI 风格接口。对于文本模型，兼容 OpenAI Chat Completions API；对于图像模型，兼容 OpenAI Images API。

### 图像相关问题

**Q: Agnes Image 2.0 Flash 是否支持文生图？**
A: 支持。文生图请求不需要传入 `image`，只需要传入 `model`、`prompt` 和 `size`。

**Q: Agnes Image 2.0 Flash 是否支持图生图？**
A: 支持。需要在请求中传入 `image` 数组。

**Q: 输入图片 URL 不可访问怎么办？**
A: 建议使用公网可访问的 HTTPS 图片地址，或使用 Data URI Base64 输入。

**Q: 请求超时怎么办？**
A: 图片生成可能需要数秒到几十秒，客户端建议设置较长超时时间（60s - 360s）。

### 视频相关问题

**Q: 视频生成是同步还是异步的？**
A: 异步的。需要先创建视频任务，再使用返回的 `video_id` 查询结果。

**Q: 推荐用什么方式查询视频结果？**
A: 推荐使用 `video_id` 查询，旧版 `task_id` 方式仍支持但不推荐。

**Q: num_frames 有什么约束？**
A: 必须 <= 441，且满足 `8n + 1`（如 81、121、161、241、441）。

---

## 附录：接入检查清单

接入前建议确认：

- [ ] 已获得有效 API Key
- [ ] 请求地址正确（`https://apihub.agnes-ai.com/v1/...`）
- [ ] Header 中已添加 `Authorization: Bearer YOUR_API_KEY`
- [ ] Header 中已添加 `Content-Type: application/json`
- [ ] 模型名称正确
- [ ] 图像 API 的 `response_format` 放在 `extra_body` 中（不在顶层）
- [ ] 视频 API 使用异步模式（创建任务 -> 轮询结果）
- [ ] 客户端超时设置合理（图像 60-360s，视频更长）
