"use client";

import * as React from "react";
import { UploadCloud, Loader2, Sparkles, Image as ImageIcon, Trash2, X } from "lucide-react";

type Photo = {
  id: string;
  url: string;
  aiStyle?: { description: string } | null;
  createdAt: string;
};

type ProjectInsight = {
    style?: string;
    materials?: string;
    technical?: string;
};

export function PhotoGallery({ projectId }: { projectId: string }) {
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<{ type: "info" | "error"; message: string } | null>(null);
  const [insights, setInsights] = React.useState<ProjectInsight>({});
  const [studioLoading, setStudioLoading] = React.useState<string | null>(null);
  const [visualizingPhoto, setVisualizingPhoto] = React.useState<Photo | null>(null);
  const visualizingId = visualizingPhoto?.id ?? null;
  const [selectedStyle, setSelectedStyle] = React.useState<string | null>(null);
  const [vizResult, setVizResult] = React.useState<string | null>(null);
  const [vizError, setVizError] = React.useState<string | null>(null);
  const [isVizLoading, setIsVizLoading] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchPhotos = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/photos`);
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.items || []);
        // If the backend returns aiInsights for the project, we should fetch it.
        // For now, we rely on the studio result.
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const runStudioAnalysis = async (mode: string) => {
      setStudioLoading(mode);
      setStatus({ type: "info", message: "AI анализира всички снимки..." });
      try {
          const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/ai-studio?mode=${mode}`, {
              method: "POST"
          });
          const data = await res.json();
          if (data.ok) {
              setInsights(prev => ({ ...prev, [mode]: data.result }));
              setStatus({ type: "info", message: "Анализът е готов!" });
          } else {
              throw new Error(data.error || "Грешка при AI анализа");
          }
      } catch (e) {
          setStatus({ type: "error", message: e instanceof Error ? e.message : "Грешка при анализа" });
      } finally {
          setStudioLoading(null);
      }
  };

  React.useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  // Clear status after 5s
  React.useEffect(() => {
    if (status) {
      const t = setTimeout(() => setStatus(null), 5000);
      return () => clearTimeout(t);
    }
  }, [status]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploading(true);
    setStatus({ type: "info", message: "Качване..." });
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/photos`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setStatus({ type: "info", message: "Снимката е качена успешно." });
        await fetchPhotos();
      } else {
        const errText = await res.text();
        setStatus({ type: "error", message: `Грешка при качване: ${errText || "Сървърна грешка"}` });
      }
    } catch {
       setStatus({ type: "error", message: "Възникна мрежова грешка при качването." });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deletePhoto(photoId: string) {
    if (!window.confirm("Сигурни ли сте, че искате да изтриете тази снимка?")) return;
    
    setDeletingId(photoId);
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photoId)}`, { method: "DELETE" });
      if (res.ok) {
        setPhotos(prev => prev.filter(p => p.id !== photoId));
      } else {
        setStatus({ type: "error", message: "Грешка при изтриване." });
      }
    } catch {
      setStatus({ type: "error", message: "Възникна мрежова грешка." });
    } finally {
      setDeletingId(null);
    }
  }


  const STYLES = [
      { id: "scandinavian", name: "Scandinavian", color: "#f4f1ea", desc: "Light woods & airy minimalism" },
      { id: "industrial", name: "Industrial", color: "#2d2d2d", desc: "Raw concrete & steel accents" },
      { id: "minimalist", name: "Minimalist", color: "#ffffff", desc: "Pure lines & hidden logic" },
      { id: "farmhouse", name: "Farmhouse", color: "#d8c3a5", desc: "Warm wood & rustic textures" },
      { id: "japandi", name: "Japandi", color: "#e3dbd2", desc: "Zen balance & organic tones" },
      { id: "traditional", name: "Traditional", color: "#5d4037", desc: "Rich mahogany & ornate detail" },
      { id: "transitional", name: "Transitional", color: "#eceff1", desc: "Perfect classic-modern mix" },
      { id: "mid-century", name: "Mid-Century", color: "#8d6e63", desc: "Iconic walnut & 50s soul" },
      { id: "mediterranean", name: "Mediterranean", color: "#ffab91", desc: "Terracotta & sun-drenched soul" },
      { id: "hitech", name: "High-Tech", color: "#cfd8dc", desc: "Smart glass & metallic finish" },
  ];

  async function startVisualization(styleKey: string) {
      if (!visualizingPhoto) return;
      setIsVizLoading(true);
      setSelectedStyle(styleKey);
      setVizResult(null);
      setVizError(null);
      console.log(`[VirtualStylist] Starting visualization for style: ${styleKey}`);
      try {
          const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/visualize`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ photoId: visualizingPhoto.id, photoUrl: visualizingPhoto.url, styleKey })
          });
          const data = await res.json();
          if (data.ok) {
              setVizResult(data.url);
          } else {
              setVizError(data.error || "Грешка при визуализацията");
              console.error(`[VirtualStylist] AI Error: ${data.error}`);
          }
      } catch (err) {
          setVizError("Мрежова грешка при комуникация със сървъра");
          console.error(`[VirtualStylist] Network Error:`, err);
      } finally {
          setIsVizLoading(false);
      }
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div className="space-y-1">
            <h3 className="text-base font-black uppercase tracking-[0.2em] text-slate-900 flex items-center gap-3">
               <ImageIcon className="h-5 w-5 text-slate-400" />
               Вдъхновения и Снимки
            </h3>
            <p className="text-[10px] text-slate-500 font-light tracking-widest uppercase">Визуален контекст и референции за проекта</p>
         </div>
         
         <div className="flex items-center gap-4">
            {status && (
              <div className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border flex items-center gap-2 animate-enter ${status.type === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-slate-50 text-slate-900 border-slate-100"}`}>
                {status.message}
                <button onClick={() => setStatus(null)}><X className="h-3 w-3" /></button>
              </div>
            )}
            <button
               onClick={() => fileInputRef.current?.click()}
               disabled={uploading}
               className="btn-premium px-6 py-2.5 technical-label rounded-xl shadow-lg flex items-center gap-3 active:scale-95 transition-all"
            >
               {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
               <span className="relative top-[1px]">{uploading ? "КАЧВАНЕ..." : "КАЧИ СНИМКА"}</span>
            </button>
         </div>
       </div>

       {loading ? (
           <div className="flex items-center justify-center py-20 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
               <div className="flex flex-col items-center gap-4">
                  <div className="h-10 w-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Зареждане на галерия...</span>
               </div>
           </div>
       ) : (
           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
               {photos.length === 0 && !uploading && (
                 <div className="col-span-full py-16 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] bg-slate-50/30">
                    <ImageIcon className="h-12 w-12 text-slate-200 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Няма качени снимки</p>
                 </div>
               )}

               {photos.map(photo => (
                   <div key={photo.id} className="relative aspect-square rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm group bg-white">
                        {/* Action Toolbar on Hover */}
                        <div className="absolute top-4 right-4 z-30 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                           <button 
                             onClick={() => setVisualizingPhoto(photo)}
                             className="h-10 w-10 bg-white/90 backdrop-blur-xl text-slate-900 rounded-2xl flex items-center justify-center shadow-2xl hover:bg-slate-900 hover:text-white transition-all active:scale-90"
                             title="Визуализирай в друг стил"
                           >
                             <Sparkles className="h-4 w-4" />
                           </button>
                           <button 
                             onClick={() => deletePhoto(photo.id)}
                             disabled={deletingId === photo.id}
                             className="h-10 w-10 bg-white/90 backdrop-blur-xl text-red-600 rounded-2xl flex items-center justify-center shadow-2xl hover:bg-red-500 hover:text-white transition-all active:scale-90"
                           >
                             {deletingId === photo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                           </button>
                        </div>

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photo.url} alt="Photo" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                        
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500" />
                   </div>
               ))}
           </div>
       )}

        {/* VIRTUAL STYLIST MODAL: PREMIUM REDESIGN */}
        {visualizingId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 bg-slate-900/80 backdrop-blur-2xl animate-in fade-in duration-500">
                <div className="glass-premium border-white/40 shadow-[0_0_100px_rgba(0,0,0,0.2)] w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col p-0 rounded-[3rem]">
                    
                    {/* MODAL HEADER */}
                    <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-3">
                                <div className="h-2 w-2 rounded-full bg-slate-900 animate-pulse" />
                                <h2 className="text-2xl font-black uppercase tracking-[0.4em] text-slate-900 leading-none">Virtual Stylist</h2>
                            </div>
                            <p className="text-[10px] text-slate-500 font-light tracking-[0.5em] uppercase pl-5">Nano Banana PRO · Architectural Engine</p>
                        </div>
                        <button 
                          onClick={() => { setVisualizingPhoto(null); setVizResult(null); setSelectedStyle(null); }}
                          className="h-12 w-12 rounded-2xl bg-white/40 border border-white/60 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-90"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
                        
                        {/* LEFT: STYLE SELECTION (SWATCH GRID) */}
                        <div className="lg:col-span-5 border-r border-white/10 overflow-auto p-10 space-y-10 bg-white/20">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 flex items-center gap-4">
                                    <span>Архитектурен Каталог</span>
                                    <div className="h-[1px] flex-1 bg-slate-100" />
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    {STYLES.map(style => (
                                        <button
                                          key={style.id}
                                          onClick={() => startVisualization(style.id)}
                                          disabled={isVizLoading}
                                          className={`group relative overflow-hidden p-5 rounded-2xl border transition-all flex items-center gap-6 ${selectedStyle === style.id ? 'border-slate-900 bg-slate-900 shadow-2xl scale-[1.02] z-10' : 'border-white/60 bg-white/40 hover:border-slate-300 hover:scale-[1.01] shadow-sm'}`}
                                        >
                                            <div 
                                              className="h-14 w-14 rounded-xl shadow-inner border border-black/5 shrink-0"
                                              style={{ backgroundColor: style.color || "#ccc", backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(0,0,0,0.05) 100%)` }}
                                            />
                                            <div className="text-left space-y-1">
                                                <div className={`text-[11px] font-black uppercase tracking-widest ${selectedStyle === style.id ? 'text-white' : 'text-slate-900'}`}>{style.name}</div>
                                                <div className={`text-[9px] font-light uppercase tracking-widest ${selectedStyle === style.id ? 'text-slate-400' : 'text-slate-500'}`}>{style.desc}</div>
                                            </div>
                                            {selectedStyle === style.id && !isVizLoading && (
                                                <Sparkles className="h-4 w-4 text-white ml-auto animate-pulse" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: RESULT VIEWPORT */}
                        <div className="lg:col-span-7 p-10 flex flex-col items-center justify-center bg-slate-50/30">
                            <div className="w-full h-full rounded-[2.5rem] bg-white border border-white/60 overflow-hidden relative shadow-[0_32px_80px_-20px_rgba(0,0,0,0.15)] group">
                                {isVizLoading ? (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-10 glass-cad z-20 backdrop-blur-3xl">
                                        <div className="relative">
                                            <div className="h-24 w-24 border-2 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <Sparkles className="h-8 w-8 text-slate-900 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-3">
                                            <div className="text-[14px] font-black uppercase tracking-[0.5em] text-slate-900">Nano Banana PRO</div>
                                            <div className="text-[9px] text-slate-400 font-light tracking-[0.3em] uppercase">Проектиране на текстури и осветление...</div>
                                        </div>
                                        
                                        {/* BLUEPRINT SHIMMER EFFECT */}
                                        <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden">
                                            <div className="w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px] animate-pulse" />
                                        </div>
                                    </div>
                                ) : null}

                                {vizError && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-6 z-30 bg-white group-hover:bg-slate-50 transition-colors">
                                        <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center">
                                            <X className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-red-600">Грешка при генериране</h4>
                                            <p className="text-[10px] text-slate-500 font-light tracking-widest max-w-[300px] mx-auto leading-relaxed">
                                                {vizError}
                                            </p>
                                        </div>
                                        <button 
                                          onClick={() => selectedStyle && startVisualization(selectedStyle)}
                                          className="btn-premium px-8 py-3 technical-label text-[9px] rounded-xl shadow-lg active:scale-95 transition-all"
                                        >
                                            ОПИТАЙ ОТНОВО
                                        </button>
                                    </div>
                                )}

                                {vizResult ? (
                                    <div className="w-full h-full flex flex-col animate-enter">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={vizResult} alt="Visualized Kitchen" className="w-full h-full object-cover" />
                                        
                                        <div className="absolute inset-x-10 bottom-10 flex gap-4 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                                            <a 
                                              href={vizResult} 
                                              download={`kitchen_${selectedStyle}.png`}
                                              target="_blank" 
                                              rel="noreferrer"
                                              className="flex-1 btn-blueprint py-5 rounded-2xl flex items-center justify-center gap-4 text-sm"
                                            >
                                                Свали Проекта (High-Res)
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    !isVizLoading && !vizError && (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-20 text-center space-y-8">
                                            <div className="h-32 w-32 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center relative">
                                                <div className="absolute inset-0 bg-slate-900/5 rounded-full animate-ping" />
                                                <ImageIcon className="h-12 w-12 text-slate-200" />
                                            </div>
                                            <div className="space-y-4">
                                                <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900">Изберете стил от каталога</h3>
                                                <p className="text-[10px] text-slate-400 font-light tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
                                                    Изберете архитектурно направление от левия панел,<br/>за да трансформирате снимката в реално време.
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

       {/* SMART AI STUDIO PANEL */}
       {!loading && photos.length > 0 && (
         <div className="mt-12 space-y-8 animate-enter">
            <div className="relative pt-8 border-t border-slate-100">
               <div className="absolute -top-[1px] left-0 w-24 h-[2px] bg-slate-900" />
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                  <div className="space-y-1">
                     <h4 className="text-sm font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-3">
                        <Sparkles className="h-4 w-4 text-slate-900" />
                        Smart AI Studio
                     </h4>
                     <p className="text-[10px] text-slate-500 font-light tracking-widest uppercase">Експертен разбор на всички проектирани детайли</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                     <button
                       onClick={() => runStudioAnalysis("style")}
                       disabled={!!studioLoading}
                       className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${studioLoading === "style" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900"}`}
                     >
                        {studioLoading === "style" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                        Стилов Анализ
                     </button>
                     <button
                       onClick={() => runStudioAnalysis("materials")}
                       disabled={!!studioLoading}
                       className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${studioLoading === "materials" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900"}`}
                     >
                        {studioLoading === "materials" ? <Loader2 className="h-3 w-3 animate-spin" /> : <UploadCloud className="h-3 w-3" />}
                        Материали
                     </button>
                     <button
                       onClick={() => runStudioAnalysis("technical")}
                       disabled={!!studioLoading}
                       className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${studioLoading === "technical" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-900 hover:text-slate-900"}`}
                     >
                        {studioLoading === "technical" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-3 w-3" />}
                        Технически Разбор
                     </button>
                  </div>
               </div>

               {/* RESULTS AREA */}
               <div className="grid grid-cols-1 gap-6">
                  {(Object.keys(insights).length > 0 || studioLoading) ? (
                     <div className="glass-cad rounded-[2rem] border border-slate-200 p-8 shadow-xl min-h-[200px] relative overflow-hidden">
                        {studioLoading && (
                           <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 animate-pulse">
                              <div className="h-8 w-8 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin" />
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900">AI Моделира анализа...</span>
                           </div>
                        )}

                        <div className="space-y-8">
                           {Object.entries(insights).map(([mode, text]) => (
                              <div key={mode} className="space-y-4 animate-enter">
                                 <div className="flex items-center gap-4">
                                    <div className="h-[1px] flex-1 bg-slate-100" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400 text-center">
                                       {mode === "style" ? "Дизайн и Атмосфера" : mode === "materials" ? "Спецификация Материали" : "Техническа експертиза"}
                                    </span>
                                    <div className="h-[1px] flex-1 bg-slate-100" />
                                 </div>
                                 <p className="text-sm text-slate-800 leading-relaxed font-light whitespace-pre-wrap">
                                    {text}
                                 </p>
                              </div>
                           ))}
                        </div>
                     </div>
                  ) : (
                     <div className="py-12 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center px-6">
                        <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
                           <Sparkles className="h-6 w-6 text-slate-200" />
                        </div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 mb-2">Готовност за AI анализ</h5>
                        <p className="text-[10px] text-slate-400 font-light tracking-widest max-w-[300px]">Изберете един от мощните режими по-горе, за да получите експертно мнение за проекта</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
       )}

       <input
           type="file"
           ref={fileInputRef}
           onChange={handleUpload}
           accept="image/*"
           className="hidden"
       />
    </div>
  );
}
