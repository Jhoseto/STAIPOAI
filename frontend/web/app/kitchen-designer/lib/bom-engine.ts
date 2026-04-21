import { Entity, CabinetEntity, FurnitureEntity, CountertopEntity, BOMPanel, EdgeBandingType } from '../types';

/**
 * Standard edge bandings templates
 */
const EDGE_FRONT_ONLY = { L1: '1mm' as EdgeBandingType, L2: 'none' as EdgeBandingType, W1: 'none' as EdgeBandingType, W2: 'none' as EdgeBandingType };
const EDGE_FRONT_BOTTOM = { L1: '1mm' as EdgeBandingType, L2: 'none' as EdgeBandingType, W1: '1mm' as EdgeBandingType, W2: 'none' as EdgeBandingType };
const EDGE_ALL_SIDES = { L1: '1mm' as EdgeBandingType, L2: '1mm' as EdgeBandingType, W1: '1mm' as EdgeBandingType, W2: '1mm' as EdgeBandingType };
const EDGE_NONE = { L1: 'none' as EdgeBandingType, L2: 'none' as EdgeBandingType, W1: 'none' as EdgeBandingType, W2: 'none' as EdgeBandingType };

export function generateBOM(entities: Entity[]): BOMPanel[] {
  const panels: BOMPanel[] = [];
  
  for (const entity of entities) {
    if (entity.type === 'cabinet') {
      panels.push(...generateCabinetPanels(entity as CabinetEntity));
    } else if (entity.type === 'furniture') {
      panels.push(...generateFurniturePanels(entity as FurnitureEntity));
    } else if (entity.type === 'countertop') {
      panels.push(...generateCountertopPanels(entity as CountertopEntity));
    }
  }

  return panels;
}

function generateCabinetPanels(cabinet: CabinetEntity): BOMPanel[] {
  const panels: BOMPanel[] = [];
  const { width, depth, height } = cabinet.geometry;
  const isWallCabinet = cabinet.geometry.cabinetType === 'wall';
  
  const carcassThickness = 18; // mm (Основа ПДЧ)
  const frontThickness = 18;   // mm (Врати МДФ/ПДЧ)
  const backThickness = 3;     // mm (Гръб HDF)
  
  const carcassMat = 'ПДЧ 18мм Бяло';
  const frontMat = 'МДФ 18мм Мат Син';
  const backMat = 'ХДФ 3мм Бяло';

  // 1. Дъно (Bottom)
  panels.push({
    id: crypto.randomUUID(),
    cabinetId: cabinet.id,
    name: 'Дъно',
    material: carcassMat,
    length: width - (carcassThickness * 2), // Inside width
    width: depth,
    thickness: carcassThickness,
    quantity: 1,
    edgeBanding: EDGE_FRONT_ONLY,
  });

  // 2. Страници (Sides)
  panels.push({
    id: crypto.randomUUID(),
    cabinetId: cabinet.id,
    name: 'Страница Дясна',
    material: carcassMat,
    length: height,
    width: depth,
    thickness: carcassThickness,
    quantity: 1,
    edgeBanding: isWallCabinet ? EDGE_FRONT_ONLY : EDGE_FRONT_BOTTOM,
  });
  
  panels.push({
    id: crypto.randomUUID(),
    cabinetId: cabinet.id,
    name: 'Страница Лява',
    material: carcassMat,
    length: height,
    width: depth,
    thickness: carcassThickness,
    quantity: 1,
    edgeBanding: isWallCabinet ? EDGE_FRONT_ONLY : EDGE_FRONT_BOTTOM,
  });

  // 3. Таван / Цагри (Top / Rails)
  if (isWallCabinet) {
    // Wall cabinets have a full top panel
    panels.push({
      id: crypto.randomUUID(),
      cabinetId: cabinet.id,
      name: 'Таван',
      material: carcassMat,
      length: width - (carcassThickness * 2),
      width: depth,
      thickness: carcassThickness,
      quantity: 1,
      edgeBanding: EDGE_FRONT_ONLY,
    });
  } else {
    // Base cabinets have 2 rails (цагри)
    panels.push({
      id: crypto.randomUUID(),
      cabinetId: cabinet.id,
      name: 'Цагра (Предна/Задна)',
      material: carcassMat,
      length: width - (carcassThickness * 2),
      width: 80, // 80mm rails
      thickness: carcassThickness,
      quantity: 2,
      edgeBanding: EDGE_FRONT_ONLY, // Front rail gets banding on 1 side
    });
  }

  // 4. Гръб (Back Panel HDF) - Usually grooved in by 10-15mm or nailed flat
  // Assuming nailed flat (width-2, height-2) or cut exactly
  panels.push({
    id: crypto.randomUUID(),
    cabinetId: cabinet.id,
    name: 'Гръб (HDF)',
    material: backMat,
    length: height - 2, // Slight tolerance
    width: width - 2,
    thickness: backThickness,
    quantity: 1,
    edgeBanding: EDGE_NONE,
  });

  // 5. Врати (Doors / Fronts)
  // Determine number of doors based on width or explicitly set properties
  const doorCount = cabinet.properties?.doorCount || (width > 600 ? 2 : 1);
  const gap = 4; // 4mm total gap (usually 2mm all around)
  
  // Example for simple standard doors. For drawers, it would be different.
  const doorWidth = (width / doorCount) - (gap / doorCount);
  const doorHeight = height - gap;

  panels.push({
    id: crypto.randomUUID(),
    cabinetId: cabinet.id,
    name: doorCount > 1 ? 'Врата (Двойна)' : 'Врата',
    material: frontMat,
    length: doorHeight,
    width: doorWidth,
    thickness: frontThickness,
    quantity: doorCount,
    edgeBanding: EDGE_ALL_SIDES, // Doors always banded all around
  });

  return panels;
}

