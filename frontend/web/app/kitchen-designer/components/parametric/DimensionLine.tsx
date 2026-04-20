import React from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';

interface DimensionLineProps {
  start: THREE.Vector3;
  end: THREE.Vector3;
  label: string;
  vertical?: boolean;
}

export function DimensionLine({ start, end, label, vertical }: DimensionLineProps) {
  const center = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);

  if (distance < 10) return null; // Don't show for tiny distances

  return (
    <group>
      {/* Dimension Line */}
      <Line
        points={[start, end]}
        color="#3b82f6"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      
      {/* Ticks at the ends */}
      <Line
        points={[
          new THREE.Vector3(start.x, start.y + 20, start.z),
          new THREE.Vector3(start.x, start.y - 20, start.z)
        ]}
        color="#3b82f6"
      />
      <Line
        points={[
          new THREE.Vector3(end.x, end.y + 20, end.z),
          new THREE.Vector3(end.x, end.y - 20, end.z)
        ]}
        color="#3b82f6"
      />

      {/* Label */}
      <Html position={center} center distanceFactor={10}>
        <div className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-[10px] font-bold shadow-sm whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  );
}
