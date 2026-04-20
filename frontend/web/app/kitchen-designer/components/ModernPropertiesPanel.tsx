import { Settings2, Layers, Grid3X3, BoxSelect, ChefHat, Ruler, Maximize, ShieldCheck, Utensils, Zap, Droplets, Lock, Unlock } from 'lucide-react';
import { useCADStore } from '../store/cad-store';
import { generateCountertop } from '../lib/countertop-generator';
import { CabinetEntity, CountertopEntity, ApplianceEntity, ApplianceType } from '../types';
import { ParametricAppliance } from './parametric/ParametricAppliance';
export function ModernPropertiesPanel() {
  const { selection, drawing, updateEntity, setLocked, currentCommand, wallDefaults, setWallDefaults, addEntity } = useCADStore();

  if (!drawing) return null;

  const selectedEntity = selection.length === 1 
    ? drawing.entities.find(e => e.id === selection[0]) 
    : null;

  const handleUpdateGeometry = (key: string, value: string) => {
    if (!selectedEntity || selectedEntity.type !== 'cabinet') return;
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    updateEntity(selectedEntity.id, {
      geometry: {
        ...selectedEntity.geometry,
        [key]: numValue
      }
    });
  };

  return (
    <aside className="w-80 bg-white/50 backdrop-blur-md border-l border-slate-200 flex flex-col z-20 shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      {/* Panel Header */}
      <div className="h-14 border-b border-slate-200 flex items-center px-4 gap-2">
        <Settings2 size={18} className="text-slate-600" />
        <h2 className="text-slate-900 font-medium text-sm">Свойства</h2>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {selection.length === 0 ? (
          currentCommand === 'WALL' ? (
            <div className="space-y-6">
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
        ) : selection.length > 1 ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100 gap-3">
              <p className="text-sm text-center font-medium text-blue-900">Избрани са {selection.length} обекта</p>
              
              <div className="grid grid-cols-2 gap-2 w-full">
                <button 
                  onClick={() => setLocked(selection, true)}
                  className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                >
                  <Lock size={14} className="text-slate-500" />
                  <span>Заключи</span>
                </button>
                <button 
                  onClick={() => setLocked(selection, false)}
                  className="flex items-center justify-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                >
                  <Unlock size={14} className="text-slate-500" />
                  <span>Отключи</span>
                </button>
              </div>

              {/* Contextual Action: Countertop Generation */}
              {drawing.entities.filter(e => selection.includes(e.id) && e.type === 'cabinet').length > 0 && (
                <button 
                  onClick={() => {
                    const newSlabs = generateCountertop(selection, drawing.entities);
                    newSlabs.forEach(slab => addEntity(slab));
                  }}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                >
                  <ChefHat size={16} />
                  <span>Постави Плот върху избраните</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-center text-slate-400 px-4">Груповото редактиране на размери ще бъде добавено скоро.</p>
          </div>
        ) : selectedEntity?.type === 'cabinet' ? (
          <div className="space-y-6">
            <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${selectedEntity.locked ? 'bg-red-50 border-red-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedEntity.locked ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  {selectedEntity.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${selectedEntity.locked ? 'text-red-900' : 'text-slate-900'}`}>
                    {selectedEntity.locked ? 'Обектът е заключен' : 'Обектът е отключен'}
                  </div>
                  <div className="text-[10px] text-slate-500">Сигурност на позицията</div>
                </div>
              </div>
              <button 
                onClick={() => setLocked([selectedEntity.id], !selectedEntity.locked)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedEntity.locked 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {selectedEntity.locked ? 'ОТКЛЮЧИ' : 'ЗАКЛЮЧИ'}
              </button>
            </div>

            {/* Example premium property group */}
            <PropertyGroup title="Размери">
              <PropertyRow 
                label="Ширина" 
                value={selectedEntity.geometry.width.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => handleUpdateGeometry('width', val)}
              />
              <PropertyRow 
                label="Височина" 
                value={selectedEntity.geometry.height.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => handleUpdateGeometry('height', val)}
              />
              <PropertyRow 
                label="Дълбочина" 
                value={selectedEntity.geometry.depth.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => handleUpdateGeometry('depth', val)}
              />
            </PropertyGroup>

            <PropertyGroup title="Позиция">
              <PropertyRow 
                label="X Координата" 
                value={selectedEntity.geometry.position.x.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, position: { ...selectedEntity.geometry.position, x: num } } });
                }}
              />
              <PropertyRow 
                label="Y Координата (Дълб.)" 
                value={selectedEntity.geometry.position.y.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, position: { ...selectedEntity.geometry.position, y: num } } });
                }}
              />
              <PropertyRow 
                label="Дъно от пода" 
                value={(selectedEntity.geometry.floorOffset ?? 0).toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, floorOffset: num } });
                }}
              />
              <PropertyRow 
                label="Ротация" 
                value={(selectedEntity.geometry.rotation * (180 / Math.PI)).toFixed(0)} 
                unit="°" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, rotation: num * (Math.PI / 180) } });
                }}
              />
            </PropertyGroup>

            <PropertyGroup title="Конфигурация на вратите">
              <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 rounded-md ${selectedEntity.locked ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-xs text-slate-600">Брой врати</span>
                <div className="flex bg-slate-100 rounded-lg p-0.5">
                  {[1, 2].map(count => (
                    <button
                      key={count}
                      disabled={selectedEntity.locked}
                      onClick={() => updateEntity(selectedEntity.id, { properties: { ...selectedEntity.properties, doorCount: count } })}
                      className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                        (selectedEntity.properties.doorCount || (selectedEntity.geometry.width > 600 ? 2 : 1)) === count
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {(selectedEntity.properties.doorCount === 1 || (!selectedEntity.properties.doorCount && selectedEntity.geometry.width <= 600)) && (
                <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 rounded-md ${selectedEntity.locked ? 'opacity-50 pointer-events-none' : ''}`}>
                  <span className="text-xs text-slate-600">Отваряне</span>
                  <div className="flex bg-slate-100 rounded-lg p-0.5">
                    {[
                      { id: 'left', label: 'Дясно' },
                      { id: 'right', label: 'Ляво' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        disabled={selectedEntity.locked}
                        onClick={() => updateEntity(selectedEntity.id, { 
                          properties: { 
                            ...selectedEntity.properties, 
                            doorConfiguration: { 
                              ...(selectedEntity.properties.doorConfiguration || {}), 
                              handlePosition: opt.id 
                            } 
                          } 
                        })}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                          (selectedEntity.properties.doorConfiguration?.handlePosition || 'left') === opt.id
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </PropertyGroup>

            <PropertyGroup title="Материали">
              <PropertyColor 
                label="Лице" 
                color={selectedEntity.properties.color || "#1e293b"} 
                name="Слейт Мат" 
                disabled={selectedEntity.locked}
              />
              <PropertyColor 
                label="Корпус" 
                color="#f8fafc" 
                name="Бяло Гладка" 
                disabled={selectedEntity.locked}
              />
            </PropertyGroup>

          </div>
        ) : selectedEntity?.type === 'countertop' ? (
          <div className="space-y-6">
            <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${selectedEntity.locked ? 'bg-red-50 border-red-100 shadow-sm' : 'bg-emerald-50 border-emerald-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedEntity.locked ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                  {selectedEntity.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${selectedEntity.locked ? 'text-red-900' : 'text-emerald-900'}`}>
                    {selectedEntity.locked ? 'Плотът е заключен' : 'Настройки на Плот'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {selectedEntity.locked ? 'Сигурност на позицията' : 'Персонализирайте вашата повърхност'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setLocked([selectedEntity.id], !selectedEntity.locked)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedEntity.locked 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                  : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50 shadow-sm'
                }`}
              >
                {selectedEntity.locked ? 'ОТКЛЮЧИ' : 'ЗАКЛЮЧИ'}
              </button>
            </div>

            <PropertyGroup title="Размери и Позиция">
              <PropertyRow 
                label="Дебелина" 
                value={(selectedEntity as CountertopEntity).geometry.height.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...(selectedEntity as CountertopEntity).geometry, height: num } });
                }}
              />
              <PropertyRow 
                label="Височина (от под)" 
                value={(selectedEntity as CountertopEntity).geometry.elevation.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...(selectedEntity as CountertopEntity).geometry, elevation: num } });
                }}
              />
              <PropertyRow 
                label="Заобляне" 
                value={(selectedEntity as CountertopEntity).properties.edgeRadius.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, edgeRadius: num } });
                }}
              />
            </PropertyGroup>

            <PropertyGroup title="Нос (Overhang)">
              <PropertyRow 
                label="Преден" 
                value={(selectedEntity as CountertopEntity).properties.overhang.front.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, overhang: { ...(selectedEntity as CountertopEntity).properties.overhang, front: num } } });
                }}
              />
              <PropertyRow 
                label="Страничен" 
                value={(selectedEntity as CountertopEntity).properties.overhang.left.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, overhang: { ...(selectedEntity as CountertopEntity).properties.overhang, left: num, right: num } } });
                }}
              />
            </PropertyGroup>

            <PropertyGroup title="Заден Борд">
              <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 rounded-md ${selectedEntity.locked ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-xs text-slate-600">Активирай борд</span>
                <button
                  disabled={selectedEntity.locked}
                  onClick={() => updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, backsplash: !(selectedEntity as CountertopEntity).properties.backsplash } })}
                  className={`relative inline-flex h-4 w-9 items-center rounded-full transition-colors ${(selectedEntity as CountertopEntity).properties.backsplash ? 'bg-emerald-500' : 'bg-slate-300'}`}
                >
                  <span className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-transform ${(selectedEntity as CountertopEntity).properties.backsplash ? 'translate-x-6' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {(selectedEntity as CountertopEntity).properties.backsplash && (
                <PropertyRow 
                  label="Височина борд" 
                  value={(selectedEntity as CountertopEntity).properties.backsplashHeight.toString()} 
                  unit="mm" 
                  disabled={selectedEntity.locked}
                  onChange={(val) => {
                    const num = parseFloat(val);
                    if(!isNaN(num)) updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, backsplashHeight: num } });
                  }}
                />
              )}
            </PropertyGroup>

            <PropertyGroup title="Визия">
               <div className={`p-2 space-y-2 ${selectedEntity.locked ? 'opacity-50 pointer-events-none' : ''}`}>
                 <div className="text-[10px] text-slate-400 font-medium px-1">МАТЕРИАЛ</div>
                 <div className="grid grid-cols-5 gap-2">
                   {(['marble', 'granite', 'quartz', 'wood', 'laminate'] as const).map(m => (
                     <button
                       key={m}
                       disabled={selectedEntity.locked}
                       onClick={() => updateEntity(selectedEntity.id, { properties: { ...(selectedEntity as CountertopEntity).properties, material: m } })}
                       className={`aspect-square rounded-md border-2 transition-all ${
                         (selectedEntity as CountertopEntity).properties.material === m ? 'border-blue-500 scale-110 shadow-md' : 'border-slate-200'
                       }`}
                       title={m}
                       style={{ 
                         background: m === 'marble' ? '#f8fafc' : m === 'granite' ? '#334155' : m === 'wood' ? '#78350f' : '#e2e8f0' 
                       }}
                     />
                   ))}
                 </div>
               </div>
            </PropertyGroup>

            <PropertyGroup title="Уреди за вграждане">
              <div className="p-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const ct = selectedEntity as CountertopEntity;
                    const appliance: ApplianceEntity = {
                      id: crypto.randomUUID(),
                      type: 'appliance',
                      layer: 'APPLIANCES',
                      color: 151,
                      linetype: 'CONTINUOUS',
                      lineweight: 0.1,
                      visible: true,
                      locked: false,
                      geometry: {
                        position: { ...ct.geometry.position },
                        width: Math.min(ct.geometry.width - 40, 500),
                        depth: Math.min(ct.geometry.depth - 40, 400),
                        height: 50,
                        rotation: ct.geometry.rotation,
                        elevation: ct.geometry.elevation + ct.geometry.height, 
                        parentId: ct.id
                      },
                      properties: {
                        applianceType: 'sink_single',
                        material: 'steel'
                      }
                    };
                    addEntity(appliance);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <Droplets size={16} className="text-blue-500" />
                  <span className="text-[10px] font-bold text-slate-700">МИВКА</span>
                </button>
                <button
                  onClick={() => {
                    const ct = selectedEntity as CountertopEntity;
                    const appliance: ApplianceEntity = {
                      id: crypto.randomUUID(),
                      type: 'appliance',
                      layer: 'APPLIANCES',
                      color: 10,
                      linetype: 'CONTINUOUS',
                      lineweight: 0.1,
                      visible: true,
                      locked: false,
                      geometry: {
                        position: { ...ct.geometry.position },
                        width: Math.min(ct.geometry.width - 40, 600),
                        depth: Math.min(ct.geometry.depth - 40, 520),
                        height: 10,
                        rotation: ct.geometry.rotation,
                        elevation: ct.geometry.elevation + ct.geometry.height,
                        parentId: ct.id
                      },
                      properties: {
                        applianceType: 'hob_induction',
                        material: 'glass'
                      }
                    };
                    addEntity(appliance);
                  }}
                  className="flex flex-col items-center gap-1.5 p-2 bg-slate-50 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                >
                  <Zap size={16} className="text-amber-500" />
                  <span className="text-[10px] font-bold text-slate-700">КОТЛОН</span>
                </button>
              </div>
            </PropertyGroup>
          </div>
        ) : selectedEntity?.type === 'wall' ? (
          <div className="space-y-6">
            <div className={`p-3 rounded-xl border flex items-center justify-between transition-all ${selectedEntity.locked ? 'bg-red-50 border-red-100 shadow-sm' : 'bg-slate-50 border-slate-100'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedEntity.locked ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
                  {selectedEntity.locked ? <Lock size={16} /> : <Unlock size={16} />}
                </div>
                <div>
                  <div className={`text-xs font-bold ${selectedEntity.locked ? 'text-red-900' : 'text-slate-900'}`}>{selectedEntity.locked ? 'Стената е заключена' : 'Стена'}</div>
                  <div className="text-[10px] text-slate-500">Сигурност на контура</div>
                </div>
              </div>
              <button 
                onClick={() => setLocked([selectedEntity.id], !selectedEntity.locked)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  selectedEntity.locked 
                  ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-sm'
                }`}
              >
                {selectedEntity.locked ? 'ОТКЛЮЧИ' : 'ЗАКЛЮЧИ'}
              </button>
            </div>

            <PropertyGroup title="Размери на стена">
              <PropertyRow 
                label="Дължина" 
                value={Math.round(Math.hypot(
                  selectedEntity.geometry.end.x - selectedEntity.geometry.start.x, 
                  selectedEntity.geometry.end.y - selectedEntity.geometry.start.y
                )).toString()} 
                unit="mm"
                disabled={selectedEntity.locked}
              />
              <PropertyRow 
                label="Дебелина" 
                value={selectedEntity.geometry.thickness.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, thickness: num } });
                }}
              />
              <PropertyRow 
                label="Височина" 
                value={selectedEntity.geometry.height.toString()} 
                unit="mm" 
                disabled={selectedEntity.locked}
                onChange={(val) => {
                  const num = parseFloat(val);
                  if(!isNaN(num)) updateEntity(selectedEntity.id, { geometry: { ...selectedEntity.geometry, height: num } });
                }}
              />
            </PropertyGroup>
          </div>
        ) : (
           <div className="flex flex-col items-center justify-center h-40 text-slate-500 gap-3">
             <p className="text-sm text-center">Свойствата за този тип обект не са налични.</p>
           </div>
        )}
      </div>
    </aside>
  );
}

function PropertyGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
      <div className="bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function PropertyRow({ label, value, unit, onChange, disabled }: { label: string, value: string, unit: string, onChange?: (val: string) => void, disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-md ${disabled ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-1">
        <input 
          type="text" 
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          className="w-16 bg-white border border-slate-200 rounded px-2 py-1 text-xs text-slate-900 text-right outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all shadow-sm disabled:bg-slate-50"
        />
        <span className="text-xs text-slate-400">{unit}</span>
      </div>
    </div>
  );
}

function PropertyColor({ label, color, name, disabled }: { label: string, color: string, name: string, disabled?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors rounded-md cursor-pointer ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      <span className="text-xs text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">{name}</span>
        <div 
          className="w-5 h-5 rounded-full border border-slate-200 shadow-sm" 
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}