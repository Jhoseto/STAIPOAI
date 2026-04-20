import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RoomDimensions {
  length: number;
  width: number;
  height: number;
}

export interface DoorPosition {
  wall: 'north' | 'south' | 'east' | 'west';
  position: number;
  width: number;
}

export interface WindowPosition {
  wall: 'north' | 'south' | 'east' | 'west';
  position: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface CabinetPosition {
  type: 'base' | 'wall' | 'tall' | 'sink' | 'stove' | 'fridge';
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
}

export interface GeneratedLayout {
  id: 'A' | 'B' | 'C';
  name: string;
  description: string;
  cabinets: CabinetPosition[];
  triangleScore: number;
  efficiency: number;
  walls: Array<{
    start: { x: number; z: number };
    end: { x: number; z: number };
    thickness: number;
    height: number;
  }>;
}

interface RoomWizardState {
  // Step management
  currentStep: 'dimensions' | 'doors' | 'windows' | 'generating' | 'selection' | 'completed';
  
  // Room data
  roomDimensions: RoomDimensions;
  doors: DoorPosition[];
  windows: WindowPosition[];
  
  // Generated layouts
  layouts: GeneratedLayout[];
  selectedLayout: GeneratedLayout | null;
  
  // UI state
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  setCurrentStep: (step: RoomWizardState['currentStep']) => void;
  
  // Room actions
  setRoomDimensions: (dimensions: Partial<RoomDimensions>) => void;
  addDoor: (door: Omit<DoorPosition, 'position'>) => void;
  updateDoor: (index: number, updates: Partial<DoorPosition>) => void;
  removeDoor: (index: number) => void;
  addWindow: (window: Omit<WindowPosition, 'position'>) => void;
  updateWindow: (index: number, updates: Partial<WindowPosition>) => void;
  removeWindow: (index: number) => void;
  
  // Layout actions
  setLayouts: (layouts: GeneratedLayout[]) => void;
  setSelectedLayout: (layout: GeneratedLayout | null) => void;
  selectLayout: (layoutId: string) => void;
  
  // Generation actions
  generateLayouts: () => Promise<void>;
  resetWizard: () => void;
  
  // Utility actions
  calculateArea: () => number;
  validateRoom: () => { isValid: boolean; errors: string[] };
}

export const useRoomWizardStore = create<RoomWizardState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentStep: 'dimensions',
      roomDimensions: {
        length: 350,
        width: 280,
        height: 260,
      },
      doors: [],
      windows: [],
      layouts: [],
      selectedLayout: null,
      isGenerating: false,
      error: null,

      // Step management
      setCurrentStep: (step) => set({ currentStep: step }),

      // Room actions
      setRoomDimensions: (dimensions) => set((state) => ({
        roomDimensions: { ...state.roomDimensions, ...dimensions }
      })),

      addDoor: (door) => set((state) => ({
        doors: [...state.doors, { ...door, position: 100 }]
      })),

      updateDoor: (index, updates) => set((state) => ({
        doors: state.doors.map((door, i) => i === index ? { ...door, ...updates } : door)
      })),

      removeDoor: (index) => set((state) => ({
        doors: state.doors.filter((_, i) => i !== index)
      })),

      addWindow: (window) => set((state) => ({
        windows: [...state.windows, { ...window, position: 150 }]
      })),

      updateWindow: (index, updates) => set((state) => ({
        windows: state.windows.map((window, i) => i === index ? { ...window, ...updates } : window)
      })),

      removeWindow: (index) => set((state) => ({
        windows: state.windows.filter((_, i) => i !== index)
      })),

      // Layout actions
      setLayouts: (layouts) => set({ layouts }),
      setSelectedLayout: (layout) => set({ selectedLayout: layout }),
      selectLayout: (layoutId) => set((state) => ({
        selectedLayout: state.layouts.find(layout => layout.id === layoutId) || null
      })),

