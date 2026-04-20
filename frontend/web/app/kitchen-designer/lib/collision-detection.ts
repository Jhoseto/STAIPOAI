import { CabinetEntity, WallEntity, Entity, Point2D } from '../types';

// ─── OBB Helpers ────────────────────────────────────────

type Vec2 = { x: number; y: number };

/** Rotate a 2D point around origin by angle (radians) */
function rotatePoint(p: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos - p.y * sin, y: p.x * sin + p.y * cos };
}

/** Get the 4 corners of a cabinet in world space (accounting for rotation) */
export function getCabinetCorners(cabinet: CabinetEntity): Vec2[] {
  const { position, width, depth, rotation } = cabinet.geometry;
  const hw = width / 2;
  const hd = depth / 2;

  // Local corners (centre at origin)
  const localCorners: Vec2[] = [
    { x: -hw, y: -hd },
    { x:  hw, y: -hd },
    { x:  hw, y:  hd },
    { x: -hw, y:  hd },
  ];

  // Rotate and translate to world space
  return localCorners.map(c => {
    const r = rotatePoint(c, rotation);
    return { x: position.x + r.x, y: position.y + r.y };
  });
}

/** Get the 4 wall corners (the wall footprint rectangle) in world space */
export function getWallCorners(wall: WallEntity): Vec2[] {
  const { start, end, thickness } = wall.geometry;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return [];

  // Perpendicular unit vector (normal)
  const nx = -dy / len;
  const ny =  dx / len;
  const half = thickness / 2;

  return [
    { x: start.x + nx * half, y: start.y + ny * half },
    { x:   end.x + nx * half, y:   end.y + ny * half },
    { x:   end.x - nx * half, y:   end.y - ny * half },
    { x: start.x - nx * half, y: start.y - ny * half },
  ];
}

// ─── SAT (Separating Axis Theorem) ──────────────────────

function projectPolygon(corners: Vec2[], axis: Vec2): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const c of corners) {
    const proj = c.x * axis.x + c.y * axis.y;
    if (proj < min) min = proj;
    if (proj > max) max = proj;
  }
  return { min, max };
}

function getNormals(corners: Vec2[]): Vec2[] {
  const normals: Vec2[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const edge = { x: b.x - a.x, y: b.y - a.y };
    const len = Math.hypot(edge.x, edge.y);
    if (len > 0) {
      normals.push({ x: -edge.y / len, y: edge.x / len });
    }
  }
  return normals;
}

/** Returns true if two convex polygons intersect (SAT) */
function polygonsIntersect(a: Vec2[], b: Vec2[]): boolean {
  if (a.length === 0 || b.length === 0) return false;

  const axes = [...getNormals(a), ...getNormals(b)];

  for (const axis of axes) {
    const projA = projectPolygon(a, axis);
    const projB = projectPolygon(b, axis);
    // Separating axis found → no collision
    if (projA.max < projB.min || projB.max < projA.min) return false;
  }
  return true;
}

// ─── Public API ─────────────────────────────────────────

/**
 * Returns a Set of entity IDs that have at least one collision
 * (cabinet-wall or cabinet-cabinet).
 */
export function getCollidingIds(entities: Entity[]): Set<string> {
  const colliding = new Set<string>();
  const cabinets = entities.filter(e => e.type === 'cabinet') as CabinetEntity[];
  const walls    = entities.filter(e => e.type === 'wall')    as WallEntity[];

  // Pre-compute corners
  const cabinetCorners = cabinets.map(c => ({ id: c.id, corners: getCabinetCorners(c) }));
  const wallCorners    = walls   .map(w => ({ id: w.id, corners: getWallCorners(w) }));

  // Cabinet vs Wall
  for (const cab of cabinetCorners) {
    for (const wall of wallCorners) {
      if (polygonsIntersect(cab.corners, wall.corners)) {
        colliding.add(cab.id);
        break; // No need to check more walls for this cabinet
      }
    }
  }

  // Cabinet vs Cabinet
  for (let i = 0; i < cabinetCorners.length; i++) {
    for (let j = i + 1; j < cabinetCorners.length; j++) {
      if (polygonsIntersect(cabinetCorners[i].corners, cabinetCorners[j].corners)) {
        colliding.add(cabinetCorners[i].id);
        colliding.add(cabinetCorners[j].id);
      }
    }
  }

  return colliding;
}
