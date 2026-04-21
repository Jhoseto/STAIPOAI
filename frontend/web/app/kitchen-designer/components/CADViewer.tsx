import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, OrthographicCamera, PerspectiveCamera, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useCADStore } from '../store/cad-store';
import { ParametricCabinet } from './parametric/ParametricCabinet';
import { ParametricWall } from './parametric/ParametricWall';
import { InteractionEngine } from './parametric/InteractionEngine';
import { AutoGeometryEngine } from './parametric/AutoGeometryEngine';
import { CabinetEntity, WallEntity, CountertopEntity, ApplianceEntity, FurnitureEntity } from '../types';
import { CabinetLibrary } from './CabinetLibrary';
import { getCollidingIds } from '../lib/collision-detection';
import { ParametricCountertop } from './parametric/ParametricCountertop';
import { ParametricAppliance } from './parametric/ParametricAppliance';
import { ParametricFurniture } from './parametric/ParametricFurniture';
import { SlabLibrary } from './SlabLibrary';
import { AutoDimensions } from './parametric/AutoDimensions';

function ElevationCameraHandler() {
  const { viewMode, elevationWallId, drawing } = useCADStore();
  const { camera } = useThree();

  useEffect(() => {
    if (viewMode === 'elevation' && elevationWallId && drawing) {
      const wall = drawing.entities.find(e => e.id === elevationWallId) as WallEntity;
      if (wall && camera instanceof THREE.OrthographicCamera) {
        // Find center of wall
        const cx = (wall.geometry.start.x + wall.geometry.end.x) / 2;
        const cy = (wall.geometry.start.y + wall.geometry.end.y) / 2;

        // Find angle of wall
        const dx = wall.geometry.end.x - wall.geometry.start.x;
        const dy = wall.geometry.end.y - wall.geometry.start.y;
        const angle = Math.atan2(dy, dx);

        // We want to look AT the wall from inside the room.
        // Assuming normal points inward...
        // For simplicity, position camera offset by normal
        const normalX = -Math.sin(angle);
        const normalZ = Math.cos(angle);

        const dist = 3000;
        camera.position.set(cx + normalX * dist, 1000, cy + normalZ * dist);
        camera.lookAt(cx, 1000, cy);
        camera.updateProjectionMatrix();
      }
    }
  }, [viewMode, elevationWallId, drawing, camera]);

  return null;
}


export function CADViewer() {
  const { viewMode, isDraggingObj } = useCADStore();
  const is2D = viewMode === '2d';
  const isElevation = viewMode === 'elevation';
  const isPresentation = viewMode === 'presentation';

  return (
    <div className="w-full h-full bg-transparent relative outline-none selection:bg-blue-500/30">
      <Canvas shadows gl={{ preserveDrawingBuffer: true }}>
        {(is2D || isElevation) ? (
          <OrthographicCamera key="ortho-cam" makeDefault position={isElevation ? [0, 1000, 3000] : [0, 5000, 0]} zoom={0.5} near={-10000} far={10000} />
        ) : (
          <PerspectiveCamera key="persp-cam" makeDefault position={[3000, 2000, 3000]} fov={45} near={10} far={20000} />
        )}

        <ElevationCameraHandler />

        {/* Sleek Orbit Controls */}
        <OrbitControls
          key={is2D || isElevation ? 'ortho-controls' : 'persp-controls'}
          enabled={!isDraggingObj}
          enableRotate={!is2D && !isElevation}
          enableDamping
          dampingFactor={0.05}
          minPolarAngle={is2D || isElevation ? 0 : 0.1}
          maxPolarAngle={is2D || isElevation ? 0 : Math.PI / 2.1}
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

        <Environment preset="city" />

        {/* Свежа, светла мрежа (Grid) - Скрита в presentation mode */}
        {!isPresentation && (
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
        )}

        {!is2D && (
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.3}
            scale={10000}
            blur={2}
            far={100}
          />
        )}

        <SceneGraph is2D={is2D} isPresentation={isPresentation} />

        {(is2D || isElevation) && !isPresentation && (
          <AutoDimensions isElevation={isElevation} />
        )}
      </Canvas>

      {/* Viewport content is handled by CADViewer and overlays are now in ModernSystemToolbar */}
      {!isPresentation && (
        <>
          <CabinetLibrary />
          <SlabLibrary />
        </>
      )}
    </div>
  );
}

function SceneGraph({ is2D, isPresentation }: { is2D: boolean, isPresentation: boolean }) {
  const { drawing, selection, collisionDetectionEnabled } = useCADStore();
  if (!drawing) return null;

  // Compute collisions every render if enabled (only runs on entity changes via React reconciler)
  const collidingIds = collisionDetectionEnabled ? getCollidingIds(drawing.entities) : new Set<string>();

  // Filter entities by layer visibility
  const visibleEntities = drawing.entities.filter(entity => {
    const layer = drawing.layers.find(l => l.name === entity.layer);
    return layer ? layer.on : true; // If layer not found (e.g. legacy entity), show it
  });

  return (
    <group>
      <AutoGeometryEngine />
      {visibleEntities.map(entity => {
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
        if (entity.type === 'furniture') {
          return (
            <ParametricFurniture
              key={entity.id}
              furniture={entity as FurnitureEntity}
              is2D={is2D}
              selected={isSelected}
            />
          );
        }

        // TODO: Render Window, Door
        return null;
      })}

      {!isPresentation && <InteractionEngine is2D={is2D} />}
    </group>
  );
}
