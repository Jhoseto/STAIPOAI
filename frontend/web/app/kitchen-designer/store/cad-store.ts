import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import { useStore } from 'zustand';
import { Point2D, Entity, LineEntity, WallEntity, DoorEntity, WindowEntity, CabinetEntity, Layer, Viewport, CADDrawing } from '../types';
import { cadStorage } from '../lib/storage';

interface CADState {
  drawing: CADDrawing | null;
  viewport: Viewport;
  
  // View mode - 2d plan, 3d perspective, elevation (frontal wall view), or fullscreen presentation
  viewMode: '2d' | '3d' | 'elevation' | 'presentation';
  elevationWallId: string | null; // Selected wall for elevation view
  
  // Measurement Tool State
  measurement: { start: Point2D | null, end: Point2D | null };
  
  // AI Assistant State
  isAssistantOpen: boolean;
  chatMessages: { role: 'user' | 'assistant', content: string }[];
  
  // Current drawing state
  currentCommand: string | null;
  commandOptions: Record<string, any>;
  isDrawing: boolean;
  currentEntity: Entity | null;
  isDraggingObj: boolean;
  setDraggingObj: (isDragging: boolean) => void;
  dragState: { id: string, type: string, offsetX: number, offsetZ: number, originalGeometries: Record<string, any> } | null;
  startDragging: (id: string, type: string, x: number, z: number) => void;
  stopDragging: () => void;
  
  // Selection
  selection: string[];
  gripPoints: Point2D[];
  
  // Input state
  lastPoint: Point2D | null;
  relativeBase: Point2D | null;
  tracking: boolean;
  
  // Actions
  initializeDrawing: (name: string) => void;
  setViewport: (viewport: Partial<Viewport>) => void;
  setViewMode: (mode: '2d' | '3d' | 'elevation' | 'presentation') => void;
  setElevationWall: (wallId: string | null) => void;
  panViewport: (dx: number, dy: number) => void;
  zoomViewport: (factor: number, center?: Point2D) => void;
  rotateViewport: (deltaX: number, deltaY: number) => void; // 3D orbit controls
  resetView: () => void; // Reset to default view
  
  // Measurement actions
  setMeasurementStart: (point: Point2D | null) => void;
  setMeasurementEnd: (point: Point2D | null) => void;
  clearMeasurement: () => void;
  
  // Command system
  startCommand: (command: string, options?: Record<string, any>) => void;
  endCommand: () => void;
  setCommandOption: (key: string, value: any) => void;
  
  // AI Assistant actions
  toggleAssistant: () => void;
  addChatMessage: (role: 'user' | 'assistant', content: string) => void;
  
  // Entity operations
  addEntity: (entity: Entity) => void;
  deleteEntity: (id: string) => void;
  deleteSelection: () => void;
  updateEntity: (id: string, updates: Partial<Entity>) => void;
  updateAllEntities: (filter: (e: Entity) => boolean, updates: Partial<Entity>) => void;
  setLocked: (ids: string[], locked: boolean) => void;
  
  // Selection operations
  selectEntity: (id: string, additive?: boolean) => void;
  selectWindow: (corner1: Point2D, corner2: Point2D) => void;
  clearSelection: () => void;
  
  // Layer operations
  toggleLayerVisiblity: (layerName: string) => void;
  
  // External Integrations
  importWizardLayout: (layout: any) => void;
  
  // Settings
  wallDefaults: { thickness: number, height: number };
  setWallDefaults: (defaults: Partial<{ thickness: number, height: number }>) => void;
  
  // Drawing operations
  startLine: (start: Point2D) => void;
  continueLine: (end: Point2D) => void;
  finishLine: () => void;
  startWall: (start: Point2D) => void;
  continueWall: (end: Point2D) => void;
  finishWall: () => void;
  startDoor: (position: Point2D, width?: number) => void;
  placeDoor: (position: Point2D, width?: number) => void;
  startWindow: (position: Point2D, width?: number) => void;
  placeWindow: (position: Point2D, width?: number) => void;
  
  // Cabinet operations
  placeCabinet: (cabinetType: CabinetEntity['geometry']['cabinetType'], position: Point2D) => void;
  startCabinet: (cabinetType: CabinetEntity['geometry']['cabinetType'], position: Point2D) => void;
  
  // Grid and snap
  setGridSettings: (settings: Partial<CADDrawing['gridSettings']>) => void;
  snapToGrid: (point: Point2D) => Point2D;
  orthoConstrain: (point: Point2D, base: Point2D) => Point2D;
  
  // Snap Engine
  findNearestWall: (point: Point2D, maxDistance?: number) => WallEntity | null;
  snapToWall: (point: Point2D, wall: WallEntity, offset?: number) => Point2D;
  getWallSnapPoints: (wall: WallEntity, spacing?: number) => Point2D[];
  findBestCabinetPosition: (cabinetWidth: number, point: Point2D) => { wall: WallEntity; position: Point2D; rotation: number } | null;
  distanceToLineSegment: (point: Point2D, lineStart: Point2D, lineEnd: Point2D) => number;
  
  // Collision detection
  checkCollision: (entity: Entity, excludeId?: string) => Entity[];
  canPlaceCabinet: (cabinetType: CabinetEntity['geometry']['cabinetType'], position: Point2D, excludeId?: string) => boolean;
  getValidCabinetPositions: (cabinetType: CabinetEntity['geometry']['cabinetType'], point: Point2D) => Point2D[];
  
  // Utility functions
  worldToScreen: (point: Point2D) => Point2D;
  screenToWorld: (point: Point2D) => Point2D;
  getEntityBounds: (entity: Entity) => { min: Point2D; max: Point2D };
  pointInEntity: (point: Point2D, entity: Entity) => boolean;
  
