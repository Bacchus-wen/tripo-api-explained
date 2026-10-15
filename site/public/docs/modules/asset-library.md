# Asset Library / 资产库

- layer: library
- status: live
- tools: glb + meta.json

Every asset is stored as glb plus meta.json with source, order, size, triangle count and QA results. Downstream scenes only take from here.

所有资产统一存成 glb 加 meta.json，记录来源、订单、尺寸、面数、质检结果。下游场景只从这里取货。

## Inputs
- Approved assets / 通过评审的资产

## Outputs
- library/<id>/ / library/<id>/

## QA
- Complete meta.json / meta.json 字段完整
