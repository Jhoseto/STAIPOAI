import React from 'react';
import * as THREE from 'three';
import { WallEntity } from '../../types';
import { useCADStore } from '../../store/cad-store';

interface WallProps {
  wall: WallEntity;
  is2D: boolean;
  selected?: boolean;
  isGhost?: boolean;
}

const materials = {
  wall3D: new THREE.MeshStandardMaterial({ 
    color: '#f8fafc', // Clean white/light-gray plaster
    roughness: 0.9, 
    metalness: 0.0 
  }),
  wall2D: new THREE.MeshBasicMaterial({ 
    color: '#94a3b8' // Slate 400 for 2D outline
  }),
  selected: new THREE.MeshStandardMaterial({ 
    color: '#3b82f6', 
    transparent: true, 
    opacity: 0.3 
  }),
  ghost: new THREE.MeshStandardMaterial({ 
    color: '#38bdf8', 
    transparent: true, 
    opacity: 0.6, 
    depthWrite: false 
  })
};

export function ParametricWall({ wall, is2D, selected, isGhost }: WallProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const { start, end, thickness, height } = wall.geometry;
  
  // Calculate length and angle for the 3D box
  const dx = end.x - start.x;
  const dz = end.y - start.y;
  const length = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dz, dx); 
  
  // Box is positioned at the center
  const midX = (start.x + end.x) / 2;
  const midZ = (start.y + end.y) / 2;

  // Don't render zero-length walls (e.g. initial click before drag)
  if (length < 1) return null; 

  if (is2D) {
    return (
      <group 
        position={[midX, 0, midZ]} 
        rotation={[0, -angle, 0]}
        onPointerDown={(e) => {
          if (isGhost) return;
          e.stopPropagation();
          selectEntity(wall.id, e.ctrlKey || e.metaKey);
          startDragging(wall.id, 'wall', e.point.x, e.point.z, { ...wall.geometry });
        }}
      >
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[length, 10, thickness]} />
          <primitive object={isGhost ? materials.ghost : materials.wall2D} attach="material" />
        </mesh>
        {selected && !isGhost && (
          <mesh position={[0, height / 2, 0]}>
            <boxGeometry args={[length + 4, 12, thickness + 4]} />
            <primitive object={materials.selected} attach="material" />
          </mesh>
        )}
      </group>
    );
  }

  return (
    <group 
      position={[midX, 0, midZ]} 
      rotation={[0, -angle, 0]}
      onPointerDown={(e) => {
        if (isGhost) return;
        e.stopPropagation();
        selectEntity(wall.id, e.ctrlKey || e.metaKey);
        startDragging(wall.id, 'wall', e.point.x, e.point.z, { ...wall.geometry });
      }}
    >
      {/* Main Wall Body */}
      <mesh position={[0, height / 2, 0]} castShadow={!isGhost} receiveShadow={!isGhost}>
        <boxGeometry args={[length, height, thickness]} />
        <primitive object={isGhost ? materials.ghost : materials.wall3D} attach="material" />
      </mesh>
      
      {/* Selection Highlight */}
      {selected && !isGhost && (
        <mesh position={[0, height / 2, 0]}>
          <boxGeometry args={[length + 4, height + 4, thickness + 4]} />
          <primitive object={materials.selected} attach="material" />
        </mesh>
      )}
    </group>
  );
}
