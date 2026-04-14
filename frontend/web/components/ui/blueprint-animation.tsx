"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Three distinct blueprint "scenes" to cycle through
// Five very detailed blueprint "scenes" to cycle through
const scenes = [
  // Scene 1: Complex Kitchen Top-down Map
  [
    'M 10 10 L 90 10 L 90 40 L 10 40 Z', // main island
    'M 12 12 L 88 12 L 88 38 L 12 38 Z', // inner counter 
    'M 20 15 L 40 15 L 40 35 L 20 35 Z', // sink 
    'M 25 20 A 2 2 0 1 0 25 25 A 2 2 0 1 0 25 20', // sink tap
    'M 35 20 A 2 2 0 1 0 35 25 A 2 2 0 1 0 35 20', // sink tap 2
    'M 60 15 A 5 5 0 1 0 70 15 A 5 5 0 1 0 60 15', // burner 1
    'M 60 30 A 5 5 0 1 0 70 30 A 5 5 0 1 0 60 30', // burner 2
    'M 75 15 A 3 3 0 1 0 85 15 A 3 3 0 1 0 75 15', // burner 3
    'M 75 30 A 3 3 0 1 0 85 30 A 3 3 0 1 0 75 30', // burner 4
    'M 10 70 L 90 70 L 90 90 L 10 90 Z', // back wall cabinets
    'M 30 70 L 30 90', 'M 50 70 L 50 90', 'M 70 70 L 70 90', // cabinet divides
    'M 5 50 L 95 50', 'M 5 48 L 5 52', 'M 95 48 L 95 52', // main dim
    'M 50 48 L 50 52', 'M 25 48 L 25 52', 'M 75 48 L 75 52', // sub dims
    'M 15 75 L 25 85', 'M 35 75 L 45 85', 'M 55 75 L 65 85', 'M 75 75 L 85 85', // hatch lines
  ],
  // Scene 2: Isometric Cabinet & Drafting Geometry
  [
    'M 30 70 L 70 50 L 70 20 L 30 40 Z', // isometric left face
    'M 70 50 L 85 60 L 85 30 L 70 20 Z', // isometric right face
    'M 30 40 L 70 20 L 85 30 L 45 50 Z', // isometric top face
    'M 40 55 L 60 45 L 60 25 L 40 35 Z', // inner door inset
    'M 75 45 L 80 48 L 80 35 L 75 32 Z', // side panel inset
    'M 10 10 L 90 90', // diagonal reference A
    'M 10 90 L 90 10', // diagonal reference B
    'M 5 50 L 95 50', // horizon line
    'M 10 50 A 40 40 0 0 1 90 50', // massive perspective arc
    'M 20 50 A 30 30 0 0 1 80 50', // perspective arc 2
    'M 50 5 L 50 95', // vertical meridian
  ],
  // Scene 3: Structural Elevations & Measurements
  [
    'M 20 20 L 80 20 L 80 80 L 20 80 Z', // wall frame
    'M 25 25 L 75 25 L 75 75 L 25 75 Z', // inner frame
    'M 25 50 L 75 50', // cross section
    'M 40 25 L 40 75', 'M 60 25 L 60 75', // stud lines
    'M 20 80 L 10 90', 'M 80 80 L 90 90', // floor perspective
    'M 10 90 L 90 90', // floor horizon
    'M 15 5 L 15 95', 'M 13 20 L 17 20', 'M 13 80 L 17 80', // vertical dim
    'M 5 15 L 95 15', 'M 20 13 L 20 17', 'M 80 13 L 80 17', // horizontal dim
    'M 40 50 A 10 10 0 1 0 60 50 A 10 10 0 1 0 40 50', // center socket detail
    'M 48 50 L 52 50', 'M 50 48 L 50 52', // crosshair socket
  ],
  // Scene 4: Floorplan Architecture Grid
  [
    'M 5 5 L 95 5', 'M 5 15 L 95 15', 'M 5 25 L 95 25', 'M 5 35 L 95 35',
    'M 5 45 L 95 45', 'M 5 55 L 95 55', 'M 5 65 L 95 65', 'M 5 75 L 95 75', 'M 5 85 L 95 85', 'M 5 95 L 95 95',
    'M 5 5 L 5 95', 'M 15 5 L 15 95', 'M 25 5 L 25 95', 'M 35 5 L 35 95',
    'M 45 5 L 45 95', 'M 55 5 L 55 95', 'M 65 5 L 65 95', 'M 75 5 L 75 95', 'M 85 5 L 85 95', 'M 95 5 L 95 95',
    'M 25 25 L 75 25 L 75 75 L 25 75 Z', // master room
    'M 55 25 L 55 75', // division wall
    'M 25 55 L 55 55', // sub division
    'M 45 55 A 10 10 0 0 0 55 65', // swing door arc
    'M 45 55 L 55 65', // swing door line
    'M 75 65 A 10 10 0 0 1 65 75', // main door arc
    'M 75 65 L 65 75', // main door line
  ]
];

export function BlueprintAnimation({ strokeClass = "stroke-white/80" }: { strokeClass?: string }) {
  const [currentScene, setCurrentScene] = useState(0);

  useEffect(() => {
    // Rotate scenes every 6 seconds
    const interval = setInterval(() => {
      setCurrentScene((prev) => (prev + 1) % scenes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full">
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="xMidYMid slice"
        className={`w-full h-full fill-transparent overflow-hidden drop-shadow-[0_0_2px_rgba(255,255,255,0.8)] ${strokeClass}`}
      >
        <AnimatePresence mode="wait">
          <motion.g
            key={currentScene}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
          >
            {scenes[currentScene].map((d, i) => (
              <motion.path
                key={i}
                d={d}
                strokeWidth={0.3}
                strokeDasharray="1 0"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ 
                  pathLength: [0, 1, 1], 
                  opacity: [0, 1, 1] 
                }}
                transition={{
                  duration: 4,
                  ease: "easeInOut",
                  delay: i * 0.15, // Stagger drawing of each line
                }}
              />
            ))}
          </motion.g>
        </AnimatePresence>
      </svg>
      
      {/* Scanning grid effect overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <motion.div 
        animate={{ y: ["0%", "100%", "0%"] }}
        transition={{ duration: 10, ease: "linear", repeat: Infinity }}
        className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-white/40 to-transparent blur-[1px]"
      />
    </div>
  );
}
