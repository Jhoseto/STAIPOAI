import { CADDrawing, ApplianceEntity, CabinetEntity } from '../types';

export interface AnalyticsResult {
  workTriangle: {
    perimeter: number;
    score: number; // 0-100
    details: string;
    sinkPos?: { x: number, y: number };
    stovePos?: { x: number, y: number };
    fridgePos?: { x: number, y: number };
  };
  storage: {
    totalVolume: number; // liters/dm3
    efficiencyScore: number;
  };
  overallScore: number;
}

export function calculateDesignAnalytics(drawing: CADDrawing): AnalyticsResult {
  const appliances = drawing.entities.filter(e => e.type === 'appliance') as ApplianceEntity[];
  
  // 1. Identify key points for the Work Triangle
  const sink = appliances.find(a => a.properties.applianceType.includes('sink'));
  const stove = appliances.find(a => a.properties.applianceType.includes('hob') || a.properties.applianceType.includes('oven'));
  const fridge = appliances.find(a => a.properties.applianceType.includes('fridge'));

  let triangleScore = 0;
  let perimeter = 0;
  let details = "Не са намерени всички основни уреди (мивка, печка, хладилник).";

  if (sink && stove && fridge) {
    const d1 = Math.hypot(sink.geometry.position.x - stove.geometry.position.x, sink.geometry.position.y - stove.geometry.position.y);
    const d2 = Math.hypot(stove.geometry.position.x - fridge.geometry.position.x, stove.geometry.position.y - fridge.geometry.position.y);
    const d3 = Math.hypot(fridge.geometry.position.x - sink.geometry.position.x, fridge.geometry.position.y - sink.geometry.position.y);
    
    perimeter = Math.round(d1 + d2 + d3);
    
    // Ideal: 4000mm to 6500mm
    if (perimeter >= 4000 && perimeter <= 7000) {
      triangleScore = 100;
      details = "Перфектен функционален триъгълник.";
    } else if (perimeter < 4000) {
      triangleScore = 60;
      details = "Уредите са твърде близо един до друг (теснота).";
    } else {
      triangleScore = 40;
      details = "Твърде голямо разстояние за ходене между уредите.";
    }
  }

  // 2. Storage metrics
  const cabinets = drawing.entities.filter(e => e.type === 'cabinet') as CabinetEntity[];
  const totalVolume = cabinets.reduce((acc, cab) => {
    return acc + (cab.geometry.width * cab.geometry.height * cab.geometry.depth) / 1000000;
  }, 0);

  const efficiencyScore = Math.min(100, Math.round(totalVolume / 2)); // Mock scaling

  return {
    workTriangle: {
      perimeter,
      score: triangleScore,
      details,
      sinkPos: sink?.geometry.position,
      stovePos: stove?.geometry.position,
      fridgePos: fridge?.geometry.position,
    },
    storage: {
      totalVolume: Math.round(totalVolume),
      efficiencyScore
    },
    overallScore: Math.round((triangleScore + efficiencyScore) / 2)
  };
}
