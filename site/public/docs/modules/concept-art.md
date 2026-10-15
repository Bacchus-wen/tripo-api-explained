# Concept Art & Sign-off / 概念图与签字

- layer: create
- status: live
- tools: Tripo API text-to-image, Tripo API image-to-image

Tripo text-to-image makes a whole-scene concept to lock style and lighting; after human sign-off, image-to-image extracts a reference per prop from that concept so every asset shares one style. Aligning in 2D is far cheaper than iterating in 3D.

用 Tripo 的 text-to-image 出整体概念图锁定风格和光影，人签字后用 image-to-image 从概念图里抽出每个道具的参考图，保证风格统一。2D 先对齐，比直接改 3D 便宜得多。

## Inputs
- Order / 订单

## Outputs
- Scene concept, prop reference images / 整体概念图、道具参考图

## QA
- Human sign-off / 用户签字
