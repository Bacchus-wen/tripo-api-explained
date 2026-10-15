# Four-View Critic / 四视角评审

- layer: process
- status: live
- tools: Blender four-view renders, Claude critic sub-agent

Renders overview, close-up, low-angle and wireframe views; an independent critic lists at least three concrete flaws and scores the scene, routing failures back to the right step.

渲染 3/4 总览、近景、低机位、线框四张图，交给独立的评审代理挑至少 3 个具体问题并打分，不合格按问题类型退回对应环节。

## Inputs
- Scene .blend / 场景 .blend

## Outputs
- Four renders, score and flaw list / 四视角截图、评分与问题清单

## QA
- Target 9/10 with a round cap / 目标分数 9/10，轮数有上限
