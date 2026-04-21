import { generateBOM, exportBOMToCSV, downloadCSV } from '../../../lib/bom-engine';
import * as htmlToImage from 'html-to-image';

export const handleToggleLayer = async (store: any, args: any) => {
  const { layer, visible } = args;
  store.toggleLayerVisiblity(layer); // Note the typo in cad-store: toggleLayerVisiblity
  return true;
};

export const handleSetViewMode = async (store: any, args: any) => {
  const { mode, wallId } = args;
  store.setViewMode(mode);
  
  if (mode === 'elevation' && wallId) {
    // Ако магазинът има функция за задаване на стената, я извикваме
    if (typeof store.setElevationWall === 'function') {
      store.setElevationWall(wallId);
    }
  }
  return true;
};

export const handleExportBOM = async (store: any, args: any) => {
  if (!store.drawing) return false;
  
  const panels = generateBOM(store.drawing.entities);
  const csv = exportBOMToCSV(panels);
  downloadCSV(csv, `kitchen_cut_list_${Date.now()}.csv`);
  
  return true;
};

export const handlePresentationExport = async (store: any, args: any) => {
  const element = document.querySelector('main') || document.body;
  try {
    const dataUrl = await htmlToImage.toPng(element, {
      quality: 1.0,
      pixelRatio: 2,
      backgroundColor: '#f8fafc',
    });
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `staipo_presentation_${Date.now()}.png`;
    link.click();
    return true;
  } catch (err) {
    console.error("Export failed:", err);
    return false;
  }
};
