import { Entity, Point2D, CabinetEntity, WallEntity } from '../types';

export interface SnapResult {
  position: Point2D;
  rotation: number;
  snapped: boolean;
}

/**
 * Calculates the shortest distance from a point to a line segment.
 * Returns the distance and the exact closest point on the line segment.
 */
function getClosestPointOnSegment(p: Point2D, a: Point2D, b: Point2D): { distance: number, point: Point2D } {
  const atob = { x: b.x - a.x, y: b.y - a.y };
  const atop = { x: p.x - a.x, y: p.y - a.y };
  const lenSq = atob.x * atob.x + atob.y * atob.y;
  
  if (lenSq === 0) {
    const dist = Math.hypot(p.x - a.x, p.y - a.y);
    return { distance: dist, point: a };
  }
  
  const dot = atop.x * atob.x + atop.y * atob.y;
  const t = Math.max(0, Math.min(1, dot / lenSq));
  
  const closest = {
    x: a.x + t * atob.x,
    y: a.y + t * atob.y
  };
  
  const dist = Math.hypot(p.x - closest.x, p.y - closest.y);
  return { distance: dist, point: closest };
}

export function calculateSnap(
  mousePos: Point2D, 
  currentEntity: CabinetEntity | Partial<CabinetEntity>, 
  allEntities: Entity[],
  currentRotation: number = 0
): SnapResult {
  
  const SNAP_DISTANCE = 300; // 300mm magnetic radius
  let bestPos = { ...mousePos };
  let bestRot = currentRotation;
  let snapped = false;
  let minDistance = SNAP_DISTANCE;

  const width = currentEntity.geometry?.width || 600;
  const depth = currentEntity.geometry?.depth || 600;

  // 1. Try snapping to Wall first (determines rotation purely)
  for (const ent of allEntities) {
    if (ent.type === 'wall') {
      const wall = ent as WallEntity;
      const { distance, point } = getClosestPointOnSegment(mousePos, wall.geometry.start, wall.geometry.end);
      
      if (distance < minDistance) {
        minDistance = distance;
        
        // Calculate wall angle
        const dx = wall.geometry.end.x - wall.geometry.start.x;
        const dy = wall.geometry.end.y - wall.geometry.start.y;
        const wallAngle = Math.atan2(dy, dx);
        
        // The cabinet's back should face the wall.
        // If the wall goes from left to right (0 rad), its normal facing "inside" the room usually depends on drawing order.
        // We will snap the back perpendicularly.
        // The normal angle is wallAngle + PI/2 or - PI/2.
        // We determine which side the mouse is on using the cross product to get the exact normal pointing to the mouse.
        const cross = dx * (mousePos.y - wall.geometry.start.y) - dy * (mousePos.x - wall.geometry.start.x);
        
        let normalAngle;
        if (cross > 0) {
           normalAngle = wallAngle + Math.PI / 2;
        } else {
           normalAngle = wallAngle - Math.PI / 2;
        }

        // Cabinet rotation assumes 0 is facing "down/front" (towards positive Z).
        // If back is to the wall, rotation should be normalAngle + PI.
        bestRot = normalAngle + Math.PI;

        // Offset the point along the normal so the BACK of the cabinet touches the wall.
        // R3F cabinet center is locally at [0, 0, 0]. The back is at -depth/2.
        // So we must move the center physically AWAY from the wall by depth/2.
        const offsetDist = depth / 2 + wall.geometry.thickness / 2;
        bestPos = {
          x: point.x + Math.cos(normalAngle) * offsetDist,
          y: point.y + Math.sin(normalAngle) * offsetDist
        };
        
        snapped = true;
      }
    }
  }

  // 2. Try snapping to another Cabinet (side-by-side)
  // Cabinet snap can override Wall snap position if we are very close to another cabinet's edge, 
  // but we should probably keep the rotation established by the wall if both are triggered.
  // For simplicity, if we hit a cabinet, we align strictly to it.
  for (const ent of allEntities) {
    if (ent.type === 'cabinet' && ent.id !== currentEntity.id) {
      const cab = ent as CabinetEntity;
      const otherPos = cab.geometry.position;
      const otherRot = cab.geometry.rotation;
      const otherWidth = cab.geometry.width;

      const distSq = (mousePos.x - otherPos.x) ** 2 + (mousePos.y - otherPos.y) ** 2;
      
      if (Math.sqrt(distSq) < SNAP_DISTANCE && Math.sqrt(distSq) < minDistance) {
        minDistance = Math.sqrt(distSq);
        
        // We calculate distance in the local coordinate space of the target cabinet.
        const dx = mousePos.x - otherPos.x;
        const dy = mousePos.y - otherPos.y;
        
        // Un-rotate the dx/dy vector to see if mouse is on left or right
        const localX = dx * Math.cos(-otherRot) - dy * Math.sin(-otherRot);
        
        // Match rotation absolutely
        bestRot = otherRot;
        snapped = true;

        if (localX > 0) {
          // Snap Right
          const offsetAmount = (otherWidth / 2) + (width / 2);
          bestPos = {
            x: otherPos.x + Math.cos(otherRot) * offsetAmount,
            y: otherPos.y + Math.sin(otherRot) * offsetAmount
          };
        } else {
          // Snap Left
          const offsetAmount = (otherWidth / 2) + (width / 2);
          bestPos = {
            x: otherPos.x - Math.cos(otherRot) * offsetAmount,
            y: otherPos.y - Math.sin(otherRot) * offsetAmount
          };
        }
      }
    }
  }

  return { position: bestPos, rotation: bestRot, snapped };
}
