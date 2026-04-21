export const handleAddEntity = async (store: any, args: any) => {
  try {
    const { type, position, width, height, depth, rotation = 0, cabinetType, wallId, propertiesJson } = args;
    
    // Properties are typically passed as JSON string from AI to ensure nested structure safety
    let props = {};
    if (propertiesJson) {
      try { props = JSON.parse(propertiesJson); } catch (e) { }
    }

    const newObj: any = {
      id: crypto.randomUUID(), // Generator function for ID
      type: type,
      layer: type === 'wall' ? 'WALLS' : (type === 'door' || type === 'window' ? 'WINDOWS' : 'FURNITURE'),
      color: 4,
      linetype: 'CONTINUOUS',
      lineweight: 0.25,
      visible: true,
      locked: false,
      geometry: {
        position,
        width,
        height,
        depth,
        rotation,
        cabinetType,
        wallId
      },
      properties: props
    };

    store.addEntity(newObj);
    return true;
  } catch (error) {
    console.error("Add Entity Failed:", error);
    return false;
  }
};

export const handleRemoveEntity = async (store: any, args: any) => {
  store.deleteSelection(); // Actually we need deleteEntity or remove specific ID.
  // We'll map it logic to select -> delete
  store.selectEntity(args.id);
  store.deleteSelection();
  return true;
};

export const handleUpdateEntity = async (store: any, args: any) => {
  let updates = {};
  if (args.updatesJson) {
    try { updates = JSON.parse(args.updatesJson); } catch(e) {}
  }
  
  store.updateEntity(args.id, updates);
  return true;
};

export const handleBulkUpdate = async (store: any, args: any) => {
  const { ids, updatesJson } = args;
  let updates = {};
  if (updatesJson) {
    try { updates = JSON.parse(updatesJson); } catch(e) {}
  }

  // cad-store.ts offers updateAllEntities
  // We can just iterate over IDs
  ids.forEach((id: string) => {
    store.updateEntity(id, updates);
  });
  return true;
};
