import { CabinetEntity, CountertopEntity, Entity, Point2D } from '../types';

/**
 * Generates a CountertopEntity for a given set of cabinet IDs.
 * It groups cabinets by their rotation and proximity.
 */
export function generateCountertop(selectedIds: string[], allEntities: Entity[]): CountertopEntity[] {
  const selectedCabinets = allEntities.filter(
    ent => ent.type === 'cabinet' && selectedIds.includes(ent.id)
  ) as CabinetEntity[];

  if (selectedCabinets.length === 0) return [];

  // 1. Group cabinets by rotation (within a small tolerance)
  const ROTATION_TOLERANCE = 0.01;
  const groups: CabinetEntity[][] = [];

  selectedCabinets.forEach(cab => {
    let placed = false;
    for (const group of groups) {
      if (Math.abs(group[0].geometry.rotation - cab.geometry.rotation) < ROTATION_TOLERANCE) {
        group.push(cab);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([cab]);
  });

  const results: CountertopEntity[] = [];

  // 2. For each group with same rotation, calculate a slab
  groups.forEach(group => {
    // In local space of the first cabinet's rotation
    const rotation = group[0].geometry.rotation;
    const cos = Math.cos(-rotation);
    const sin = Math.sin(-rotation);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let maxTop = 0; // The highest cabinet top

    group.forEach(cab => {
      const { x, y } = cab.geometry.position;
      const w = cab.geometry.width;
      const d = cab.geometry.depth;
      const h = cab.geometry.height;
      const offset = cab.geometry.floorOffset || 0;

      // Transform center to local space
      const lx = x * cos - y * sin;
      const ly = x * sin + y * cos;

      minX = Math.min(minX, lx - w / 2);
      maxX = Math.max(maxX, lx + w / 2);
      minY = Math.min(minY, ly - d / 2);
      maxY = Math.max(maxY, ly + d / 2);
      maxTop = Math.max(maxTop, offset + h);
    });

    const width = maxX - minX;
    const depth = maxY - minY;
    
    // Transform local center back to world space
    const localCenterX = (minX + maxX) / 2;
    const localCenterY = (minY + maxY) / 2;
    
    const worldCenterX = localCenterX * Math.cos(rotation) - localCenterY * Math.sin(rotation);
    const worldCenterY = localCenterX * Math.sin(rotation) + localCenterY * Math.cos(rotation);

    results.push({
      id: crypto.randomUUID(),
      type: 'countertop',
      layer: 'FURNITURE',
      color: 7, // White/Light Gray
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position: { x: worldCenterX, y: worldCenterY },
        width: width,
        depth: depth,
        height: 40, // 40mm thickness
        elevation: maxTop, // sits exactly on top of cabinets
        rotation: rotation,
        cabinetIds: group.map(c => c.id)
      },
      properties: {
        material: 'marble',
        color: '#ffffff',
        finish: 'glossy',
        overhang: {
          front: 20,
          back: 0,
          left: 0,
          right: 0
        },
        backsplash: true,
        backsplashHeight: 50,
        edgeRadius: 10
      }
    } as CountertopEntity);
  });

  return results;
}