  // Auto-save
  saveStatus: 'saved' | 'saving' | 'unsaved' | 'error';
  autoSave: () => void;
  loadDrawing: (id: string) => Promise<boolean>;
  exportDrawing: () => string;
  importDrawing: (json: string) => boolean;
  
  // Clipboard
  clipboard: Entity[];
  copySelection: () => void;
  pasteSelection: () => void;
  
  // Settings
  collisionDetectionEnabled: boolean;
  setCollisionDetectionEnabled: (enabled: boolean) => void;
}

// Create store with undo/redo history
const cadStore = create<CADState>()(
  devtools(
    subscribeWithSelector(
      temporal(
        immer((set, get) => ({
  drawing: null,
  viewport: {
    center: { x: 0, y: 0 },
    height: 1000,
    scale: 1,
    rotation: 0,
    rotationX: 45, // Default 3D angle
    rotationY: 45,
  },
  
  viewMode: '2d' as const,
  elevationWallId: null,
  measurement: { start: null, end: null },
  saveStatus: 'saved' as const,
  
  currentCommand: null,
  isAssistantOpen: false,
  chatMessages: [
    { role: 'assistant', content: 'Здравей! Аз съм твоят AI асистент за проектиране на кухни. Как мога да ти помогна днес?' }
  ],
  commandOptions: {},
  isDrawing: false,
  currentEntity: null,
  isDraggingObj: false,
  setDraggingObj: (isDragging) => set({ isDraggingObj: isDragging }),
  dragState: null as { id: string, type: string, offsetX: number, offsetZ: number, originalGeometries: Record<string, any> } | null,
  startDragging: (id, type, x, z) => {
    const state = get();
    const entity = state.drawing?.entities.find(e => e.id === id);
    if (entity?.locked) return; // Block dragging if locked
    
    // Capture ALL selected entities' original geometries for group dragging
    const originalGeometries: Record<string, any> = {};
    state.selection.forEach(sid => {
      const ent = state.drawing?.entities.find(e => e.id === sid);
      if (ent && !ent.locked) {
        originalGeometries[sid] = JSON.parse(JSON.stringify(ent.geometry));
      }
    });

    // Ensure the clicked entity (id) is included even if it somehow wasn't in selection
    if (!originalGeometries[id] && entity) {
      originalGeometries[id] = JSON.parse(JSON.stringify(entity.geometry));
    }
    
    set({ 
      isDraggingObj: true, 
      dragState: { id, type, offsetX: x, offsetZ: z, originalGeometries } 
    });
  },
  stopDragging: () => set({ isDraggingObj: false, dragState: null }),
  
  clipboard: [],
  copySelection: () => {
    const state = get();
    if (!state.drawing || state.selection.length === 0) return;
    
    const selected = state.drawing.entities.filter(e => state.selection.includes(e.id));
    // Clone but with fresh IDs so they don't clash later
    set({ clipboard: JSON.parse(JSON.stringify(selected)) });
  },
  
  pasteSelection: () => {
    const state = get();
    if (state.clipboard.length === 0) return;
    
    // Variant B: Attach to mouse. 
    // We'll set a special command 'PASTE' and InteractionEngine will handle it.
    set({ 
      currentCommand: 'PASTE',
      commandOptions: { 
        entities: JSON.parse(JSON.stringify(state.clipboard)) // clone again for the session
      } 
    });
  },

  collisionDetectionEnabled: true,
  setCollisionDetectionEnabled: (enabled) => set({ collisionDetectionEnabled: enabled }),
  
  selection: [],
  gripPoints: [],

  // Settings
  wallDefaults: { thickness: 200, height: 2600 },
  setWallDefaults: (defaults) => set((state) => ({ wallDefaults: { ...state.wallDefaults, ...defaults } })),
  
  importWizardLayout: (layout: any) => {
    const state = get();
    if (!state.drawing) return;
    
    const newEntities: any[] = [];
    
    // Process walls (convert cm to mm)
    if (layout.walls) {
      layout.walls.forEach((w: any) => {
        newEntities.push({
          id: crypto.randomUUID(),
          type: 'wall',
          layer: 'WALLS',
          color: 8,
          linetype: 'CONTINUOUS',
          lineweight: 0.25,
          visible: true,
          locked: false,
          geometry: {
            start: { x: w.start.x * 10, y: w.start.z * 10 },
            end: { x: w.end.x * 10, y: w.end.z * 10 },
            thickness: (w.thickness || 15) * 10,
            height: (w.height || 260) * 10
          },
          properties: {}
        });
      });
    }
    
    // Process cabinets (convert cm to mm)
    if (layout.cabinets) {
      layout.cabinets.forEach((c: any) => {
        newEntities.push({
          id: crypto.randomUUID(),
          type: 'cabinet',
          layer: 'FURNITURE',
          color: 4,
          linetype: 'CONTINUOUS',
          lineweight: 0.25,
          visible: true,
          locked: false,
          geometry: {
            position: { x: c.x * 10, y: c.y * 10 },
            width: (c.width || 60) * 10,
            height: c.type === 'tall' ? 2200 : 720,
            depth: (c.depth || 60) * 10,
            rotation: (c.rotation || 0) * (Math.PI / 180),
            cabinetType: c.type || 'base'
          },
          properties: {
             material: 'melamine', color: '#1e293b', finish: 'matte', doorStyle: 'flat', doorCount: (c.width || 60) > 60 ? 2 : 1
          }
        });
      });
    }
    
    set({
      drawing: {
        ...state.drawing,
        entities: newEntities
      }
    });
  },
  
  lastPoint: null,
  relativeBase: null,
  tracking: false,
  
  initializeDrawing: (name) => set({
    drawing: {
      id: crypto.randomUUID(),
      name,
      units: 'mm',
      precision: 0,
      limits: { min: { x: -10000, y: -10000 }, max: { x: 10000, y: 10000 } },
      layers: [
        { name: '0', color: 7, linetype: 'CONTINUOUS', lineweight: 0.25, plot: true, on: true, freeze: false, lock: false },
        { name: 'WALLS', color: 1, linetype: 'CONTINUOUS', lineweight: 0.50, plot: true, on: true, freeze: false, lock: false },
        { name: 'DOORS', color: 2, linetype: 'CONTINUOUS', lineweight: 0.30, plot: true, on: true, freeze: false, lock: false },
        { name: 'WINDOWS', color: 3, linetype: 'CONTINUOUS', lineweight: 0.25, plot: true, on: true, freeze: false, lock: false },
        { name: 'FURNITURE', color: 4, linetype: 'CONTINUOUS', lineweight: 0.25, plot: true, on: true, freeze: false, lock: false },
        { name: 'DIMENSIONS', color: 5, linetype: 'CONTINUOUS', lineweight: 0.18, plot: true, on: true, freeze: false, lock: false },
      ],
      entities: [],
      viewport: { center: { x: 0, y: 0 }, height: 1000, scale: 1, rotation: 0, rotationX: 45, rotationY: 45 },
      ucs: { origin: { x: 0, y: 0 }, xAxis: { dx: 1, dy: 0 }, yAxis: { dx: 0, dy: 1 } },
      gridSettings: {
        on: true,
        xSpacing: 10, // 1cm spacing (10mm = 1cm)
        ySpacing: 10, // 1cm spacing (10mm = 1cm)
        majorSpacing: 100, // Major grid every 10cm
        snap: true,
        snapSpacing: { x: 10, y: 10 }, // Snap to 1cm precision
        ortho: false,
      },
      activeLayer: '0',
      currentColor: 7,
      currentLinetype: 'CONTINUOUS',
      currentLineweight: 0.25,
    }
  }),
  
  setViewport: (updates) => set(state => ({
    viewport: { ...state.viewport, ...updates }
  })),
  
  setViewMode: (mode) => set(state => ({
    viewMode: mode,
    // Reset elevation wall when switching away from elevation mode
    ...(mode !== 'elevation' && { elevationWallId: null })
  })),
  
  setElevationWall: (wallId) => set({
    elevationWallId: wallId,
    viewMode: wallId ? 'elevation' : '2d'
  }),
  
  panViewport: (dx, dy) => set(state => ({
    viewport: {
      ...state.viewport,
      center: {
        x: state.viewport.center.x + dx,
        y: state.viewport.center.y + dy,
      }
    }
  })),

  rotateViewport: (deltaX, deltaY) => set(state => ({
    viewport: {
      ...state.viewport,
      rotationY: state.viewport.rotationY + deltaX * 0.5, // Horizontal rotation
      rotationX: Math.max(-90, Math.min(90, state.viewport.rotationX + deltaY * 0.5)), // Vertical rotation (clamped)
    }
  })),

  resetView: () => set(state => ({
    viewport: {
      ...state.viewport,
      center: { x: 0, y: 0 },
      scale: 1,
      rotationX: 45,
      rotationY: 45,
    }
  })),

  setMeasurementStart: (point) => set(state => ({
    measurement: { ...state.measurement, start: point }
  })),
  
  setMeasurementEnd: (point) => set(state => ({
    measurement: { ...state.measurement, end: point }
  })),
  
  clearMeasurement: () => set({
    measurement: { start: null, end: null }
  }),
  
  zoomViewport: (factor, center) => set(state => {
    const newScale = state.viewport.scale * factor;
    const zoomCenter = center || state.viewport.center;
    
    // Grid is 10mm (1cm), we want max zoom where 1cm = 100 pixels for precision
    // Min zoom: show entire building (scale ~0.01 = 1 meter on screen)
    // Max zoom: 1cm grid square = 100 pixels for precise snap
    const minScale = 0.01;  // Can see entire building
    const maxScale = 10;    // 1cm grid = 100 pixels for precision work
    
    return {
      viewport: {
        ...state.viewport,
        scale: Math.max(minScale, Math.min(maxScale, newScale)),
        center: zoomCenter,
      }
    };
  }),
  
  startCommand: (command, options = {}) => set({
    currentCommand: command,
    commandOptions: options,
    isDrawing: false,
    currentEntity: null,
    lastPoint: null,
    relativeBase: null,
  }),
  
  endCommand: () => set({
    currentCommand: null,
    commandOptions: {},
    isDrawing: false,
    currentEntity: null,
  }),
  
  setCommandOption: (key, value) => set(state => ({
    commandOptions: { ...state.commandOptions, [key]: value }
  })),

  toggleAssistant: () => set(state => ({ isAssistantOpen: !state.isAssistantOpen })),
  
  addChatMessage: (role, content) => set(state => ({
    chatMessages: [...state.chatMessages, { role, content }]
  })),
  
  addEntity: (entity) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      entities: [...state.drawing.entities, entity]
    }
  }) : {}),
  
  deleteEntity: (id) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      entities: state.drawing.entities.filter((e: Entity) => e.id !== id)
    },
    selection: state.selection.filter((sid: string) => sid !== id)
  }) : {}),

  deleteSelection: () => set(state => {
    if (!state.drawing || state.selection.length === 0) return state;
    
    // Safety: Don't delete locked entities
    const entitiesToDelete = state.selection.filter(id => {
      const ent = state.drawing?.entities.find(e => e.id === id);
      return !ent?.locked;
    });

    if (entitiesToDelete.length === 0) return state;

    return {
      drawing: {
        ...state.drawing,
        entities: state.drawing.entities.filter(e => !entitiesToDelete.includes(e.id))
      },
      selection: state.selection.filter(id => !entitiesToDelete.includes(id))
    };
  }),
  
  updateEntity: (id, updates) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      entities: state.drawing.entities.map((e: Entity) => {
        if (e.id === id) {
          // If locked, only allow unlocking. Block all other updates (geometry, properties, etc.)
          if (e.locked && updates.locked === undefined) return e;
          return { ...e, ...updates };
        }
        return e;
      })
    }
  }) : {}),

  updateAllEntities: (filter, updates) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      entities: state.drawing.entities.map((e: Entity) => filter(e) ? { ...e, ...updates } : e)
    }
  }) : {}),

  setLocked: (ids, locked) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      entities: state.drawing.entities.map((e: Entity) => 
        ids.includes(e.id) ? { ...e, locked } : e
      )
    }
  }) : {}),
  
  selectEntity: (id, additive = false) => set(state => ({
    selection: additive 
      ? state.selection.includes(id) 
        ? state.selection.filter((sid: string) => sid !== id)
        : [...state.selection, id]
      : [id]
  })),
  
  selectWindow: (corner1, corner2) => set(state => {
    if (!state.drawing) return state;
    
    const min = { x: Math.min(corner1.x, corner2.x), y: Math.min(corner1.y, corner2.y) };
    const max = { x: Math.max(corner1.x, corner2.x), y: Math.max(corner1.y, corner2.y) };
    
    const selected = state.drawing.entities.filter((entity: Entity) => {
      const bounds = get().getEntityBounds(entity);
      return bounds.min.x <= max.x && bounds.max.x >= min.x &&
             bounds.min.y <= max.y && bounds.max.y >= min.y;
    }).map((e: Entity) => e.id);
    
    return { selection: selected };
  }),
  
  clearSelection: () => set({ selection: [] }),
  
  toggleLayerVisiblity: (layerName) => set(state => {
    if (!state.drawing) return state;
    return {
      drawing: {
        ...state.drawing,
        layers: state.drawing.layers.map(l => 
          l.name === layerName ? { ...l, on: !l.on } : l
        )
      }
    };
  }),

  startLine: (start) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedStart = state.drawing.gridSettings.snap ? state.snapToGrid(start) : start;
    
    const line: LineEntity = {
      id: crypto.randomUUID(),
      type: 'line' as const,
      layer: state.drawing.activeLayer,
      color: state.drawing.currentColor,
      linetype: state.drawing.currentLinetype,
      lineweight: state.drawing.currentLineweight,
      visible: true,
      locked: false,
      geometry: {
        start: snappedStart,
        end: snappedStart,
      },
      properties: {}
    };
    
    set({
      currentEntity: line,
      lastPoint: snappedStart,
      relativeBase: snappedStart,
      isDrawing: true,
    });
  },
  
  continueLine: (end) => {
    const state = get();
    if (!state.currentEntity || state.currentEntity.type !== 'line') return;
    
    let snappedEnd = state.drawing?.gridSettings.snap ? state.snapToGrid(end) : end;
    
    // Apply ortho if enabled
    if (state.drawing?.gridSettings.ortho && state.lastPoint) {
      snappedEnd = state.orthoConstrain(snappedEnd, state.lastPoint);
    }
    
    const updatedLine: LineEntity = {
      ...state.currentEntity,
      type: 'line' as const,
      geometry: {
        start: state.currentEntity.geometry.start,
        end: snappedEnd,
      }
    };
    
    set({
      currentEntity: updatedLine,
      lastPoint: snappedEnd,
    });
  },
  
  finishLine: () => {
    const state = get();
    if (!state.currentEntity || state.currentEntity.type !== 'line') return;
    
    // Don't add zero-length lines
    const line = state.currentEntity;
    if (line.geometry.start.x === line.geometry.end.x && 
        line.geometry.start.y === line.geometry.end.y) {
      set({ currentEntity: null });
      return;
    }
    
    state.addEntity(line);
    set({ currentEntity: null });
  },
  
  startWall: (start) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedStart = state.drawing.gridSettings.snap ? state.snapToGrid(start) : start;
    
    const wall: WallEntity = {
      id: crypto.randomUUID(),
      type: 'wall' as const,
      layer: 'WALLS',
      color: 8, // Silver/gray color for walls
      linetype: 'CONTINUOUS',
      lineweight: 0.25, // Thinner line for drawing
      visible: true,
      locked: false,
      geometry: {
        start: snappedStart,
        end: snappedStart,
        thickness: state.wallDefaults.thickness,
        height: state.wallDefaults.height,
      },
      properties: {}
    };
    
    set({
      currentEntity: wall,
      lastPoint: snappedStart,
      relativeBase: snappedStart,
      isDrawing: true,
    });
  },
  
  continueWall: (end) => {
    const state = get();
    if (!state.currentEntity || state.currentEntity.type !== 'wall') return;

    let snappedEnd = state.drawing?.gridSettings.snap ? state.snapToGrid(end) : end;

    if (state.drawing?.gridSettings.ortho && state.lastPoint) {
      snappedEnd = state.orthoConstrain(snappedEnd, state.lastPoint);
    }

    const finalizedWall: WallEntity = {
      ...state.currentEntity,
      type: 'wall' as const,
      geometry: {
        start: state.currentEntity.geometry.start,
        end: snappedEnd,
        thickness: state.currentEntity.geometry.thickness,
        height: state.currentEntity.geometry.height,
      }
    };
    
    // Add finalized wall to the canvas
    state.addEntity(finalizedWall);

    // Prepare next wall segment connecting to the end of the last one
    const nextWall: WallEntity = {
      id: crypto.randomUUID(),
      type: 'wall' as const,
      layer: 'WALLS',
      color: 8,
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        start: snappedEnd,
        end: snappedEnd,
        thickness: state.wallDefaults.thickness,
        height: state.wallDefaults.height,
      },
      properties: {}
    };

    set({
      currentEntity: nextWall,
      lastPoint: snappedEnd,
      relativeBase: snappedEnd,
    });
  },

  finishWall: () => {
    const state = get();
    if (!state.currentEntity || state.currentEntity.type !== 'wall') return;

    // Throw away the uncompleted ghost wall
    set({
      currentCommand: null,
      isDrawing: false,
      currentEntity: null,
      lastPoint: null,
      relativeBase: null,
    });
  },

  startDoor: (position, width = 80) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedPosition = state.drawing.gridSettings.snap ? state.snapToGrid(position) : position;
    
    const door: DoorEntity = {
      id: crypto.randomUUID(),
      type: 'door' as const,
      layer: 'DOORS',
      color: 2, // Yellow
      linetype: 'CONTINUOUS',
      lineweight: 0.30,
      visible: true,
      locked: false,
      geometry: {
        position: snappedPosition,
        width: width,
        height: 200,
        direction: 'left',
      },
      properties: {}
    };
    
    set({
      currentEntity: door,
      lastPoint: snappedPosition,
    });
  },
  
  placeDoor: (position, width = 80) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedPosition = state.drawing.gridSettings.snap ? state.snapToGrid(position) : position;
    
    const door: DoorEntity = {
      id: crypto.randomUUID(),
      type: 'door' as const,
      layer: 'DOORS',
      color: 2, // Yellow
      linetype: 'CONTINUOUS',
      lineweight: 0.30,
      visible: true,
      locked: false,
      geometry: {
        position: snappedPosition,
        width: width,
        height: 200,
        direction: 'left',
      },
      properties: {}
    };
    
    state.addEntity(door);
  },
  
  startWindow: (position, width = 100) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedPosition = state.drawing.gridSettings.snap ? state.snapToGrid(position) : position;
    
    const window: WindowEntity = {
      id: crypto.randomUUID(),
      type: 'window' as const,
      layer: 'WINDOWS',
      color: 3, // Green
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position: snappedPosition,
        width: width,
        height: 120,
        sillHeight: 90,
      },
      properties: {}
    };
    
    set({
      currentEntity: window,
      lastPoint: snappedPosition,
    });
  },
  
  placeWindow: (position, width = 100) => {
    const state = get();
    if (!state.drawing) return;
    
    const snappedPosition = state.drawing.gridSettings.snap ? state.snapToGrid(position) : position;
    
    const window: WindowEntity = {
      id: crypto.randomUUID(),
      type: 'window' as const,
      layer: 'WINDOWS',
      color: 3, // Green
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position: snappedPosition,
        width: width,
        height: 120,
        sillHeight: 90,
      },
      properties: {}
    };
    
    state.addEntity(window);
  },
  
  placeCabinet: (cabinetType, position) => {
    const state = get();
    if (!state.drawing) return;
    
    // Check if we can place cabinet at this position
    if (!state.canPlaceCabinet(cabinetType, position)) {
      // Try to find valid positions nearby
      const validPositions = state.getValidCabinetPositions(cabinetType, position);
      if (validPositions.length === 0) return; // No valid positions found
      
      // Use the closest valid position
      position = validPositions[0];
    }
    
    // Use Snap Engine to find best position
    const bestPosition = state.findBestCabinetPosition(60, position); // Standard 60cm width
    
    let finalPosition = position;
    let rotation = 0;
    let wallId: string | undefined;
    
    if (bestPosition) {
      finalPosition = bestPosition.position;
      rotation = bestPosition.rotation;
      wallId = bestPosition.wall.id;
    }
    
    const cabinetDimensions = {
      base: { width: 60, height: 85, depth: 60 },
      wall: { width: 60, height: 70, depth: 35 },
      tall: { width: 60, height: 210, depth: 60 },
      sink: { width: 80, height: 85, depth: 60 },
      stove: { width: 60, height: 85, depth: 60 },
      fridge: { width: 60, height: 200, depth: 65 }
    };
    
    const dims = cabinetDimensions[cabinetType];
    
    const cabinet: CabinetEntity = {
      id: crypto.randomUUID(),
      type: 'cabinet' as const,
      layer: 'FURNITURE',
      color: 4, // Blue
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position: finalPosition,
        width: dims.width,
        height: dims.height,
        depth: dims.depth,
        rotation: rotation,
        cabinetType: cabinetType,
        wallId: wallId
      },
      properties: {
        // Materials & Finishes
        material: 'melamine',
        color: '#FFFFFF',
        finish: 'matte',
        
        // Door Configuration
        doorStyle: 'flat',
        doorCount: 1,
        doorConfiguration: {
          hingeType: 'concealed',
          handleType: 'handle',
          handlePosition: 'center',
          handleMaterial: 'stainless_steel'
        },
        
        // Internal Configuration
        shelves: {
          count: cabinetType === 'wall' ? 2 : 1,
          positions: cabinetType === 'wall' ? [200, 400] : [150],
          thickness: 16,
          material: 'melamine'
        },
        
        // Drawer Configuration
        drawers: {
          count: cabinetType === 'base' ? 2 : 0,
          heights: cabinetType === 'base' ? [120, 120] : [],
          drawerType: 'standard',
          handles: true
        },
        
        // Construction Details
        construction: {
          carcaseThickness: 16,
          backPanelThickness: 8,
          bottomPanelThickness: 16,
          edgeBanding: {
            front: true,
            back: false,
            left: true,
            right: true,
            thickness: 0.8,
            material: 'pvc'
          }
        },
        
        // Hardware
        hardware: {
          hinges: 'blum',
          handles: 'hafele',
          drawerSlides: 'blum',
          shelfPins: 'standard'
        }
      }
    };
    
    state.addEntity(cabinet);
  },
  
  startCabinet: (cabinetType, position) => {
    const state = get();
    if (!state.drawing) return;
    
    // For now, just place the cabinet directly
    state.placeCabinet(cabinetType, position);
  },
  
  setGridSettings: (settings) => set(state => state.drawing ? ({
    drawing: {
      ...state.drawing,
      gridSettings: { ...state.drawing.gridSettings, ...settings }
    }
  }) : {}),
  
  snapToGrid: (point) => {
    const state = get();
    if (!state.drawing?.gridSettings.snap) return point;
    
    const snap = state.drawing.gridSettings.snapSpacing;
    return {
      x: Math.round(point.x / snap.x) * snap.x,
      y: Math.round(point.y / snap.y) * snap.y,
    };
  },
  
  orthoConstrain: (point, base) => {
    const dx = Math.abs(point.x - base.x);
    const dy = Math.abs(point.y - base.y);
    
    return dx > dy 
      ? { x: point.x, y: base.y }
      : { x: base.x, y: point.y };
  },
  
  worldToScreen: (point) => {
    const state = get();
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return point;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    return {
      x: centerX + (point.x - state.viewport.center.x) * state.viewport.scale,
      y: centerY - (point.y - state.viewport.center.y) * state.viewport.scale,
    };
  },
  
  screenToWorld: (point) => {
    const state = get();
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return point;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    return {
      x: state.viewport.center.x + (point.x - centerX) / state.viewport.scale,
      y: state.viewport.center.y - (point.y - centerY) / state.viewport.scale,
    };
  },
  
  getEntityBounds: (entity) => {
    switch (entity.type) {
      case 'line':
        const line = entity as LineEntity;
        return {
          min: { 
            x: Math.min(line.geometry.start.x, line.geometry.end.x),
            y: Math.min(line.geometry.start.y, line.geometry.end.y)
          },
          max: { 
            x: Math.max(line.geometry.start.x, line.geometry.end.x),
            y: Math.max(line.geometry.start.y, line.geometry.end.y)
          }
        };
      case 'wall':
        const wall = entity as WallEntity;
        const halfThick = wall.geometry.thickness / 2;
        return {
          min: { 
            x: Math.min(wall.geometry.start.x, wall.geometry.end.x) - halfThick,
            y: Math.min(wall.geometry.start.y, wall.geometry.end.y) - halfThick
          },
          max: { 
            x: Math.max(wall.geometry.start.x, wall.geometry.end.x) + halfThick,
            y: Math.max(wall.geometry.start.y, wall.geometry.end.y) + halfThick
          }
        };
      case 'cabinet':
      case 'countertop':
      case 'appliance':
      case 'furniture':
        const cent = entity as any;
        return {
          min: { 
            x: cent.geometry.position.x - cent.geometry.width / 2,
            y: cent.geometry.position.y - (cent.geometry.depth || 0) / 2
          },
          max: { 
            x: cent.geometry.position.x + cent.geometry.width / 2,
            y: cent.geometry.position.y + (cent.geometry.depth || 0) / 2
          }
        };
      case 'door':
        const door = entity as any;
        return {
          min: { 
            x: door.geometry.position.x - door.geometry.width / 2,
            y: door.geometry.position.y - (door.geometry.height || 0)
          },
          max: { 
            x: door.geometry.position.x + door.geometry.width / 2,
            y: door.geometry.position.y + (door.geometry.height || 0)
          }
        };
      case 'window':
        const window = entity as any;
        return {
          min: { 
            x: window.geometry.position.x - window.geometry.width / 2,
            y: window.geometry.position.y - window.geometry.height - window.geometry.sillHeight
          },
          max: { 
            x: window.geometry.position.x + window.geometry.width / 2,
            y: window.geometry.position.y - window.geometry.sillHeight
          }
        };
      case 'cabinet':
        const cabinet = entity as any;
        const cos = Math.cos(cabinet.geometry.rotation);
        const sin = Math.sin(cabinet.geometry.rotation);
        const hw = cabinet.geometry.width / 2;
        const hh = cabinet.geometry.height / 2;
        
        // Calculate rotated corners
        const corners = [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw, y: hh },
          { x: -hw, y: hh }
        ].map(corner => ({
          x: cabinet.geometry.position.x + corner.x * cos - corner.y * sin,
          y: cabinet.geometry.position.y + corner.x * sin + corner.y * cos
        }));
        
        return {
          min: {
            x: Math.min(...corners.map(c => c.x)),
            y: Math.min(...corners.map(c => c.y))
          },
          max: {
            x: Math.max(...corners.map(c => c.x)),
            y: Math.max(...corners.map(c => c.y))
          }
        };
      default:
        return { min: { x: 0, y: 0 }, max: { x: 0, y: 0 } };
    }
  },

  getNearestWall: (point: Point2D, maxDistance = 500) => {
    const state = get();
    if (!state.drawing) return null;
    
    let nearestWall: WallEntity | null = null;
    let minDistance = maxDistance;
    
    // Find all wall entities
    const walls = state.drawing.entities.filter(e => e.type === 'wall') as WallEntity[];
    
    walls.forEach(wall => {
      // Calculate distance from point to wall line segment
      const { start, end } = wall.geometry;
      const distance = state.distanceToLineSegment(point, start, end);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestWall = wall;
      }
    });
    
    return nearestWall;
  },
  
  snapToWall: (point, wall, offset = 0) => {
    const { start, end } = wall.geometry;
    const wallVector = { dx: end.x - start.x, dy: end.y - start.y };
    const wallLength = Math.sqrt(wallVector.dx * wallVector.dx + wallVector.dy * wallVector.dy);
    const wallNormal = { dx: -wallVector.dy / wallLength, dy: wallVector.dx / wallLength };
    
    // Project point onto wall line
    const toPoint = { dx: point.x - start.x, dy: point.y - start.y };
    const projection = (toPoint.dx * wallVector.dx + toPoint.dy * wallVector.dy) / (wallLength * wallLength);
    const clampedProjection = Math.max(0, Math.min(1, projection));
    
    // Calculate snapped position
    const snappedPoint = {
      x: start.x + wallVector.dx * clampedProjection + wallNormal.dx * offset,
      y: start.y + wallVector.dy * clampedProjection + wallNormal.dy * offset
    };
    
    return snappedPoint;
  },
  
  getWallSnapPoints: (wall, spacing = 50) => {
    const { start, end } = wall.geometry;
    const wallVector = { dx: end.x - start.x, dy: end.y - start.y };
    const wallLength = Math.sqrt(wallVector.dx * wallVector.dx + wallVector.dy * wallVector.dy);
    const wallNormal = { dx: -wallVector.dy / wallLength, dy: wallVector.dx / wallLength };
    
    const snapPoints: Point2D[] = [];
    const numPoints = Math.floor(wallLength / spacing);
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      snapPoints.push({
        x: start.x + wallVector.dx * t,
        y: start.y + wallVector.dy * t
      });
    }
    
    return snapPoints;
  },
  
  findBestCabinetPosition: (cabinetWidth, point) => {
    const state = get();
    const nearestWall = state.findNearestWall(point, 100);
    
    if (!nearestWall) return null;
    
    // Snap to wall with standard offset (base cabinets are typically 60cm deep)
    const snappedPosition = state.snapToWall(point, nearestWall, 60);
    
    // Calculate rotation based on wall direction
    const { start, end } = nearestWall.geometry;
    const wallAngle = Math.atan2(end.y - start.y, end.x - start.x);
    
    return {
      wall: nearestWall,
      position: snappedPosition,
      rotation: wallAngle
    };
  },
  
  // Helper function for distance to line segment
  distanceToLineSegment: (point: Point2D, lineStart: Point2D, lineEnd: Point2D) => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    
    if (lenSq !== 0) {
      param = dot / lenSq;
    }
    
    let xx, yy;
    
    if (param < 0) {
      xx = lineStart.x;
      yy = lineStart.y;
    } else if (param > 1) {
      xx = lineEnd.x;
      yy = lineEnd.y;
    } else {
      xx = lineStart.x + param * C;
      yy = lineStart.y + param * D;
    }
    
    const dx = point.x - xx;
    const dy = point.y - yy;
    
    return Math.sqrt(dx * dx + dy * dy);
  },
  
  // Collision detection implementation
  checkCollision: (entity, excludeId) => {
    const state = get();
    if (!state.drawing) return [];
    
    const entityBounds = state.getEntityBounds(entity);
    const collisions: Entity[] = [];
    
    state.drawing.entities.forEach(other => {
      if (other.id === excludeId || !other.visible) return;
      
      const otherBounds = state.getEntityBounds(other);
      
      // Check AABB collision
      if (entityBounds.min.x < otherBounds.max.x &&
          entityBounds.max.x > otherBounds.min.x &&
          entityBounds.min.y < otherBounds.max.y &&
          entityBounds.max.y > otherBounds.min.y) {
        collisions.push(other);
      }
    });
    
    return collisions;
  },
  
  canPlaceCabinet: (cabinetType, position, excludeId) => {
    const state = get();
    if (!state.drawing) return false;
    
    // Create temporary cabinet entity for collision checking
    const cabinetDimensions = {
      base: { width: 60, height: 85, depth: 60 },
      wall: { width: 60, height: 70, depth: 35 },
      tall: { width: 60, height: 210, depth: 60 },
      sink: { width: 80, height: 85, depth: 60 },
      stove: { width: 60, height: 85, depth: 60 },
      fridge: { width: 60, height: 200, depth: 65 }
    };
    
    const dims = cabinetDimensions[cabinetType];
    const bestPosition = state.findBestCabinetPosition(dims.width, position);
    
    if (!bestPosition) return false;
    
    const tempCabinet: CabinetEntity = {
      id: 'temp',
      type: 'cabinet',
      layer: 'FURNITURE',
      color: 4,
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position: bestPosition.position,
        width: dims.width,
        height: dims.height,
        depth: dims.depth,
        rotation: bestPosition.rotation,
        cabinetType: cabinetType,
        wallId: bestPosition.wall.id
      },
      properties: {
        // Materials & Finishes
        material: 'melamine',
        color: '#FFFFFF',
        finish: 'matte',
        
        // Door Configuration
        doorStyle: 'flat',
        doorCount: 1,
        doorConfiguration: {
          hingeType: 'concealed',
          handleType: 'handle',
          handlePosition: 'center',
          handleMaterial: 'stainless_steel'
        },
        
        // Internal Configuration
        shelves: {
          count: 1,
          positions: [150],
          thickness: 16,
          material: 'melamine'
        },
        
        // Drawer Configuration
        drawers: {
          count: 0,
          heights: [],
          drawerType: 'standard',
          handles: true
        },
        
        // Construction Details
        construction: {
          carcaseThickness: 16,
          backPanelThickness: 8,
          bottomPanelThickness: 16,
          edgeBanding: {
            front: true,
            back: false,
            left: true,
            right: true,
            thickness: 0.8,
            material: 'pvc'
          }
        },
        
        // Hardware
        hardware: {
          hinges: 'blum',
          handles: 'hafele',
          drawerSlides: 'blum',
          shelfPins: 'standard'
        }
      }
    };
    
    const collisions = state.checkCollision(tempCabinet, excludeId);
    
    // Allow collision with walls and doors/windows (cabinets can be placed against them)
    const allowedCollisions = collisions.filter(c => 
      c.type === 'wall' || c.type === 'door' || c.type === 'window'
    );
    
    // Check for collisions with other cabinets or furniture
    const problematicCollisions = collisions.filter(c => 
      c.type === 'cabinet' || c.type === 'furniture'
    );
    
    return problematicCollisions.length === 0;
  },
  
  getValidCabinetPositions: (cabinetType, point) => {
    const state = get();
    if (!state.drawing) return [];
    
    const validPositions: Point2D[] = [];
    const nearestWall = state.findNearestWall(point, 100);
    
    if (!nearestWall) return validPositions;
    
    const cabinetDimensions = {
      base: { width: 60, height: 85, depth: 60 },
      wall: { width: 60, height: 70, depth: 35 },
      tall: { width: 60, height: 210, depth: 60 },
      sink: { width: 80, height: 85, depth: 60 },
      stove: { width: 60, height: 85, depth: 60 },
      fridge: { width: 60, height: 200, depth: 65 }
    };
    
    const dims = cabinetDimensions[cabinetType];
    const snapPoints = state.getWallSnapPoints(nearestWall, 20); // Check every 20cm
    
    snapPoints.forEach(snapPoint => {
      const testPosition = state.snapToWall(snapPoint, nearestWall, 60);
      
      if (state.canPlaceCabinet(cabinetType, testPosition)) {
        validPositions.push(testPosition);
      }
    });
    
    return validPositions;
  },

  // Auto-save Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»Ð½Ð¾ÑÑ‚ - ÑÐ²ÐµÑ‚Ð¾Ð²Ð½Ð¾ Ð½Ð¸Ð²Ð¾ 2026
  autoSave: () => {
    const state = get();
    if (!state.drawing) return;
    
    set({ saveStatus: 'saving' });
    
    // Ð”ÐµÐ±Ð°ÑƒÐ½Ñ Ð·Ð° 1 ÑÐµÐºÑƒÐ½Ð´Ð° Ð·Ð° Ð¾Ð¿Ñ‚Ð¸Ð¼Ð°Ð»Ð½Ð° Ð¿Ñ€Ð¾Ð¸Ð·Ð²Ð¾Ð´Ð¸Ñ‚ÐµÐ»Ð½Ð¾ÑÑ‚
    cadStorage.autoSave(
      state.drawing.id,
      state.drawing.name,
      {
        drawing: state.drawing,
        viewport: state.viewport,
        timestamp: Date.now(),
      },
      undefined, // thumbnail - Ð¼Ð¾Ð¶Ðµ Ð´Ð° ÑÐµ Ð´Ð¾Ð±Ð°Ð²Ð¸ canvas screenshot
      1000 // 1 ÑÐµÐºÑƒÐ½Ð´Ð° delay
    );
    
    // Ð¡Ð¸Ð¼ÑƒÐ»Ð¸Ñ€Ð°Ð¼Ðµ ÑƒÑÐ¿ÐµÑˆÐ½Ð¾ Ð·Ð°Ð¿Ð°Ð·Ð²Ð°Ð½Ðµ ÑÐ»ÐµÐ´ ÐºÑ€Ð°Ñ‚ÐºÐ¾ Ð²Ñ€ÐµÐ¼Ðµ
    setTimeout(() => {
      set({ saveStatus: 'saved' });
    }, 1500);
  },

  loadDrawing: async (id) => {
    try {
      set({ saveStatus: 'saving' });
      const data = await cadStorage.loadDrawing(id);
      
      if (data && data.data) {
        set({
          drawing: data.data.drawing,
          viewport: data.data.viewport || get().viewport,
          saveStatus: 'saved',
        });
        return true;
      }
      
      set({ saveStatus: 'error' });
      return false;
    } catch (error) {
      console.error('Ð“Ñ€ÐµÑˆÐºÐ° Ð¿Ñ€Ð¸ Ð·Ð°Ñ€ÐµÐ¶Ð´Ð°Ð½Ðµ:', error);
      set({ saveStatus: 'error' });
      return false;
    }
  },

  exportDrawing: () => {
    const state = get();
    if (!state.drawing) return '';
    
    const exportData = {
      drawing: state.drawing,
      viewport: state.viewport,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    return JSON.stringify(exportData, null, 2);
  },

  importDrawing: (json) => {
    try {
      const data = JSON.parse(json);
      
      if (!data.drawing) {
        console.error('ÐÐµÐ²Ð°Ð»Ð¸Ð´ÐµÐ½ Ñ„Ð¾Ñ€Ð¼Ð°Ñ‚ Ð½Ð° Ñ„Ð°Ð¹Ð»Ð°');
        return false;
      }
      
      set({
        drawing: data.drawing,
        viewport: data.viewport || get().viewport,
        saveStatus: 'unsaved',
      });
      
      return true;
    } catch (error) {
      console.error('Ð“Ñ€ÐµÑˆÐºÐ° Ð¿Ñ€Ð¸ Ð¸Ð¼Ð¿Ð¾Ñ€Ñ‚:', error);
      return false;
    }
  },

  findNearestWall: (point, maxDistance = 500) => {
    const state = get();
    if (!state.drawing) return null;
    
    let nearestWall: WallEntity | null = null;
    let minDistance = maxDistance;
    
    const walls = state.drawing.entities.filter(e => e.type === 'wall') as WallEntity[];
    
    walls.forEach(wall => {
      const { start, end } = wall.geometry;
      const distance = state.distanceToLineSegment(point, start, end);
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestWall = wall;
      }
    });
    
    return nearestWall;
  },

  pointInEntity: (point, entity) => {
    const bounds = get().getEntityBounds(entity);
    return point.x >= bounds.min.x && point.x <= bounds.max.x &&
           point.y >= bounds.min.y && point.y <= bounds.max.y;
  },
  
  })),
  {
    partialize: (state) => ({ drawing: state.drawing }),
    limit: 100
  }
)
  )
));

// Export store with undo functionality
export const useCADStore = cadStore;

// Helper hook to access undo/redo functions reactively
export const useUndoManager = () => useStore(cadStore.temporal, (state) => state);
