import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Lock } from 'lucide-react';
import { FurnitureEntity } from '../../types';
import { useCADStore } from '../../store/cad-store';

interface FurnitureProps {
  furniture: FurnitureEntity;
  is2D: boolean;
  selected?: boolean;
}

import { PBRMaterials } from '../../lib/pbr-materials';

const getMaterial = (matName: string) => {
  switch (matName) {
    case 'marble': return PBRMaterials.countertop_marble;
    case 'granite': return PBRMaterials.countertop_granite_dark;
    case 'wood': return PBRMaterials.countertop_wood;
    case 'glass': return PBRMaterials.glass_clear;
    case 'metal': return PBRMaterials.metal_brushed_steel;
    case 'mdf': return PBRMaterials.front_matte_slate;
    case 'melamine': return PBRMaterials.carcass_white;
    default: return PBRMaterials.carcass_white;
  }
};

export function ParametricFurniture({ furniture, is2D, selected }: FurnitureProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const { width, depth, height, elevation, rotation, position, orientation = 'horizontal' } = furniture.geometry;
  const { overhang, backsplash, backsplashHeight, material, edgeRadius } = furniture.properties;

  const isVertical = orientation === 'vertical';

  // Final dimensions including overhang
  const totalWidth = width + (overhang.left || 0) + (overhang.right || 0);
  const totalDepth = depth + (overhang.front || 0) + (overhang.back || 0);
  
  // Pivot adjustment for overhang
  const xOffset = ((overhang.right || 0) - (overhang.left || 0)) / 2;
  const zOffset = ((overhang.back || 0) - (overhang.front || 0)) / 2;

  const shape = useMemo(() => {
    const s = new THREE.Shape();
    // For vertical panels, width is still width, but "depth" becomes the height of the panel
    const actualW = totalWidth;
    const actualH = totalDepth;
    const r = Math.min(edgeRadius, actualW / 2.1, actualH / 2.1);
    
    if (r <= 0) {
      s.moveTo(-actualW / 2, -actualH / 2);
      s.lineTo(actualW / 2, -actualH / 2);
      s.lineTo(actualW / 2, actualH / 2);
      s.lineTo(-actualW / 2, actualH / 2);
      s.lineTo(-actualW / 2, -actualH / 2);
      return s;
    }

    s.moveTo(-actualW / 2, actualH / 2 - r);
    s.lineTo(-actualW / 2, -actualH / 2 + r);
    s.absarc(-actualW / 2 + r, -actualH / 2 + r, r, Math.PI, Math.PI * 1.5, false);
    s.lineTo(actualW / 2 - r, -actualH / 2);
    s.absarc(actualW / 2 - r, -actualH / 2 + r, r, Math.PI * 1.5, Math.PI * 2, false);
    s.lineTo(actualW / 2, actualH / 2 - r);
    s.absarc(actualW / 2 - r, actualH / 2 - r, r, 0, Math.PI / 2, false);
    s.lineTo(-actualW / 2 + r, actualH / 2);
    s.absarc(-actualW / 2 + r, actualH / 2 - r, r, Math.PI / 2, Math.PI, false);

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

  const activeMaterial = getMaterial(material);

  if (is2D) {
    return (
      <group 
        position={[position.x, 0, position.y]} 
        rotation={[0, -rotation, 0]}
        onPointerDown={(e) => {
          if (useCADStore.getState().currentCommand) return;
          e.stopPropagation();
          const isAlreadySelected = useCADStore.getState().selection.includes(furniture.id);
          if (!isAlreadySelected) {
            selectEntity(furniture.id, e.ctrlKey || e.metaKey);
          }
          startDragging(furniture.id, 'furniture', e.point.x, e.point.z);
        }}
      >
        <mesh position={[xOffset, 150, zOffset]}>
          <boxGeometry args={[totalWidth, 10, isVertical ? height : totalDepth]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : '#64748b'} transparent opacity={0.6} />
        </mesh>
      </group>
    );
  }

  return (
    <group 
      position={[position.x, elevation, position.y]} 
      rotation={[0, -rotation, 0]}
      onPointerDown={(e) => {
        if (useCADStore.getState().currentCommand) return;
        e.stopPropagation();
        const isAlreadySelected = useCADStore.getState().selection.includes(furniture.id);
        if (!isAlreadySelected) {
          selectEntity(furniture.id, e.ctrlKey || e.metaKey);
        }
        startDragging(furniture.id, 'furniture', e.point.x, e.point.z);
      }}
    >
      {/* Main Body */}
      <mesh 
        position={[xOffset, isVertical ? totalDepth / 2 : height, zOffset]} 
        rotation={[isVertical ? 0 : Math.PI / 2, 0, 0]} 
        castShadow 
        receiveShadow
      >
        <extrudeGeometry args={[shape, extrudeSettings]} />
        <primitive object={activeMaterial} attach="material" />
      </mesh>

      {/* Backsplash - typically only for horizontal slabs */}
      {!isVertical && backsplash && (
        <mesh position={[xOffset, height + backsplashHeight / 2, totalDepth / 2 + zOffset - 5]} castShadow receiveShadow>
          <boxGeometry args={[totalWidth, backsplashHeight, 10]} />
          <primitive object={activeMaterial} attach="material" />
        </mesh>
      )}

      {/* Selection Highlight */}
      {selected && (
        <mesh position={[
          isVertical ? xOffset : xOffset,
          isVertical ? height / 2 : height / 2,
          isVertical ? zOffset : zOffset
        ]}>
          <boxGeometry args={[
            isVertical ? totalWidth + 4 : totalWidth + 10,
            isVertical ? totalDepth + 4 : height + 10,
            isVertical ? height + 4 : totalDepth + 10
          ]} />
          <primitive object={PBRMaterials.selected} attach="material" />
        </mesh>
      )}

      {/* 3D Lock Indicator */}
      {selected && furniture.locked && (
        <Html distanceFactor={10} position={[0, height + 100, 0]}>
          <div className="flex items-center justify-center bg-red-600 text-white p-1.5 rounded-full shadow-lg shadow-red-500/50 animate-bounce">
            <Lock size={12} strokeWidth={3} />
          </div>
        </Html>
      )}
    </group>
  );
}
