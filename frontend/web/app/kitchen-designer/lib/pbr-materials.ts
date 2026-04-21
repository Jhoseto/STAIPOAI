import * as THREE from 'three';

// Premium PBR Materials Library
// Using MeshPhysicalMaterial for clearcoat, transmission, and advanced lighting responses.

export const PBRMaterials = {
  // --- CARCASS (Корпус) ---
  carcass_white: new THREE.MeshStandardMaterial({ 
    color: '#f8fafc',
    roughness: 0.85,
    metalness: 0.05,
  }),
  carcass_dark: new THREE.MeshStandardMaterial({ 
    color: '#1e293b',
    roughness: 0.85,
    metalness: 0.05,
  }),

  // --- FRONTS (Вратички) ---
  front_matte_slate: new THREE.MeshStandardMaterial({
    color: '#0f172a',
    roughness: 0.9,     // Super matte
    metalness: 0.0,
  }),
  front_matte_white: new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.9,     // Super matte
    metalness: 0.0,
  }),
  front_gloss_white: new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    roughness: 0.05,    // Very smooth
    metalness: 0.1,
    clearcoat: 1.0,     // High gloss reflection
    clearcoatRoughness: 0.1,
  }),
  front_wood_oak: new THREE.MeshStandardMaterial({
    color: '#d1bfae',   // Base wood color (placeholder for texture)
    roughness: 0.6,
    metalness: 0.0,
  }),

  // --- COUNTERTOPS (Плотове) ---
  countertop_marble: new THREE.MeshPhysicalMaterial({
    color: '#f4f4f5',
    roughness: 0.1,
    metalness: 0.1,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
  }),
  countertop_granite_dark: new THREE.MeshPhysicalMaterial({
    color: '#18181b',
    roughness: 0.2,
    metalness: 0.3,
    clearcoat: 0.5,
  }),
  countertop_wood: new THREE.MeshStandardMaterial({
    color: '#8b5a2b',
    roughness: 0.7,
    metalness: 0.0,
  }),

  // --- METALS (Дръжки, Уреди) ---
  metal_brushed_steel: new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    roughness: 0.4,
    metalness: 0.8,
  }),
  metal_black: new THREE.MeshStandardMaterial({
    color: '#111827',
    roughness: 0.3,
    metalness: 0.8,
  }),
  metal_brass: new THREE.MeshStandardMaterial({
    color: '#b5a642',
    roughness: 0.3,
    metalness: 0.9,
  }),

  // --- GLASS (Стъкло) ---
  glass_clear: new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.95, // Glass transparency
    thickness: 0.5,
    ior: 1.5,
  }),

  // --- UTILS ---
  plinth_anthracite: new THREE.MeshStandardMaterial({
    color: '#171717',
    roughness: 0.8,
    metalness: 0.1,
  }),
  wireframe: new THREE.MeshBasicMaterial({
    color: '#38bdf8',
    wireframe: true,
  }),
  selected: new THREE.MeshStandardMaterial({
    color: '#3b82f6',
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
  }),
  ghost: new THREE.MeshStandardMaterial({
    color: '#38bdf8',
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.1,
    depthWrite: false,
  }),
  collision: new THREE.MeshStandardMaterial({
    color: '#ef4444',
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};
