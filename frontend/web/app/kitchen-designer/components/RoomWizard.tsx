"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowRight, 
  Home, 
  DoorOpen, 
  Sun, 
  Ruler, 
  CheckCircle2,
  ArrowLeft,
  Sparkles
} from 'lucide-react';
import { RoomDimensions, GeneratedLayout, useRoomWizardStore } from '../store/room.store';
import { useCADStore } from '../store/cad-store';

interface RoomWizardProps {
  onComplete?: () => void;
}

export function RoomWizard({ onComplete }: RoomWizardProps) {
  const [step, setStep] = useState<'dimensions' | 'doors' | 'windows' | 'generating' | 'selection'>('dimensions');
  const [room, setRoom] = useState<RoomDimensions>({
    length: 350,
    width: 280,
    height: 260,
  });
  const [doors, setDoors] = useState<DoorPosition[]>([]);
  const [windows, setWindows] = useState<WindowPosition[]>([]);
  const [layouts, setLayouts] = useState<GeneratedLayout[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleNext = () => {
    switch (step) {
      case 'dimensions':
        setStep('doors');
        break;
      case 'doors':
        setStep('windows');
        break;
      case 'windows':
        generateLayouts();
        break;
      case 'selection':
        // Will be handled by layout selection
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'doors':
        setStep('dimensions');
        break;
      case 'windows':
        setStep('doors');
        break;
      case 'selection':
        setStep('windows');
        break;
    }
  };

  const generateLayouts = async () => {
    setStep('generating');
    setIsGenerating(true);

    try {
      // Call backend API to generate layouts
      const response = await fetch('/api/kitchen-wizard/generate-layouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          room,
          doors,
          windows,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate layouts');
      }

      const data = await response.json();
      setLayouts(data.layouts);
      setStep('selection');
    } catch (error) {
      console.error('Error generating layouts:', error);
      // Fallback to mock layouts
      const mockLayouts: GeneratedLayout[] = [
        {
          id: 'A',
          name: 'U-Shape Layout',
          description: 'Maximum storage and counter space',
          cabinets: [
            { type: 'base', x: 50, y: 50, width: 60, depth: 60, rotation: 0 },
            { type: 'sink', x: 120, y: 50, width: 80, depth: 60, rotation: 0 },
            { type: 'stove', x: 210, y: 50, width: 60, depth: 60, rotation: 0 },
            // ... more cabinets
          ],
          triangleScore: 95,
          efficiency: 88,
          walls: [
            { start: { x: 0, z: 0 }, end: { x: room.length, z: 0 }, thickness: 150, height: room.height },
            { start: { x: room.length, z: 0 }, end: { x: room.length, z: room.width }, thickness: 150, height: room.height },
            { start: { x: room.length, z: room.width }, end: { x: 0, z: room.width }, thickness: 150, height: room.height },
            { start: { x: 0, z: room.width }, end: { x: 0, z: 0 }, thickness: 150, height: room.height },
          ],
        },
        {
          id: 'B',
          name: 'L-Shape Layout',
          description: 'Open and spacious design',
          cabinets: [
            { type: 'base', x: 50, y: 50, width: 200, depth: 60, rotation: 0 },
            { type: 'wall', x: 50, y: 50, width: 150, depth: 35, rotation: 90 },
            // ... more cabinets
          ],
          triangleScore: 88,
          efficiency: 82,
          walls: [
            { start: { x: 0, z: 0 }, end: { x: room.length, z: 0 }, thickness: 150, height: room.height },
            { start: { x: room.length, z: 0 }, end: { x: room.length, z: room.width }, thickness: 150, height: room.height },
            { start: { x: room.length, z: room.width }, end: { x: 0, z: room.width }, thickness: 150, height: room.height },
            { start: { x: 0, z: room.width }, end: { x: 0, z: 0 }, thickness: 150, height: room.height },
          ],
        },
        {
          id: 'C',
          name: 'Straight Layout',
          description: 'Simple and efficient',
          cabinets: [
            { type: 'base', x: 50, y: 50, width: 250, depth: 60, rotation: 0 },
            { type: 'wall', x: 50, y: 50, width: 180, depth: 35, rotation: 90 },
            // ... more cabinets
          ],
          triangleScore: 76,
          efficiency: 75,
          walls: [
            { start: { x: 0, z: 0 }, end: { x: room.length, z: 0 }, thickness: 150, height: room.height },
            { start: { x: room.length, z: 0 }, end: { x: room.length, z: room.width }, thickness: 150, height: room.height },
            { start: { x: room.length, z: room.width }, end: { x: 0, z: room.width }, thickness: 150, height: room.height },
            { start: { x: 0, z: room.width }, end: { x: 0, z: 0 }, thickness: 150, height: room.height },
          ],
        },
      ];
      setLayouts(mockLayouts);
      setStep('selection');
    } finally {
      setIsGenerating(false);
    }
  };

  const addDoor = () => {
    setDoors([...doors, {
      wall: 'north',
      position: 100,
      width: 80,
    }]);
  };

  const addWindow = () => {
    setWindows([...windows, {
      wall: 'north',
      position: 150,
      width: 120,
      height: 140,
      sillHeight: 100,
    }]);
  };

  const updateDoor = (index: number, updates: Partial<DoorPosition>) => {
    setDoors(doors.map((door, i) => i === index ? { ...door, ...updates } : door));
  };

  const updateWindow = (index: number, updates: Partial<WindowPosition>) => {
    setWindows(windows.map((window, i) => i === index ? { ...window, ...updates } : window));
  };

  const removeDoor = (index: number) => {
    setDoors(doors.filter((_, i) => i !== index));
  };

  const removeWindow = (index: number) => {
    setWindows(windows.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header */}
      <div className="h-16 border-b border-slate-200/60 flex items-center px-6 bg-white">
        <div className="flex items-center gap-4">
          <Sparkles className="w-6 h-6 text-slate-800" />
          <h1 className="text-xl font-semibold text-slate-900">KUHNENSKI ASISTENT ZA PROEKTIRANE</h1>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {[1, 2, 3, 4].map((stepNum) => (
            <div
              key={stepNum}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                (step === 'dimensions' && stepNum === 1) ||
                (step === 'doors' && stepNum === 2) ||
                (step === 'windows' && stepNum === 3) ||
                (step === 'generating' && stepNum === 4) ||
                (step === 'selection' && stepNum === 4)
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {stepNum}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <AnimatePresence mode="wait">
          {/* Step 1: Room Dimensions */}
          {step === 'dimensions' && (
            <motion.div
              key="dimensions"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h2 
                  className="text-2xl font-semibold text-slate-900 mb-2"
                  dangerouslySetInnerHTML={{ __html: '&#1044;&#1048;&#1052;&#1045;&#1053;&#1057;&#1048;&#1048; &#1053;&#1040; &#1057;&#1058;&#1040;&#1071;&#1058;&#1040;' }}
                />
                <p 
                  className="text-slate-600"
                  dangerouslySetInnerHTML={{ __html: '&#1042;&#1074;&#1077;&#1076;&#1077;&#1090;&#1077; &#1090;&#1086;&#1095;&#1085;&#1080;&#1090;&#1077; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1080; &#1085;&#1072; &#1074;&#1072;&#1096;&#1072;&#1090;&#1072; &#1082;&#1091;&#1093;&#1085;&#1103;' }}
                />
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Ruler className="w-4 h-4 inline mr-1" />
                      <span dangerouslySetInnerHTML={{ __html: '&#1044;&#1066;&#1051;&#1046;&#1048;&#1053;&#1040; (cm)' }} />
                    </label>
                    <input
                      type="number"
                      value={room.length}
                      onChange={(e) => setRoom({ ...room, length: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      min="200"
                      max="800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Ruler className="w-4 h-4 inline mr-1" />
                      <span dangerouslySetInnerHTML={{ __html: '&#1064;&#1048;&#1056;&#1048;&#1053;&#1040; (cm)' }} />
                    </label>
                    <input
                      type="number"
                      value={room.width}
                      onChange={(e) => setRoom({ ...room, width: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      min="200"
                      max="600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      <Home className="w-4 h-4 inline mr-1" />
                      <span dangerouslySetInnerHTML={{ __html: '&#1042;&#1048;&#1057;&#1054;&#1063;&#1048;&#1053;&#1040; (cm)' }} />
                    </label>
                    <input
                      type="number"
                      value={room.height}
                      onChange={(e) => setRoom({ ...room, height: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      min="240"
                      max="300"
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-slate-700 mt-0.5" />
                    <div>
                      <h4 
                        className="font-medium text-slate-900"
                        dangerouslySetInnerHTML={{ __html: `&#1056;&#1040;&#1047;&#1052;&#1045;&#1056; &#1053;&#1040; &#1057;&#1058;&#1040;&#1071;&#1058;&#1040;: ${room.length}cm × ${room.width}cm` }}
                      />
                      <p 
                        className="text-slate-600 text-sm mt-1"
                        dangerouslySetInnerHTML={{ __html: `&#1055;&#1051;&#1054;&#1065;: ${(room.length * room.width / 10000).toFixed(2)}m²` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Doors */}
          {step === 'doors' && (
            <motion.div
              key="doors"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Polojenia na Vrati</h2>
                <p className="text-gray-600">Dobavete vsichki vrati, koito vodyat do kuchniata</p>
              </div>

              <div className="space-y-4">
                {doors.map((door, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Stena</label>
                        <select
                          value={door.wall}
                          onChange={(e) => updateDoor(index, { wall: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="north">Sever</option>
                          <option value="south">Yug</option>
                          <option value="east">Iztok</option>
                          <option value="west">Zapad</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Polojenie (cm)</label>
                        <input
                          type="number"
                          value={door.position}
                          onChange={(e) => updateDoor(index, { position: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Shirina (cm)</label>
                        <input
                          type="number"
                          value={door.width}
                          onChange={(e) => updateDoor(index, { width: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeDoor(index)}
                          className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Iztrii
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addDoor}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  <DoorOpen className="w-5 h-5 inline mr-2" />
                  Dobavi Vrata
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Windows */}
          {step === 'windows' && (
            <motion.div
              key="windows"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="p-8 max-w-2xl mx-auto"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Window Positions</h2>
                <p className="text-gray-600">Add windows for natural light consideration</p>
              </div>

              <div className="space-y-4">
                {windows.map((window, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-5 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Wall</label>
                        <select
                          value={window.wall}
                          onChange={(e) => updateWindow(index, { wall: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="north">North</option>
                          <option value="south">South</option>
                          <option value="east">East</option>
                          <option value="west">West</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Position (cm)</label>
                        <input
                          type="number"
                          value={window.position}
                          onChange={(e) => updateWindow(index, { position: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
                        <input
                          type="number"
                          value={window.width}
                          onChange={(e) => updateWindow(index, { width: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                        <input
                          type="number"
                          value={window.height}
                          onChange={(e) => updateWindow(index, { height: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={() => removeWindow(index)}
                          className="w-full px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  onClick={addWindow}
                  className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                >
                  <Sun className="w-5 h-5 inline mr-2" />
                  Add Window
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Generating */}
          {step === 'generating' && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center h-full"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
                />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Generating Kitchen Layouts</h3>
                <p className="text-gray-600">AI is creating 3 optimal designs for your space...</p>
              </div>
            </motion.div>
          )}

          {/* Step 5: Layout Selection */}
          {step === 'selection' && (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              className="p-8"
            >
              <div className="mb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">Choose Your Kitchen Layout</h2>
                <p className="text-gray-600">AI generated 3 optimal layouts for your space</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {layouts.map((layout) => (
                  <motion.div
                    key={layout.id}
                    whileHover={{ scale: 1.02 }}
                    className="border border-gray-200 rounded-lg p-6 cursor-pointer hover:border-blue-500 hover:shadow-lg"
                    onClick={() => onComplete(layout)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{layout.name}</h3>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded">
                        {layout.id}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-4">{layout.description}</p>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Triangle Score:</span>
                        <span className="font-medium text-green-600">{layout.triangleScore}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Space Efficiency:</span>
                        <span className="font-medium text-blue-600">{layout.efficiency}%</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-sm">Layout Preview</span>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        useRoomWizardStore.getState().selectLayout(layout.id);
                        useCADStore.getState().initializeDrawing(`AI Kitchen - ${layout.name}`);
                        useCADStore.getState().importWizardLayout(layout);
                        if (onComplete) onComplete();
                      }}
                      className="w-full mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Отвори в 3D CAD Редактора
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      {step !== 'generating' && step !== 'selection' && (
        <div className="h-16 border-t border-slate-200/60 flex items-center justify-between px-6 bg-white">
          <button
            onClick={handleBack}
            disabled={step === 'dimensions'}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            NAZAD
          </button>
          
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            {step === 'windows' ? 'GENERIRAI LAYOUTA' : 'NAPRED'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
