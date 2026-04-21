import React, { useState, useEffect } from 'react';
import { Settings2, Layers, Grid3X3, BoxSelect, ChefHat, Ruler, Maximize, ShieldCheck, Utensils, Zap, Droplets, Lock, Unlock } from 'lucide-react';
import { useCADStore } from '../store/cad-store';
import { generateCountertop } from '../lib/countertop-generator';
import { CabinetEntity, CountertopEntity, ApplianceEntity, ApplianceType, FurnitureEntity } from '../types';
import { ParametricAppliance } from './parametric/ParametricAppliance';

export function ModernPropertiesPanel() {
  const { selection, drawing, updateEntity, setLocked, currentCommand, wallDefaults, setWallDefaults, addEntity, viewMode, setElevationWall, setViewMode } = useCADStore();

  if (!drawing) return null;

  const selectedEntities = drawing.entities.filter(e => selection.includes(e.id));
  const selectedEntity = selectedEntities.length === 1 ? selectedEntities[0] : null;
  
  // Mixed values handling
  const getCommonValue = (getValue: (e: any) => any) => {
    if (selectedEntities.length === 0) return "";
    const firstVal = getValue(selectedEntities[0]);
    const allSame = selectedEntities.every(e => getValue(e) === firstVal);
    return allSame ? firstVal.toString() : "---";
  };

  const handleBatchUpdateGeometry = (key: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    selection.forEach(id => {
      const ent = drawing.entities.find(e => e.id === id);
      if (!ent || ent.locked) return;
      updateEntity(id, {
        geometry: {
          ...ent.geometry,
          [key]: numValue
        }
      });
    });
  };

  const handleBatchUpdateProperty = (path: string[], value: any) => {
    selection.forEach(id => {
      const ent = drawing.entities.find(e => e.id === id);
      if (!ent || ent.locked) return;
      
      const newProps = { ...ent.properties };
      let current = newProps;
      for (let i = 0; i < path.length - 1; i++) {
        current[path[i]] = { ...current[path[i]] };
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      
      updateEntity(id, { properties: newProps });
    });
  };

  // Determine if we should show cabinet, countertop, appliance or furniture properties
  const allOfType = (type: string) => selectedEntities.length > 0 && selectedEntities.every(e => e.type === type);

  return (
    <aside className="w-80 bg-white/50 backdrop-blur-md border-l border-slate-200 flex flex-col z-20 shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      {/* Panel Header */}
      <div className="h-10 border-b border-slate-200 flex items-center px-3 gap-2 shrink-0 bg-slate-50/50">
        <Settings2 size={14} className="text-slate-500" />
        <h2 className="text-slate-900 font-bold text-[11px] uppercase tracking-wider">Свойства</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-4">

        {/* Universal Action Bar — always visible when something is selected */}
        {selection.length > 0 && (
          <div className="flex gap-1.5">
            <button
              onClick={() => setLocked(selection, !selectedEntities.every(e => e.locked))}
              className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all border shadow-sm ${
                selectedEntities.every(e => e.locked)
                  ? 'bg-red-600 text-white border-red-700 hover:bg-red-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {selectedEntities.every(e => e.locked) ? <Lock size={11} /> : <Unlock size={11} />}
              {selectedEntities.every(e => e.locked) ? 'Отключи' : 'Заключи'}
            </button>
            {selection.length > 1 && (
              <span className="flex items-center px-2 text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
                {selection.length} <BoxSelect size={10} className="ml-1" />
              </span>
            )}
          </div>
        )}

        {selection.length === 0 ? (
          currentCommand === 'WALL' ? (
            <div className="space-y-4">
              <PropertyGroup title="Опции на инструмент: Стена">
                <PropertyRow 
                  label="Дебелина" 
                  value={wallDefaults.thickness.toString()} 
                  unit="mm" 
                  onChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num)) setWallDefaults({ thickness: num });
                  }}
                />
                <PropertyRow 
                  label="Височина" 
                  value={wallDefaults.height.toString()} 
                  unit="mm" 
                  onChange={(val) => {
                    const num = parseFloat(val);
                    if (!isNaN(num)) setWallDefaults({ height: num });
                  }}
                />
              </PropertyGroup>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-3">
              <BoxSelect size={32} strokeWidth={1} />
              <p className="text-sm text-center">Изберете обект за да редактирате свойствата му</p>
            </div>
          )
        ) : allOfType('cabinet') ? (
          <div className="space-y-4">
            <div className={`p-2 rounded-xl border flex items-center justify-between transition-all ${selectedEntities.every(e => e.locked) ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedEntities.every(e => e.locked) ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                   {selectedEntities.every(e => e.locked) ? <Lock size={12} /> : <Unlock size={12} />}
                </div>
                <div>
                   <div className={`text-[10px] font-bold uppercase tracking-tight ${selectedEntities.every(e => e.locked) ? 'text-red-900' : 'text-slate-900'}`}>
                     {selectedEntities.every(e => e.locked) ? 'Всички са заключени' : selectedEntities.some(e => e.locked) ? 'Частично заключени' : 'Отключени'}
                   </div>
                </div>
              </div>
              <button 
                onClick={() => setLocked(selection, !selectedEntities.every(e => e.locked))}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                  selectedEntities.every(e => e.locked) 
                  ? 'bg-red-600 text-white' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {selectedEntities.every(e => e.locked) ? 'ОТКЛЮЧИ ВСИЧКИ' : 'ЗАКЛЮЧИ ИЗБРАНИТЕ'}
              </button>
            </div>

            <PropertyGroup title="Размери">
              <PropertyRow label="Ширина" value={getCommonValue(e => e.geometry.width)} unit="mm" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('width', val)} />
              <PropertyRow label="Височина" value={getCommonValue(e => e.geometry.height)} unit="mm" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('height', val)} />
              <PropertyRow label="Дълбочина" value={getCommonValue(e => e.geometry.depth)} unit="mm" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('depth', val)} />
            </PropertyGroup>

            <PropertyGroup title="Позиция">
              <PropertyRow 
                label="X Координата" 
                value={getCommonValue(e => e.geometry.position.x)} 
                unit="mm" 
                disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    // Update relative to individual starting positions? No, CAD usually sets absolute value for all.
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent) updateEntity(id, { geometry: { ...ent.geometry, position: { ...ent.geometry.position, x: num } } });
                    });
                  }
                }}
              />
              <PropertyRow 
                label="Y Координата (Дълб.)" 
                value={getCommonValue(e => e.geometry.position.y)} 
                unit="mm" 
                disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent) updateEntity(id, { geometry: { ...ent.geometry, position: { ...ent.geometry.position, y: num } } });
                    });
                  }
                }}
              />
              <PropertyRow 
                label="Дъно от пода" 
                value={getCommonValue(e => e.geometry.floorOffset ?? 0)} 
                unit="mm" 
                disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent) updateEntity(id, { geometry: { ...ent.geometry, floorOffset: num } });
                    });
                  }
                }}
              />
              <PropertyRow 
                label="Ротация" 
                value={getCommonValue(e => Math.round(e.geometry.rotation * (180 / Math.PI)))} 
                unit="°" 
                disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent) updateEntity(id, { geometry: { ...ent.geometry, rotation: num * (Math.PI / 180) } });
                    });
                  }
                }}
              />
            </PropertyGroup>

            <PropertyGroup title="Конфигурация на вратите">
              <div className={`flex items-center justify-between px-2 py-0.5 border-b border-slate-50 last:border-0 rounded-md ${selectedEntities.some(e => e.locked) ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-[11px] text-slate-600 font-medium">Брой врати</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {[1, 2].map(count => {
                    const isMixed = getCommonValue(e => e.properties.doorCount || (e.geometry.width > 600 ? 2 : 1)) === "---";
                    const isCurrent = !isMixed && parseInt(getCommonValue(e => e.properties.doorCount || (e.geometry.width > 600 ? 2 : 1))) === count;
                    
                    return (
                      <button
                        key={count}
                        disabled={selectedEntities.some(e => e.locked)}
                        onClick={() => handleBatchUpdateProperty(['doorCount'], count)}
                        className={`px-3 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                          isCurrent
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400'
                        }`}
                      >
                        {count}
                      </button>
                    );
                  })}
                </div>
              </div>

              {getCommonValue(e => e.properties.doorCount || (e.geometry.width > 600 ? 2 : 1)) === "1" && (
                <div className={`flex items-center justify-between px-2 py-0.5 border-b border-slate-50 last:border-0 rounded-md ${selectedEntities.some(e => e.locked) ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span className="text-[11px] text-slate-600 font-medium">Отваряне</span>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {[
                      { id: 'left', label: 'Дясно' },
                      { id: 'right', label: 'Ляво' }
                    ].map(opt => {
                      const isCurrent = getCommonValue(e => e.properties.doorConfiguration?.handlePosition || 'left') === opt.id;
                      return (
                        <button
                          key={opt.id}
                          disabled={selectedEntities.some(e => e.locked)}
                          onClick={() => {
                            selection.forEach(id => {
                              const ent = drawing.entities.find(e => e.id === id);
                              if (ent) updateEntity(id, { properties: { ...ent.properties, doorConfiguration: { ...(ent.properties.doorConfiguration || {}), handlePosition: opt.id } } });
                            });
                          }}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all ${
                            isCurrent
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </PropertyGroup>

            <PropertyGroup title="Материали">
              <PropertyColor label="Лице" color={getCommonValue(e => e.properties.color || "#1e293b")} name="Слейт Мат" disabled={selectedEntities.some(e => e.locked)} />
              <PropertyColor label="Корпус" color="#f8fafc" name="Бяло Гладка" disabled={selectedEntities.some(e => e.locked)} />
            </PropertyGroup>

            {selectedEntities.length > 1 && (
              <button 
                onClick={() => {
                  const newSlabs = generateCountertop(selection, drawing.entities);
                  newSlabs.forEach(slab => addEntity(slab));
                }}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                <ChefHat size={14} />
                <span>Постави Плот върху избраните</span>
              </button>
            )}
          </div>
        ) : allOfType('countertop') ? (
          <div className="space-y-4">
            <div className={`p-2 rounded-xl border flex items-center justify-between transition-all ${selectedEntities.every(e => e.locked) ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedEntities.every(e => e.locked) ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {selectedEntities.every(e => e.locked) ? <Lock size={12} /> : <Unlock size={12} />}
                </div>
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-tight ${selectedEntities.every(e => e.locked) ? 'text-red-900' : 'text-emerald-900'}`}>{selectedEntities.length > 1 ? `Плотове (${selectedEntities.length})` : 'Плот / Избор'}</div>
                </div>
              </div>
              <button 
                onClick={() => setLocked(selection, !selectedEntities.every(e => e.locked))}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                  selectedEntities.every(e => e.locked) ? 'bg-red-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
                }`}
              >
                {selectedEntities.every(e => e.locked) ? 'ОТКЛЮЧИ' : 'ЗАКЛЮЧИ'}
              </button>
            </div>

            <PropertyGroup title="Размери и Позиция">
              <PropertyRow 
                label="Дебелина" 
                value={getCommonValue(e => e.geometry.height)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => handleBatchUpdateGeometry('height', val)}
              />
              <PropertyRow 
                label="Височина (от под)" 
                value={getCommonValue(e => e.geometry.elevation)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => handleBatchUpdateGeometry('elevation', val)}
              />
            </PropertyGroup>

            <PropertyGroup title="Нос (Overhang)">
              <PropertyRow 
                label="Преден" 
                value={getCommonValue(e => e.properties.overhang.front)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent?.type === 'countertop') {
                        updateEntity(id, { properties: { ...ent.properties, overhang: { ...ent.properties.overhang, front: num } } });
                      }
                    });
                  }
                }}
              />
              <PropertyRow 
                label="Страничен" 
                value={getCommonValue(e => e.properties.overhang.left)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                      const ent = drawing.entities.find(e => e.id === id);
                      if (ent?.type === 'countertop') {
                        updateEntity(id, { properties: { ...ent.properties, overhang: { ...ent.properties.overhang, left: num, right: num } } });
                      }
                    });
                  }
                }}
              />
            </PropertyGroup>

            {selectedEntities.length === 1 && (
              <PropertyGroup title="Уреди">
                <div className="p-1.5 grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => {
                      const ct = selectedEntity as CountertopEntity;
                      const appliance: ApplianceEntity = {
                        id: crypto.randomUUID(), type: 'appliance', layer: 'APPLIANCES', color: 151, linetype: 'CONTINUOUS', lineweight: 0.1, visible: true, locked: false,
                        geometry: { position: { ...ct.geometry.position }, width: Math.min(ct.geometry.width - 40, 500), depth: Math.min(ct.geometry.depth - 40, 400), height: 50, rotation: ct.geometry.rotation, elevation: ct.geometry.elevation + ct.geometry.height, parentId: ct.id },
                        properties: { applianceType: 'sink_single', material: 'steel' }
                      };
                      addEntity(appliance);
                    }}
                    className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 transition-all"
                  >
                    <Droplets size={12} className="text-blue-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase">МИВКА</span>
                  </button>
                  <button
                    onClick={() => {
                      const ct = selectedEntity as CountertopEntity;
                      const appliance: ApplianceEntity = {
                        id: crypto.randomUUID(), type: 'appliance', layer: 'APPLIANCES', color: 10, linetype: 'CONTINUOUS', lineweight: 0.1, visible: true, locked: false,
                        geometry: { position: { ...ct.geometry.position }, width: Math.min(ct.geometry.width - 40, 600), depth: Math.min(ct.geometry.depth - 40, 520), height: 10, rotation: ct.geometry.rotation, elevation: ct.geometry.elevation + ct.geometry.height, parentId: ct.id },
                        properties: { applianceType: 'hob_induction', material: 'glass' }
                      };
                      addEntity(appliance);
                    }}
                    className="flex items-center gap-2 p-1.5 bg-slate-50 hover:bg-white rounded-lg border border-slate-200 transition-all"
                  >
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-[10px] font-black text-slate-700 uppercase">КОТЛОН</span>
                  </button>
                </div>
              </PropertyGroup>
            )}
          </div>
        ) : allOfType('wall') ? (
          <div className="space-y-4">
            <div className={`p-2 rounded-xl border flex items-center justify-between transition-all ${selectedEntities.every(e => e.locked) ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedEntities.every(e => e.locked) ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  {selectedEntities.every(e => e.locked) ? <Lock size={12} /> : <Unlock size={12} />}
                </div>
                <div>
                  <div className={`text-[10px] font-bold uppercase tracking-tight ${selectedEntities.every(e => e.locked) ? 'text-red-900' : 'text-slate-900'}`}>
                    {selectedEntities.length > 1 ? `Стени (${selectedEntities.length})` : 'Стена'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setLocked(selection, !selectedEntities.every(e => e.locked))}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                  selectedEntities.every(e => e.locked) ? 'bg-red-600 text-white' : 'bg-white text-slate-700 border border-slate-200 shadow-sm'
                }`}
              >
                {selectedEntities.every(e => e.locked) ? 'ОТКЛЮЧИ ВСИЧКИ' : 'ЗАКЛЮЧИ ИЗБРАНИТЕ'}
              </button>
            </div>

            <PropertyGroup title="Размери на стена">
              <PropertyRow 
                label="Дебелина" value={getCommonValue(e => e.geometry.thickness)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => handleBatchUpdateGeometry('thickness', val)}
              />
              <PropertyRow 
                label="Височина" value={getCommonValue(e => e.geometry.height)} unit="mm" disabled={selectedEntities.some(e => e.locked)}
                onChange={(val) => handleBatchUpdateGeometry('height', val)}
              />
            </PropertyGroup>

            {selectedEntities.length === 1 && selectedEntity && (
              <div className="px-1 space-y-2">
                <button 
                  onClick={() => setElevationWall(selectedEntity.id)}
                  disabled={viewMode === 'elevation'}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Maximize size={14} />
                  <span>ВИЖ ИЗГЛЕД (ELEVATION)</span>
                </button>
                
                {viewMode === 'elevation' && (
                  <button 
                    onClick={() => setViewMode('2d')}
                    className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-all border border-slate-200"
                  >
                    <Ruler size={14} />
                    <span>ОБРАТНО В 2Д ПЛАН</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : allOfType('furniture') ? (
          <div className="space-y-4">
            <div className={`p-2 rounded-xl border flex items-center justify-between transition-all ${selectedEntities.every(e => e.locked) ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
              <div className="flex items-center gap-2">
                <div className={`p-1.5 rounded-lg ${selectedEntities.every(e => e.locked) ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                  {selectedEntities.every(e => e.locked) ? <Lock size={12} /> : <Layers size={12} />}
                </div>
                <div>
                  <div className={`text-[10px] font-black uppercase tracking-tight ${selectedEntities.every(e => e.locked) ? 'text-red-900' : 'text-blue-900'}`}>
                     {selectedEntities.length > 1 ? `Панели (${selectedEntities.length})` : getCommonValue(e => e.properties.label)}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setLocked(selection, !selectedEntities.every(e => e.locked))}
                className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                  selectedEntities.every(e => e.locked) ? 'bg-red-600 text-white' : 'bg-white text-blue-700 border border-blue-200 shadow-sm'
                }`}
              >
                {selectedEntities.every(e => e.locked) ? 'ОТКЛЮЧИ ВСИЧКИ' : 'ЗАКЛЮЧИ ИЗБРАНИТЕ'}
              </button>
            </div>

            <PropertyGroup title="Конфигурация">
              <div className={`flex items-center justify-between px-2 py-0.5 border-b border-slate-50 last:border-0 rounded-md ${selectedEntities.some(e => e.locked) ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-[11px] text-slate-600 font-medium">Ориентация</span>
                <div className="flex bg-slate-100 p-0.5 rounded-lg">
                  {['horizontal', 'vertical'].map(orient => {
                    const isCurrent = getCommonValue(e => e.geometry.orientation) === orient;
                    return (
                      <button
                        key={orient}
                        disabled={selectedEntities.some(e => e.locked)}
                        onClick={() => {
                          selection.forEach(id => {
                            const ent = drawing.entities.find(e => e.id === id);
                            if (ent?.type === 'furniture') updateEntity(id, { geometry: { ...ent.geometry, orientation: orient } });
                          });
                        }}
                        className={`px-2 py-0.5 text-[9px] font-black rounded-md transition-all ${
                          isCurrent ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                        }`}
                      >
                        {orient === 'horizontal' ? 'ХОР.' : 'ВЕРТ.'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </PropertyGroup>

            <PropertyGroup title="Размери(mm)">
              <PropertyRow label="Ширина" value={getCommonValue(e => e.geometry.width)} unit="" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('width', val)} />
              <PropertyRow label="Дълб./Вис." value={getCommonValue(e => e.geometry.depth)} unit="" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('depth', val)} />
              <PropertyRow label="Дебелина" value={getCommonValue(e => e.geometry.height)} unit="" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('height', val)} />
            </PropertyGroup>

            <PropertyGroup title="Позиция и Ротация">
              <PropertyRow label="Височина (от под)" value={getCommonValue(e => e.geometry.elevation)} unit="mm" disabled={selectedEntities.some(e => e.locked)} onChange={(val) => handleBatchUpdateGeometry('elevation', val)} />
              <PropertyRow 
                label="Ротация" 
                value={getCommonValue(e => Math.round(e.geometry.rotation * (180 / Math.PI)))} 
                unit="°" 
                disabled={selectedEntities.some(e => e.locked)} 
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) {
                    selection.forEach(id => {
                       const ent = drawing.entities.find(e => e.id === id);
                       if (ent) updateEntity(id, { geometry: { ...ent.geometry, rotation: num * (Math.PI / 180) } });
                    });
                  }
                }} 
              />
            </PropertyGroup>

            <PropertyGroup title="Визия">
               <div className={`p-1.5 space-y-1.5 ${selectedEntities.some(e => e.locked) ? 'opacity-50 pointer-events-none' : ''}`}>
                 <div className="grid grid-cols-4 gap-1.5">
                   {(['melamine', 'mdf', 'wood', 'marble', 'granite', 'quartz', 'glass', 'metal'] as const).map(m => {
                     const isCurrent = getCommonValue(e => e.properties.material) === m;
                     return (
                       <button
                         key={m}
                         disabled={selectedEntities.some(e => e.locked)}
                         onClick={() => handleBatchUpdateProperty(['material'], m)}
                         className={`aspect-square rounded-md border-2 transition-all ${
                           isCurrent ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-200'
                         }`}
                         style={{ background: m === 'marble' ? '#f8fafc' : m === 'granite' ? '#334155' : m === 'wood' ? '#78350f' : m === 'glass' ? '#bae6fd' : m === 'metal' ? '#94a3b8' : '#e2e8f0' }}
                       />
                     );
                   })}
                 </div>
               </div>
            </PropertyGroup>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-slate-400 gap-3">
            <BoxSelect size={28} strokeWidth={1} />
            <p className="text-[11px] text-center text-slate-500">
              Избрани {selection.length} обекта от различен тип.<br/>
              Използвай горния бутон за заключване.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}

function PropertyGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{title}</h3>
      <div className="bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function PropertyRow({ 
  label, 
  value, 
  unit, 
  onChange, 
  disabled 
}: { 
  label: string, 
  value: string, 
  unit: string, 
  onChange?: (val: string) => void, 
  disabled?: boolean 
}) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleWheel = (e: React.WheelEvent) => {
    if (disabled || !onChange) return;
    e.preventDefault();
    const step = e.shiftKey ? 100 : 10;
    const current = parseFloat(localValue) || 0;
    const next = e.deltaY < 0 ? current + step : current - step;
    const nextStr = next.toString();
    setLocalValue(nextStr);
    onChange(nextStr);
  };

  const handleChange = (val: string) => {
    setLocalValue(val);
    onChange?.(val);
  };

  const handleBlur = () => {
    if (isNaN(parseFloat(localValue))) {
      setLocalValue(value);
    }
  };

  return (
    <div 
      onWheel={handleWheel}
      className={`flex items-center justify-between px-2 py-0.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-md group ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <span className="text-[11px] text-slate-600 font-medium">{label}</span>
      <div className="flex items-center gap-0.5">
        <input 
          type="text" 
          value={localValue}
          disabled={disabled}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={handleBlur}
          className="w-14 bg-transparent border-none px-1 py-0.5 text-[11px] text-slate-900 text-right outline-none focus:bg-white focus:ring-1 focus:ring-blue-400 rounded transition-all font-semibold"
        />
        <span className="text-[10px] text-slate-400 w-4">{unit}</span>
      </div>
    </div>
  );
}

function PropertyColor({ label, color, name, disabled }: { label: string, color: string, name: string, disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2 py-0.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors rounded-md cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <span className="text-[11px] text-slate-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">{name}</span>
        <div 
          className="w-4 h-4 rounded-full border border-slate-200 shadow-sm" 
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}