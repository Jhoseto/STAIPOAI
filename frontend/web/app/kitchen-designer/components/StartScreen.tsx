"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, 
  Plus, 
  FolderOpen, 
  ArrowRight,
  Home,
  Clock,
  Wand2
} from 'lucide-react';

interface StartScreenProps {
  onQuickStart: () => void;
  onNewProject: () => void;
  onLoadProject: () => void;
}

export function StartScreen({ onQuickStart, onNewProject, onLoadProject }: StartScreenProps) {
  const options = [
    {
      id: 'quick-start',
      title: '&#1041;&#1098;&#1088;&#1079; &#1087;&#1088;&#1086;&#1077;&#1082;&#1090;&#1080;&#1088;&#1072;&#1085;&#1077;',
      description: 'AI &#1072;&#1089;&#1080;&#1089;&#1090;&#1077;&#1085;&#1090; &#1079;&#1072; &#1085;&#1072;&#1095;&#1080;&#1085;&#1072;&#1077;&#1097;&#1080; &#1087;&#1086;&#1090;&#1088;&#1077;&#1073;&#1080;&#1090;&#1077;&#1083;&#1080;',
      icon: Wand2,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      features: [
        '&#1042;&#1074;&#1077;&#1078;&#1076;&#1072;&#1085;&#1077; &#1085;&#1072; &#1088;&#1072;&#1079;&#1084;&#1077;&#1088;&#1080; &#1085;&#1072; &#1089;&#1090;&#1072;&#1103;&#1090;&#1072;',
        '3 AI &#1075;&#1077;&#1085;&#1077;&#1088;&#1080;&#1088;&#1072;&#1085;&#1080; &#1083;&#1077;&#1072;&#1091;&#1090;&#1072;',
        '&#1055;&#1088;&#1086;&#1092;&#1077;&#1089;&#1080;&#1086;&#1085;&#1072;&#1083;&#1085;&#1080; &#1087;&#1088;&#1077;&#1087;&#1086;&#1088;&#1072;&#1082;&#1080;'
      ],
      onClick: onQuickStart
    },
    {
      id: 'new-project',
      title: '&#1053;&#1086;&#1074; &#1087;&#1088;&#1086;&#1077;&#1082;&#1090;',
      description: '&#1047;&#1072;&#1087;&#1086;&#1095;&#1085;&#1077;&#1090;&#1077; &#1086;&#1090; &#1085;&#1072;&#1095;&#1072;&#1083;&#1086; &#1089; &#1087;&#1088;&#1072;&#1079;&#1085;&#1086; &#1087;&#1083;&#1072;&#1090;&#1085;&#1086;',
      icon: Plus,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      features: [
        '&#1063;&#1080;&#1089;&#1090;&#1072; &#1088;&#1077;&#1096;&#1077;&#1090;&#1082;&#1072; &#1079;&#1072; &#1095;&#1077;&#1088;&#1090;&#1072;&#1085;&#1077;',
        '&#1055;&#1098;&#1083;&#1085;&#1080; CAD &#1082;&#1086;&#1085;&#1090;&#1088;&#1086;&#1083;&#1080;',
        '&#1055;&#1088;&#1086;&#1092;&#1077;&#1089;&#1080;&#1086;&#1085;&#1072;&#1083;&#1085;&#1080; &#1080;&#1085;&#1089;&#1090;&#1088;&#1091;&#1084;&#1077;&#1085;&#1090;&#1080;'
      ],
      onClick: onNewProject
    },
    {
      id: 'load-project',
      title: '&#1047;&#1072;&#1088;&#1077;&#1076;&#1080; &#1087;&#1088;&#1086;&#1077;&#1082;&#1090;',
      description: '&#1054;&#1090;&#1074;&#1086;&#1088;&#1077;&#1090;&#1077; &#1080; &#1087;&#1088;&#1086;&#1076;&#1098;&#1083;&#1078;&#1077;&#1090;&#1077;&#1095; &#1089;&#1072;&#1097;&#1077;&#1089;&#1090;&#1074;&#1091;&#1074;&#1072;&#1097;&#1090; &#1076;&#1080;&#1079;&#1072;&#1081;&#1085;',
      icon: FolderOpen,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      features: [
        '&#1056;&#1072;&#1079;&#1075;&#1083;&#1077;&#1078;&#1076;&#1072;&#1085;&#1077; &#1085;&#1072; &#1079;&#1072;&#1087;&#1072;&#1079;&#1077;&#1085;&#1080; &#1087;&#1088;&#1086;&#1077;&#1082;&#1090;&#1080;',
        '&#1055;&#1088;&#1086;&#1076;&#1098;&#1083;&#1078;&#1077;&#1085;&#1080;&#1077; &#1086;&#1090; &#1082;&#1098;&#1076;&#1077;&#1090;&#1086; &#1089;&#1088;&#1103;&#1097;&#1090;&#1077;',
        '&#1056;&#1077;&#1076;&#1072;&#1082;&#1090;&#1080;&#1088;&#1072;&#1085;&#1077; &#1085;&#1072; &#1089;&#1072;&#1097;&#1077;&#1089;&#1090;&#1074;&#1091;&#1074;&#1072;&#1097;&#1080; &#1083;&#1077;&#1072;&#1091;&#1090;&#1080;'
      ],
      onClick: onLoadProject
    }
  ];

  return (
    <div className="relative min-h-screen text-slate-900 font-sans bg-[#F2F4F7] flex items-center justify-center p-8">
      {/* Background with premium styling */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-white blur-[130px] opacity-60 pointer-events-none" />
      </div>
      
      <div className="relative z-10 max-w-6xl w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          {/* Subtitle badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-slate-300/60 bg-white/50 shadow-sm backdrop-blur-md mb-8"
          >
            <div className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" />
            <span 
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800"
              dangerouslySetInnerHTML={{ __html: '&#1055;&#1088;&#1086;&#1092;&#1077;&#1089;&#1080;&#1086;&#1085;&#1072;&#1083;&#1077;&#1085; &#1082;&#1091;&#1093;&#1085;&#1077;&#1085;&#1089;&#1082;&#1080; CAD' }}
            />
          </motion.div>

          <div className="flex items-center justify-center gap-4 mb-6">
            <Home className="w-12 h-12 text-slate-800" />
            <h1 className="text-5xl lg:text-[4rem] font-medium tracking-tight text-black leading-[1.05]">
              <span dangerouslySetInnerHTML={{ __html: '&#1050;&#1091;&#1093;&#1085;&#1077;&#1085;&#1089;&#1082;&#1080;' }} /> <br className="hidden lg:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-400">
                <span dangerouslySetInnerHTML={{ __html: '&#1076;&#1080;&#1079;&#1072;&#1081;&#1085;&#1077;&#1088;' }} />
              </span>
            </h1>
            <Sparkles className="w-12 h-12 text-slate-600" />
          </div>
          <p 
            className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed"
            dangerouslySetInnerHTML={{ __html: '&#1055;&#1088;&#1086;&#1092;&#1077;&#1089;&#1080;&#1086;&#1085;&#1072;&#1083;&#1085;&#1072; CAD &#1089;&#1080;&#1089;&#1090;&#1077;&#1084;&#1072; &#1079;&#1072; &#1082;&#1091;&#1093;&#1085;&#1077;&#1085;&#1089;&#1082;&#1080; &#1076;&#1080;&#1079;&#1072;&#1081;&#1085; &#1089; AI &#1072;&#1089;&#1080;&#1089;&#1090;&#1077;&#1085;&#1094;&#1080;&#1103;. &#1055;&#1088;&#1086;&#1077;&#1082;&#1090;&#1080;&#1088;&#1072;&#1081;&#1090;&#1077; &#1087;&#1088;&#1077;&#1094;&#1080;&#1079;&#1085;&#1086; &#1074;&#1080;&#1079;&#1091;&#1072;&#1083;&#1085;&#1086; &#1080; &#1077;&#1092;&#1077;&#1082;&#1090;&#1080;&#1074;&#1085;&#1086;.' }}
          />
        </motion.div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group"
            >
              <div
                onClick={option.onClick}
                className="h-full p-8 bg-white rounded-[2rem] border border-slate-200/50 hover:border-slate-300 shadow-sm hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 cursor-pointer"
              >
                {/* Icon */}
                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-slate-900 transition-colors">
                  <option.icon className="w-8 h-8 text-slate-700 group-hover:text-white transition-colors" />
                </div>

                {/* Content */}
                <h3 
                  className="text-[18px] font-bold tracking-tight text-slate-900 group-hover:text-black transition-colors mb-3"
                  dangerouslySetInnerHTML={{ __html: option.title }}
                />
                
                <p 
                  className="text-[15px] text-slate-500 leading-relaxed mb-6"
                  dangerouslySetInnerHTML={{ __html: option.description }}
                />

                {/* Features */}
                <div className="space-y-2 mb-6">
                  {option.features.map((feature, featureIndex) => (
                    <div key={featureIndex} className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-slate-600 transition-colors">
                      <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                      <span dangerouslySetInnerHTML={{ __html: feature }} />
                    </div>
                  ))}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100 font-bold uppercase tracking-widest text-[11px] text-slate-400 group-hover:text-slate-900 transition-colors">
                  <span dangerouslySetInnerHTML={{ __html: '&#1047;&#1072;&#1087;&#1086;&#1095;&#1085;&#1080;' }} />
                  <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center"
        >
          <div className="inline-flex items-center gap-8 px-8 py-4 bg-white/50 backdrop-blur-md rounded-full border border-slate-300/60 shadow-sm">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Clock className="w-5 h-5 text-slate-700" />
              <span 
                className="font-medium"
                dangerouslySetInnerHTML={{ __html: '&#1041;&#1098;&#1088;&#1079; &#1089;&#1090;&#1072;&#1088;&#1090;: ~2 &#1084;&#1080;&#1085;&#1091;&#1090;&#1080;' }}
              />
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Sparkles className="w-5 h-5 text-slate-700" />
              <span 
                className="font-medium"
                dangerouslySetInnerHTML={{ __html: 'AI &#1075;&#1077;&#1085;&#1077;&#1088;&#1080;&#1088;&#1072;&#1085;&#1080; &#1083;&#1077;&#1072;&#1091;&#1090;&#1080;' }}
              />
            </div>
            <div className="w-px h-4 bg-slate-300" />
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <Home className="w-5 h-5 text-slate-700" />
              <span 
                className="font-medium"
                dangerouslySetInnerHTML={{ __html: '&#1055;&#1088;&#1086;&#1092;&#1077;&#1089;&#1080;&#1086;&#1085;&#1072;&#1083;&#1085;&#1080; CAD &#1080;&#1085;&#1089;&#1090;&#1088;&#1091;&#1084;&#1077;&#1085;&#1090;&#1080;' }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
