// Scoped styles for the image-gen demo (root class .d-ig).
export const IG_CSS = `
.d-ig{position:absolute;inset:0;container-type:size;color:#ece9e3;font-size:13px;overflow:hidden;
  background:radial-gradient(120% 90% at 30% 20%,#23252b 0%,#15171c 55%,#0e0f12 100%)}
.d-ig *{box-sizing:border-box}
.d-ig .ig-main{position:absolute;left:16px;right:16px;top:42px;bottom:68px;display:grid;grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);gap:0 52px}
.d-ig .ig-col{display:flex;flex-direction:column;min-height:0;min-width:0;gap:8px}
.d-ig .ig-head{display:flex;align-items:baseline;gap:8px;font-size:12px;color:#9a9fa8;white-space:nowrap;overflow:hidden}
.d-ig .ig-head b{display:inline-grid;place-items:center;width:18px;height:18px;border-radius:50%;background:#2a2e36;color:#ffb347;font-size:11px;flex:none;transition:background .4s,color .4s}
.d-ig .ig-head.on b{background:#ffb347;color:#15171c}
.d-ig .ig-head span{overflow:hidden;text-overflow:ellipsis}
.d-ig .ig-head code{font-family:var(--mono);font-size:11px;color:#3fa7a0}
.d-ig .ig-prompt{font:11.5px/1.55 var(--mono);color:#cfd3da;background:#0f1114;border:1px solid #262a32;border-radius:8px;padding:6px 10px;
  flex:none;height:calc(1.55em * 2 + 14px);overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.d-ig .ig-prompt i{font-style:normal;color:#e07a3f}
.d-ig .ig-prompt .caret{display:inline-block;width:7px;height:1.1em;vertical-align:-2px;background:#ffb347;margin-left:1px;animation:igblink 1s steps(1) infinite}
@keyframes igblink{50%{opacity:0}}
.d-ig .ig-stagewrap{flex:1;min-height:0;container-type:size;display:flex;align-items:center;justify-content:center}
.d-ig .ig-frame{position:relative;width:min(100cqw,150cqh);aspect-ratio:3/2;border-radius:12px;overflow:hidden;cursor:zoom-in;
  background:#0c0d10;box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 0 1px rgba(255,255,255,.06)}
.d-ig .ig-frame>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:blur(22px) saturate(.2) brightness(.7);transform:scale(1.08);opacity:0}
.d-ig .ig-frame canvas{position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:screen;opacity:0;pointer-events:none;image-rendering:pixelated}
.d-ig .ig-scan{position:absolute;left:0;right:0;top:0;height:2px;background:linear-gradient(90deg,transparent,#ffb347,transparent);
  box-shadow:0 0 18px 4px rgba(255,179,71,.35);opacity:0;pointer-events:none}
.d-ig .ig-status{position:absolute;left:10px;top:10px;font:11px var(--mono);color:#ece9e3;background:rgba(12,13,16,.72);border:1px solid #2c313a;
  border-radius:999px;padding:3px 10px 3px 8px;display:flex;gap:6px;align-items:center;opacity:0;transition:opacity .3s;backdrop-filter:blur(4px)}
.d-ig .ig-status i{width:7px;height:7px;border-radius:50%;background:#ffb347;box-shadow:0 0 8px #ffb347}
.d-ig .ig-status.ok i{background:#7cc49a;box-shadow:0 0 8px #7cc49a}
.d-ig .ig-box{position:absolute;border-radius:6px;pointer-events:none}
.d-ig .ig-box svg{position:absolute;inset:-2px;width:calc(100% + 4px);height:calc(100% + 4px);overflow:visible}
.d-ig .ig-box rect{fill:rgba(255,179,71,.06);stroke:#ffb347;stroke-width:1.6;vector-effect:non-scaling-stroke}
.d-ig .ig-box em{position:absolute;left:-1px;top:-19px;font:600 10.5px var(--mono);font-style:normal;color:#15171c;background:#ffb347;
  border-radius:4px 4px 4px 0;padding:1px 6px;white-space:nowrap;opacity:0;transform:translateY(4px);transition:opacity .3s,transform .3s}
.d-ig .ig-box.in em{opacity:1;transform:none}
.d-ig .ig-facts{display:flex;flex-wrap:nowrap;gap:5px;min-height:22px;overflow:hidden;flex:none}
.d-ig .ig-facts span{flex:none}
.d-ig .ig-facts span{font:11px var(--mono);background:#1b1e24;border:1px solid #2c313a;border-radius:999px;padding:2px 9px;color:#cfd3da;
  opacity:0;transform:translateY(4px);transition:opacity .35s,transform .35s}
.d-ig .ig-facts span.in{opacity:1;transform:none}
.d-ig .ig-facts span.hl{border-color:rgba(224,122,63,.6);color:#ffb347}
.d-ig .ig-cards{flex:1;min-height:0;display:grid;grid-template-columns:1fr 1fr;grid-auto-rows:minmax(0,1fr);gap:10px}
.d-ig .ig-cards.one{grid-template-columns:1fr}
.d-ig .ig-card{position:relative;min-height:0;display:flex;flex-direction:column;background:#1b1e24;border:1px solid #2c313a;border-radius:10px;
  overflow:hidden;cursor:zoom-in;transition:border-color .4s,box-shadow .4s,transform .25s}
.d-ig .ig-card:hover{transform:translateY(-2px);border-color:#4a505c}
.d-ig .ig-card.got{border-color:rgba(255,179,71,.55);box-shadow:0 0 0 3px rgba(255,179,71,.08)}
.d-ig .ig-thumb{position:relative;flex:1;min-height:0;background:repeating-linear-gradient(45deg,#1f2228 0 6px,#1b1e24 6px 12px)}
.d-ig .ig-thumb img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transform:scale(1.06);transition:opacity .6s,transform .9s cubic-bezier(.2,.8,.2,1)}
.d-ig .ig-card.got .ig-thumb img{opacity:1;transform:none}
.d-ig .ig-lab{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:4px 8px;font-size:12px;white-space:nowrap}
.d-ig .ig-lab span{overflow:hidden;text-overflow:ellipsis}
.d-ig .ig-lab code{font:10px var(--mono);color:#3fa7a0;opacity:.35;transition:opacity .4s}
.d-ig .ig-card.got .ig-lab code{opacity:1}
.d-ig .ig-ghost{position:absolute;z-index:6;border-radius:6px;pointer-events:none;background-repeat:no-repeat;
  box-shadow:0 10px 30px rgba(0,0,0,.55),0 0 0 1.5px #ffb347;will-change:transform,opacity}
.d-ig svg.ig-links{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5;overflow:visible}
.d-ig .ig-links path{fill:none;stroke:#ffb347;stroke-width:1.4;stroke-linecap:round;opacity:.85}
.d-ig .ig-links path.flow{stroke-dasharray:3 7;opacity:.45;animation:igflow 1.4s linear infinite}
.d-ig .ig-links circle{fill:#ffb347}
@keyframes igflow{to{stroke-dashoffset:-20}}
.d-ig .ig-to3d{position:absolute;right:16px;bottom:18px;z-index:3;display:flex;align-items:center;gap:10px;padding:8px 14px 8px 12px;border-radius:12px;
  background:linear-gradient(90deg,rgba(63,167,160,.14),rgba(255,179,71,.14));border:1px solid rgba(255,179,71,.35);font-size:13px;
  opacity:.22;filter:grayscale(1);transition:opacity .6s,filter .6s,box-shadow .6s;max-width:calc(100% - 360px);white-space:nowrap}
.d-ig .ig-to3d.in{opacity:1;filter:none;box-shadow:0 0 30px rgba(255,179,71,.18)}
.d-ig .ig-to3d b{color:#ffb347;font-size:15px}
.d-ig .ig-to3d small{color:#9a9fa8;font-size:11px;overflow:hidden;text-overflow:ellipsis}
.d-ig .ig-to3d .arr{display:inline-block;color:#ffb347;font-size:18px;transition:transform .6s}
.d-ig .ig-to3d.in .arr{animation:ignudge 1.6s ease-in-out infinite}
@keyframes ignudge{50%{transform:translateX(4px)}}
.d-ig .ig-empty{position:absolute;inset:0;display:grid;place-items:center;text-align:center;padding:16px;color:#9a9fa8;border:1px dashed #3a3f4a;border-radius:10px;line-height:1.6}
.d-ig .demo-panel .demo-seg button{white-space:nowrap}
.d-ig .ig-steps{display:flex;gap:4px;align-items:center}
.d-ig .ig-steps i{width:18px;height:3px;border-radius:2px;background:#2c313a;transition:background .4s,width .4s}
.d-ig .ig-steps i.on{background:#ffb347;width:26px}
@container (max-width:820px){.d-ig .ig-lab code{display:none}.d-ig .ig-main{top:58px}.d-ig .ig-main{gap:0 34px;grid-template-columns:minmax(0,1.45fr) minmax(0,1fr)}.d-ig .ig-to3d small{display:none}.d-ig .ig-to3d{max-width:calc(100% - 300px)}}
`;
