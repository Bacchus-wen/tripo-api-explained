# Structural QA / 结构质检

- layer: process
- status: live
- tools: inspect_asset.py

Read-only checks on the raw glb: meshes, triangle count, UVs, materials and textures. A structural report does not replace art or Blender checks.

只读检查原始 glb：网格、三角面数、UV、材质与贴图是否齐全。结构报告不能代替美术和 Blender 检查。

## Inputs
- Raw glb / 原始 glb

## Outputs
- QA report JSON / QA 报告 JSON

## QA
- Read every warning; never auto-regenerate on errors / warning 需逐条阅读，不因报错自动重新生成
