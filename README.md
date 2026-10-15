# Tripo API 图解 · Tripo API, Explained

用可以动手玩的 3D 演示，帮普通人看懂 Tripo 3D 生成 API；附一次 AI + Tripo + Blender 真实运行的完整记录。

A bilingual (zh/en) interactive site that explains the Tripo 3D generation API to non-engineers, plus the full record of one real AI + Tripo + Blender run.

- 网站 / Site: https://bacchus-wen.github.io/tripo-api-explained/
- 纯文本版 / Plain text for AI readers: `llms.txt`

## 目录 / Layout

| 路径 | 内容 |
|---|---|
| `site/` | 网站（Vite + three.js）。`npm ci && npm run dev` 本地运行 |
| `layers/` | 产线模块，每个模块一个 `module.json`，加模块就是加文件夹 |
| `runs/` | 真实运行记录（订单、截图、质检、评审） |
| `library/` | 资产库：清理后的 glb + `meta.json` |
| `tools/` | Tripo 图片客户端、运行驱动、记录生成脚本 |
| `docs/` | 设计文档、Tripo API V3 调研、讲稿 |
| `ai-3d-pipeline.md` | 产线架构说明 |

推送到 `main` 后，GitHub Actions 会自动构建并发布到 GitHub Pages。
