# Agnes AI API 完整参数参考文档

> 数据来源：https://agnes-ai.com/doc/ (2026-06-12 爬取)
> 本文档涵盖 Agnes Image 2.0 Flash、Agnes Image 2.1 Flash、Agnes Video V2.0 三个模型的全部参数、示例与注意事项。

---

## 通用信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://apihub.agnes-ai.com` |
| 认证方式 | Bearer Token |
| 认证 Header | `Authorization: Bearer YOUR_API_KEY` |
| Content-Type | `application/json` |
| 当前价格 | Image: $0/image（促销）; Video: $0/second（促销） |
| 原价 | Image: $0.003/image; Video: $0.005/second |

---

# 一、Agnes Image 2.0 Flash

**模型名称**: `agnes-image-2.0-flash`
**Endpoint**: `POST https://apihub.agnes-ai.com/v1/images/generations`
**兼容结构**: OpenAI Images API

## 1.1 能力

| 能力 | 说明 |
|------|------|
| Text-to-Image | 根据文本 Prompt 生成图像 |
| Image-to-Image | 基于输入图像进行编辑、转换或增强 |
| Multi-Image Input | 支持输入多张参考图并合成为一张新图像 |
| Image Editing | 修改构图、风格、对象、背景、场景和视觉细节 |
| Style Control | 调整艺术风格、光照、布局和视觉方向 |
| Fast Generation | 针对快速、低成本的生产工作流进行优化 |

## 1.2 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| `model` | string | **是** | 模型名称，固定为 `agnes-image-2.0-flash` |
| `prompt` | string | **是** | 描述目标图像或编辑需求的文本提示词 |
| `size` | string | **是** | 输出图像尺寸，例如 `1024x768`、`1024x1024`、`768x1024` |
| `image` | string[] | 图生图必填 | 输入图片数组，支持公网 URL 或 Data URI Base64 |
| `return_base64` | boolean | 否 | 文生图返回 Base64 时使用 |
| `extra_body.response_format` | string | 否 | 输出格式，常用 `url` 或 `b64_json` |

## 1.3 重要说明（必读）

1. **文生图不需要传 `image`** — 只需 `model`、`prompt`、`size`
2. **图生图需要传 `image`** — image 数组放在 `extra_body` 中
3. **图生图不需要传 `tags`** — 不要传 `{"tags": ["img2img"]}`
4. **`response_format` 不要放在顶层** — 放在 `extra_body` 中，否则返回 400 错误

## 1.4 调用示例

### 1.4.1 文生图：URL 输出

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

返回路径: `data[0].url`

### 1.4.2 文生图：Base64 输出

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

返回路径: `data[0].b64_json`

### 1.4.3 图生图：URL 输入，URL 输出

用于编辑或转换现有图像。**注意 `image` 放在 `extra_body` 中。**

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

返回路径: `data[0].url`

### 1.4.4 图生图：URL 输入，Base64 输出

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.0-flash",
    "prompt": "Make the object orange while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "b64_json"
    }
  }'
```

返回路径: `data[0].b64_json`

### 1.4.5 图生图：Data URI Base64 输入

如果输入图片不是公网 URL，可以使用 Data URI Base64 格式。

**Data URI 格式**: `data:image/png;base64,BASE64_HERE`

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

### 1.4.6 多图合成请求

用于将多张输入图像组合成一个新场景。**多张图都放在 `extra_body.image` 数组中。**

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

## 1.5 响应格式

### URL 输出

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

### Base64 输出

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

## 1.6 响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `created` | integer | 请求创建时间戳 |
| `data` | array | 生成图片结果列表 |
| `data[].url` | string / null | 生成图片 URL，Base64 输出时为 null |
| `data[].b64_json` | string / null | Base64 图片数据，URL 输出时为 null |
| `data[].revised_prompt` | string / null | 修订后的 Prompt，如无则为 null |

## 1.7 Prompt 最佳实践

**文生图 Prompt 结构**:
```
[Main subject] + [Scene / background] + [Style] + [Lighting] + [Composition] + [Quality requirements]
```

示例:
```
A young explorer standing in an ancient temple, cinematic fantasy style, warm dramatic lighting, wide-angle composition, ultra detailed, high quality
```

**图生图 Prompt 结构**:
```
[Editing instruction] + [Elements to preserve] + [Target style / scene] + [Lighting] + [Composition] + [Quality requirements]
```

示例:
```
Change the background into a cinematic fantasy temple while preserving the person's face, outfit, and pose, warm dramatic lighting, wide-angle composition, ultra detailed, high quality
```

---

# 二、Agnes Image 2.1 Flash

**模型名称**: `agnes-image-2.1-flash`
**Endpoint**: `POST https://apihub.agnes-ai.com/v1/images/generations`
**兼容结构**: OpenAI Images API

