import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, OrthographicCamera, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCADStore } from '../store/cad-store';
import { ParametricCabinet } from './parametric/ParametricCabinet';
import { ParametricWall } from './parametric/ParametricWall';
import { InteractionEngine } from './parametric/InteractionEngine';
import { CabinetEntity, WallEntity, CountertopEntity, ApplianceEntity } from '../types';
import { CabinetLibrary } from './CabinetLibrary';
import { getCollidingIds } from '../lib/collision-detection';
import { ParametricCountertop } from './parametric/ParametricCountertop';
import { ParametricAppliance } from './parametric/ParametricAppliance';

export function CADViewer() {
  const { viewMode, isDraggingObj } = useCADStore();
  const is2D = viewMode === '2d';

  return (
    <div className="w-full h-full bg-transparent relative outline-none selection:bg-blue-500/30">
      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        {is2D ? (
          <OrthographicCamera makeDefault position={[0, 5000, 0]} zoom={0.5} near={-10000} far={10000} />
        ) : (
          <PerspectiveCamera makeDefault position={[3000, 2000, 3000]} fov={45} near={10} far={20000} />
        )}

        {/* Sleek Orbit Controls */}
        <OrbitControls
          enabled={!isDraggingObj}
          enableRotate={!is2D}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={is2D ? 0 : 0.1}
          maxPolarAngle={is2D ? 0 : Math.PI / 2.1}
          makeDefault
          mouseButtons={{
            LEFT: undefined,                   // LMB free for selection
            MIDDLE: is2D ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
            RIGHT: THREE.MOUSE.PAN,            // RMB to pan
          }}
        />

        <ambientLight intensity={0.6} color="#ffffff" />
        <directionalLight
          position={[1000, 2000, -1000]}
          intensity={1.2}
          castShadow
          shadow-bias={-0.0001}
          shadow-mapSize={[2048, 2048]}
        />
        <directionalLight position={[-1000, 1000, 1000]} intensity={0.4} color="#e0e7ff" />

        {!is2D && <Environment preset="city" background={false} />}

        {/* Свежа, светла мрежа (Grid) */}
        <Grid
          renderOrder={-1}
          position={[0, -1, 0]}
          infiniteGrid
          fadeDistance={is2D ? 20000 : 8000}
          sectionSize={100}
          sectionColor={is2D ? '#cbd5e1' : '#cbd5e1'}
          cellColor={is2D ? '#f1f5f9' : '#f1f5f9'}
          cellSize={10}
          sectionThickness={is2D ? 1.5 : 1}
          cellThickness={is2D ? 1 : 0.5}
        />

        {!is2D && (
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.3}
            scale={10000}
            blur={2}
            far={100}
          />
        )}

        <SceneGraph is2D={is2D} />
      </Canvas>

      <ViewModeOverlay />
      <CabinetLibrary />
    </div>
  );
}

function SceneGraph({ is2D }: { is2D: boolean }) {
  const { drawing, selection, collisionDetectionEnabled } = useCADStore();
  if (!drawing) return null;

  // Compute collisions every render if enabled (only runs on entity changes via React reconciler)
  const collidingIds = collisionDetectionEnabled ? getCollidingIds(drawing.entities) : new Set<string>();

  return (
    <group>
      {drawing.entities.map(entity => {
        const isSelected = selection.includes(entity.id);

        if (entity.type === 'cabinet') {
          return (
            <ParametricCabinet
              key={entity.id}
              cabinet={entity as CabinetEntity}
              is2D={is2D}
              selected={isSelected}
              hasCollision={collidingIds.has(entity.id)}
            />
          );
        }

        if (entity.type === 'countertop') {
          return (
            <ParametricCountertop
              key={entity.id}
              countertop={entity as CountertopEntity}
              is2D={is2D}
              selected={isSelected}
            />
          );
        }

        if (entity.type === 'appliance') {
          return (
            <ParametricAppliance
              key={entity.id}
              appliance={entity as ApplianceEntity}
              is2D={is2D}
              selected={isSelected}
            />
          );
        }
        
        if (entity.type === 'wall') {
          return (
            <ParametricWall
              key={entity.id}
              wall={entity as WallEntity}
              is2D={is2D}
              selected={isSelected}
            />
          );
        }
        
        // TODO: Render Window, Door
        return null;
      })}

      <InteractionEngine is2D={is2D} />
    </group>
  );
}

function ViewModeOverlay() {
  const { viewMode, setViewMode } = useCADStore();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex bg-white/80 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm z-10">
      <button
        onClick={() => setViewMode('2d')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === '2d'
            ? 'bg-slate-900 text-white shadow'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        2D План
      </button>
      <button
        onClick={() => setViewMode('3d')}
        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
          viewMode === '3d'
            ? 'bg-slate-900 text-white shadow'
            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
        }`}
      >
        3D Изглед
      </button>
    </div>
  );
}