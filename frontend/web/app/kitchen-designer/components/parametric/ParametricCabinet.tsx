import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Lock } from 'lucide-react';
import { CabinetEntity } from '../../types';
import { useCADStore } from '../../store/cad-store';

interface CabinetProps {
  cabinet: CabinetEntity;
  is2D: boolean;
  selected?: boolean;
  isGhost?: boolean;
  hasCollision?: boolean;
}

import { PBRMaterials } from '../../lib/pbr-materials';

export function ParametricCabinet({ cabinet, is2D, selected, isGhost, hasCollision }: CabinetProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const { width, height, depth, floorOffset } = cabinet.geometry;
  // X and Z represent the position on the floor, Y is height
  // R3F: X is right, Y is up, Z is forward/back
  const { x, y: z } = cabinet.geometry.position; 
  const rotation = cabinet.geometry.rotation;
  // floorOffset: height of the cabinet BOTTOM above the floor (default 0 for base, ~1400 for wall)
  const bottomY = (floorOffset ?? 0);
  
  // Parametric Dimensions (These would usually come from the cabinet's construction properties)
  const thickness = 18; // 18mm standard carcass
  const backThickness = 3; // 3mm HDF back
  const frontThickness = 18; // 18mm MDF front
  const gap = 2; // 2mm gap between fronts
  const plinthHeight = 100; // 100mm plinth/legs

  // Calculate actual carcass depth minus the front
  const carcassDepth = depth - frontThickness;

  const parts = useMemo(() => {
    const baseParts = [
      // Left Side Panel
      {
        name: 'left_side',
        size: [thickness, height, carcassDepth],
        pos: [-width / 2 + thickness / 2, height / 2, frontThickness / 2],
        material: PBRMaterials.carcass_dark
      },
      // Right Side Panel
      {
        name: 'right_side',
        size: [thickness, height, carcassDepth],
        pos: [width / 2 - thickness / 2, height / 2, frontThickness / 2],
        material: PBRMaterials.carcass_dark
      },
      // Bottom Panel
      {
        name: 'bottom',
        size: [width - thickness * 2, thickness, carcassDepth],
        pos: [0, thickness / 2, frontThickness / 2],
        material: PBRMaterials.carcass_dark
      },
      // Top Panel / Rails (Depending on base or wall cabinet)
      {
        name: 'top',
        size: [width - thickness * 2, thickness, carcassDepth],
        pos: [0, height - thickness / 2, frontThickness / 2],
        material: PBRMaterials.carcass_dark
      },
      // Back Panel
      {
        name: 'back',
        size: [width - thickness * 2, height - thickness * 2, backThickness],
        pos: [0, height / 2, carcassDepth / 2 - backThickness / 2 + frontThickness / 2],
        material: PBRMaterials.carcass_dark
      }
    ];

    // Динамичен цокъл (Auto-Plinth) за подови шкафове
    if (bottomY > 0 && bottomY <= 150 && !isGhost) {
      baseParts.push({
        name: 'plinth',
        size: [width, bottomY, carcassDepth - 40], // Plinth is set back by 40mm
        pos: [0, -bottomY / 2, frontThickness / 2 - 20],
        material: PBRMaterials.plinth_anthracite
      });
    }

    // Динамични вратички и дръжки (Dynamic Doors & Metallic Handles)
    // По подразбиране: ако е над 600мм - слагаме 2 врати
    const doorCount = cabinet.properties?.doorCount || (width > 600 ? 2 : 1);
    const doorWidth = (width - gap * (doorCount + 1)) / doorCount;
    
    for (let i = 0; i < doorCount; i++) {
      const doorX = -width / 2 + gap + (doorWidth / 2) + i * (doorWidth + gap);
      
      baseParts.push({
        name: `door_${i}`,
        size: [doorWidth, height - gap * 2, frontThickness],
        pos: [doorX, height / 2, -carcassDepth / 2 + frontThickness / 2],
        material: isGhost ? PBRMaterials.ghost : PBRMaterials.front_matte_slate
      });

      // Добавяне на луксозна метална дръжка (Premium Metallic Handle)
      // Дръжките се разминават за 2 врати (лява и дясна)
      const handleX = doorCount === 1 
        ? (cabinet.properties?.doorConfiguration?.handlePosition === 'right' ? doorX + doorWidth/2 - 35 : doorX - doorWidth/2 + 35)
        : (i === 0 ? doorX + doorWidth/2 - 35 : doorX - doorWidth/2 + 35);
        
      baseParts.push({
        name: `handle_${i}`,
        size: [10, 160, 24], // Premium handle dimensions
        pos: [handleX, height / 2 + 100, -carcassDepth / 2 - 12], // Стърчи напред
        material: isGhost ? PBRMaterials.ghost : PBRMaterials.metal_brushed_steel
      });
    }

    return baseParts;
  }, [width, height, depth, carcassDepth, cabinet.properties, isGhost]);

  if (is2D) {
    // In 2D Top View, we just render a simple wireframe outline
    return (
      <group 
        position={[x, 0, z]} 
        rotation={[0, -rotation, 0]}
        onPointerDown={(e) => {
          if (isGhost || useCADStore.getState().currentCommand) return;
          e.stopPropagation();
          const isAlreadySelected = useCADStore.getState().selection.includes(cabinet.id);
          if (!isAlreadySelected) {
            selectEntity(cabinet.id, e.ctrlKey || e.metaKey);
          }
          startDragging(cabinet.id, 'cabinet', e.point.x, e.point.z);
        }}
      >
        <mesh position={[0, height, 0]}>
          <boxGeometry args={[width, 1, depth]} />
          <primitive object={isGhost ? PBRMaterials.ghost : PBRMaterials.wireframe} attach="material" />
        </mesh>
        {selected && !isGhost && (
           <mesh position={[0, height, 0]}>
            <boxGeometry args={[width + 4, 2, depth + 4]} />
            <primitive object={PBRMaterials.selected} attach="material" />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group 
      position={[x, bottomY, z]} 
      rotation={[0, -rotation, 0]}
      onPointerDown={(e) => {
        if (isGhost || useCADStore.getState().currentCommand) return;
        e.stopPropagation();
        const isAlreadySelected = useCADStore.getState().selection.includes(cabinet.id);
        if (!isAlreadySelected) {
          selectEntity(cabinet.id, e.ctrlKey || e.metaKey);
        }
        startDragging(cabinet.id, 'cabinet', e.point.x, e.point.z);
      }}
      dispose={null}
    >
      {/* Render each piece of the cabinet */}
      {parts.map((part, index) => (
        <mesh 
          key={index} 
          position={part.pos as [number, number, number]} 
          castShadow={!isGhost} 
          receiveShadow={!isGhost}
        >
          <boxGeometry args={part.size as [number, number, number]} />
          <primitive object={part.material} attach="material" />
        </mesh>
      ))}

      {/* 3D Lock Indicator */}
      {selected && cabinet.locked && (
        <Html distanceFactor={10} position={[0, height + 150, 0]}>
          <div className="flex items-center justify-center bg-red-600 text-white p-1.5 rounded-full shadow-lg shadow-red-500/50 animate-bounce">
            <Lock size={12} strokeWidth={3} />
          </div>
        </Html>
      )}

      {/* Selection Highlight */}
      {selected && !isGhost && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 4, height + 4, depth + 4]} />
          <primitive object={PBRMaterials.selected} attach="material" />
        </mesh>
      )}

      {/* Collision Warning — red pulsing overlay */}
      {hasCollision && !isGhost && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[width + 8, height + 8, depth + 8]} />
          <primitive object={PBRMaterials.collision} attach="material" />
        </mesh>
      )}
    </group>
  );
}
