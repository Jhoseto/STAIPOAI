import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Lock } from 'lucide-react';
import { CountertopEntity } from '../../types';
import { useCADStore } from '../../store/cad-store';

interface CountertopProps {
  countertop: CountertopEntity;
  is2D: boolean;
  selected?: boolean;
}

const materials = {
  marble: new THREE.MeshStandardMaterial({ color: '#f8fafc', roughness: 0.1, metalness: 0.1 }),
  granite: new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.2, metalness: 0.1 }),
  quartz: new THREE.MeshStandardMaterial({ color: '#e2e8f0', roughness: 0.05, metalness: 0.05 }),
  wood: new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.8, metalness: 0 }),
  laminate: new THREE.MeshStandardMaterial({ color: '#94a3b8', roughness: 0.4, metalness: 0 }),
  selected: new THREE.MeshStandardMaterial({ 
    color: '#3b82f6', 
    transparent: true, 
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide
  })
};

export function ParametricCountertop({ countertop, is2D, selected }: CountertopProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const { width, depth, height, elevation, rotation, position } = countertop.geometry;
  const { overhang, backsplash, backsplashHeight, material, edgeRadius } = countertop.properties;

  // Final dimensions including overhang
  const totalWidth = width + (overhang.left || 0) + (overhang.right || 0);
  const totalDepth = depth + (overhang.front || 0) + (overhang.back || 0);
  
  // Pivot adjustment for overhang (center moves because of asymmetric overhang)
  const xOffset = ((overhang.right || 0) - (overhang.left || 0)) / 2;
  const zOffset = ((overhang.back || 0) - (overhang.front || 0)) / 2;

  if (is2D) {
    return (
      <group 
        position={[position.x, 0, position.y]} 
        rotation={[0, -rotation, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          selectEntity(countertop.id, e.ctrlKey || e.metaKey);
          startDragging(countertop.id, 'countertop', e.point.x, e.point.z, { ...countertop.geometry });
        }}
      >
        <mesh position={[xOffset, 100, zOffset]}>
          <boxGeometry args={[totalWidth, 10, totalDepth]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : '#cbd5e1'} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  const activeMaterial = materials[material as keyof typeof materials] || materials.marble;

  // Create custom shape for the countertop slab with rounded front corners
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const r = Math.min(edgeRadius, totalWidth / 2, totalDepth / 2); // Clamp radius
    
    // Start from Back-Left (Sharp)
    s.moveTo(-totalWidth / 2, totalDepth / 2);
    // Line to Back-Right (Sharp)
    s.lineTo(totalWidth / 2, totalDepth / 2);
    // Line to near Front-Right
    s.lineTo(totalWidth / 2, -totalDepth / 2 + r);
    // Arc for Front-Right corner
    s.absarc(totalWidth / 2 - r, -totalDepth / 2 + r, r, 0, -Math.PI / 2, true);
    // Line to near Front-Left
    s.lineTo(-totalWidth / 2 + r, -totalDepth / 2);
    // Arc for Front-Left corner
    s.absarc(-totalWidth / 2 + r, -totalDepth / 2 + r, r, -Math.PI / 2, -Math.PI, true);
    // Back to Back-Left
    s.lineTo(-totalWidth / 2, totalDepth / 2);
    
    return s;
  }, [totalWidth, totalDepth, edgeRadius]);

  const extrudeSettings = useMemo(() => ({
    steps: 1,
    depth: height,
    bevelEnabled: edgeRadius > 0,
    bevelThickness: Math.min(edgeRadius, 5),
    bevelSize: Math.min(edgeRadius, 5),
    bevelOffset: 0,
    bevelSegments: 8
  }), [height, edgeRadius]);

  return (
    <group 
      position={[position.x, elevation, position.y]} 
      rotation={[0, -rotation, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectEntity(countertop.id, e.ctrlKey || e.metaKey);
        startDragging(countertop.id, 'countertop', e.point.x, e.point.z, { ...countertop.geometry });
      }}
    >
      {/* Main Slab */}
      <mesh 
        position={[xOffset, height, zOffset]} 
        rotation={[Math.PI / 2, 0, 0]} 
        castShadow 
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <primitive object={activeMaterial} attach="material" />
      </mesh>

      {/* Backsplash (Ð›Ð°Ð¹Ñ Ð½Ð°) */}
      {backsplash && (
        <mesh position={[xOffset, height + backsplashHeight / 2, totalDepth / 2 + zOffset - 5]} castShadow receiveShadow>
          <boxGeometry args={[totalWidth, backsplashHeight, 10]} />
          <primitive object={activeMaterial} attach="material" />
        </mesh>
      )}

      {/* Selection Highlight */}
      {selected && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 10, height + 10, depth + 10]} />
          <primitive object={materials.selected} attach="material" />
        </mesh>
      )}

      {/* 3D Lock Indicator */}
      {selected && countertop.locked && (
        <Html distanceFactor={10} position={[0, height + 100, 0]}>
          <div className="flex items-center justify-center bg-red-600 text-white p-1.5 rounded-full shadow-lg shadow-red-500/50 animate-bounce">
            <Lock size={12} strokeWidth={3} />
          </div>
        </Html>
      )}
    </group>
  );
}
