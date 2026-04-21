import React from 'react';
import * as THREE from 'three';
import { Html, Line } from '@react-three/drei';
import { useCADStore } from '../../store/cad-store';

export function AutoDimensions({ isElevation = false }: { isElevation?: boolean }) {
  const { drawing, viewMode } = useCADStore();
  
  if (!drawing || (viewMode !== '2d' && viewMode !== 'elevation')) return null;

  return (
    <group>
      {drawing.entities.map(entity => {
        if (entity.type !== 'cabinet' && entity.type !== 'furniture') return null;

        const { width, depth, height, position, rotation = 0, floorOffset = 0 } = entity.geometry;
        
        // --- 1. Top/Plan Dimensions (Horizontal width) ---
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        // Dimension line offset from object (y in world is elevation, z in world is plan depth)
        const totalTopHeight = floorOffset + height;
        const dimOffset = isElevation ? totalTopHeight + 150 : (depth / 2) + 150;
        
        // Calculate points for the dimension line (local to world)
        // Line endpoints relative to object center
        const p1Local = { x: -width / 2, z: isElevation ? 0 : -depth / 2 - 100 };
        const p2Local = { x: width / 2, z: isElevation ? 0 : -depth / 2 - 100 };
        
        const p1 = [
          position.x + (p1Local.x * cos - (isElevation ? 0 : p1Local.z) * sin),
          isElevation ? dimOffset : 10,
          position.y + (p1Local.x * sin + (isElevation ? 0 : p1Local.z) * cos)
        ] as [number, number, number];

        const p2 = [
          position.x + (p2Local.x * cos - (isElevation ? 0 : p2Local.z) * sin),
          isElevation ? dimOffset : 10,
          position.y + (p2Local.x * sin + (isElevation ? 0 : p2Local.z) * cos)
        ] as [number, number, number];

        // Midpoint for label
        const mid = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2] as [number, number, number];

        return (
          <group key={entity.id}>
            {/* Dimension Line */}
            <Line
              points={[p1, p2]}
              color="#334155"
              lineWidth={1}
              transparent
              opacity={0.6}
            />

            {/* Dimension Ticks */}
            <DimensionTick position={p1} rotation={isElevation ? 0 : rotation} isElevation={isElevation} />
            <DimensionTick position={p2} rotation={isElevation ? 0 : rotation} isElevation={isElevation} />

            {/* Dimension Label */}
            <Html position={mid} center>
              <div className="bg-white px-1.5 py-0.5 border border-slate-300 text-slate-800 text-[9px] font-mono font-bold rounded-sm shadow-sm whitespace-nowrap pointer-events-none">
                {Math.round(width)}
              </div>
            </Html>

            {/* 2. Height Dimensions (Ground to Top and FloorOffset to Top) */}
            {isElevation && (
              <group>
                {/* Total height from floor */}
                <Line
                  points={[
                    [position.x + width / 2 + 100, 0, position.y],
                    [position.x + width / 2 + 100, totalTopHeight, position.y]
                  ]}
                  color="#94a3b8"
                  lineWidth={1}
                  transparent
                  opacity={0.4}
                />
                <Html position={[position.x + width / 2 + 120, totalTopHeight / 2, position.y]} center>
                  <div className="text-slate-400 text-[8px] font-mono font-bold transform -rotate-90">
                    {Math.round(totalTopHeight)}
                  </div>
                </Html>
                
                {/* Object height dimension */}
                <Line
                  points={[
                    [position.x - width / 2 - 100, floorOffset, position.y],
                    [position.x - width / 2 - 100, floorOffset + height, position.y]
                  ]}
                  color="#334155"
                  lineWidth={1}
                />
                <Html position={[position.x - width / 2 - 120, floorOffset + height / 2, position.y]} center>
                  <div className="bg-white px-1 py-0.5 border border-slate-300 text-slate-800 text-[9px] font-mono font-bold rounded-sm shadow-sm transform -rotate-90">
                    {Math.round(height)}
                  </div>
                </Html>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

function DimensionTick({ position, rotation, isElevation }: { position: [number, number, number], rotation: number, isElevation: boolean }) {
  const tickLen = 40;
  // Slanted tick line
  const p1 = [position[0] - tickLen/2, position[1], position[2] - tickLen/2] as [number, number, number];
  const p2 = [position[0] + tickLen/2, position[1], position[2] + tickLen/2] as [number, number, number];
  
  return (
    <Line 
      points={[p1, p2]}
      color="#334155"
      lineWidth={2}
      transparent
      opacity={0.8}
    />
  );
}