## 2.1 能力

| 能力 | 说明 |
|------|------|
| 文生图 | 根据自然语言提示词生成高质量图片 |
| 图生图 | 根据提示词对已有图片进行转换、编辑或优化 |
| 高信息密度图像优化 | 更好处理复杂布局、丰富细节和密集视觉元素 |
| 构图保持 | 图生图时可尽量保持原图构图、主体结构和视角 |
| 灵活尺寸控制 | 支持自定义输出尺寸，例如 `1024x768` |
| URL 返回 | 支持将生成结果以可访问图片 URL 返回 |
| Base64 返回 | 支持将生成结果以 Base64 数据返回 |
| URL 或 Data URI 输入 | 图生图支持公网图片 URL 或 Data URI Base64 输入 |

**与 2.0 的差异**: 2.1 Flash 在 **高信息密度图像** 生成方面进行了优化，更适合复杂视觉细节、丰富构图、密集元素和清晰语义对齐等场景。

## 2.2 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| `model` | string | **是** | 模型名称，固定使用 `agnes-image-2.1-flash` |
| `prompt` | string | **是** | 图片生成或图片编辑提示词 |
| `size` | string | **是** | 输出图片尺寸，例如 `1024x768` |
| `image` | string[] | 图生图必填 | 输入图片数组，支持公网 URL 或 Data URI Base64 |
| `return_base64` | boolean | 否 | 文生图需要返回 Base64 时使用 |
| `extra_body` | object | 否 | 高级工作流扩展参数 |
| `extra_body.response_format` | string | 否 | 输出格式，常用值为 `url` 或 `b64_json` |

## 2.3 重要说明（必读）

1. 请使用 `agnes-image-2.1-flash` 作为模型名称
2. 文生图请求中，`model`、`prompt`、`size` 为必填参数
3. **图生图请求中，请将输入图片放在 `extra_body` 的 `image` 数组中**
4. `image` 支持公网图片 URL，也支持 Data URI Base64
5. **不要将 `response_format` 放在请求体顶层**，否则可能返回 400 错误
6. 如需 URL 输出，请将 `"response_format": "url"` 放在 `extra_body` 中
7. 如需文生图 Base64 输出，可使用顶层参数 `"return_base64": true`
8. 如需图生图 Base64 输出，请在 `extra_body` 中设置 `"response_format": "b64_json"`
9. **图生图不需要传 `tags: ["img2img"]`**

## 2.4 调用示例

### 2.4.1 文生图：URL 输出

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

返回路径: `data[0].url`

### 2.4.2 文生图：Base64 输出

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

返回路径: `data[0].b64_json`

### 2.4.3 图生图：URL 输入，URL 输出

用于基于已有图片进行转换，并尽量保持原图构图。**注意 `image` 放在 `extra_body` 中。**

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

返回路径: `data[0].url`

### 2.4.4 图生图：URL 输入，Base64 输出

```bash
curl https://apihub.agnes-ai.com/v1/images/generations \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-image-2.1-flash",
    "prompt": "Make the object orange while preserving the original composition",
    "size": "1024x768",
    "extra_body": {
      "image": [
        "https://example.com/input-image.png"
      ],
      "response_format": "b64_json"
    }
  }'
```

返回路径: `data[0].b64_json`

