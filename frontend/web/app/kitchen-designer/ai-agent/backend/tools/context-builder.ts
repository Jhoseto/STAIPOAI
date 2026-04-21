/**
 * Конвертира масив от CAD entities в текстов формат (markdown),
 * лесен за четене от AI модела (Gemini).
 */
export function buildKitchenContext(entities: any[]): string {
  if (!entities || entities.length === 0) {
    return "Проектът е напълно празен. Няма начертани стени или поставени обекти.";
  }

  let text = "ТЕКУЩО СЪСТОЯНИЕ НА ПРОЕКТА (Снапшот):\n\n";

  // Разделяме по типове
  const walls = entities.filter(e => e.type === 'wall');
  const cabinets = entities.filter(e => e.type === 'cabinet');
  // Добавяне на други ако се налага
  const doors = entities.filter(e => e.type === 'door');
  const windows = entities.filter(e => e.type === 'window');

  text += `--- СТЕНИ (${walls.length} бр.) ---\n`;
  walls.forEach((w, i) => {
    // Дължината на стената може да се изчисли от start и end точките.
    const dx = w.geometry.end.x - w.geometry.start.x;
    const dy = w.geometry.end.y - w.geometry.start.y;
    const length = Math.round(Math.sqrt(dx * dx + dy * dy));
    text += `W${i+1} [ID: ${w.id}]: дължина=${length}mm, начало=(${w.geometry.start.x}, ${w.geometry.start.y}), край=(${w.geometry.end.x}, ${w.geometry.end.y})\n`;
  });

  if (doors.length > 0) {
    text += `\n--- ВРАТИ (${doors.length} бр.) ---\n`;
    doors.forEach((d) => {
      text += `[ID: ${d.id}] Врата на стена [${d.geometry.wallId}], позиция=(${d.geometry.position.x}, ${d.geometry.position.y}), ширина=${d.geometry.width}mm\n`;
    });
  }

  if (windows.length > 0) {
    text += `\n--- ПРОЗОРЦИ (${windows.length} бр.) ---\n`;
    windows.forEach((w) => {
      text += `[ID: ${w.id}] Прозорец на стена [${w.geometry.wallId}], позиция=(${w.geometry.position.x}, ${w.geometry.position.y}), ширина=${w.geometry.width}mm\n`;
    });
  }

  text += `\n--- ШКАФОВЕ (${cabinets.length} бр.) ---\n`;
  if (cabinets.length === 0) {
    text += "Няма поставени шкафове.\n";
  } else {
    cabinets.forEach((c) => {
      text += `[ID: ${c.id}] Тип: ${c.geometry.cabinetType.toUpperCase()}, размери=${c.geometry.width}x${c.geometry.height}x${c.geometry.depth}mm, позиция=(${c.geometry.position.x}, ${c.geometry.position.y}), стенаID=${c.geometry.wallId || 'Няма / Свободностоящ'}\n`;
      if (c.properties) {
         text += `   -> Свойства: стил=${c.properties.doorStyle}, цвят=${c.properties.color}, материал=${c.properties.material}\n`;
      }
    });
  }

  return text;
}
