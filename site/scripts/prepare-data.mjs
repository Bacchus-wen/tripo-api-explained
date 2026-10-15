// Collect modules, runs and generated images from the repo into site/public for the static build.
// Also emits plain-text docs for AI readers (llms.txt + one Markdown file per module).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repo = path.resolve(site, '..');
const pub = path.join(site, 'public');
const out = path.join(pub, 'data');
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(path.join(out, 'images'), { recursive: true });

const walk = (dir, name) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(dir, e.name);
  return e.isDirectory() ? walk(p, name) : e.name === name ? [p] : [];
}) : [];
const copy = (rel) => {
  const src = path.join(repo, rel);
  if (!fs.existsSync(src)) return false;
  const dst = path.join(out, rel);
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  return true;
};

const modules = walk(path.join(repo, 'layers'), 'module.json').map((f) => {
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  const skill = path.join(path.dirname(f), 'SKILL.md');
  m.skill = fs.existsSync(skill) ? fs.readFileSync(skill, 'utf8') : null;
  if (m.station?.model) copy(m.station.model);
  return m;
}).sort((a, b) => a.order - b.order);

const runs = walk(path.join(repo, 'runs'), 'run.json').map((f) => {
  const run = JSON.parse(fs.readFileSync(f, 'utf8'));
  const refs = [
    ...run.steps.flatMap((s) => (s.artifacts || []).map((a) => a.path)),
    ...(run.assets || []).map((a) => a.model),
    run.scene?.model, ...(run.scene?.renders || []),
  ].filter(Boolean);
  refs.forEach(copy);
  return run;
});

const imgRoot = path.join(repo, 'assets/generated/tripo-images');
const images = fs.existsSync(imgRoot) ? fs.readdirSync(imgRoot).filter((op) =>
  fs.existsSync(path.join(imgRoot, op, 'image.png'))) : [];
images.forEach((op) => fs.copyFileSync(path.join(imgRoot, op, 'image.png'), path.join(out, 'images', `${op}.png`)));

fs.writeFileSync(path.join(out, 'index.json'), JSON.stringify({ modules, runs, images }, null, 1));

// Plain-text exports for AI agents and search engines.
const docs = path.join(pub, 'docs', 'modules');
fs.rmSync(path.join(pub, 'docs'), { recursive: true, force: true });
fs.mkdirSync(docs, { recursive: true });
const api = JSON.parse(fs.readFileSync(path.join(site, 'src/data/tripo-api.json'), 'utf8'));
for (const m of modules) {
  const lines = [`# ${m.name.en} / ${m.name.zh}`, '', `- layer: ${m.layer}`, `- status: ${m.status}`,
    `- tools: ${m.tools.join(', ')}`, '', m.summary.en, '', m.summary.zh, '',
    '## Inputs', ...m.inputs.map((x) => `- ${x.en} / ${x.zh}`), '', '## Outputs', ...m.outputs.map((x) => `- ${x.en} / ${x.zh}`)];
  if (m.qa?.length) lines.push('', '## QA', ...m.qa.map((x) => `- ${x.en} / ${x.zh}`));
  if (m.skill) lines.push('', '## SKILL.md', '', m.skill);
  fs.writeFileSync(path.join(docs, `${m.id}.md`), lines.join('\n') + '\n');
}
const llms = [
  '# Tripo API, Explained — AI + Tripo 3D asset pipeline',
  '',
  '> A bilingual (zh/en) interactive site that explains the Tripo 3D generation API to non-engineers, and shows a real end-to-end run of an AI + Tripo + Blender asset pipeline.',
  '',
  `API base: ${api.base}`,
  '',
  '## Tripo API features',
  ...api.features.map((f) => `- ${f.name.en} (${f.endpoint}) [${f.status}]: ${f.what.en}`),
  '',
  '## Pipeline modules',
  ...modules.map((m) => `- [${m.name.en}](/docs/modules/${m.id}.md) [${m.layer}, ${m.status}]: ${m.summary.en}`),
  '',
  '## Real runs',
  ...runs.map((r) => `- ${r.order_id}: ${r.title.en} (${r.status})`),
];
fs.writeFileSync(path.join(pub, 'llms.txt'), llms.join('\n') + '\n');
console.log(`prepared ${modules.length} modules, ${runs.length} runs, ${images.length} images`);