### 2.4.5 图生图：Data URI Base64 输入

图生图也支持使用 Data URI Base64 作为输入图片。

**Data URI 格式**: `data:image/png;base64,BASE64_HERE`

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

## 2.5 响应格式

### URL 输出

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

### Base64 输出

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

## 2.6 Prompt 最佳实践

**文生图**:
```
[主体] + [场景 / 环境] + [风格] + [光照] + [构图] + [质量要求]
```

示例:
```
A luminous floating city above a misty canyon at sunrise, cinematic realism, wide-angle composition, rich architectural details, soft golden light, high visual density
```

**图生图**:
```
[修改要求] + [新风格 / 新场景] + [需要添加或移除的元素] + [需要保留的元素]
```

示例:
```
Change the daytime street scene into a cinematic cyberpunk night scene, add neon signs and wet road reflections, while preserving the original street layout, camera angle, and main building shapes.
```

**高信息密度图片**:
```
A large fantasy harbor city built on cliffs, hundreds of small boats, layered stone bridges, glowing windows, distant mountains, cloudy sunset sky, cinematic fantasy realism, wide-angle composition, rich architectural details, high visual density
```

## 2.7 常见错误与排查

### 错误 1: response_format 放在顶层导致报错

错误写法:
```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A futuristic city",
  "size": "1024x768",
  "response_format": "url"
}
```

正确写法:
```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "A futuristic city",
  "size": "1024x768",
  "extra_body": {
    "response_format": "url"
  }
}
```

### 错误 2: 图生图不需要 tags

不要传:
```json
{ "tags": ["img2img"] }
```

图生图只需要在 `extra_body.image` 数组中提供输入图片。

正确示例:
```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Make the object blue while preserving the original composition",
  "size": "1024x768",
  "extra_body": {
    "image": ["https://example.com/input.png"],
    "response_format": "url"
  }
}
```

### 错误 5: 图生图请求缺少 image

错误示例 (缺少 image):
```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Make the image cyberpunk style",
  "size": "1024x768"
}
```

正确示例:
```json
{
  "model": "agnes-image-2.1-flash",
  "prompt": "Make the image cyberpunk style while preserving the original composition",
  "size": "1024x768",
  "extra_body": {
    "image": ["https://example.com/input.png"],
    "response_format": "url"
  }
}
```

---

# 三、Agnes Video V2.0

**模型名称**: `agnes-video-v2.0`
**创建任务 Endpoint**: `POST https://apihub.agnes-ai.com/v1/videos`
**查询结果 (推荐)**: `GET https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>`
**查询结果 (旧版兼容)**: `GET https://apihub.agnes-ai.com/v1/videos/{task_id}`
**API 类型**: 异步任务式（先创建任务，再轮询查询结果）

## 3.1 能力

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

## 3.2 创建视频任务 - 请求参数

| 参数 | 类型 | 是否必填 | 说明 |
|------|------|----------|------|
| `model` | string | **是** | 模型名称，使用 `agnes-video-v2.0` |
| `prompt` | string | **是** | 视频内容的文本描述 |
| `image` | string / array | 否 | **单图时为 string（顶层放图片 URL）；多图时在 extra_body.image 数组中** |
| `mode` | string | 否 | 生成模式，例如 `ti2vid` 或 `keyframes` |
| `height` | integer | 否 | 视频高度，默认值为 `768` |
| `width` | integer | 否 | 视频宽度，默认值为 `1152` |
| `num_frames` | integer | 否 | 视频帧数，必须 <= 441，且满足 `8n + 1` |
| `frame_rate` | number | 否 | 视频 FPS，支持范围为 1-60 |
| `num_inference_steps` | integer | 否 | 推理步数 |
| `seed` | integer | 否 | 随机种子，用于保证结果可复现 |
| `negative_prompt` | string | 否 | 负向提示词，用于描述需要避免的内容 |
| `extra_body.image` | array | 否 | 多图视频或关键帧模式中的输入图片 URL 数组 |
| `extra_body.mode` | string | 否 | 额外模式设置，例如 `keyframes` |

