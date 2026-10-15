// Scoped styles for the task-lifecycle sequence diagram (root class .d-lc).
export const LC_CSS = `
.d-lc{position:absolute;inset:0;color:#ece9e3;font-size:13px;overflow:hidden;container-type:size;
  background:radial-gradient(110% 80% at 20% 10%,#22252b 0%,#15171c 55%,#0e0f12 100%)}
.d-lc *{box-sizing:border-box}
.d-lc .lc-main{position:absolute;left:16px;right:16px;top:42px;bottom:70px;display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:16px}
.d-lc .lc-seq{position:relative;min-height:0;display:flex;flex-direction:column;background:rgba(16,18,22,.6);border:1px solid #262a32;border-radius:12px;overflow:hidden}
.d-lc .lc-lanes{display:grid;grid-template-columns:1fr 1fr;padding:10px 14px 8px;border-bottom:1px solid #23272e;flex:none}
.d-lc .lc-lane{display:flex;flex-direction:column;gap:1px}
.d-lc .lc-lane:last-child{text-align:right}
.d-lc .lc-lane b{font-size:13px}
.d-lc .lc-lane small{font:10.5px var(--mono);color:#6b717c}
.d-lc .lc-life{position:absolute;top:52px;bottom:0;width:1px;background:repeating-linear-gradient(#2c313a 0 4px,transparent 4px 8px)}
.d-lc .lc-rows{position:relative;flex:1;min-height:0;display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:6px 0 10px}
.d-lc .lc-row{position:relative;height:34px;flex:none;margin:0 14px;animation:lcin .35s cubic-bezier(.2,.8,.2,1)}
@keyframes lcin{from{opacity:0;transform:translateY(8px)}}
.d-lc .lc-row .ln{position:absolute;left:6%;right:6%;bottom:9px;height:2px;border-radius:2px;background:currentColor;transform-origin:left;animation:lcdraw .45s cubic-bezier(.2,.8,.2,1) both}
.d-lc .lc-row.rtl .ln{transform-origin:right}
@keyframes lcdraw{from{transform:scaleX(0)}}
.d-lc .lc-row .ln::after{content:"";position:absolute;right:-1px;top:-4px;border:5px solid transparent;border-left:7px solid currentColor;border-right:0}
.d-lc .lc-row.rtl .ln::after{right:auto;left:-1px;border-left:0;border-right:7px solid currentColor}
.d-lc .lc-row .tx{position:absolute;left:8%;right:8%;bottom:14px;font:11.5px var(--mono);color:#ece9e3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.d-lc .lc-row.rtl .tx{text-align:right}
.d-lc .lc-row .tx em{font-style:normal;color:#9a9fa8}
.d-lc .c-req{color:#3fa7a0}.d-lc .c-res{color:#7cc49a}.d-lc .c-poll{color:#5b6270}.d-lc .c-bad{color:#e06a5f}.d-lc .c-warn{color:#e8b85c}.d-lc .c-dl{color:#ffb347}
.d-lc .lc-row.note .ln{display:none}
.d-lc .lc-row.note .tx{left:6%;right:6%;bottom:8px;text-align:center;font:12px var(--font);color:#e8b85c;white-space:normal;line-height:1.3}
.d-lc .lc-row.note.bad .tx{color:#e06a5f}.d-lc .lc-row.note.ok .tx{color:#7cc49a}
.d-lc .lc-row s{color:#6b717c}
.d-lc .lc-dot{position:absolute;bottom:6px;width:8px;height:8px;border-radius:50%;background:#ffb347;box-shadow:0 0 10px #ffb347}
.d-lc .lc-side{display:flex;flex-direction:column;gap:10px;min-height:0}
.d-lc .lc-box{background:#1b1e24;border:1px solid #2c313a;border-radius:12px;padding:10px 12px;transition:border-color .4s,opacity .4s}
.d-lc .lc-box h4{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#6b717c;font-weight:600}
.d-lc .lc-ringw{display:flex;align-items:center;gap:12px}
.d-lc .lc-ring{width:64px;height:64px;flex:none;transform:rotate(-90deg)}
.d-lc .lc-ring circle{fill:none;stroke-width:6}
.d-lc .lc-ring .bg{stroke:#2a2e36}
.d-lc .lc-ring .fg{stroke:#ffb347;stroke-linecap:round;transition:stroke .4s}
.d-lc .lc-pct{font:600 18px var(--mono);font-variant-numeric:tabular-nums}
.d-lc .lc-chip{display:inline-block;margin-top:4px;font:600 11px var(--mono);padding:2px 9px;border-radius:999px;background:#2a2e36;color:#9a9fa8;transition:all .3s}
.d-lc .lc-chip.queued{background:rgba(125,134,152,.22);color:#cfd3da}
.d-lc .lc-chip.running{background:rgba(255,179,71,.16);color:#ffb347}
.d-lc .lc-chip.success{background:rgba(124,196,154,.16);color:#7cc49a}
.d-lc .lc-chip.unknown{background:rgba(232,184,92,.12);color:#e8b85c;animation:lcpulse 1s ease-in-out infinite}
.d-lc .lc-chip.rejected{background:rgba(224,106,95,.16);color:#e06a5f}
@keyframes lcpulse{50%{opacity:.45}}
.d-lc .lc-meter{position:relative;height:12px;border-radius:7px;background:#2a2e36;overflow:hidden}
.d-lc .lc-meter i{position:absolute;top:0;bottom:0;right:0;width:0;border-radius:7px;transition:width .6s cubic-bezier(.2,.8,.2,1),background .4s}
.d-lc .lc-meter i.frozen{background:repeating-linear-gradient(45deg,#7fb6d9 0 5px,#5c8fb3 5px 10px)}
.d-lc .lc-meter i.charged{background:#e07a3f}
.d-lc .lc-cred{display:flex;justify-content:space-between;margin-top:6px;font:11px var(--mono);color:#9a9fa8}
.d-lc .lc-cred b{color:#ece9e3;font-weight:600}
.d-lc .lc-small{font-size:11.5px;color:#9a9fa8;margin-top:6px;line-height:1.45}
.d-lc .lc-dl{opacity:.35}
.d-lc .lc-dl.live{opacity:1;border-color:rgba(255,179,71,.5)}
.d-lc .lc-cd{font:600 20px var(--mono);color:#ffb347;font-variant-numeric:tabular-nums}
.d-lc .lc-cdbar{height:3px;border-radius:2px;background:#2a2e36;margin-top:6px;overflow:hidden}
.d-lc .lc-cdbar i{display:block;height:100%;background:#ffb347;width:100%}
.d-lc .demo-seg button{white-space:nowrap}
@container (max-width:820px){.d-lc .lc-main{top:58px;grid-template-columns:minmax(0,1fr) 180px;gap:10px}.d-lc .lc-small{display:none}.d-lc .lc-ring{width:48px;height:48px}}
@container (max-height:560px){.d-lc .lc-row{height:30px}.d-lc .lc-box{padding:8px 10px}}
`;
