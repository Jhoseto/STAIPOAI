import React, { useState, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useCADStore } from '../../store/cad-store';
import { ParametricCabinet } from './ParametricCabinet';
import { CabinetEntity } from '../../types';

export function PlacementEngine({ is2D }: { is2D: boolean }) {
  const { currentCommand, drawing, addEntity, endCommand } = useCADStore();
  const { camera, pointer, raycaster } = useThree();
  
  const [ghostPos, setGhostPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [ghostRotation, setGhostRotation] = useState<number>(0);
  const floorRef = useRef<THREE.Mesh>(null);

  // If we are not drawing a cabinet, don't render the engine's ghost
  if (currentCommand !== 'CABINET' || !drawing) return null;

  const handlePointerMove = (e: any) => {
    // Intersect with the floor plane
    if (e.point) {
      let x = e.point.x;
      let z = e.point.z;

      // Basic Grid Snapping (100mm = 10cm grid snap by default for placement)
      const snapSize = 100;
      if (drawing.gridSettings.snap) {
        x = Math.round(x / snapSize) * snapSize;
        z = Math.round(z / snapSize) * snapSize;
      }

      // TODO: Magnetic Snapping to other cabinets/walls goes here
      // For now, we just snap to grid and position the ghost

      setGhostPos(new THREE.Vector3(x, 0, z));
    }
  };

  const handlePointerDown = (e: any) => {
    // Left click places the cabinet
    if (e.button === 0) {
      const newCabinet: CabinetEntity = {
        id: crypto.randomUUID(),
        type: 'cabinet',
        layer: 'FURNITURE',
        color: 4,
        linetype: 'CONTINUOUS',
        lineweight: 0.25,
        visible: true,
        locked: false,
        geometry: {
          position: { x: ghostPos.x, y: ghostPos.z }, // Store X and Z mapped to X, Y
          width: 600,
          height: 720,
          depth: 580,
          rotation: ghostRotation,
          cabinetType: 'base'
        },
        properties: {
          material: 'melamine',
          color: '#1e293b',
          finish: 'matte',
          doorStyle: 'flat',
          doorCount: 1,
          doorConfiguration: { hingeType: 'concealed', handleType: 'handle', handlePosition: 'left', handleMaterial: 'metal' },
          shelves: { count: 1, positions: [360], thickness: 18, material: 'melamine' },
          drawers: { count: 0, heights: [], drawerType: 'standard', handles: false },
          construction: { carcaseThickness: 18, backPanelThickness: 3, bottomPanelThickness: 18, edgeBanding: { front: true, back: false, left: false, right: false, thickness: 0.8, material: 'pvc' } },
          hardware: { hinges: 'blum', handles: 'standard', drawerSlides: 'blum', shelfPins: 'standard' }
        }
      };

      addEntity(newCabinet);
      
      // Keep placing more cabinets until user presses ESC (or right click, to be implemented)
    } else if (e.button === 2) {
      // Right click to cancel tool
      endCommand();
    }
  };

  // Keyboard rotation (Spacebar to rotate cabinet by 90 degrees)
  // We attach this to document
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setGhostRotation(r => r + Math.PI / 2);
      } else if (e.code === 'Escape') {
        endCommand();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [endCommand]);

  // Construct a temporary dummy cabinet entity for the ghost
  const ghostCabinet: CabinetEntity = {
    id: 'ghost',
    type: 'cabinet',
    layer: '0',
    color: 7,
    linetype: 'CONTINUOUS',
    lineweight: 0.25,
    visible: true,
    locked: false,
    geometry: {
      position: { x: ghostPos.x, y: ghostPos.z },
      width: 600,
      height: 720,
      depth: 580,
      rotation: ghostRotation,
      cabinetType: 'base'
    },
    properties: {} as any
  };

  return (
    <group>
      {/* Invisible floor to catch raycaster events */}
      <mesh 
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        visible={false}
      >
        <planeGeometry args={[100000, 100000]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* The Ghost Cabinet */}
      <ParametricCabinet 
        cabinet={ghostCabinet} 
        is2D={is2D} 
        isGhost={true} 
      />
    </group>
  );
}
