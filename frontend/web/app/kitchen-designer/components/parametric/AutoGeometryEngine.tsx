'use client';

import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useCADStore } from '../../store/cad-store';
import { CabinetEntity, Point2D } from '../../types';
import { PBRMaterials } from '../../lib/pbr-materials';

/**
 * AutoGeometryEngine
 * Responsibilities:
 * 1. Groups base cabinets into contiguous rows.
 * 2. Renders continuous Plinths (bottom boards).
 * 3. Renders continuous Countertops (top slabs).
 */
export function AutoGeometryEngine() {
  const drawing = useCADStore(state => state.drawing);
  if (!drawing) return null;

  // 1. Extract base cabinets
  const baseCabinets = useMemo(() => {
    return drawing.entities.filter(e => 
      e.type === 'cabinet' && 
      (e.properties as any).cabinetType === 'base'
    ) as CabinetEntity[];
  }, [drawing.entities]);

  // 2. Group cabinets into contiguous rows
  // For now, we'll use a simple proximity + alignment grouping
  const rows = useMemo(() => {
    if (baseCabinets.length === 0) return [];

    const groups: CabinetEntity[][] = [];
    const processed = new Set<string>();

    baseCabinets.forEach(cab => {
      if (processed.has(cab.id)) return;

      const currentGroup: CabinetEntity[] = [cab];
      processed.add(cab.id);

      // Find neighbors recursively
      const findNeighbors = (target: CabinetEntity) => {
        baseCabinets.forEach(other => {
          if (processed.has(other.id)) return;

          // Check if 'other' is adjacent to 'target'
          // Standard cabinets are 600mm deep. Alignment check + distance check.
          const dx = Math.abs(target.geometry.position.x - other.geometry.position.x);
          const dy = Math.abs(target.geometry.position.y - other.geometry.position.y);
          const rotDiff = Math.abs(target.geometry.rotation - other.geometry.rotation) % Math.PI;

          const isAligned = rotDiff < 0.01 || Math.abs(rotDiff - Math.PI) < 0.01;
          const distance = Math.hypot(dx, dy);
          
          // Max gap for grouping: width of one cabinet + small margin
          const maxGap = (target.geometry.width + other.geometry.width) / 2 + 5;

          if (isAligned && distance < maxGap) {
            processed.add(other.id);
            currentGroup.push(other);
            findNeighbors(other);
          }
        });
      };

      findNeighbors(cab);
      groups.push(currentGroup);
    });

    return groups;
  }, [baseCabinets]);

  return (
    <group name="auto-geometry">
      {rows.map((row, idx) => (
        <CabinetRowGeometry key={idx} cabinets={row} />
      ))}
    </group>
  );
}

function CabinetRowGeometry({ cabinets }: { cabinets: CabinetEntity[] }) {
  if (cabinets.length === 0) return null;

  // Calculate row bounding box in its local coordinate space (assuming all have same rotation)
  const rotation = cabinets[0].geometry.rotation;
  
  const { minX, maxX, avgY, depth, height } = useMemo(() => {
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    let minX = Infinity;
    let maxX = -Infinity;
    let sumY = 0;
    let maxDepth = 0;
    let maxHeight = 0;

    cabinets.forEach(cab => {
      const lx = cab.geometry.position.x * cos - cab.geometry.position.y * sin;
      const ly = cab.geometry.position.x * sin + cab.geometry.position.y * cos;
      
      const hw = cab.geometry.width / 2;
      minX = Math.min(minX, lx - hw);
      maxX = Math.max(maxX, lx + hw);
      sumY += ly;
      maxDepth = Math.max(maxDepth, cab.geometry.depth);
      maxHeight = Math.max(maxHeight, cab.geometry.height);
    });

    return {
      minX,
      maxX,
      avgY: sumY / cabinets.length,
      depth: maxDepth,
      height: maxHeight
    };
  }, [cabinets, rotation]);

  const rowWidth = maxX - minX;
  const centerX_Local = (minX + maxX) / 2;
  
  // Transform local center back to world
  const worldX = centerX_Local * Math.cos(rotation) - avgY * Math.sin(rotation);
  const worldY = centerX_Local * Math.sin(rotation) + avgY * Math.cos(rotation);

  return (
    <group position={[worldX, 0, worldY]} rotation={[0, -rotation, 0]}>
      {/* 1. Continuous Plinth (Ð¦Ð¾ÐºÑŠÐ») */}
      <mesh position={[0, 50, depth / 2 - 40]}>
        <boxGeometry args={[rowWidth, 100, 20]} />
        <primitive object={PBRMaterials.plinth_anthracite} attach="material" />
      </mesh>

      {/* 2. Continuous Countertop (Плот) */}
      <mesh position={[0, height + 20, 0]}>
        <boxGeometry args={[rowWidth + 10, 40, depth + 20]} />
        <primitive object={PBRMaterials.countertop_marble} attach="material" />
      </mesh>

      {/* 3. Continuous Backsplash (Гръб) */}
      <mesh position={[0, height + 40 + 300, depth / 2 + 5]}>
        <boxGeometry args={[rowWidth, 600, 10]} />
        <primitive object={PBRMaterials.carcass_white} attach="material" />
      </mesh>
    </group>
  );
}
