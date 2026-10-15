# Tripo Image-to-3D / Tripo 图生 3D

- layer: generate
- status: live
- tools: Tripo API v3.1, game-assets tripo_api.py

Calls the Tripo API with a prop reference to produce a model with PBR textures. Best for characters, creatures, organic shapes and complex hero props.

用道具参考图调用 Tripo 直连 API 生成带 PBR 贴图的模型。适合角色、生物、有机形体和造型复杂的主体道具。

## Inputs
- Prop reference image / 道具参考图

## Outputs
- glb with PBR textures / 带 PBR 贴图的 glb

## QA
- Keep task_id; never auto-resubmit paid requests / 保存 task_id，不自动重复提交付费请求