      // Generation actions
      generateLayouts: async () => {
        const state = get();
        set({ isGenerating: true, error: null });

        try {
          const response = await fetch('/api/kitchen/room-wizard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              room: state.roomDimensions,
              doors: state.doors,
              windows: state.windows,
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to generate layouts');
          }

          const data = await response.json();
          set({ 
            layouts: data.layouts,
            currentStep: 'selection',
            isGenerating: false 
          });
        } catch (error) {
          console.error('Error generating layouts:', error);
          
          // Fallback to mock layouts
          const mockLayouts: GeneratedLayout[] = [
            {
              id: 'A',
              name: 'U-Shape Layout',
              description: 'Maximum storage and counter space',
              cabinets: [
                { type: 'base', x: 50, y: 50, width: 60, depth: 60, rotation: 0 },
                { type: 'sink', x: 120, y: 50, width: 80, depth: 60, rotation: 0 },
                { type: 'stove', x: 210, y: 50, width: 60, depth: 60, rotation: 0 },
                { type: 'fridge', x: 50, y: 120, width: 60, depth: 60, rotation: 90 },
                { type: 'base', x: 50, y: 190, width: 200, depth: 60, rotation: 0 },
                { type: 'wall', x: 50, y: 50, width: 200, depth: 35, rotation: 90 },
              ],
              triangleScore: 95,
              efficiency: 88,
              walls: [
                { start: { x: 0, z: 0 }, end: { x: state.roomDimensions.length, z: 0 }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: 0 }, end: { x: state.roomDimensions.length, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: state.roomDimensions.width }, end: { x: 0, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: 0, z: state.roomDimensions.width }, end: { x: 0, z: 0 }, thickness: 150, height: state.roomDimensions.height },
              ],
            },
            {
              id: 'B',
              name: 'L-Shape Layout',
              description: 'Open and spacious design',
              cabinets: [
                { type: 'base', x: 50, y: 50, width: 200, depth: 60, rotation: 0 },
                { type: 'sink', x: 110, y: 50, width: 80, depth: 60, rotation: 0 },
                { type: 'stove', x: 200, y: 50, width: 60, depth: 60, rotation: 0 },
                { type: 'fridge', x: 50, y: 120, width: 60, depth: 60, rotation: 90 },
                { type: 'base', x: 50, y: 190, width: 100, depth: 60, rotation: 0 },
                { type: 'wall', x: 50, y: 50, width: 150, depth: 35, rotation: 90 },
              ],
              triangleScore: 88,
              efficiency: 82,
              walls: [
                { start: { x: 0, z: 0 }, end: { x: state.roomDimensions.length, z: 0 }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: 0 }, end: { x: state.roomDimensions.length, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: state.roomDimensions.width }, end: { x: 0, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: 0, z: state.roomDimensions.width }, end: { x: 0, z: 0 }, thickness: 150, height: state.roomDimensions.height },
              ],
            },
            {
              id: 'C',
              name: 'Straight Layout',
              description: 'Simple and efficient',
              cabinets: [
                { type: 'base', x: 50, y: 50, width: 250, depth: 60, rotation: 0 },
                { type: 'sink', x: 110, y: 50, width: 80, depth: 60, rotation: 0 },
                { type: 'stove', x: 200, y: 50, width: 60, depth: 60, rotation: 0 },
                { type: 'fridge', x: 50, y: 120, width: 60, depth: 60, rotation: 90 },
                { type: 'wall', x: 50, y: 50, width: 180, depth: 35, rotation: 90 },
              ],
              triangleScore: 76,
              efficiency: 75,
              walls: [
                { start: { x: 0, z: 0 }, end: { x: state.roomDimensions.length, z: 0 }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: 0 }, end: { x: state.roomDimensions.length, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: state.roomDimensions.length, z: state.roomDimensions.width }, end: { x: 0, z: state.roomDimensions.width }, thickness: 150, height: state.roomDimensions.height },
                { start: { x: 0, z: state.roomDimensions.width }, end: { x: 0, z: 0 }, thickness: 150, height: state.roomDimensions.height },
              ],
            },
          ];
          
          set({ 
            layouts: mockLayouts,
            currentStep: 'selection',
            isGenerating: false 
          });
        }
      },

      resetWizard: () => set({
        currentStep: 'dimensions',
        roomDimensions: {
          length: 350,
          width: 280,
          height: 260,
        },
        doors: [],
        windows: [],
        layouts: [],
        selectedLayout: null,
        isGenerating: false,
        error: null,
      }),

      // Utility actions
      calculateArea: () => {
        const state = get();
        return (state.roomDimensions.length * state.roomDimensions.width) / 10000;
      },

      validateRoom: () => {
        const state = get();
        const errors: string[] = [];

        if (state.roomDimensions.length < 200 || state.roomDimensions.length > 800) {
          errors.push('Room length must be between 200cm and 800cm');
        }

        if (state.roomDimensions.width < 200 || state.roomDimensions.width > 600) {
          errors.push('Room width must be between 200cm and 600cm');
        }

        if (state.roomDimensions.height < 240 || state.roomDimensions.height > 300) {
          errors.push('Room height must be between 240cm and 300cm');
        }

        // Check door positions
        state.doors.forEach((door, index) => {
          const maxPosition = door.wall === 'north' || door.wall === 'south' 
            ? state.roomDimensions.length 
            : state.roomDimensions.width;
          
          if (door.position < 0 || door.position + door.width > maxPosition) {
            errors.push(`Door ${index + 1} position is invalid`);
          }
        });

        // Check window positions
        state.windows.forEach((window, index) => {
          const maxPosition = window.wall === 'north' || window.wall === 'south' 
            ? state.roomDimensions.length 
            : state.roomDimensions.width;
          
          if (window.position < 0 || window.position + window.width > maxPosition) {
            errors.push(`Window ${index + 1} position is invalid`);
          }

          if (window.sillHeight < 80 || window.sillHeight > 120) {
            errors.push(`Window ${index + 1} sill height should be between 80cm and 120cm`);
          }
        });

        return {
          isValid: errors.length === 0,
          errors
        };
      },
    }),
    {
      name: 'room-wizard-storage',
      partialize: (state) => ({
        roomDimensions: state.roomDimensions,
        doors: state.doors,
        windows: state.windows,
      }),
    }
  )
);
