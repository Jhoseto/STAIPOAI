import React from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import { Lock } from 'lucide-react';
import { ApplianceEntity } from '../../types';
import { useCADStore } from '../../store/cad-store';

interface ApplianceProps {
  appliance: ApplianceEntity;
  is2D: boolean;
  selected?: boolean;
}

export function ParametricAppliance({ appliance, is2D, selected }: ApplianceProps) {
  const selectEntity = useCADStore(state => state.selectEntity);
  const startDragging = useCADStore(state => state.startDragging);
  const { width, height, depth, elevation, rotation, position } = appliance.geometry;
  const { applianceType } = appliance.properties;

  if (is2D) {
    return (
      <group 
        position={[position.x, 0, position.y]} 
        rotation={[0, -rotation, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          selectEntity(appliance.id, e.ctrlKey || e.metaKey);
          startDragging(appliance.id, 'appliance', e.point.x, e.point.z, { ...appliance.geometry });
        }}
      >
        <mesh position={[0, 105, 0]}>
          <boxGeometry args={[width, 5, depth]} />
          <meshStandardMaterial color={selected ? '#3b82f6' : '#64748b'} transparent opacity={0.8} />
        </mesh>
        {/* Visual indicator for Hobart/Sink */}
        <mesh position={[0, 106, 0]}>
          <boxGeometry args={[width * 0.8, 2, depth * 0.8]} />
          <meshStandardMaterial color="#ffffff" wireframe />
        </mesh>
      </group>
    );
  }

  // Helper to render the specific appliance model
  const renderModel = () => {
    switch (applianceType) {
      case 'sink_single':
        return (
          <group>
            {/* Sink Rim */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[width, 5, depth]} />
              <meshStandardMaterial color="#cbd5e1" roughness={0.1} metalness={0.8} />
            </mesh>
            {/* Bowl */}
            <mesh position={[0, -150, 0]}>
              <boxGeometry args={[width - 40, 300, depth - 40]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.2} metalness={0.9} />
            </mesh>
            {/* Faucet (simple) */}
            <mesh position={[0, 50, -depth/2 + 50]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[10, 10, 100]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.9} />
            </mesh>
          </group>
        );
      case 'hob_induction':
        return (
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[width, 4, depth]} />
            <meshStandardMaterial color="#0f172a" roughness={0.05} metalness={0.2} />
            {/* Burner indicators */}
            <group position={[0, 2.1, 0]}>
              <mesh position={[-width/4, 0, -depth/4]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[width/8 - 2, width/8, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
              </mesh>
              <mesh position={[width/4, 0, -depth/4]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[width/10 - 2, width/10, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
              </mesh>
              <mesh position={[-width/4, 0, depth/4]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[width/10 - 2, width/10, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
              </mesh>
              <mesh position={[width/4, 0, depth/4]} rotation={[-Math.PI/2, 0, 0]}>
                <ringGeometry args={[width/8 - 2, width/8, 32]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.3} />
              </mesh>
            </group>
          </mesh>
        );
      case 'oven':
        return (
          <group>
            <mesh position={[0, -height/2, 0]}>
              <boxGeometry args={[width, height, depth]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Glass Front */}
            <mesh position={[0, -height/2, depth/2 + 2]}>
              <boxGeometry args={[width - 40, height - 100, 5]} />
              <meshStandardMaterial color="#0f172a" transparent opacity={0.7} />
            </mesh>
            {/* Handle */}
            <mesh position={[0, -50, depth/2 + 10]}>
              <boxGeometry args={[width - 100, 10, 20]} />
              <meshStandardMaterial color="#94a3b8" metalness={0.8} />
            </mesh>
          </group>
        );
      default:
        return (
          <mesh>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial color="#cbd5e1" />
          </mesh>
        );
    }
  };

  return (
    <group 
      position={[position.x, elevation, position.y]} 
      rotation={[0, -rotation, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        selectEntity(appliance.id, e.ctrlKey || e.metaKey);
        startDragging(appliance.id, 'appliance', e.point.x, e.point.z, { ...appliance.geometry });
      }}
    >
      {renderModel()}
      {selected && (
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[width + 10, height + 10, depth + 10]} />
          <meshStandardMaterial color="#3b82f6" transparent opacity={0.2} wireframe />
        </mesh>
      )}

      {/* 3D Lock Indicator */}
      {selected && appliance.locked && (
        <Html distanceFactor={10} position={[0, height + 100, 0]}>
          <div className="flex items-center justify-center bg-red-600 text-white p-1.5 rounded-full shadow-lg shadow-red-500/50 animate-bounce">
            <Lock size={12} strokeWidth={3} />
          </div>
        </Html>
      )}
    </group>
  );
}