### image 参数位置说明（关键）

**图生视频（单图）**: `image` 为**顶层** string 类型，值为图片 URL
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "...",
  "image": "https://example.com/image.png"
}
```

**多图视频 / 关键帧动画**: `image` 为 **`extra_body.image`** 数组类型
```json
{
  "model": "agnes-video-v2.0",
  "prompt": "...",
  "extra_body": {
    "image": [
      "https://example.com/image1.png",
      "https://example.com/image2.png"
    ]
  }
}
```

## 3.3 创建视频任务 - 示例

### 3.3.1 文生视频

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

### 3.3.2 图生视频（单图）

**注意: `image` 为顶层 string，不是数组，也不在 extra_body 中。**

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

### 3.3.3 多图视频生成

**注意: 多图时 image 放在 `extra_body.image` 数组中。**

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

### 3.3.4 关键帧动画

**注意: 关键帧模式需要同时设置 `extra_body.image` 和 `extra_body.mode`。**

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

## 3.4 创建任务响应

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

### 创建任务响应字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID，可用于旧版查询接口 |
| `task_id` | string | 任务 ID，作用与 `id` 相同 |
| `video_id` | string | 视频 ID，**推荐用于查询视频结果** |
| `object` | string | 对象类型，通常为 `video` |
| `model` | string | 当前任务使用的模型 |
| `status` | string | 当前任务状态 |
| `progress` | integer | 当前任务进度百分比 |
| `created_at` | integer | 任务创建时间戳 |
| `seconds` | string | 视频时长，单位为秒 |
| `size` | string | 视频分辨率 |

## 3.5 查询视频结果

### 推荐方式：使用 video_id 查询

建议轮询间隔: **5 秒**

```bash
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```

可选参数 `model_name`:
```bash
curl --location --request GET 'https://apihub.agnes-ai.com/agnesapi?video_id=<VIDEO_ID>&model_name=agnes-video-v2.0' \
  --header 'Authorization: Bearer <API_KEY>'
```

### 兼容方式：使用 task_id 查询

```bash
curl --location --request GET 'https://apihub.agnes-ai.com/v1/videos/<TASK_ID>' \
  --header 'Authorization: Bearer <API_KEY>'