function generateFurniturePanels(furniture: FurnitureEntity): BOMPanel[] {
  // Simplistic conversion: Furniture entity represents a single slab / panel component
  return [{
    id: crypto.randomUUID(),
    cabinetId: furniture.id,
    name: furniture.properties.label || 'Свободен Панел',
    material: `Материал ${furniture.properties.material}`,
    length: furniture.geometry.orientation === 'horizontal' ? furniture.geometry.width : furniture.geometry.height,
    width: furniture.geometry.orientation === 'horizontal' ? furniture.geometry.depth : furniture.geometry.depth,
    thickness: furniture.geometry.orientation === 'horizontal' ? furniture.geometry.height : furniture.geometry.width,
    quantity: 1,
    edgeBanding: EDGE_ALL_SIDES,
  }];
}

function generateCountertopPanels(countertop: CountertopEntity): BOMPanel[] {
  const { width, depth, height } = countertop.geometry;
  const totalWidth = width + (countertop.properties.overhang.left || 0) + (countertop.properties.overhang.right || 0);
  const totalDepth = depth + (countertop.properties.overhang.front || 0) + (countertop.properties.overhang.back || 0);

  return [{
    id: crypto.randomUUID(),
    cabinetId: countertop.id,
    name: 'Кухненски Плот',
    material: `Плот ${countertop.properties.material}`,
    length: totalWidth,
    width: totalDepth,
    thickness: height,
    quantity: 1,
    edgeBanding: EDGE_ALL_SIDES, // Simplified - custom processing later
  }];
}

/**
 * Generate a CSV string from BOM Panels
 */
export function exportBOMToCSV(panels: BOMPanel[]): string {
  const header = ['Име/Описание', 'Материал', 'Дължина (L)', 'Широчина (W)', 'Дебелина', 'Количество', 'Кант L1', 'Кант L2', 'Кант W1', 'Кант W2', 'ID'];
  const rows = panels.map(p => [
    p.name,
    p.material,
    p.length.toFixed(1),
    p.width.toFixed(1),
    p.thickness.toFixed(1),
    p.quantity.toString(),
    p.edgeBanding.L1,
    p.edgeBanding.L2,
    p.edgeBanding.W1,
    p.edgeBanding.W2,
    p.cabinetId
  ]);

  const csvContent = [header, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel encoding
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
