// Professional CAD Types - AutoCAD Style
export interface Point2D {
  x: number;
  y: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Vector2D {
  dx: number;
  dy: number;
}

export interface BoundingBox {
  min: Point2D;
  max: Point2D;
}

export interface Entity {
  id: string;
  type: 'line' | 'polyline' | 'arc' | 'circle' | 'wall' | 'door' | 'window' | 'cabinet' | 'furniture' | 'countertop' | 'appliance';
  layer: string;
  color: number; // AutoCAD color index
  linetype: string;
  lineweight: number; // in mm
  visible: boolean;
  locked: boolean;
  geometry: any;
  properties: Record<string, any>;
}

export interface LineEntity extends Entity {
  type: 'line';
  geometry: {
    start: Point2D;
    end: Point2D;
  };
}

export interface WallEntity extends Entity {
  type: 'wall';
  geometry: {
    start: Point2D;
    end: Point2D;
    thickness: number;
    height: number;
  };
}

export interface DoorEntity extends Entity {
  type: 'door';
  geometry: {
    position: Point2D;
    width: number;
    height: number;
    direction: 'left' | 'right' | 'double';
    wallId?: string; // Reference to the wall this door belongs to
  };
}

export interface WindowEntity extends Entity {
  type: 'window';
  geometry: {
    position: Point2D;
    width: number;
    height: number;
    sillHeight: number;
    wallId?: string; // Reference to the wall this window belongs to
  };
}

export interface CabinetEntity extends Entity {
  type: 'cabinet';
  geometry: {
    position: Point2D;
    width: number;
    height: number;
    depth: number;
    rotation: number; // Angle in radians
    cabinetType: 'base' | 'wall' | 'tall' | 'sink' | 'stove' | 'fridge';
    floorOffset?: number; // Height of the cabinet bottom above the floor in mm (e.g. 0 for base, 1400 for wall)
    wallId?: string; // Reference to the wall this cabinet belongs to
  };
  properties: {
    // Materials & Finishes
    material: string; // 'melamine', 'mdf', 'solid_wood'
    color: string; // Hex color or material name
    finish: string; // 'matte', 'glossy', 'textured'
    
    // Door Configuration
    doorStyle: 'flat' | 'shaker' | 'raised_panel' | 'glass';
    doorCount: number; // 1, 2, or more doors
    doorConfiguration: {
      hingeType: 'concealed' | 'visible' | 'soft_close';
      handleType: 'handle' | 'knob' | 'push_to_open' | 'none';
      handlePosition: 'left' | 'right' | 'center' | 'both';
      handleMaterial: string;
    };
    
    // Internal Configuration
    shelves: {
      count: number;
      positions: number[]; // Heights from bottom
      thickness: number; // 16mm, 18mm
      material: string;
    };
    
    // Drawer Configuration
    drawers: {
      count: number;
      heights: number[]; // Individual drawer heights
      drawerType: 'standard' | 'soft_close' | 'push_to_open';
      handles: boolean;
    };
    
    // Construction Details
    construction: {
      carcaseThickness: number; // 16mm, 18mm
      backPanelThickness: number; // 3mm, 8mm
      bottomPanelThickness: number; // 16mm, 18mm
      edgeBanding: {
        front: boolean;
        back: boolean;
        left: boolean;
        right: boolean;
        thickness: number; // 0.8mm, 2mm
        material: string;
      };
    };
    
    // Hardware
    hardware: {
      hinges: string; // Brand/model
      handles: string; // Brand/model
      drawerSlides: string; // Brand/model
      shelfPins: string; // Brand/model
    };
  };
}

export type ApplianceType = 'sink_single' | 'sink_double' | 'hob_induction' | 'hob_gas' | 'oven' | 'microwave' | 'hood';

export interface ApplianceEntity extends Entity {
  type: 'appliance';
  geometry: {
    position: Point2D;
    width: number;
    height: number;
    depth: number;
    rotation: number;
    elevation: number;
    parentId?: string; // e.g., the cabinet it is placed on
  };
  properties: {
    applianceType: ApplianceType;
    material: string;
    brand?: string;
    model?: string;
  };
}

export interface CountertopEntity extends Entity {
  type: 'countertop';
  geometry: {
    position: Point2D;
    width: number;
    depth: number;
    height: number; // thickness (e.g. 40mm)
    elevation: number; // height from floor to bottom of countertop (e.g. 870mm)
    rotation: number;
    cabinetIds: string[]; // cabinets covered by this countertop
  };
  properties: {
    material: 'marble' | 'granite' | 'quartz' | 'wood' | 'laminate';
    color: string;
    finish: 'matte' | 'glossy';
    overhang: {
      front: number;
      back: number;
      left: number;
      right: number;
    };
    backsplash: boolean;
    backsplashHeight: number;
    edgeRadius: number; // For front and side rounding
  };
}

export interface FurnitureEntity extends Entity {
  type: 'furniture';
  geometry: {
    position: Point2D;
    width: number;
    height: number;
    depth: number;
    rotation: number;
    elevation: number;
    orientation?: 'horizontal' | 'vertical';
  };
  properties: {
    label: string;
    material: 'marble' | 'granite' | 'quartz' | 'wood' | 'mdf' | 'melamine' | 'glass' | 'metal';
    color: string;
    finish: 'matte' | 'glossy';
    overhang: {
      front: number;
      back: number;
      left: number;
      right: number;
    };
    backsplash: boolean;
    backsplashHeight: number;
    edgeRadius: number;
  };
}

export interface Layer {
  name: string;
  color: number;
  linetype: string;
  lineweight: number;
  plot: boolean;
  on: boolean;
  freeze: boolean;
  lock: boolean;
}

export interface Viewport {
  center: Point2D;
  height: number;
  scale: number;
  rotation: number;
  // 3D orbit controls
  rotationX: number; // Vertical rotation (elevation)
  rotationY: number; // Horizontal rotation (azimuth)
}

export interface UCS {
  origin: Point2D;
  xAxis: Vector2D;
  yAxis: Vector2D;
}

export interface CADDrawing {
  id: string;
  name: string;
  units: 'mm' | 'cm' | 'm' | 'inches';
  precision: number;
  limits: BoundingBox;
  layers: Layer[];
  entities: Entity[];
  viewport: Viewport;
  ucs: UCS;
  gridSettings: {
    on: boolean;
    xSpacing: number;
    ySpacing: number;
    majorSpacing: number;
    snap: boolean;
    snapSpacing: Point2D;
    ortho: boolean;
  };
  activeLayer: string;
  currentColor: number;
  currentLinetype: string;
  currentLineweight: number;
}

// --- BOM (Bill of Materials) & Cut List Types ---

export type EdgeBandingType = 'none' | '1mm' | '2mm';

export interface EdgeBanding {
  L1: EdgeBandingType; // Long side 1
  L2: EdgeBandingType; // Long side 2
  W1: EdgeBandingType; // Short side 1
  W2: EdgeBandingType; // Short side 2
}

export interface BOMPanel {
  id: string; // Internal id 
  cabinetId: string; // Which cabinet it belongs to
  name: string; // eg. "Left Side", "Bottom", "Door"
  material: string; // e.g. "MDF 18mm White", "HDF 3mm White"
  length: number; // L
  width: number;  // W
  thickness: number;
  quantity: number;
  edgeBanding: EdgeBanding;
}