```

## 3.6 查询结果响应（任务完成后）

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

### 结果字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 任务 ID |
| `video_id` | string | 视频 ID |
| `model` | string | 当前任务使用的模型 |
| `object` | string | 对象类型 |
| `status` | string | 任务状态 |
| `progress` | integer | 任务进度百分比 |
| `seconds` | string | 视频时长，单位为秒 |
| `size` | string | 视频分辨率 |
| `remixed_from_video_id` | string | **最终生成的视频 URL**，仅在 `status` 为 `completed` 时可用 |
| `error` | object / null | 错误信息，任务失败时返回 |

## 3.7 任务状态说明

| 状态 | 说明 |
|------|------|
| `queued` | 任务正在队列中等待 |
| `in_progress` | 视频正在生成中 |
| `completed` | 视频已生成完成 |
| `failed` | 视频生成失败 |

## 3.8 视频时长控制

计算公式: `seconds = num_frames / frame_rate`

约束:
- `num_frames` 必须 <= 441
- `num_frames` 必须满足 `8n + 1`（即 9, 17, 25, ..., 81, 121, 161, 241, 441）
- `frame_rate` 支持范围为 1-60

### 常用时长参数

| 目标时长 | 推荐参数 |
|----------|----------|
| 约 3 秒 | `num_frames: 81`, `frame_rate: 24` |
| 约 5 秒 | `num_frames: 121`, `frame_rate: 24` |
| 约 10 秒 | `num_frames: 241`, `frame_rate: 24` |
| 约 18 秒 | `num_frames: 441`, `frame_rate: 24` |

## 3.9 推荐参数

| 使用场景 | 推荐设置 |
|----------|----------|
| 标准视频生成 | `width: 1152`, `height: 768`, `num_frames: 121`, `frame_rate: 24` |
| 短视频社交内容 | `num_frames: 81` 或 `121`, `frame_rate: 24` |
| 更长视频 | 增加 `num_frames` 或降低 `frame_rate` |
| 更平滑运动 | 使用 `frame_rate: 24` 或 `30` |
| 可复现结果 | 设置固定 `seed` |
| 关键帧过渡 | 使用 `extra_body.mode: "keyframes"` |
| 避免不需要的内容 | 使用 `negative_prompt` |

## 3.10 Prompt 最佳实践

**文生视频**:
```
[主体] + [动作] + [场景] + [镜头运动] + [光照] + [风格]
```
示例:
```
A young astronaut walking across a red desert planet, dust blowing in the wind, slow cinematic tracking shot, dramatic sunset lighting, realistic sci-fi style
```

**图生视频**:
```
Animate the character with subtle breathing motion, hair moving gently in the wind, background lights flickering softly, while keeping the face and outfit consistent
```

**多图视频**:
```
Use the first image as the starting scene and the second image as the target scene. Create a smooth transformation with consistent lighting, natural motion, and cinematic pacing
```

**关键帧动画**:
```
Create a smooth transition from the first keyframe to the second keyframe, maintaining character identity, consistent camera angle, and natural motion between scenes
```

## 3.11 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 请求无效，请检查请求参数 |
| 401 | 未授权，请检查 API Key |
| 404 | 任务或视频不存在 |
| 500 | 服务器错误 |
| 503 | 服务繁忙，请稍后重试 |

---

# 四、image 参数位置速查表（最关键）

这是最容易出错的地方，汇总如下：

| 模型 | 场景 | image 参数位置 | 类型 |
|------|------|---------------|------|
| **Image 2.0 Flash** | 文生图 | 不传 | - |
| **Image 2.0 Flash** | 图生图（单图/多图） | `extra_body.image` | string[] 数组 |
| **Image 2.1 Flash** | 文生图 | 不传 | - |
| **Image 2.1 Flash** | 图生图（单图/多图） | `extra_body.image` | string[] 数组 |
| **Video V2.0** | 文生视频 | 不传 | - |
| **Video V2.0** | 图生视频（单图） | **顶层 `image`** | string（单个 URL） |
| **Video V2.0** | 多图视频 / 关键帧 | `extra_body.image` | array（URL 数组） |

## response_format 位置速查表

| 模型 | 场景 | response_format 位置 |
|------|------|---------------------|
| Image 2.0 / 2.1 Flash | URL 输出 | `extra_body.response_format: "url"` |
| Image 2.0 / 2.1 Flash | Base64 输出（文生图） | 顶层 `return_base64: true` |
| Image 2.0 / 2.1 Flash | Base64 输出（图生图） | `extra_body.response_format: "b64_json"` |
| Video V2.0 | - | 不适用（视频通过查询接口获取 URL） |

## image 格式支持

| 格式 | 说明 |
|------|------|
| 公网 HTTPS URL | `https://example.com/image.png` |
| Data URI Base64 | `data:image/png;base64,BASE64_HERE` |

---

# 五、接入检查清单

- [ ] 已获得有效 API Key
- [ ] 请求地址正确（Images: `/v1/images/generations`; Video: `/v1/videos`）
- [ ] Header 中已添加 `Authorization: Bearer YOUR_API_KEY`
- [ ] Header 中已添加 `Content-Type: application/json`
- [ ] 模型名称正确（`agnes-image-2.0-flash` / `agnes-image-2.1-flash` / `agnes-video-v2.0`）
- [ ] `response_format` 放在 `extra_body` 中（**不要放顶层**）
- [ ] 图生图不传 `tags: ["img2img"]`
- [ ] 图生图的 `image` 放在 `extra_body.image` 中（图片 API）
- [ ] 图生视频的 `image` 放在**顶层**（视频 API，单图时）
- [ ] 客户端超时设置为 60s-360s
- [ ] 视频任务使用 `video_id` 轮询查询结果（间隔 5s）
