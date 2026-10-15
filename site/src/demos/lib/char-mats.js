// Shared materials for the hero toy robot (premium vinyl-figure look).
// Each call returns a fresh set so a demo can dispose its own copies.
import * as THREE from 'three';

export const ROBOT_COLORS = { teal: 0x3fa7a0, orange: 0xe07a3f, gun: 0x3b4049 };

export function createRobotMaterials() {
  const paint = (color, extra = {}) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.36, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.14,
    sheen: 0.15, sheenRoughness: 0.6, sheenColor: new THREE.Color(0xffffff), ...extra,
  });
  const mats = {
    teal: paint(ROBOT_COLORS.teal),
    tealDark: paint(0x2b7d78, { roughness: 0.42 }),
    orange: paint(ROBOT_COLORS.orange),
    cream: paint(0xe9e2d3, { roughness: 0.45, clearcoat: 0.6 }),
    gun: new THREE.MeshPhysicalMaterial({
      color: ROBOT_COLORS.gun, metalness: 0.85, roughness: 0.34, clearcoat: 0.4, clearcoatRoughness: 0.3,
    }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc8ccd3, metalness: 1, roughness: 0.22 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x17191e, metalness: 0.1, roughness: 0.78 }),
    groove: new THREE.MeshStandardMaterial({ color: 0x0d0f12, metalness: 0.2, roughness: 0.9 }),
    visor: new THREE.MeshPhysicalMaterial({
      color: 0x07090c, metalness: 0.4, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03,
    }),
    eye: new THREE.MeshStandardMaterial({
      color: 0x000000, emissive: 0x7ff3ff, emissiveIntensity: 3.2, toneMapped: true,
    }),
    core: new THREE.MeshStandardMaterial({
      color: 0x221100, emissive: 0xffa640, emissiveIntensity: 3.0,
    }),
    lamp: new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff5a3c, emissiveIntensity: 3.4 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0xfff1d8, metalness: 0, roughness: 0.05, transmission: 0.6, thickness: 0.05,
      transparent: true, opacity: 0.55, clearcoat: 1,
    }),
  };
  return mats;
}

// Disposes every material in a set (and textures they own).
export function disposeMaterials(mats) {
  Object.values(mats).forEach((m) => {
    if (!m?.isMaterial) return;
    Object.values(m).forEach((v) => v?.isTexture && v.dispose());
    m.dispose();
  });
}
