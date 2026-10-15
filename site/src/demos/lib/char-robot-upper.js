// Upper-body part builders for the hero robot. Each builder fills a Group whose origin is the
// bone pivot it rides on (head bone, chest bone, hips bone). Units: metres, robot faces +Z.
export function buildHead(k, M, g) {
  // Big chibi helmet shell (teal) with an orange brow and engraved panel lines.
  k.mesh(k.plate(0.5, 0.36, 0.44, 0.12, 6), M.teal, g, 0, 0.2, 0);
  k.mesh(k.plate(0.46, 0.05, 0.12, 0.022), M.orange, g, 0, 0.355, 0.12, -0.18);
  k.mesh(k.plate(0.08, 0.04, 0.3, 0.018), M.orange, g, 0, 0.375, -0.06);
  // Horizontal band groove around the helmet.
  k.mesh(k.line(0.36, 0.006, 0.006), M.groove, g, 0, 0.1, 0.221);
  k.mesh(k.line(0.36, 0.006, 0.006), M.groove, g, 0, 0.1, -0.221);
  for (const s of [-1, 1]) {
    k.mesh(k.line(0.3, 0.006, 0.006), M.groove, g, s * 0.251, 0.1, 0, 0, Math.PI / 2);
    // Ear pods: gunmetal drum, orange trim ring, steel cap with bolts.
    k.mesh(k.cyl(0.085, 0.085, 0.05, 32), M.gun, g, s * 0.262, 0.2, 0, 0, 0, Math.PI / 2);
    k.mesh(k.torus(0.078, 0.01, 40), M.orange, g, s * 0.29, 0.2, 0, 0, Math.PI / 2, 0);
    k.mesh(k.cyl(0.048, 0.052, 0.025, 24), M.steel, g, s * 0.292, 0.2, 0, 0, 0, Math.PI / 2);
    const ring = g.children.length;
    k.boltRing(g, M.steel, 0, 0, 0, 0.062, 4, 0.008);
    for (let i = ring; i < g.children.length; i++) {
      const b = g.children[i];
      b.position.set(s * 0.288, 0.2 + b.position.y, b.position.x);
      b.rotation.set(0, s * Math.PI / 2, 0);
    }
  }
  // Mouth grille: short slots under the visor.
  for (let i = -2; i <= 2; i++) k.mesh(k.line(0.012, 0.035, 0.006), M.groove, g, i * 0.028, 0.05, 0.221);
  // Back vent and rear bolts.
  k.mesh(k.plate(0.22, 0.12, 0.03, 0.012), M.gun, g, 0, 0.2, -0.222);
  for (let i = -2; i <= 2; i++) k.mesh(k.line(0.16, 0.008, 0.006), M.groove, g, 0, 0.2 + i * 0.022, -0.239);
  // Neck collar (gunmetal) under the helmet.
  k.mesh(k.cyl(0.075, 0.09, 0.08, 28), M.gun, g, 0, 0.0, 0);
  k.mesh(k.torus(0.08, 0.008, 36), M.steel, g, 0, 0.03, 0, Math.PI / 2);
}

export function buildVisor(k, M, g) {
  // Recessed gunmetal frame + glossy black visor + two emissive pill eyes (eyes get userData).
  k.mesh(k.plate(0.42, 0.2, 0.05, 0.05, 5), M.gun, g, 0, 0.0, -0.01);
  k.mesh(k.plate(0.38, 0.165, 0.05, 0.045, 5), M.visor, g, 0, 0.0, 0.008);
  const eyes = [];
  for (const s of [-1, 1]) {
    const e = k.mesh(k.plate(0.075, 0.05, 0.012, 0.022, 3), M.eye, g, s * 0.085, 0.004, 0.036);
    e.castShadow = false;
    eyes.push(e);
  }
  // Tiny cheek indicator lights.
  for (const s of [-1, 1]) k.mesh(k.sphere(0.008, 10, 8), M.lamp, g, s * 0.16, -0.055, 0.03);
  g.userData.eyes = eyes;
}

export function buildAntenna(k, M, g) {
  k.mesh(k.cyl(0.032, 0.04, 0.03, 20), M.gun, g, 0, 0.015, 0);
  k.mesh(k.cyl(0.008, 0.01, 0.17, 10), M.steel, g, 0, 0.11, 0);
  k.mesh(k.torus(0.014, 0.004, 16), M.orange, g, 0, 0.12, 0, Math.PI / 2);
  const lamp = k.mesh(k.sphere(0.026, 20, 14), M.lamp, g, 0, 0.215, 0);
  k.mesh(k.sphere(0.034, 20, 14), M.glass, g, 0, 0.215, 0).castShadow = false;
  g.userData.lamp = lamp;
}

