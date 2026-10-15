// Limb part builders for the hero robot. s = +1 for the robot's left (+X), -1 for its right.
// Each group's origin is the joint pivot of the bone it rides on.
import * as THREE from 'three';

export function buildUpperArm(k, M, g, s) {
  k.mesh(k.sphere(0.066), M.gun, g, 0, 0, 0);
  // Orange shoulder pad tilted outward, steel rim and two bolts.
  const pad = new THREE.Group();
  pad.position.set(s * 0.02, 0.025, 0);
  pad.rotation.z = -s * 0.42;
  g.add(pad);
  k.mesh(k.dome(0.112, 0.075), M.orange, pad, 0, 0, 0);
  k.mesh(k.torus(0.108, 0.009, 48), M.gun, pad, 0, -0.008, 0, Math.PI / 2);
  k.mesh(k.line(0.006, 0.006, 0.2), M.groove, pad, 0, 0.074, 0);
  for (const z of [-0.045, 0.045]) k.mesh(k.bolt(0.009), M.steel, pad, 0, 0.06, z, -Math.PI / 2);
  k.mesh(k.capsule(0.05, 0.12), M.teal, g, 0, -0.11, 0);
  k.mesh(k.torus(0.052, 0.009, 28), M.gun, g, 0, -0.07, 0, Math.PI / 2);
}

export function buildForearm(k, M, g, s) {
  k.mesh(k.sphere(0.052), M.gun, g, 0, 0, 0);
  k.mesh(k.cyl(0.022, 0.022, 0.13, 16), M.steel, g, 0, 0, 0, 0, 0, Math.PI / 2);
  k.mesh(k.plate(0.12, 0.16, 0.125, 0.045, 5), M.teal, g, 0, -0.1, 0);
  k.mesh(k.plate(0.136, 0.04, 0.14, 0.018), M.orange, g, 0, -0.165, 0);
  k.mesh(k.line(0.006, 0.1, 0.006), M.groove, g, s * 0.061, -0.09, 0);
  k.mesh(k.line(0.08, 0.006, 0.006), M.groove, g, 0, -0.06, 0.063);
  k.mesh(k.bolt(0.008), M.steel, g, s * 0.064, -0.05, 0.03, 0, s * Math.PI / 2);
  k.mesh(k.bolt(0.008), M.steel, g, s * 0.064, -0.05, -0.03, 0, s * Math.PI / 2);
}

// Articulated hand: palm, three two-segment fingers and a thumb. Finger pivots are exposed in
// g.userData.fingers so animations can open / close the hand.
export function buildHand(k, M, g, s) {
  k.mesh(k.sphere(0.036, 18, 12), M.gun, g, 0, 0, 0);
  k.mesh(k.plate(0.05, 0.075, 0.086, 0.018), M.gun, g, 0, -0.05, 0);
  k.mesh(k.plate(0.02, 0.06, 0.07, 0.008), M.orange, g, s * 0.03, -0.052, 0);
  const fingers = [];
  const seg = k.capsule(0.0125, 0.026, 10);
  for (const z of [-0.027, 0, 0.027]) {
    const f1 = new THREE.Group();
    f1.position.set(0, -0.088, z);
    f1.rotation.z = -s * 0.35;
    g.add(f1);
    k.mesh(seg, M.gun, f1, 0, -0.02, 0);
    k.mesh(k.sphere(0.014, 10, 8), M.steel, f1, 0, 0, 0);
    const f2 = new THREE.Group();
    f2.position.set(0, -0.042, 0);
    f2.rotation.z = -s * 0.45;
    f1.add(f2);
    k.mesh(seg, M.gun, f2, 0, -0.018, 0);
    fingers.push(f1, f2);
  }
  const thumb = new THREE.Group();
  thumb.position.set(-s * 0.012, -0.04, 0.045);
  thumb.rotation.set(0.7, 0, -s * 0.5);
  g.add(thumb);
  k.mesh(seg, M.gun, thumb, 0, -0.022, 0);
  k.mesh(k.sphere(0.014, 10, 8), M.steel, thumb, 0, 0, 0);
  g.userData.fingers = fingers;
  g.userData.thumb = thumb;
}

export function buildThigh(k, M, g, s) {
  k.mesh(k.sphere(0.066), M.gun, g, 0, 0, 0);
  k.mesh(k.plate(0.13, 0.2, 0.15, 0.05, 5), M.teal, g, 0, -0.14, 0);
  k.mesh(k.line(0.006, 0.12, 0.006), M.groove, g, s * 0.066, -0.14, 0);
  k.mesh(k.plate(0.07, 0.08, 0.02, 0.01), M.cream, g, 0, -0.12, 0.076);
  k.mesh(k.bolt(0.008), M.steel, g, 0, -0.1, 0.087);
}

export function buildShin(k, M, g, s) {
  k.mesh(k.cyl(0.056, 0.056, 0.115, 28), M.gun, g, 0, 0, 0, 0, 0, Math.PI / 2);
  for (const x of [-0.06, 0.06]) k.mesh(k.cyl(0.03, 0.03, 0.012, 20), M.steel, g, x, 0, 0, 0, 0, Math.PI / 2);
  k.mesh(k.plate(0.105, 0.09, 0.04, 0.018), M.orange, g, 0, -0.01, 0.07, -0.15);
  // Chunky boot-shaped shin with grooves, bolts and a rear piston.
  k.mesh(k.plate(0.15, 0.22, 0.17, 0.055, 5), M.teal, g, 0, -0.15, 0);
  k.mesh(k.line(0.11, 0.006, 0.006), M.groove, g, 0, -0.1, 0.086);
  k.mesh(k.line(0.11, 0.006, 0.006), M.groove, g, 0, -0.2, 0.086);
  for (const x of [-0.045, 0.045]) k.mesh(k.bolt(0.008), M.steel, g, x, -0.15, 0.087);
  k.mesh(k.line(0.006, 0.16, 0.006), M.groove, g, s * 0.076, -0.15, 0);
  k.mesh(k.cyl(0.075, 0.075, 0.035, 28), M.gun, g, 0, -0.255, 0);
  k.mesh(k.cyl(0.012, 0.012, 0.15, 10), M.steel, g, 0, -0.12, -0.09);
  k.mesh(k.cyl(0.02, 0.02, 0.05, 12), M.gun, g, 0, -0.06, -0.09);
}

export function buildFoot(k, M, g) {
  k.mesh(k.sphere(0.046, 20, 14), M.gun, g, 0, 0, 0);
  k.mesh(k.plate(0.17, 0.075, 0.27, 0.034, 5), M.orange, g, 0, -0.078, 0.035);
  k.mesh(k.plate(0.176, 0.022, 0.278, 0.009, 3), M.rubber, g, 0, -0.109, 0.035);
  k.mesh(k.plate(0.158, 0.05, 0.075, 0.022), M.teal, g, 0, -0.072, 0.142);
  k.mesh(k.plate(0.12, 0.05, 0.06, 0.02), M.gun, g, 0, -0.068, -0.085);
  k.mesh(k.line(0.13, 0.006, 0.006), M.groove, g, 0, -0.04, 0.09, -0.5);
  for (const x of [-0.05, 0.05]) k.mesh(k.bolt(0.007), M.steel, g, x, -0.05, -0.116, Math.PI);
}
