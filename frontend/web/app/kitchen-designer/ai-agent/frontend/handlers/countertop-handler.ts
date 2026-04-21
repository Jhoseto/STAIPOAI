
import { generateCountertop } from '../../../lib/countertop-generator';

export const handleGenerateCountertops = async (store: any, args: any) => {
  const { baseCabinetIds } = args;
  
  if (!store.drawing) return false;
  
  // Използваме съществуващия генератор от STAIPO
  const countertops = generateCountertop(baseCabinetIds, store.drawing.entities);
  
  // Добавяме генерираните плотове
  countertops.forEach((top) => {
    store.addEntity(top);
  });
  
  return true;
};
