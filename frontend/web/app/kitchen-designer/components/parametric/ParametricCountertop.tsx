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

import { PBRMaterials } from '../../lib/pbr-materials';

const getMaterial = (matName: string) => {
  switch (matName) {
    case 'marble': return PBRMaterials.countertop_marble;
    case 'granite': return PBRMaterials.countertop_granite_dark;
    case 'wood': return PBRMaterials.countertop_wood;
    default: return PBRMaterials.carcass_white;
  }
};

export function ParametricCountertop({ countertop, is2D, selected }: CountertopProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const drawing = useCADStore(state => state.drawing);
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
          if (useCADStore.getState().currentCommand) return;
          e.stopPropagation();
          const isAlreadySelected = useCADStore.getState().selection.includes(countertop.id);
          if (!isAlreadySelected) {
            selectEntity(countertop.id, e.ctrlKey || e.metaKey);
          }
          startDragging(countertop.id, 'countertop', e.point.x, e.point.z);
        }}
      >
        <mesh position={[xOffset, 100, zOffset]}>
          <boxGeometry args={[totalWidth, 10, totalDepth]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : '#cbd5e1'} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  const activeMaterial = getMaterial(material);

  // Compute holes from appliances that sit on this countertop
  const applianceHoles = useMemo(() => {
    if (!drawing) return [];
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    return drawing.entities.filter(e =>
      e.type === 'appliance' &&
      (e.properties.applianceType === 'sink_single' ||
       e.properties.applianceType === 'sink_double' ||
       e.properties.applianceType === 'hob_induction' ||
       e.properties.applianceType === 'hob_gas')
    ).map(appliance => {
      // Transform appliance world position into countertop local space
      const ax = appliance.geometry.position.x - position.x;
      const az = appliance.geometry.position.y - position.y; // .y is Z in world

      // Rotate into countertop's local coordinate space
      const localX = ax * cos - az * sin;
      const localZ = ax * sin + az * cos;

      // Check if appliance center is on this countertop
      const hw = totalWidth / 2;
      const hd = totalDepth / 2;
      if (localX < -hw || localX > hw || localZ < -hd || localZ > hd) return null;

      // Create a rectangular hole with a small margin (20mm) from appliance edges
      const margin = 20;
      const holeW = appliance.geometry.width - margin * 2;
      const holeD = appliance.geometry.depth - margin * 2;

      const hole = new THREE.Shape();
      hole.moveTo(localX - holeW / 2, localZ - holeD / 2);
      hole.lineTo(localX + holeW / 2, localZ - holeD / 2);
      hole.lineTo(localX + holeW / 2, localZ + holeD / 2);
      hole.lineTo(localX - holeW / 2, localZ + holeD / 2);
      hole.closePath();
      return hole;
    }).filter(Boolean) as THREE.Shape[];
  }, [drawing, countertop.id, position.x, position.y, rotation, totalWidth, totalDepth]);

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

    // Add appliance holes
    s.holes = applianceHoles;
    
    return s;
  }, [totalWidth, totalDepth, edgeRadius, applianceHoles]);

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
        if (useCADStore.getState().currentCommand) return;
        e.stopPropagation();
        const isAlreadySelected = useCADStore.getState().selection.includes(countertop.id);
        if (!isAlreadySelected) {
          selectEntity(countertop.id, e.ctrlKey || e.metaKey);
        }
        startDragging(countertop.id, 'countertop', e.point.x, e.point.z);
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
        <mesh position={[xOffset, height / 2, zOffset]}>
          <boxGeometry args={[totalWidth + 10, height + 10, totalDepth + 10]} />
          <primitive object={PBRMaterials.selected} attach="material" />
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
