# Tripo API V3 技术调研

调研日期：2026-10-15。只读文档，未调用任何 Tripo 端点，也未使用 API Key。
标注约定：**已实测** = `/Users/wenbin/Desktop/游戏产线配置/docs/tripo-api-implementation-notes.md` 第 8 节有真实调用记录；**文档确认** = 当前 V3 官方文档写明；**未确认** = 文档缺失、互相矛盾或只出现在迁移表里。凡是文档之间有冲突，都在对应位置写明。

---

## 1. 服务边界

| 项 | 内容 | 状态 |
| --- | --- | --- |
| Base URL | `https://openapi.tripo3d.ai/v3`；中国大陆另有站点 `developers.tripo3d.com`（介绍页提示） | 已实测（balance 和一次建模） |
| 认证 | Header `Authorization: Bearer {api_key}`；Key 在控制台创建，只显示一次。V2 和 V3 共用同一批 Key | 已实测（`GET /v3/account/balance` 返回 HTTP 200 / code 0） |
| 统一响应 | 成功时 `{"code":0,"data":{...}}`；失败时 `{"code":<int>,"message","suggestion","request_id"}` | 文档确认 |
| 异步模式 | 所有生成/处理端点都只返回 `data.task_id`，结果通过 `GET /v3/tasks/{task_id}` 或 Webhook 获取 | 已实测 |
| 下载域名 | 文档示例写的是 `cdn.tripo3d.ai`；实测返回的下载主机是 `tripo-data.rg1.data.tripo3d.com`（下载时不带认证头） | 已实测，与文档示例不同 |

