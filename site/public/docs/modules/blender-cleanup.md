# Blender Cleanup & Assembly / Blender 清理与组装

- layer: process
- status: live
- tools: Blender 5.2 (headless)

Headless Blender scripts normalise real-world scale, move pivots to the base, recalculate normals, decimate over budget, assemble the scene from the plan, then export and re-import to verify.

无界面 Blender 脚本统一米制尺寸、把轴心放到底部、重算法线、超面数时减面，再按平面图组装场景，导出后重新导入验证。

## Inputs
- Raw glb, layout.json / 原始 glb、layout.json

## Outputs
- Cleaned glb, scene .blend / 清理后的 glb、场景 .blend

## QA
- Save/reopen and export/re-import pass / 保存重开、导出再导入通过
