import React from 'react';
import { motion } from 'framer-motion';

interface ActionButtonProps {
  icon: any;
  label: string;
  onClick: () => void;
}

export function ActionButton({ icon: Icon, label, onClick }: ActionButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors duration-200 text-left shadow-sm hover:shadow"
    >
      <div className="shrink-0 flex items-center justify-center">
        <Icon size={14} />
      </div>
      <span className="text-[11px] font-medium leading-tight truncate px-0.5">{label}</span>
    </motion.button>
  );
}
