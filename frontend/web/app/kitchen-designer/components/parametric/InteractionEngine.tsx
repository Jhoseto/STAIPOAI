import React, { useState, useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useCADStore } from '../../store/cad-store';
import { ParametricCabinet } from './ParametricCabinet';
import { ParametricWall } from './ParametricWall';
import { ParametricFurniture } from './ParametricFurniture';
import { CabinetEntity, WallEntity, Point2D, FurnitureEntity } from '../../types';
import { calculateSnap, calculateFurnitureSnap } from '../../lib/snap-engine';

import { DimensionLine } from './DimensionLine';

export function InteractionEngine({ is2D }: { is2D: boolean }) {
  const { 
    currentCommand, 
    commandOptions,
    drawing, 
    addEntity, 
    endCommand, 
    isDrawing,
    startWall, 
    continueWall, 
    finishWall,
    selectWindow,
    clearSelection,
    currentEntity,
    selectEntity,
    updateEntity,
    copySelection,
    pasteSelection,
    deleteSelection,
    selection,
    dragState,
    setDraggingObj,
    stopDragging,
    measurement,
    setMeasurementStart,
    setMeasurementEnd,
    clearMeasurement
  } = useCADStore();
  
  // derive cabinet dimensions from commandOptions (set by CabinetLibrary)
  const cabinetWidth       = commandOptions?.width       ?? 600;
  const cabinetDepth       = commandOptions?.depth       ?? 600;
  const cabinetHeight      = commandOptions?.height      ?? 720;
  const cabinetType        = commandOptions?.cabinetType ?? 'base';
  const cabinetFloorOffset = commandOptions?.floorOffset ?? 100;

  // derive slab/furniture dimensions from commandOptions (set by SlabLibrary)
  const slabWidth          = commandOptions?.width       ?? 600;
  const slabDepth          = commandOptions?.depth       ?? 600;
  const slabHeight         = commandOptions?.height      ?? 18;
  const slabOrientation    = commandOptions?.orientation ?? 'horizontal';
  const slabLabel          = commandOptions?.label       ?? 'Рафт/Страница';
  
  const { camera, pointer, raycaster } = useThree();
  const floorRef = useRef<THREE.Mesh>(null);
  
  // State for Cabinet placement
  const [ghostPos, setGhostPos] = useState<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const [ghostRotation, setGhostRotation] = useState<number>(0);

  // State for Marquee Selection
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<THREE.Vector3 | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<THREE.Vector3 | null>(null);

  // Keyboard events (Escape, Rotate)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && (currentCommand === 'CABINET' || currentCommand === 'FURNITURE')) {
        e.preventDefault();
        setGhostRotation(r => r + Math.PI / 2);
      } else if (e.code === 'Escape') {
        if (currentCommand === 'WALL' && isDrawing) {
          finishWall();
        } else if (currentCommand === 'MEASURE') {
          clearMeasurement();
          endCommand();
        } else {
          endCommand();
          clearSelection();
          clearMeasurement();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyC') {
        copySelection();
      } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyV') {
        pasteSelection();
      } else if (e.code === 'Delete' || e.code === 'Backspace') {
        // Don't delete if we are typing in an input field
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
          return;
        }

        // Only delete if we are not currently drawing or typing elsewhere
        if (!isDrawing && currentCommand !== 'WALL') {
          deleteSelection();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentCommand, isDrawing, finishWall, endCommand, clearSelection, copySelection, pasteSelection, deleteSelection]);

  if (!drawing) return null;

  const getVertexSnap = (point: Point2D, entities: any[]): Point2D => {
    const SNAP_DISTANCE = 200; // 200mm snap radius
    let minDistance = SNAP_DISTANCE;
    let snapPoint = { ...point };

    for (const ent of entities) {
      if (ent.type === 'wall') {
        const { start, end } = ent.geometry;
        const dStart = Math.hypot(point.x - start.x, point.y - start.y);
        const dEnd = Math.hypot(point.x - end.x, point.y - end.y);
        
        if (dStart < minDistance) {
          minDistance = dStart;
          snapPoint = { ...start };
        }
        if (dEnd < minDistance) {
          minDistance = dEnd;
          snapPoint = { ...end };
        }
      }
    }
    return snapPoint;
  };

  const handlePointerMove = (e: any) => {
    if (!e.point) return;
    
    let x = e.point.x;
    let z = e.point.z;

    // Grid Snap
    const snapSize = 100; // 10cm grid snap
    if (drawing.gridSettings.snap) {
      x = Math.round(x / snapSize) * snapSize;
      z = Math.round(z / snapSize) * snapSize;
    }

    if (currentCommand === 'CABINET') {
      // Only track ghost position if a preset was selected
      if (commandOptions?.cabinetType) {
        const snapRes = calculateSnap({ x, y: z }, { geometry: { width: cabinetWidth, depth: cabinetDepth } } as CabinetEntity, drawing.entities, ghostRotation);
        setGhostPos(new THREE.Vector3(snapRes.position.x, 0, snapRes.position.y));
        if (snapRes.snapped) {
           setGhostRotation(snapRes.rotation);
        }
      }
    } else if (currentCommand === 'FURNITURE') {
      // Smart snapping for furniture panels
      const furGeom = { width: slabWidth, depth: slabDepth, height: slabHeight, orientation: slabOrientation };
      const snapRes = calculateFurnitureSnap({ x, y: z }, furGeom, drawing.entities, ghostRotation);
      setGhostPos(new THREE.Vector3(snapRes.position.x, 0, snapRes.position.y));
      if (snapRes.snapped) {
        setGhostRotation(snapRes.rotation);
      }
    } else if (currentCommand === 'WALL' || currentCommand === 'PASTE' || currentCommand === 'MEASURE') {
      const snapped = getVertexSnap({ x, y: z }, drawing.entities);
      setGhostPos(new THREE.Vector3(snapped.x, 0, snapped.y));
    }

    if (dragState) {
      // 1. Calculate raw movement delta from mouse interaction
      let dx = e.point.x - dragState.offsetX;
      let dz = e.point.z - dragState.offsetZ;
      
      const leaderOrigGeom = dragState.originalGeometries[dragState.id];
      if (!leaderOrigGeom) return;

      let finalDisplacement = { x: dx, z: dz };

      // 2. Determine the "Final Displacement" based on the Leader's snapping/constraints
      if ('position' in leaderOrigGeom) {
        let newX = leaderOrigGeom.position.x + dx;
        let newZ = leaderOrigGeom.position.y + dz;

        // Apply grid snap to leader
        if (drawing.gridSettings.snap) {
          const snapSize = 100;
          newX = Math.round(newX / snapSize) * snapSize;
          newZ = Math.round(newZ / snapSize) * snapSize;
        }

        // Apply Snap Engine (walls/cabinets) to leader
        const leaderEntity = drawing.entities.find(ent => ent.id === dragState.id);
        if (leaderEntity?.type === 'cabinet') {
          const snapRes = calculateSnap({ x: newX, y: newZ }, leaderEntity as CabinetEntity, drawing.entities, leaderEntity.geometry.rotation);
          newX = snapRes.position.x;
          newZ = snapRes.position.y;
        } else if (leaderEntity?.type === 'furniture') {
          const furGeom = {
            width: leaderEntity.geometry.width,
            depth: leaderEntity.geometry.depth,
            height: leaderEntity.geometry.height,
            orientation: (leaderEntity as FurnitureEntity).geometry.orientation,
          };
          const snapRes = calculateFurnitureSnap({ x: newX, y: newZ }, furGeom, drawing.entities, leaderEntity.geometry.rotation);
          newX = snapRes.position.x;
          newZ = snapRes.position.y;
        }

        // Calculate the ACTUAL displacement that the leader experienced after snapping
        finalDisplacement.x = newX - leaderOrigGeom.position.x;
        finalDisplacement.z = newZ - leaderOrigGeom.position.y;
      } else if ('start' in leaderOrigGeom) {
        // Wall leader logic
        if (drawing.gridSettings.snap) {
           const snapSize = 100;
           finalDisplacement.x = Math.round(dx / snapSize) * snapSize;
           finalDisplacement.z = Math.round(dz / snapSize) * snapSize;
        }
      }

      // 3. Apply the same Final Displacement to ALL entities in the drag group
      Object.entries(dragState.originalGeometries).forEach(([id, origGeom]) => {
        if ('position' in origGeom) {
          // Universal Position-based objects (Cabinets, Countertops, Appliances, Furniture)
          updateEntity(id, { 
            geometry: { 
              ...origGeom, 
              position: { 
                x: origGeom.position.x + finalDisplacement.x, 
                y: origGeom.position.y + finalDisplacement.z 
              }
            } 
          });
        } else if ('start' in origGeom) {
          // Wall objects
          updateEntity(id, {
            geometry: {
              ...origGeom,
              start: { 
                x: origGeom.start.x + finalDisplacement.x, 
                y: origGeom.start.y + finalDisplacement.z 
              },
              end: { 
                x: origGeom.end.x + finalDisplacement.x, 
                y: origGeom.end.y + finalDisplacement.z 
              }
            }
          });
        }
      });
    } else if (isSelecting && selectionStart) {
      setSelectionEnd(new THREE.Vector3(e.point.x, 0, e.point.z));
    }
  };

  const handlePointerDown = (e: any) => {
    // Right Click (2) to cancel current command (switch to Select mode)
    if (e.button === 2) {
      if (currentCommand) {
        endCommand();
        clearSelection();
      }
      return;
    }

    // Only intercept Left Click (0)
    if (e.button !== 0 || !e.point) return;
    
    let x = e.point.x;
    let z = e.point.z;

    if (drawing.gridSettings.snap) {
      const snapSize = 100;
      x = Math.round(x / snapSize) * snapSize;
      z = Math.round(z / snapSize) * snapSize;
    }

    const currentPoint: Point2D = { x, y: z }; // Map 3D 'z' to CAD 'y'

    if (currentCommand === 'CABINET') {
      if (!commandOptions?.cabinetType) return;
      const snapResult = calculateSnap(currentPoint, { geometry: { width: cabinetWidth, depth: cabinetDepth } } as CabinetEntity, drawing.entities, ghostRotation);
      
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
          position: snapResult.position,
          width: cabinetWidth,
          height: cabinetHeight,
          depth: cabinetDepth,
          rotation: snapResult.rotation,
          cabinetType: cabinetType,
          floorOffset: cabinetFloorOffset,
        },
        properties: {
          material: 'melamine', color: '#1e293b', finish: 'matte', doorStyle: 'flat', doorCount: 1,
          doorConfiguration: { hingeType: 'concealed', handleType: 'handle', handlePosition: 'left', handleMaterial: 'metal' },
          shelves: { count: 1, positions: [360], thickness: 18, material: 'melamine' },
          drawers: { count: 0, heights: [], drawerType: 'standard', handles: false },
          construction: { carcaseThickness: 18, backPanelThickness: 3, bottomPanelThickness: 18, edgeBanding: { front: true, back: false, left: false, right: false, thickness: 0.8, material: 'pvc' } },
          hardware: { hinges: 'blum', handles: 'standard', drawerSlides: 'blum', shelfPins: 'standard' }
        }
      };
      addEntity(newCabinet);
    }
    else if (currentCommand === 'FURNITURE') {
      if (!commandOptions?.width) return; // Don't place until a preset is selected
      const newFurniture: FurnitureEntity = {
        id: crypto.randomUUID(),
        type: 'furniture',
        layer: 'FURNITURE',
        color: 4,
        linetype: 'CONTINUOUS',
        lineweight: 0.25,
        visible: true,
        locked: false,
        geometry: {
          position: { x, y: z },
          width: slabWidth,
          height: slabHeight,
          depth: slabDepth,
          rotation: ghostRotation,
          elevation: 0,
          orientation: slabOrientation as any,
        },
        properties: {
          label: slabLabel,
          material: 'melamine',
          color: '#f1f5f9',
          finish: 'matte',
          overhang: { front: 0, back: 0, left: 0, right: 0 },
          backsplash: false,
          backsplashHeight: 50,
          edgeRadius: 0
        }
      };
      addEntity(newFurniture);
    }
    else if (currentCommand === 'PASTE') {
      const entitiesToPaste = commandOptions?.entities as any[];
      if (!entitiesToPaste || entitiesToPaste.length === 0) return;

      const anchor = entitiesToPaste[0].geometry.position;
      const dx = currentPoint.x - anchor.x;
      const dy = currentPoint.y - anchor.y;

      entitiesToPaste.forEach(ent => {
        const pasted = { ...ent, id: crypto.randomUUID() };
        pasted.geometry.position = { 
          x: ent.geometry.position.x + dx, 
          y: ent.geometry.position.y + dy 
        };
        addEntity(pasted);
      });
      endCommand();
    }
    else if (currentCommand === 'WALL') {
      const snapped = getVertexSnap(currentPoint, drawing.entities);
      if (!isDrawing) {
        startWall(snapped);
      } else {
        continueWall(snapped);
      }
    } 
    else if (currentCommand === 'MEASURE') {
      const snapped = getVertexSnap(currentPoint, drawing.entities);
      if (!measurement.start) {
        setMeasurementStart(snapped);
      } else {
        setMeasurementEnd(snapped);
      }
    } 
    else if (currentCommand === 'SELECT' || !currentCommand) {
      clearSelection();
      setIsSelecting(true);
      const rawStart = new THREE.Vector3(e.point.x, 0, e.point.z);
      setSelectionStart(rawStart);
      setSelectionEnd(rawStart);
      return;
    }
  };

  const handlePointerUp = (e: any) => {
    if (dragState) {
      stopDragging();
      return;
    }

    if (isSelecting && selectionStart && selectionEnd) {
      selectWindow(
        { x: selectionStart.x, y: selectionStart.z },
        { x: selectionEnd.x, y: selectionEnd.z }
      );
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
    }
  };

  // The visual "Ghost" representing the active action
  const renderGhost = () => {
    if (currentCommand === 'CABINET') {
      if (!commandOptions?.cabinetType) return null;
      
      const ghostCabinet = {
        id: 'ghost', type: 'cabinet', geometry: { position: { x: ghostPos.x, y: ghostPos.z }, width: cabinetWidth, height: cabinetHeight, depth: cabinetDepth, rotation: ghostRotation, cabinetType: cabinetType, floorOffset: cabinetFloorOffset }
      } as CabinetEntity;
      return <ParametricCabinet cabinet={ghostCabinet} is2D={is2D} isGhost={true} />;
    }

    if (currentCommand === 'FURNITURE') {
      if (!commandOptions?.width) return null; // Don't show ghost until a preset is selected
      const ghostSlab = {
        id: 'ghost-slab',
        type: 'furniture',
        geometry: {
          position: { x: ghostPos.x, y: ghostPos.z },
          width: slabWidth,
          height: slabHeight,
          depth: slabDepth,
          rotation: ghostRotation,
          elevation: 0,
          orientation: slabOrientation
        },
        properties: {
          label: slabLabel,
          material: 'melamine',
          overhang: { front: 0, back: 0, left: 0, right: 0 },
          backsplash: false,
          backsplashHeight: 50,
          edgeRadius: 0
        }
      } as FurnitureEntity;
      return <ParametricFurniture furniture={ghostSlab} is2D={is2D} />;
    }
    
    if (currentCommand === 'WALL') {
      if (isDrawing && currentEntity) {
        const activeWall: WallEntity = {
          ...currentEntity,
          geometry: {
            ...currentEntity.geometry,
            end: { x: ghostPos.x, y: ghostPos.z }
          }
        } as WallEntity;
        
        const dx = activeWall.geometry.end.x - activeWall.geometry.start.x;
        const dz = activeWall.geometry.end.y - activeWall.geometry.start.y;
        const length = Math.round(Math.hypot(dx, dz));
        const midX = (activeWall.geometry.start.x + activeWall.geometry.end.x) / 2;
        const midZ = (activeWall.geometry.start.y + activeWall.geometry.end.y) / 2;
        
        return (
          <group>
            <ParametricWall wall={activeWall} is2D={is2D} isGhost={true} />
            {length > 0 && (
              <Html position={[midX, is2D ? 100 : activeWall.geometry.height + 100, midZ]} center className="pointer-events-none">
                <div className="bg-slate-900/90 text-white px-2 py-1 rounded-md text-xs font-semibold shadow-xl border border-white/10 whitespace-nowrap backdrop-blur-sm">
                  {length} mm
                </div>
              </Html>
            )}
          </group>
        );
      } else {
        return (
          <mesh position={[ghostPos.x, 10, ghostPos.z]}>
            <sphereGeometry args={[30, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" transparent opacity={0.6} />
          </mesh>
        );
      }
    }

    if (isSelecting && selectionStart && selectionEnd) {
      const minX = Math.min(selectionStart.x, selectionEnd.x);
      const maxX = Math.max(selectionStart.x, selectionEnd.x);
      const minZ = Math.min(selectionStart.z, selectionEnd.z);
      const maxZ = Math.max(selectionStart.z, selectionEnd.z);
      
      return (
        <mesh position={[(minX + maxX)/2, 5, (minZ + maxZ)/2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[maxX - minX, maxZ - minZ]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.2} depthTest={false} side={THREE.DoubleSide} />
          <lineSegments>
            <edgesGeometry args={[new THREE.PlaneGeometry(maxX - minX, maxZ - minZ)]} />
            <lineBasicMaterial color="#2563eb" depthTest={false} />
          </lineSegments>
        </mesh>
      );
    }

    if (currentCommand === 'PASTE') {
      const entitiesToPaste = commandOptions?.entities as any[];
      if (!entitiesToPaste || entitiesToPaste.length === 0) return null;

      const anchor = entitiesToPaste[0].geometry.position;
      const dx = ghostPos.x - anchor.x;
      const dy = ghostPos.z - anchor.y;

      return (
        <group>
          {entitiesToPaste.map(ent => (
            <group 
              key={ent.id} 
              position={[ent.geometry.position.x + dx, 0, ent.geometry.position.y + dy]} 
              rotation={[0, -ent.geometry.rotation, 0]}
            >
              <mesh>
                <boxGeometry args={[ent.geometry.width, 2000, ent.geometry.depth]} />
                <meshStandardMaterial color="#3b82f6" transparent opacity={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      );
    }

    if (currentCommand === 'MEASURE' || (measurement.start && measurement.end)) {
      const start = measurement.start;
      const end = measurement.end || { x: ghostPos.x, y: ghostPos.z };
      
      if (start) {
        const dx = end.x - start.x;
        const dz = end.y - start.y;
        const length = Math.round(Math.hypot(dx, dz));
        
        return (
          <group>
            <Line
              points={[
                [start.x, 15, start.y],
                [end.x, 15, end.y]
              ]}
              color="#3b82f6"
              lineWidth={2}
              dashed={!measurement.end}
              dashSize={100}
              gapSize={50}
            />
            {/* Ticks */}
            <Line points={[[start.x, 0, start.y], [start.x, 100, start.y]]} color="#3b82f6" lineWidth={1} />
            <Line points={[[end.x, 0, end.y], [end.x, 100, end.y]]} color="#3b82f6" lineWidth={1} />
            
            <Html position={[(start.x + end.x)/2, 100, (start.y + end.y)/2]} center className="pointer-events-none">
              <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-[10px] font-black shadow-xl border border-white/20 whitespace-nowrap backdrop-blur-sm">
                {length} mm
              </div>
            </Html>
          </group>
        );
      }
    }

    return null;
  };

  const renderDimensions = () => {
    if (selection.length !== 1 || !drawing) return null;
    
    const entity = drawing.entities.find(e => e.id === selection[0]);
    if (!entity || entity.type !== 'cabinet') return null;

    const cab = entity as CabinetEntity;
    const { position } = cab.geometry;
    
    const nearestWall = useCADStore.getState().findNearestWall({ x: position.x, y: position.y });
    
    if (!nearestWall) return null;

    // Linear distance to wall start point as a demonstration
    const wallStart = nearestWall.geometry.start;

    return (
      <group>
        <DimensionLine 
          start={new THREE.Vector3(position.x, 150, position.y)}
          end={new THREE.Vector3(wallStart.x, 150, wallStart.y)}
          label={`${Math.round(Math.hypot(position.x - wallStart.x, position.y - wallStart.y))}mm`}
        />
      </group>
    );
  };

  return (
    <group>
      {/* Invisible floor to catch raycaster events (like a giant canvas pad) */}
      <mesh 
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, 0, 0]} 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => (e as any).nativeEvent.preventDefault()}
      >
        <planeGeometry args={[100000, 100000]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {renderGhost()}
      {renderDimensions()}
    </group>
  );
}