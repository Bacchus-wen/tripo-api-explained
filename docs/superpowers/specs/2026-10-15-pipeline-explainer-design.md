# AI + Tripo 产线讲解网站：设计（2 小时版）

日期：2026-10-15。依据：`ai-3d-pipeline.md` 与 Gemini 4 Argon 3D 工作流文章的合并分析。

## 目标
- 一个公开的中英双语 3D 讲解网站，同时服务三个用途：社区讲解、团队与 AI 的说明书、案例回放。
- 回放的数据全部来自真实运行，网页本身不调用任何付费 API。
- 新增模块（例如宣传视频 Gemini + Seedance、氛围音 ElevenLabs）等于新增一个 `module.json`，网站会自动生成对应的工位或支线。

## 本次范围（2 小时）
- 真跑 1 单：**AI 产线微缩车间** 场景搭建。由 4 个 Tripo 主体道具和程序化桌面组成。
- 网站第一版：工位产线场景、模块卡片、回放模式、自动导览按钮、双语切换、`llms.txt` 输出。
- 不做（留到以后）：第二个案例、滚动驱动的讲解镜头、手机端适配、正式部署。

## 预算（用户已授权）
- 概念图最多 6 张：1 张整体概念图 + 4 张道具参考图 + 1 张重画。
- Tripo 最多 5 次：4 个道具 + 1 次重做，模型 v3.1，`texture=true, pbr=true`。
- 整体概念图需要用户确认后才能继续；之后的调用在预算内不再逐次确认。

## 产线流程（本单）
1. **订单**：`orders/2026-10-15-001.json`。
2. **概念图**：调用 game-assets 图片 MCP，先出整体图，用户签字；再用 `prop_reference` 预设出 4 张道具参考图。
3. **生成**：调用 game-assets 的 `tripo_api.py`，按 plan、run、resume 三步；4 个道具并行提交。
4. **结构质检**：对每个原始 glb 运行 `inspect_asset.py`，保存报告。
5. **Blender 清理与组装**（无界面运行，脚本放在 `layers/process/blender-cleanup/`）：
   - 按 `layout.json` 中的米制目标尺寸缩放；
   - 轴心放到底部中心，重算法线，超出面数上限时减面；
   - 程序化生成桌面和传送带；
   - 按俯视平面图的坐标摆放；
   - 保存 `.blend`，导出 glb 后再导入一次做验证。
6. **四视角渲染**：3/4 总览、近景、低机位、线框。
7. **视觉评审**：由独立的评审子代理查看四张图，列出至少 3 个具体问题并打分。时间允许时修一轮。
8. **入库**：每个资产写 `library/<id>/model.glb` 和 `meta.json`，场景写 `library/workshop-scene/`。
9. **运行记录**：写 `runs/2026-10-15-001/run.json`，每一步的产物复制到 `runs/2026-10-15-001/` 下。
- 汇报口径分开写：文件已生成 / 结构已检查 / Blender 已验证 / 美术评审结果。

## 数据格式

### `layers/<layer>/<id>/module.json`
```json
{
  "id": "tripo-generate",
  "layer": "generate",
  "order": 30,
  "status": "live",
  "name": {"zh": "Tripo 图生 3D", "en": "Tripo Image-to-3D"},
  "summary": {"zh": "...", "en": "..."},
  "tools": ["Tripo API v3.1", "game-assets"],
  "inputs": [{"zh": "道具参考图", "en": "Prop reference image"}],
  "outputs": [{"zh": "带 PBR 贴图的 glb", "en": "glb with PBR textures"}],
  "qa": [{"zh": "...", "en": "..."}],
  "station": {"color": "#3fa7a0", "icon": "printer", "model": null}
}
```
- `layer` 的取值：`create` / `generate` / `process` / `library` / `apps`。
- `status` 的取值：`live` / `planned`。
- 非 `apps` 层的模块按 `order` 排在主传送带上；`apps` 层的模块是资产库之后的支线，`planned` 的支线画成虚线。
- `station.model` 指向资产库里的 glb 时，网站用这个模型替换程序化生成的工位外观。
- 模块同目录下可以放 `SKILL.md`，原样输出给 AI 阅读。

### `runs/<order_id>/run.json`
```json
{
  "order_id": "2026-10-15-001",
  "title": {"zh": "...", "en": "..."},
  "status": "complete",
  "started_at": "ISO8601", "finished_at": "ISO8601",
  "assets": [{"id": "workshop-printer", "name": {"zh": "...", "en": "..."}, "route": "tripo", "model": "library/workshop-printer/model.glb"}],
  "scene": {"model": "library/workshop-scene/scene.glb", "renders": ["runs/2026-10-15-001/renders/overview.png"]},
  "steps": [
    {
      "module": "tripo-generate",
      "asset": "workshop-printer",
      "status": "ok",
      "started_at": "ISO8601", "ended_at": "ISO8601",
      "summary": {"zh": "...", "en": "..."},
      "artifacts": [{"kind": "image", "path": "runs/2026-10-15-001/...", "label": {"zh": "...", "en": "..."}}],
      "metrics": {"triangles": 8628},
      "cost": {"kind": "tripo", "count": 1}
    }
  ]
}
```
- 字段说明：
  - `step.status` 取 `ok` / `warn` / `fail` / `skipped`；
  - `asset` 为 `null` 表示这一步作用于整单；
  - `artifacts.kind` 取 `image` / `model` / `json` / `video` / `text`。
- 所有路径都相对仓库根目录。

## 网站（`site/`）
- 技术：Vite + three.js（原生 JS），静态构建。
- `scripts/prepare-data.mjs` 负责：
  - 汇总所有 `module.json` 和 `run.json`，生成 `public/data/index.json`；
  - 把 run 引用到的文件复制到 `public/data/` 下；
  - 生成 `public/llms.txt` 和 `public/docs/modules/<id>.md`。
- 场景：
  - 深色背景上放一块暖色木纹的微缩桌面，主传送带沿等距方向排布；
  - 工位默认是标准化的机器（颜色和图标来自 `station`），有 `station.model` 的工位换成真实模型；
  - 资产库之后分出各个应用支线。
- 模式：
  - **手册**（默认）：自由视角，点击工位弹出双语模块卡片。
  - **自动导览**：镜头依次停在每个工位上，配一句讲解。
  - **回放**：选择案例后，每个资产以发光方块的形式沿传送带移动，到站时弹出这一步的真实产物和状态；最后在终点展示组装好的场景模型。
- 语言：中文 / English 切换，界面文案与模块数据都是双语。
- 验收：用 Playwright 对三种模式各截图一张，控制台没有报错。

## 实施顺序
1. 数据格式与模块文件（本文件和 `layers/`）。
2. 概念图交给用户签字；同时由后台代理开始搭网站，网站先用程序化工位和占位用的 run。
3. 道具参考图，再到 Tripo 并行提交；等待期间编写 Blender 脚本。
4. 质检、清理组装、四视角渲染、评审，写入 run 和 library。
5. 网站接入真实数据，核心工位换成真实模型，截图自检后交付。

## 风险
- Tripo 排队时间和模型清理不可控。如果卡住，网站照样交付，回放里如实显示停在哪一步和原因。
- `1024x1024` 以外的图片尺寸没有验收过，本次只使用 `1024x1024`。