export function buildTorso(k, M, g) {
  // Main barrel (teal), orange chamfered chest plate, gunmetal abdomen and collar.
  k.mesh(k.plate(0.56, 0.34, 0.38, 0.09, 6), M.teal, g, 0, 0.13, 0);
  k.mesh(k.chamferPlate(0.38, 0.22, 0.03, 0.06, 0.012), M.orange, g, 0, 0.14, 0.19);
  k.mesh(k.cyl(0.075, 0.075, 0.03, 36), M.gun, g, 0, 0.14, 0.215, Math.PI / 2);
  k.mesh(k.plate(0.42, 0.11, 0.3, 0.04), M.gun, g, 0, -0.03, 0);
  for (let i = -1; i <= 1; i++) k.mesh(k.line(0.36, 0.006, 0.006), M.groove, g, 0, -0.03 + i * 0.026, 0.151);
  k.mesh(k.cyl(0.115, 0.13, 0.05, 32), M.gun, g, 0, 0.31, 0);
  // Chest-plate bolts and panel lines.
  for (const [x, y] of [[-0.15, 0.22], [0.15, 0.22], [-0.15, 0.06], [0.15, 0.06]]) {
    k.mesh(k.bolt(0.01), M.steel, g, x, y, 0.222);
  }
  k.mesh(k.line(0.5, 0.006, 0.006), M.groove, g, 0, 0.27, 0.181);
  for (const s of [-1, 1]) {
    k.mesh(k.line(0.006, 0.2, 0.006), M.groove, g, s * 0.235, 0.12, 0.181);
    // Side vents.
    for (let i = 0; i < 4; i++) k.mesh(k.line(0.18, 0.012, 0.01), M.groove, g, s * 0.281, 0.06 + i * 0.035, 0, 0, Math.PI / 2);
    // Shoulder sockets.
    k.mesh(k.cyl(0.07, 0.07, 0.04, 28), M.gun, g, s * 0.285, 0.24, 0, 0, 0, Math.PI / 2);
  }
  // Rear spine groove.
  k.mesh(k.line(0.006, 0.3, 0.006), M.groove, g, 0, 0.13, -0.191);
}

export function buildCore(k, M, g) {
  // Glowing reactor core set in a steel bezel with a glass lens.
  k.mesh(k.torus(0.058, 0.012, 40), M.steel, g, 0, 0, 0.012);
  const glow = k.mesh(k.cyl(0.05, 0.05, 0.02, 32), M.core, g, 0, 0, 0.01, Math.PI / 2);
  glow.castShadow = false;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    k.mesh(k.line(0.022, 0.006, 0.008), M.gun, g, Math.cos(a) * 0.03, Math.sin(a) * 0.03, 0.024, 0, 0, a);
  }
  k.mesh(k.sphere(0.05, 28, 14), M.glass, g, 0, 0, 0.012).scale.set(1, 1, 0.35);
  g.userData.glow = glow;
}

export function buildBackpack(k, M, g) {
  // Power pack: gunmetal frame, twin orange thrusters with nozzles, steel vents, status lights.
  k.mesh(k.plate(0.4, 0.3, 0.12, 0.04), M.gun, g, 0, 0, 0);
  k.mesh(k.plate(0.3, 0.2, 0.03, 0.02), M.cream, g, 0, 0.02, -0.07);
  for (let i = -2; i <= 2; i++) k.mesh(k.line(0.22, 0.008, 0.006), M.groove, g, 0, 0.02 + i * 0.03, -0.087);
  for (const s of [-1, 1]) {
    k.mesh(k.capsule(0.055, 0.2, 20), M.orange, g, s * 0.2, -0.01, -0.03);
    k.mesh(k.cyl(0.045, 0.06, 0.06, 24, true), M.steel, g, s * 0.2, -0.18, -0.03);
    k.mesh(k.torus(0.056, 0.008, 28), M.gun, g, s * 0.2, 0.06, -0.03, Math.PI / 2);
    k.mesh(k.sphere(0.012, 10, 8), s < 0 ? M.lamp : M.eye, g, s * 0.11, 0.12, -0.065);
  }
}

// Pelvis block with hip housings. When rigid=true also adds a ribbed waist (skinned in rig).
export function buildPelvis(k, M, g, rigid) {
  k.mesh(k.plate(0.36, 0.14, 0.27, 0.05), M.gun, g, 0, -0.02, 0);
  k.mesh(k.plate(0.2, 0.1, 0.03, 0.02), M.orange, g, 0, -0.03, 0.135);
  k.mesh(k.bolt(0.01), M.steel, g, 0, -0.03, 0.155);
  for (const s of [-1, 1]) {
    k.mesh(k.cyl(0.07, 0.07, 0.06, 28), M.gun, g, s * 0.16, -0.04, 0, 0, 0, Math.PI / 2);
    k.mesh(k.torus(0.06, 0.008, 28), M.orange, g, s * 0.192, -0.04, 0, 0, Math.PI / 2, 0);
  }
  if (rigid) {
    for (let i = 0; i < 3; i++) k.mesh(k.torus(0.115 - i * 0.006, 0.02, 36), M.rubber, g, 0, 0.065 + i * 0.022, 0, Math.PI / 2);
  }
}