**V2→V3 迁移要点**（[migration](https://developers.tripo3d.ai/en/docs/migration-v2-to-v3)，[changelog](https://developers.tripo3d.ai/en/docs/changelog)）：
- Base URL 从 `https://api.tripo3d.ai/v2/openapi/` 改为 `https://openapi.tripo3d.ai/v3/`。
- V2 的通用 `POST /v2/openapi/task` + `type` 字段，拆成每种能力一个专用端点，请求体不再需要 `type`。
- V2 里的 `file`/`file_token`/`url`/`object` 以及 `draft_model_task_id`、`original_model_task_id` 等输入字段，统一为 `input`。服务端会自动判断传入的是 task_id、file_token 还是 URL。
- 字段改名：`create_time`→`created_at`，`consumed_credit`→`credits_consumed`。
- V2 的文生图和图生图共用一个接口，V3 拆成 `text-to-image` 和 `image-to-image`（V2 `generate_image` 对应 V3 `image-to-image`）。
- task_id 格式不变，V2 创建的任务可以用 V3 查询；V2 和 V3 可以并行灰度迁移。
- V3 新增：`POST /v3/tasks/list`、`POST /v3/files/upload-credentials`（只在 changelog 中提到，没有独立文档页，未确认）、`GET /v3/account/usage`。
- **时间线**（V2 文档顶部公告）：从 2026-10-01 00:00 UTC+8 起，V2 停止功能更新和技术支持；**2026-11-01 00:00 UTC+8（2026-10-31 16:00 UTC）V2 正式下线，所有 V2 端点拒收请求**。
- 自有适配器只走 V3，不要混用 V2 的 `type/file` 结构（本地笔记已按此实现）。

**模型 ID 冲突（重要）**：
- 3D：[models-and-versions](https://developers.tripo3d.ai/en/docs/models-and-versions) 页列的是 `tripo-p1`、`tripo-v3.1`（标为 default）、`tripo-v3.0`、`tripo-v2.5`，quick-start 的原始 markdown 示例也用 `tripo-v3.1`。但所有端点参数表、quick-start 渲染版示例和定价页用的都是带日期 ID：`v3.1-20260211`、`v3.0-20250812`、`v2.5-20250123`、`P1-20260311`、`P2-20260801`（Preview）。端点表把 `model` 标为 **Required**，而模型页却说存在默认值。**真实调用用的是 `v3.1-20260211`，成功（已实测）**；`tripo-v3.1` 这类别名能否被接受未确认。结论：一律传带日期的 ID。
- 图像：models-and-versions 页列出 `gemini-2.5-flash`、`gemini-3-pro`、`gemini-3.1-flash`，示例还写了 `seedream-v5`（连字符）。端点页和定价页对应的是 `banana`、`banana_pro`、`banana2`，以及下划线写法的 `seedream_v5`。实现时以端点页 ID 为准，Gemini 名称和连字符写法都未确认。
- 模型营销页称 H 和 P 系列各有“3 parallel tasks”，Rate Limits 页写的是 H=10、P=5。以 Rate Limits 页为准，实际额度需要上线后观察。

---

## 2. 能力总表

credits 来自 [定价页](https://developers.tripo3d.ai/en/pricing)，1 credit = 0.01 USD。端点页响应示例里的 `credits_consumed` 多为占位值（例如纹理示例写 100.00），**不能拿来当价格**。

### 2.1 图像生成

| 端点 | 作用 | 必填 / 关键可选 | 输出字段 | 场景 | credits |
| --- | --- | --- | --- | --- | --- |
| `POST /v3/generation/text-to-image` | 文生图，不接受参考图 | `prompt` 必填；`model`（默认 `seedream_v4`）、`size`、`quality`、`background`、`aspect_ratio`、`output_format`、`watermark`、`template` | `output.generated_image_url` | 订单→概念图 | 见 §5 |
| `POST /v3/generation/image-to-image` | 编辑、风格迁移、多图融合 | `input` 或 `inputs`；`prompt`（未指定 `template` 时必填）；`model`（默认 `seedream_v5`）、`size`、`quality`、`background`、`aspect_ratio`、`template`、`output_format` | `output.generated_image_url` | 改稿、转 T-pose、`3d_enhance` | 同文生图 |
| `POST /v3/generation/image-to-multiview` | 单图生成四视图 | `input` 必填（file_token 或 URL；PNG/JPEG/WebP） | `output.front_view_url` / `left_view_url` / `back_view_url` / `right_view_url` | 为 multiview-to-model 做预处理，或做转台预览 | 10 |
| `POST /v3/generation/edit-multiview` | 逐视图编辑四视图 | `input`（multiview task_id / file_token / URL）；`prompts[]`，每项为 `{prompt, view: front\|left\|back\|right}` | 文档只给出创建任务的响应，**结果字段未写明** | 四视图局部修正 | 每张被编辑图 5 |
| `POST /v3/openai/images/generations`、`/v3/openai/images/edits` | OpenAI Images 协议兼容，同步阻塞返回 | `model` 只能是 `gpt-image-2` / `gpt-image-2.5-flare` / `gpt-image-2.5-sunburst`；`prompt`；`size`（默认 1024x1024）、`quality`、`background`；`n` 必须为 1；edits 支持 `mask` | `data[0].url`、`tripo.task_id`（响应头 `X-Tripo-Task-Id` 同值） | 直接复用 OpenAI SDK | 与原生端点相同 |

### 2.2 3D 生成

| 端点 | 作用 | 必填 / 关键可选 | 输出字段 | 场景 | credits（无纹理 / 标准纹理） |
| --- | --- | --- | --- | --- | --- |
| `POST /v3/generation/text-to-model`（H） | 文本→3D | `prompt`（≤1024 字符）、`model`；`negative_prompt`（≤255）、`image_seed`，其余参数见下方对比表 | `output.model_url`、`output.rendered_image_url` | 快速出原型 | 10 / 20 |
| `POST /v3/generation/text-to-model`（P） | 文本→低模 | 同上，`model` 取 `P1-20260311` / `P2-20260801` | 同上 | 游戏低模 | P1 30/40；P2 100/110 |
| `POST /v3/generation/image-to-model`（H） | 单图→3D | `input`（file_token / URL / 图像 task_id）、`model`；`enable_image_autofix`、`texture_alignment`、`orientation` | 同上 | **主产线** | 20 / 30（**已实测**：30） |
| `POST /v3/generation/image-to-model`（P） | 单图→低模 | 同上，P 系列模型 | 同上 | 低模资产 | P1 40/50；P2 100/110 |
| `POST /v3/generation/multiview-to-model`（H/P） | 多视图→3D | `inputs` 三选一：view-key 对象数组 / 4 个按位置排列的字符串 `[front,left,back,right]` / `[{"task_id":...}]`；必须有 front，至少 2 张图 | 同上 | 精度要求高的资产 | H 20/30；P1 40/50；P2 100/110 |
| `POST /v3/generation/image-to-splat` | 单图→高斯泼溅 `.splat` | `input`（file_token / URL）；`model_seed` | `output.model_url`（.splat） | 实时写实展示，不产出网格 | 固定 30，约 4 分钟 |

**H 系列（v3.x）与 P 系列参数对比**（各端点参数表）：

| 参数 | H：`v3.1-20260211` / `v3.0-20250812` / `v2.5-20250123` | P：`P1-20260311` / `P2-20260801`（Preview） |
| --- | --- | --- |
| `face_limit` | 不传则自适应。三角面上限：v3.1 标准 1,500,000 / Ultra 2,000,000；v3.0 1,000,000 / 2,000,000；v2.5 500,000；`quad` 150,000；开启 `smart_low_poly` 时固定为三角 500–20,000、四边 500–10,000。文档建议：游戏 50k–100k，Web/移动 10k–50k | P1 50–20,000（P1 模型页写 48–20,000，二者冲突）；P2 三角 48–50,000，`quad=true` 时 48–25,000；建议简单模型从 150 起、复杂模型从 250 起 |
| `texture` / `pbr` | 都默认 `true`；`pbr=true` 会强制 `texture=true`。要裸几何，两项都必须显式设为 `false` | 同左 |
| `texture_quality` | `fast`（需要 texture `v3.5-20260815`）/ `standard` / `detailed` / `extreme`（8K） | 同左 |
| `texture_version`、`delight`、`texture_seed`、`model_seed`、`auto_size`（单位米，默认 false）、`export_uv`（默认 true）、`export_orientation` | 支持 | 支持 |
| `geometry_quality`（`detailed` 即 Ultra，仅 ≥v3.0） | 支持 | P1 不支持 |
| `quad` | 支持；强制输出 **FBX**，不传 face_limit 时默认 10,000 面 | 仅 P2 支持；P1 传 `quad=true` 返回 400 |
| `smart_low_poly`、`generate_parts`、`compress: "geometry"`（meshopt） | 支持（需 model ≥ v3.0-20250812） | P 系列文档未列出；changelog 写明 P1 不支持前两项 |
| `generate_parts` 约束 | 必须 `texture=false` 且 `pbr=false`，否则返回 `1004`（不传 texture 也算默认 true）；传了 `quad` 会被忽略；`smart_low_poly` 优先，此时不产出分件 | — |
| `export_orientation` 警告 | 如果之后还要做 texture/rig/retarget/convert，不要设置此项：后处理可能方向错误，而任务仍报 success。应在最后一步用 `/v3/models/convert` 调整朝向 | 同左 |

### 2.3 后处理

| 端点 | 作用 | 必填 / 关键可选 | 输出 | credits |
| --- | --- | --- | --- | --- |
| `POST /v3/models/texture` | 给已有模型重新生成贴图 | `input`（3D 任务 task_id / file_token / URL；GLB/GLTF/FBX/OBJ/STL，≤150MB）；`model`（默认 `v3.0-20250812`，另有 `v3.5-20260815`、`v2.5-20250123`）；`texture_prompt` 中 `text`、`image`、`images[4]`（顺序 front,left,back,right）三选一，`style_image` 只能配合 `text` 使用；`pbr`、`texture_quality`、`texture_alignment`、`part_names`、`bake`（默认 true）、`delight`。文档强烈建议基于 task_id 重贴图时重新提供参考图 | `model_url`、`rendered_image_url` | Fast 10 / Standard 10 / HD 20 / 8K 30 |
| `POST /v3/models/convert` | 格式转换与导出整理 | `input`；`format` 必填：`GLTF`/`FBX`/`USDZ`/`OBJ`/`STL`/`3MF`；`quad`、`force_symmetry`、`face_limit`、`flatten_bottom`(+`_threshold`)、`texture_size`（默认 4096）、`texture_format`（默认 JPEG）、`bake`、`pack_uv`、`export_vertex_colors`（仅 OBJ/GLTF）、`pivot_to_center_bottom`、`scale_factor`、`with_animation`、`animate_in_place`、`part_names`、`export_orientation`、`fbx_preset`（`blender`/`3dsmax`/`mixamo`/`bake_scale`） | `model_url` | Basic 5；以下任一参数取非默认值即按 Advanced 10 计费：`quad`、`face_limit`、`flatten_bottom(_threshold)`、`texture_size`、`texture_format`、`pivot_to_center_bottom`、`scale_factor` |
| `POST /v3/mesh/decimate`（Retopology） | 减面 / 重拓扑 | `input`；`model`：`v3.0`（可选 `smart_uv`）、`v2.0`（默认）、`v1.0`；`face_limit`：v3.0/v2.0 三角 500–20,000、四边 500–10,000，可省略；v1.0 必填，三角 ≤2,000,000、四边 ≤150,000；`quad`、`bake`、`part_names`（v1.0 不支持后两项）；`smart_uv` 只能用于 v3.0，用在其他版本返回 400/`1004` | `model_url` | v3.0 三角 35 / 四边 40；v2.0 30；v1.0 10 |
| `POST /v3/mesh/uv`（Smart UV） | 重新展 UV，并把原贴图、骨骼、动画映射到新 UV 上 | `input`（≤80,000 等效三角面，超限时任务失败并退回 credits）；`model`（仅 `default`）、`bake`、`export_orientation`、`compress` | `model_url`、`uv_render_url`（UV 图集预览） | 20 |
| `POST /v3/mesh/segment` | 部件分割 | `input`；`model`：`v1.0-20250506`（默认，基于几何）/ `v2.0-20260430`（Beta，带语义标签）；v2 专用参数 `segmentation_granularity`、`split_by_connectivity`、`ref_image` | `model_url`、`rendered_image_url` | 40 |
| `POST /v3/mesh/smartsegment` | 端到端智能分割，含自动建模 | `seg_type`：`image` 或 `model`（仅 GLB，需要 `transform`，16 个浮点数，列主序）；`input`；`granularity`、`hint` | `prompt`、`mask_url`、`seg_model_url`、`seg_task_id`、`model_task_id` | image 85 / model 55 |
| `POST /v3/mesh/complete` | 补全分割后的部件 | `input` 只接受 segment 任务的 task_id；`part_names`；`completion_mode`：`ai_completion`（默认）/ `quick_cap` | `model_url` | 50 / 30 |
| `POST /v3/animations/rig-check` | 判断能否绑骨，并推荐骨骼类型 | `input`（GLB，≤150MB） | `output.riggable`、`output.rig_type` | 免费 |
| `POST /v3/animations/rig` | 自动绑骨 | `input`；`model`：`v1.0-20240301`（只支持 biped，90+ 动作预设）/ `v2.5-20260210`（非人形）；`rig_type`（biped/quadruped/hexapod/octopod/avian/serpentine/aquatic）；`spec`：`tripo` / `mixamo`；`out_format`：`glb` / `fbx` | `model_url` | 25（文档示例显示 30，以定价页为准） |
| `POST /v3/animations/retarget` | 给已绑骨模型套用预设动画 | `input` 只接受 rig 任务的 task_id；`animation` 与 `animations[]` 二选一（如 `preset:walk`、`preset:biped:dance_01`）；`out_format`、`bake_animation`、`export_with_geometry`、`animate_in_place` | 端点页写 `output.model_url`，quick-start 写 `output.model_urls`，**两处冲突** | 每个动画 10 |
| `POST /v3/models/import` | 导入外部模型，供后续处理使用 | `input`（file_token / URL；GLB/GLTF/FBX/OBJ/STL，≤150MB） | 示例为 `model_url` | 未列价 |
| `POST /v3/models/refine`、`POST /v3/models/stylize` | 精修草稿 / 风格化（V2 介绍页称可做乐高、体素风格） | **V3 没有参数文档页**，只出现在迁移表和 Java SDK 覆盖表中 | 未确认 | 未确认 |

### 2.4 文件、任务与账户

| 端点 | 要点 |
| --- | --- |
| `POST /v3/files` | multipart 字段 `file`；图像只收 JPEG/PNG，≤20MB；模型收 GLB/GLTF/FBX/OBJ/STL，≤150MB；返回 `data.file_token`（形如 `file_...`）。**已实测** |
| `POST /v3/files/presign` | `{"format":"glb"}` 返回 `presigned_url`（**30 分钟有效**，`expires_in=1800`）和 `file_token`；用 HTTP PUT 直传且不带认证；超过 60MB 时推荐此方式；图像格式还接受 webp/bmp/tiff |
| `GET /v3/tasks/{task_id}` | 字段：`task_id`、`type`、`status`、`progress`、`output`（仅 success 时有）、`error_code`/`error_message`（失败时）、`credits_consumed`（数值，最多两位小数，不能按整数解析）、`created_at`、`completed_at`。**已实测** |
| `POST /v3/tasks/list` | `task_ids` 每次最多 100 个；返回 `tasks`（以 task_id 为键的对象）和 `missed`（ID 无效、Key 不匹配或已过期的任务） |
| `GET /v3/account/balance` / `GET /v3/account/usage` | `balance`、`frozen`；usage 返回每个任务的 `credits_consumed` 历史。balance **已实测** |
| Webhooks | 在控制台 Settings→Webhooks 配置，**请求体里没有 callback 字段**。事件：`task.completed`、`task.failed`（含取消）、`balance.low`。签名头 `Tripo-Webhook-Signature: t=<unix>,v1=<hex>`，算法为 HMAC-SHA256(`t + "." + rawBody`)；去重用 `Tripo-Webhook-Delivery`；要求约 5 秒内返回 2xx；失败会自动重试 |

---

## 3. 图像生成详解（最重要）

### 3.1 `POST /v3/generation/text-to-image`

文档原文：“Generate an image from a text prompt. Does not accept reference images — use image-to-image for that.”

| 字段 | 类型 / 默认 | 文档要点 |
| --- | --- | --- |
| `prompt` | string，**必填** | 支持中英文；建议 ≤300 个汉字或 ≤600 个英文词，最重要的元素放在前面。**没有 `negative_prompt` 字段**，原文是“Negative prompts: append after `--no`”，即写在 prompt 里 `--no` 之后 |
| `model` | string，默认 `seedream_v4` | 可选值：`seedream_v5`、`seedream_v4`、`banana`、`banana_pro`、`banana2`、`chat_image_1`（**2026-10-23 下线**）、`chat_image_1.5`（2026-12-01 下线）、`chat_image_2`、`chat_image_2.5_flare`、`chat_image_2.5_sunburst` |
| `size` | string，默认 `2048x2048` | 取值规则因模型而异。seedream_v5：分档 `2K`/`3K` 与 `WxH` 二选一，总像素 3.69–10.40MP，宽高比 [1:16,16:1]。seedream_v4：分档 `2K`/`4K`，或 `WxH`（约 3.69–16.78MP）。banana：只能用 10 个固定尺寸（如 `1024x1024`、`1248x832`）。banana_pro：`1K`/`2K`/`4K` 或 WxH。banana2：`0.5K`/`1K`/`2K`/`4K`。chat_image_2 及 2.5：预设尺寸或自定义 WxH，需同时满足：每边 ≤3840 且为 16 的倍数，长边 ≤ 短边的 3 倍，总像素 655,360–8,294,400（例如 `1080x1920` 不合法，应改成 `1088x1920`） |
| `aspect_ratio` | string，默认 `1:1` | **只有 banana 系列支持**（`1:1`、`2:3`、`3:2`、`3:4`、`4:3`、`4:5`、`5:4`、`9:16`、`16:9`、`21:9`；banana2 另支持 `1:8`、`1:4`、`4:1`、`8:1`）。seedream 和 chat_image 只认 `size` |
| `quality` | string，默认 `low` | 只有 `chat_image_2`（low/medium/high）和 2.5 系列（再加 xhigh/max）接受；其他模型传了会报错；**不支持 `auto`** |
| `background` | string | 只有 2.5 系列支持：`auto`/`opaque`/`transparent`。其他模型传了会被静默忽略。`transparent` 必须配合 `output_format=png`，否则报错 |
| `output_format` | `png`（默认）/ `jpeg` | — |
| `watermark` | bool，默认 false | 只对 seedream 生效；banana 一律嵌入不可去除的隐形水印；chat_image 没有水印开关 |
| `template` | string | `asset_extraction`（从场景中抽出主体）、`character_completion`、`t_pose`、`variants`、`figure` |

- **出图数量**：原生端点**没有数量参数**（例如 `n`、`num_images`），一个任务只对应一个 `output.generated_image_url`。要多张图只能提交多个任务。OpenAI 兼容端点明确规定 `n` 必须为 1。
- **种子**：文生图**没有 seed 字段**，无法靠种子复现同一张图。

文档中的请求示例（原样）：

```json
{
  "prompt": "A high-fashion editorial portrait, dramatic studio lighting.",
  "model": "seedream_v5",
  "size": "2K",
  "output_format": "png",
  "watermark": false
}
```

创建响应：`{"code":0,"data":{"task_id":"task_abc123"}}`。任务结果（原样）：

```json
{"code":0,"data":{"task_id":"task_abc123","type":"text_to_image","status":"success","progress":100,
 "output":{"generated_image_url":"https://cdn.tripo3d.ai/output/image.png"},
 "credits_consumed":20.00,"created_at":"2026-04-28T12:00:00Z","completed_at":"2026-04-28T12:00:08Z"}}
```

**图像输出字段是 `data.output.generated_image_url`**。V3 文档中没有 `image_url` 或 `generated_image` 这两个输出字段：`image_url` 只是 OpenAI 兼容 edits 请求的入参，`generated_image` 只是示例文件名。示例里的 `credits_consumed: 20.00` 是占位数字，按定价页 seedream 实际是 5。

### 3.2 `POST /v3/generation/image-to-image`

| 字段 | 文档要点 |
| --- | --- |
| `input` | 主参考图，接受公网 URL、`file_token` 或 `task_id`，只能选一种。jpeg/png（推荐；webp 在部分 provider 路由会被拒）；≤20MB；≤36MP（6000×6000）；最小边 14px；宽高比 [1/3,3] |
| `inputs` | string[]，多张参考图，上限：seedream 4 张、banana 10 张、chat_image 16 张；prompt 里用 `image[1]`、`image[2]` 引用。**冲突**：`input` 标为 Required，但官方多图示例只传了 `inputs`，没传 `input` |
| `prompt` | 未指定 `template` 时必填 |
| `model` | 默认 `seedream_v5`。可选：`seedream_v5`、`banana`、`banana_pro`、`banana2`、`chat_image_1/1.5/2`、`chat_image_2.5_flare`、`chat_image_2.5_sunburst`（sunburst 对未编辑区域保留得最好）。**图生图不列 `seedream_v4`** |
| `template` | `t_pose`、`character_completion`、`3d_enhance`（“enhance for 3D generation”）、`variants`、`figure`；设置后 prompt 可选 |
| `size` / `quality` / `background` / `aspect_ratio` / `output_format` | 规则同文生图。**图生图没有 `watermark` 字段** |

文档示例：`{"input":"https://example.com/reference.png","prompt":"Change the silver outfit into transparent glass.","model":"seedream_v5","size":"2K"}`；结果 `type:"image_to_image"`，输出同为 `output.generated_image_url`。

### 3.3 把图像任务直接接到 3D

- image-to-model（H/P）的 `input` 原文写明接受 “task_id — The task ID from a previous image generation task (`text_to_image` or `image_to_image`). The system automatically extracts the output image.”，即**可以把 Tripo 图像任务 ID 直接传给建模，无需下载再上传**：
  `POST /v3/generation/image-to-model` 请求体 `{"input":"<text_to_image 的 task_id>","model":"v3.1-20260211"}`。文档确认，**未实测**。文档没说源任务是否必须先到 success，建议等它 success 后再提交。
- image-to-image 的 `input`/`inputs` 也接受图像任务输出，可以先文生图再改图，链路上不落地文件。
- multiview-to-model 接受 `inputs: [{"task_id":"<uuid>"}]`，源任务必须是 success，且类型为 `generate_multiview_image` 或 `edit_multiview_image`。edit-multiview 接受 multiview 任务的 task_id。
- **文档未写明**：`image-to-multiview` 的 `input` 能否接受文生图的 task_id（文档只列了 file_token 和 URL）；OpenAI 兼容端点返回的 `tripo.task_id` 能否作为 image-to-model 的 `input`；`image-to-splat` 能否接受 task_id（同样只列了 file_token 和 URL）。
- 外部图像（GPT/Lumina 等）的任务 ID 不能当作 Tripo 的 task_id，只能传文件（上传得到 file_token）或公网直链（本地笔记的结论）。

### 3.4 图像生成的工程约束

- 图像生成并发**每个账户只有 1**：text-to-image、image-to-image、image-to-multiview、edit-multiview 共用一个并发池，这是批量出概念图的主要瓶颈。
- OpenAI 兼容端点会阻塞等待，通常 20–80 秒。超过 240 秒会返回 400 `generation_in_progress`，此时已扣费一次，应该轮询 `GET /v3/tasks/{task_id}`，不要重新提交。
- 图像下载链接的有效期**文档未写**（模型链接写的是 5 分钟）。按同样的临时 URL 处理：任务 success 后立即下载并记录哈希。

---

## 4. 任务生命周期、限流、错误码、幂等边界、下载时效

**状态机**（[task-lifecycle](https://developers.tripo3d.ai/en/docs/task-lifecycle)）：`queued`→`running`→`success | failed | cancelled`，另有 `banned`（内容违规）和 `expired`（产物已不可用）。Task Query 页的状态表只列出前 5 种，查询逻辑必须兼容全部 7 种。

**轮询**：文档建议每 1–2 秒查一次，quick-start 提示不要超过每秒 1 次；建议设置总超时（例如 5 分钟）；批量任务用 `tasks/list`。生成通常需要 10–120 秒；**实测 v3.1 带纹理约 111.67 秒**。

**计费冻结**：创建任务时冻结 credits，成功后扣除，失败或取消时释放。客户端超时不能用来推断 credits 已经释放。

**限流**（[rate-limits](https://developers.tripo3d.ai/en/docs/rate-limits)）：
- 频率按 API Key 计算，生成类端点的上限低于查询类。超限返回 429 / code `1007`。响应头带 `X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`（Unix 秒）。
- 并发按账户和任务类别计算，满额时返回 429 / code `2000`，并带 `Retry-After`。默认额度：H 生成 10、P 生成 5、**图像 1**、动画 10、模型处理（texture/convert/refine）5、网格（segment/complete/decimate）10。
- 退避顺序：先看 `Retry-After`，再看 `X-RateLimit-Reset`，最后用指数退避（1→32 秒）。

**错误码**（[error-handling](https://developers.tripo3d.ai/en/docs/error-handling)）：
- HTTP 400/401/403/404/429/500。业务码：1000 Key 无效、1001 未授权、2000 限流（**与 rate-limits 页把 2000 定义为并发超限冲突**）、2002 参数不支持、2003 空文件、2004 文件类型不支持、2008 内容违规、2010 credits 不足、2015 版本已弃用、2018 模型过于复杂。
- 端点页还使用了 `1004`（参数组合非法）和 `1007`（频率），这两个码都没有收进错误码表。
- 400/401/403 不应重试；429/500 可退避重试，最多 5 次。
- Webhook 的 `task.failed` 载荷用 `data.error.code`（字符串，例如 `"task_failed"`），而任务查询用整数 `error_code`，两边结构不一致。

**幂等边界**：
- V3 **没有** `Idempotency-Key`，也没有承诺会自动复用重复请求创建的任务。
- 固定 `model_seed`/`texture_seed` 只能复现结果，不能去重；同一输入再次提交就是一次新的计费任务。
- Webhook 的 `Tripo-Webhook-Delivery` 只用于通知去重。
- OpenAI 兼容端点即使出错也返回 `X-Tripo-Task-Id`，可以用来对账；原生端点在创建响应丢失时**无法得到 task_id**。
- 因此必须维护本地 **operation ledger**：`operation_id`、输入哈希、规范化请求哈希、模型版本、`file_token`、`task_id`、状态、本地文件哈希。POST 发出但响应丢失时记为 `submission_unknown`，禁止自动重新提交，只允许人工对账（可借助 `GET /v3/account/usage` 按时间查找）。GET 轮询和下载可以有限次重试。这套机制本地已实现，并实测验证过“完成后再次 run 时零网络请求”。

**下载时效**：
- quick-start 原文：“Model URLs expire after 5 minutes. Download immediately after the task succeeds.” 下载请求不要带 Authorization（SDK 页也这样要求）。
- 链接过期后重新 GET 原任务获取新输出；本地实测中“resume 原任务后下载”成功过一次。
- 任务的保留时长、`expired` 何时触发，**文档未写**。`file_token` 有效期**文档未写**。presigned 上传 URL 有效 30 分钟。

---

## 5. 计费（credits；1 credit = $0.01，最少充值 $1）

- **3D H 系列**：文本→3D 10（无纹理）/ 20（标准纹理）；图像→3D 20/30；多视图→3D 20/30。叠加项：HD 纹理（`detailed`）+10、8K Ultra 纹理（`extreme`）+20、HD 几何（`geometry_quality=detailed`）+20、Quad +5、Smart Low-poly +10、Generate Parts +20。
  - **实测**：image-to-model `v3.1-20260211`，参数 `texture=true, pbr=true, face_limit=10000, export_uv=true`，返回 `credits_consumed=30.0`，与“图像→3D 标准纹理 30”一致；`pbr` 和 `face_limit` 没有额外加价。
- **3D P 系列**：P1 文本 30/40，图像 40/50，多视图 40/50（详细纹理分别为 50/60/60）；P2 不分输入类型，无纹理 100，标准/详细/extreme 为 110/120/130。**P 系列比 H 系列贵**，quick-start 用 P1 搭“游戏角色”管线，估算约 85 credits、约 105 秒。
- **Splat**：30。
- **模型处理**：Texture Fast 10 / Standard 10 / HD 20 / 8K 30；Convert Basic 5 / Advanced 10；Retopology v3.0 三角 35 / 四边 40，v2.0 30，v1.0 10（`smart_uv` 不另加价）；Smart UV 20；Segmentation 40；Part Completion 50（默认）/ 30（Quick Cap）；Smart Segmentation 图像 85 / 模型 55。
- **动画**：Rig Check 免费；Auto Rig 25；Retarget 每个动画 10。
- **图像**（价格按 ≤1K / 2K / 4K 三档）：
  - seedream_v5/v4：一律 5。
  - banana：5（只有 ≤1K 档）；banana2：10/10/15；banana_pro：15/15/20。
  - chat_image_1：5；chat_image_1.5：10；chat_image_2、2.5_flare、2.5_sunburst：10/10/15。
  - GPT 质量档：`high` 20/25/40；2.5 系列 `xhigh` 25/30/45，`max` 30/50/50。不传 quality 或传 low/medium 按基础价；`size=auto` 按 2K 档计费。
  - Image to Multiview 10；Edit Multiview 每张被编辑图 5。
- **未列价**：`models/import`、`models/refine`、`models/stylize`。

---

## 6. 对我们产线的映射

产线：订单 → 概念图 → 图生 3D → 结构 QA → Blender 清理 → 四视图 critic → 资产库 → 应用（Blender 展示 / three.js / UE / TouchDesigner）。

| 产线阶段 | 可接入的 Tripo 端点 | 能替代或缩短什么 | 状态 |
| --- | --- | --- | --- |
| 订单 → 概念图 | `text-to-image`（`template: t_pose / figure / asset_extraction`），`image-to-image`（`template: 3d_enhance / character_completion`），GPT 系列可用 `background: transparent` | 可替代“GPT Image MCP 出图 → 本地落盘 → `/v3/files` 上传”这一段：图像 task_id 能直接作为 image-to-model 的 `input`。代价：图像并发只有 1、没有 seed、没有出图数量参数，`chat_image_1` 将于 2026-10-23 下线 | 文档确认 / 未实测 |
| 概念图 → 多视图 | `image-to-multiview` → 可选 `edit-multiview` → `multiview-to-model` 的 `[{"task_id"}]` | 能缩短“人工补背面图”的工作；四视图 URL 也能作为 critic 的参考图 | 文档确认 |
| 图生 3D | `image-to-model` H `v3.1-20260211`（file_token 输入） | 主路径。实测：约 112 秒、30 credits、GLB 3,469,120 字节、8,628 三角面（face_limit 设为 10000）、PBR 贴图 Color/ORM/NormalGL 各 2048² | **已实测** |
| 图生 3D（低模分支） | `image-to-model` P1/P2，或 H 系列 + `smart_low_poly` | 游戏和移动端资产可以直接拿到受控面数，省去 Blender 减面 | 文档确认 |
| 结构 QA | `rig-check`（免费，返回 riggable/rig_type）；`rendered_image_url` 预览图；`mesh/uv` 的 `uv_render_url` | Tripo **没有**网格质检端点；水密、法线、尺度仍需我们自己的检查器和 Blender 来做 | 文档确认（只能提供辅助信号） |
| Blender 清理：减面/重拓扑 | `mesh/decimate` v3.0（`smart_uv`、`quad`、`bake`） | 可替代 Blender Decimate 修改器或手工重拓扑，而且能把纹理烘焙到低模上 | 文档确认 |
| Blender 清理：UV | `mesh/uv`（≤80k 三角面），或生成时 `export_uv=true` | 可替代 Blender 的 Smart UV Project 和烘焙重映射 | 生成时 `export_uv` 已实测（产出 UVMap）；`mesh/uv` 文档确认 |
| Blender 清理：枢轴/尺度/朝向/底面 | 生成时 `auto_size`；`models/convert` 的 `pivot_to_center_bottom`、`scale_factor`、`flatten_bottom`、`export_orientation`、`fbx_preset` | 可缩短 Blender 里的变换归零和导出设置；但实测 Blender 中最长边 2 米只用于预览，真实尺度仍需人工核对 | 文档确认 |
| 重贴图（替代 AI 换肤） | `models/texture`：`texture_prompt.text`、`image`，或 4 张 `images`；`texture_version: v3.5-20260815` + `delight` | 可替代“GPT 贴图 → Blender 投影/烘焙”。注意它是 Tripo 重新生成纹理，不会原样贴上 GPT 的像素 | 文档确认 / 未实测 |
| 分件 | 生成时 `generate_parts`（必须无纹理），`mesh/segment`，`mesh/smartsegment`，`mesh/complete` | 可替代 Blender 手工拆件和补洞 | 文档确认 |
| 绑骨 / 动画 | `rig-check` → `rig`（`spec: mixamo` 或 `tripo`，`out_format: glb/fbx`）→ `retarget`（预设动作） | 对人形和常见四足角色，可替代 Blender/Mixamo 手工绑骨；只能用预设动作，不能自定义关键帧 | 文档确认 |
| 四视图 critic | 只有一张 `rendered_image_url`；`image-to-multiview` 能给出概念四视图作为对照 | Tripo 不渲染模型的四视图，critic 渲染仍由 Blender 负责 | 文档确认 |
| 资产库 | `GET /v3/tasks/{id}`、`tasks/list`、`account/usage`（成本台账）、Webhook | Tripo 不提供永久存储（URL 5 分钟有效，任务会 expired），必须落地文件并记录 SHA-256 和 manifest | 文档确认；落地流程已实测 |
| 应用：Blender 展示 | GLB 直接导入 | 实测：Blender 5.2.0 导入、保存 .blend、重开、渲染、派生 GLB 再导入全部通过 | **已实测** |
| 应用：three.js | GLB/GLTF；`compress: geometry`（meshopt，需要 three.js 端配 MeshoptDecoder）；Splat 需要单独的 splat 查看器 | — | 文档确认 / meshopt 兼容性未确认 |
| 应用：UE | `convert` 到 FBX；rig 时用 `spec: mixamo`，`fbx_preset` | 文档推荐 Unreal/Unity 使用 mixamo 规范 | 文档确认 |
| 应用：TouchDesigner | 文档没有专门说明；可用 GLB/FBX/OBJ | — | 未确认 |
| 风格化 / 精修 | `models/stylize`、`models/refine` | 可能替代体素化等风格处理 | **未确认**（V3 无参数文档） |

**实施建议**：
- 第一阶段只接 `files` → `image-to-model` H → `tasks` → 下载。
- 第二阶段按需求单独评估以下替代项，每项先做 1 次受控付费试跑，再用 Blender 验收：`mesh/decimate` v3.0（替代减面）、`models/texture`（替代 AI 换肤）、`rig` 系列（替代绑骨）、`text-to-image` 的 task_id 链路（替代 GPT 出图上传）。
- 后处理链上**不要**设置 `export_orientation`，朝向统一在最后的 `convert` 里调整。

---

## 7. 来源（实际读过的 URL）

V3 文档（2026-10-15 抓取；页面是预渲染 HTML，用 curl 取到；`mesh-smartsegment`、`generation-image-to-splat`、定价页 P/Splat 标签用 Firecrawl 抓取）：
- https://developers.tripo3d.ai/sitemap.xml
- https://developers.tripo3d.ai/en/docs/introduction
- https://developers.tripo3d.ai/en/docs/quick-start
- https://developers.tripo3d.ai/en/docs/authentication
- https://developers.tripo3d.ai/en/docs/changelog
- https://developers.tripo3d.ai/en/docs/sdk
- https://developers.tripo3d.ai/en/docs/task-lifecycle
- https://developers.tripo3d.ai/en/docs/models-and-versions
- https://developers.tripo3d.ai/en/docs/billing
- https://developers.tripo3d.ai/en/docs/generation-text-to-model/standard
- https://developers.tripo3d.ai/en/docs/generation-text-to-model/p
- https://developers.tripo3d.ai/en/docs/generation-image-to-model/standard
- https://developers.tripo3d.ai/en/docs/generation-image-to-model/p
- https://developers.tripo3d.ai/en/docs/generation-multiview-to-model/standard
- https://developers.tripo3d.ai/en/docs/generation-multiview-to-model/p
- https://developers.tripo3d.ai/en/docs/generation-image-to-splat
- https://developers.tripo3d.ai/en/docs/generation-text-to-image
- https://developers.tripo3d.ai/en/docs/generation-image-to-image
- https://developers.tripo3d.ai/en/docs/generation-image-to-multiview
- https://developers.tripo3d.ai/en/docs/generation-edit-multiview
- https://developers.tripo3d.ai/en/docs/openai-compat-images
- https://developers.tripo3d.ai/en/docs/models-texture
- https://developers.tripo3d.ai/en/docs/mesh-segment
- https://developers.tripo3d.ai/en/docs/mesh-smartsegment
- https://developers.tripo3d.ai/en/docs/mesh-complete
- https://developers.tripo3d.ai/en/docs/mesh-decimate
- https://developers.tripo3d.ai/en/docs/mesh-uv
- https://developers.tripo3d.ai/en/docs/models-convert
- https://developers.tripo3d.ai/en/docs/models-import
- https://developers.tripo3d.ai/en/docs/animations-rig-check
- https://developers.tripo3d.ai/en/docs/animations-rig
- https://developers.tripo3d.ai/en/docs/animations-retarget
- https://developers.tripo3d.ai/en/docs/task-query
- https://developers.tripo3d.ai/en/docs/task-batch-query
- https://developers.tripo3d.ai/en/docs/files
- https://developers.tripo3d.ai/en/docs/files-presign
- https://developers.tripo3d.ai/en/docs/account
- https://developers.tripo3d.ai/en/docs/error-handling
- https://developers.tripo3d.ai/en/docs/rate-limits
- https://developers.tripo3d.ai/en/docs/webhooks
- https://developers.tripo3d.ai/en/docs/migration-v2-to-v3
- https://developers.tripo3d.ai/en/pricing（含 H / P / Splat 三个标签）
- https://developers.tripo3d.ai/en/models 、https://developers.tripo3d.ai/en/models/v3-1 、https://developers.tripo3d.ai/en/models/p1

V2（只用于迁移说明）：
- https://platform.tripo3d.ai/docs/（重定向到 /docs/introduction；页首有 V2 下线公告）

本地实测依据：
- /Users/wenbin/Desktop/游戏产线配置/docs/tripo-api-implementation-notes.md（第 8 节）
