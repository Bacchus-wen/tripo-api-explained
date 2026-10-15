const LAYERS = [
  ['create', '需求与创意', 'Brief & concept'],
  ['generate', '资产生成', 'Generation'],
  ['process', '处理与评审', 'Processing & review'],
  ['library', '资产库', 'Library'],
  ['apps', '落地场景', 'Destinations'],
];

export function renderModules(view, { t, L, data }) {
  const roles = [
    ['Astra · 规划', t('拆解与编排、操控 Blender 搭场景和氛围、入库前拍板', 'Decomposition and orchestration, drives Blender for scene and mood, final call before the library')],
    ['Astra · 材质与建模', t('生图做材质、写 Blender 脚本补建模', 'Images for materials, Blender scripts for missing parts')],
    ['Tripo API', t('出图与建模：文生图、图生图、图生 3D', 'Images and models: text-to-image, image-to-image, image-to-3D')],
    ['Astra · 质检与评审', t('跑只读结构质检脚本，另开会话看图评审', 'Runs the read-only structural QA script; a separate session reviews the renders')],
    ['Blender', t('无界面脚本：清理、组装、渲染、导出验证', 'Headless scripts: clean, assemble, render, export checks')],
  ];
  view.innerHTML = `
    <section class="mods">
      <div class="run-head">
        <p class="eyebrow">${t('产线是可以插拔的', 'The pipeline is pluggable')}</p>
        <h1>${t('每一层都是模块，加一个模块就是加一个文件夹', 'Every layer is modules; adding one is adding a folder')}</h1>
        <p class="muted">${t('模块之间只通过 glb 和 JSON 对接。新模块写一个 module.json，这个页面和 /llms.txt 会自动出现它。虚线框是规划中的模块。',
          'Modules talk only through glb and JSON. Write a module.json and it appears here and in /llms.txt automatically. Dashed cards are planned modules.')}</p>
      </div>
      <div class="roles">${roles.map(([who, what]) => `<div><b>${who}</b><span>${what}</span></div>`).join('')}</div>
      <div class="lanes">${LAYERS.map(([id, zh, en]) => `
        <div class="lane"><h4>${t(zh, en)}</h4>
          ${data.modules.filter((m) => m.layer === id).map((m) => `
            <div class="mod ${m.status}" style="--c:${m.station.color}">
              <div class="mod-head"><span class="swatch"></span><b>${L(m.name)}</b>
                <span class="chip chip-${m.status === 'live' ? 'verified' : 'unconfirmed'}">${m.status === 'live' ? t('已跑通', 'Live') : t('规划中', 'Planned')}</span></div>
              <p>${L(m.summary)}</p>
              <div class="tools">${m.tools.map((x) => `<code>${x}</code>`).join('')}</div>
              <a class="doc" href="${import.meta.env.BASE_URL}docs/modules/${m.id}.md" target="_blank">${t('纯文本说明', 'Plain-text spec')} →</a>
            </div>`).join('')}
        </div>`).join('')}</div>
    </section>`;
  return null;
}
