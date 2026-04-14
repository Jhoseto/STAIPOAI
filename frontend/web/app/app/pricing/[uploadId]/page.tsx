"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { ValueAnalysisPanel } from "@/components/ui/value-analysis-panel";
import { Sparkles, UploadCloud, LayoutDashboard } from "lucide-react";

type ResolvedRow = {
  key: string;
  material: string;
  code?: string;
  qtyTotal?: number;
  areaM2Total?: number;
  edgeMTotal?: number;
  supplierName?: string;
  productName?: string;
  productCode?: string;
  priceValue?: number;
  priceUnit?: string;
  lineTotal?: number;
  availableSizes?: string[];
  availabilityText?: string;
  sourceUrl?: string;
  imageUrl?: string;
  exactMatch?: boolean;
  confidence?: number;
  reason?: string;
  accepted?: boolean;
  acceptanceThreshold?: number;
};

type ResolvedTable = {
  uploadId: string;
  projectId?: string;
  projectSaved?: boolean;
  resolvedAt?: string;
  summary: {
    total: number;
    acceptedTotal?: number;
    totalItems: number;
    resolvedExact: number;
    needsReview: number;
    acceptanceThreshold?: number;
  };
  items: ResolvedRow[];
};

function money(n: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n || 0);
}

export default function PricingPage({
  params,
}: {
  params: Promise<{ uploadId: string }>;
}) {
  const { uploadId } = React.use(params);
  const router = useRouter();
  const [table, setTable] = React.useState<ResolvedTable | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<"all" | "exact" | "review">("all");
  const [refreshBusy, setRefreshBusy] = React.useState(false);
  const [refreshReport, setRefreshReport] = React.useState<string | null>(null);
  const [progress, setProgress] = React.useState<{ running: boolean; processed: number; total: number; progressPct: number } | null>(null);
  const [savingProject, setSavingProject] = React.useState(false);
  const [closingProject, setClosingProject] = React.useState(false);
  const [projectSaved, setProjectSaved] = React.useState(false);
  
  // Manual Costs State
  const [transportCost, setTransportCost] = React.useState<string>("");
  const [installationCost, setInstallationCost] = React.useState<string>("");
  const [otherCost, setOtherCost] = React.useState<string>("");
  const [otherDescription, setOtherDescription] = React.useState<string>("");
  // Labour Calculator State
  const [laborDays, setLaborDays] = React.useState<string>("");
  const [dailyRate, setDailyRate] = React.useState<string>("");
  const [markupPct, setMarkupPct] = React.useState<string>("");
  // AI Description State
  const [aiDescription, setAiDescription] = React.useState<string | null>(null);
  const [aiDescLoading, setAiDescLoading] = React.useState(false);
  const [showPreview, setShowPreview] = React.useState(false);
  const [analysisTrigger, setAnalysisTrigger] = React.useState(0);
  const initRunRef = React.useRef(false);

  // Computed totals
  const materialTotal = table?.summary.total ?? 0;
  const laborTotal = (Number(laborDays) || 0) * (Number(dailyRate) || 0);
  const markupAmount = materialTotal * ((Number(markupPct) || 0) / 100);
  const grandTotal = materialTotal + laborTotal + markupAmount + (Number(transportCost) || 0) + (Number(installationCost) || 0) + (Number(otherCost) || 0);

  function hasRealImage(url?: string) {
    const u = (url || "").toLowerCase();
    if (!u) return false;
    return !u.includes("logo") && !u.includes("placeholder") && !u.includes("favicon");
  }

  React.useEffect(() => {
    if (initRunRef.current) return;
    initRunRef.current = true;
    async function loadResolved() {
      try {
        const existing = await fetch(`/api/uploads/${uploadId}/salex-resolved-table`, { cache: "no-store" });
        if (!existing.ok) throw new Error(await existing.text());
        const existingData = (await existing.json()) as { resolved: ResolvedTable | null };
        if (existingData.resolved) {
          setTable(existingData.resolved);
          setProjectSaved(!!existingData.resolved.projectSaved);
          return;
        }
        setRefreshBusy(true);
        setProgress({ running: true, processed: 0, total: 0, progressPct: 0 });
        setRefreshReport(null);
        const runRes = await fetch(`/api/uploads/${uploadId}/salex-resolved-table`, { method: "POST" });
        if (!runRes.ok) throw new Error(await runRes.text());
        const runData = (await runRes.json()) as { resolved?: ResolvedTable };
        if (runData.resolved) {
          setTable(runData.resolved);
          setProgress({ running: false, processed: runData.resolved.summary.totalItems, total: runData.resolved.summary.totalItems, progressPct: 100 });
          return;
        }
        const finalCheck = await fetch(`/api/uploads/${uploadId}/salex-resolved-table`, { cache: "no-store" });
        if (!finalCheck.ok) throw new Error(await finalCheck.text());
        const finalData = (await finalCheck.json()) as { resolved: ResolvedTable | null };
        if (finalData.resolved) {
          setTable(finalData.resolved);
          setProgress({ running: false, processed: finalData.resolved.summary.totalItems, total: finalData.resolved.summary.totalItems, progressPct: 100 });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестна грешка");
      } finally {
        setRefreshBusy(false);
      }
    }
    loadResolved();
  }, [uploadId]);

  React.useEffect(() => {
    if (!refreshBusy) return;
    let stop = false;
    async function poll() {
      while (!stop) {
        try {
          const res = await fetch(`/api/uploads/${uploadId}/salex-resolve-status`, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) as { running: boolean; processed: number; total: number; progressPct: number };
            setProgress(data);
            if (!data.running) return;
          }
        } catch {
          // ignore transient poll errors
        }
        await new Promise(r => setTimeout(r, 1200));
      }
    }
    poll();
    return () => {
      stop = true;
    };
  }, [refreshBusy, uploadId]);

  async function createOffer() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/uploads/${uploadId}/offer`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transportCost: Number(transportCost) || 0,
          installationCost: Number(installationCost) || 0,
          otherCost: Number(otherCost) || 0,
          otherDescription,
          laborDays: Number(laborDays) || 0,
          dailyRate: Number(dailyRate) || 0,
          markupPct: Number(markupPct) || 0,
        }) 
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { slug: string };
      router.push(`/offer/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  async function generateAiDescription() {
    if (!uploadId) return;
    setAiDescLoading(true);
    try {
      const res = await fetch(`/api/uploads/${uploadId}/describe`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { description: string };
      setAiDescription(data.description);
    } catch {
      setAiDescription("Не успяхме да генерираме автоматично описание.");
    } finally {
      setAiDescLoading(false);
    }
  }

  async function runResolve(force: boolean) {
    setRefreshBusy(true);
    setError(null);
    setRefreshReport(null);
    setProgress({ running: true, processed: 0, total: 0, progressPct: 0 });
    try {
      const res = await fetch(`/api/uploads/${uploadId}/salex-resolved-table?force=${force ? "1" : "0"}`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { resolved: ResolvedTable };
      setTable(data.resolved);
      setRefreshReport(`Обновени редове: ${data.resolved.summary.totalItems}, exact: ${data.resolved.summary.resolvedExact}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при Gemini обновяване");
    } finally {
      setRefreshBusy(false);
      setProgress(prev => (prev ? { ...prev, running: false } : null));
    }
  }

  async function saveProject() {
    if (!table?.projectId) return;
    setSavingProject(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(table.projectId)}/save`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setProjectSaved(true);
      setRefreshReport("Проектът е запазен.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при запазване");
    } finally {
      setSavingProject(false);
    }
  }

  async function closeProject() {
    if (!table?.projectId) {
      router.push("/app");
      return;
    }
    setClosingProject(true);
    setError(null);
    try {
      if (!projectSaved) {
          const choice = window.confirm("Проектът не е запазен. Желаете ли да ИЗТРИЕТЕ проекта и снимките към него, за да освободите място? (Отказ = запазване като чернова)");
          if (choice) {
              await fetch(`/api/projects/${encodeURIComponent(table.projectId)}/discard`, { method: "POST" });
              router.push("/app/projects");
              return;
          }
      }
      
      const ok = window.confirm("Затваряме този проект. Продължаваме?");
      if (!ok) return;
      router.push("/app/projects");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при затваряне");
    } finally {
      setClosingProject(false);
    }
  }

  return (
    <div className="w-full space-y-6">
      {/* HEADER SECTION */}
      <div className="pb-6 border-b border-slate-200 animate-enter">
        <div className="line-divider" />
        <span className="text-small">Калкулатор</span>
        <h1 className="text-4xl font-light tracking-tight mt-4">Ценообразуване и Съпоставяне</h1>
        {error ? <div className="text-sm text-red-600 mt-4 font-bold">{error}</div> : null}
        {refreshReport ? <div className="text-sm text-slate-500 mt-2 font-medium italic">{refreshReport}</div> : null}
        {progress?.running ? (
          <div className="mt-4 p-4 glass-cad rounded-xl border border-slate-200 flex items-center gap-4">
            <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-bold uppercase tracking-widest text-slate-700">
              Gemini Парсване: {progress.progressPct}% ({progress.processed}/{progress.total || "?"})
            </div>
          </div>
        ) : null}
      </div>

      {table ? (
        <div className="mt-8 space-y-16 text-sm">
          
          {/* === 1. МАТЕРИАЛИ (ТАБЛИЦА) === */}
          <section className="space-y-6">
            <div className="flex flex-wrap gap-4 items-end p-1 border-b border-slate-200 pb-8">
              <div className="flex p-1 bg-white/40 backdrop-blur-xl rounded-xl border border-white/40 shadow-sm glass-cad">
                <button
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${filter === "all" ? "bg-white/80 text-slate-900 shadow-md transform scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
                  onClick={() => setFilter("all")}
                  disabled={refreshBusy || busy}
                >
                  Всички
                </button>
                <button
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${filter === "exact" ? "bg-white/80 text-slate-900 shadow-md transform scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
                  onClick={() => setFilter("exact")}
                  disabled={refreshBusy || busy}
                >
                  Точни (100%)
                </button>
                <button
                  className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 ${filter === "review" ? "bg-white/80 text-slate-900 shadow-md transform scale-[1.02]" : "text-slate-500 hover:text-slate-800"}`}
                  onClick={() => setFilter("review")}
                  disabled={refreshBusy || busy}
                >
                  За проверка
                </button>
              </div>
              
              <div className="ml-auto flex gap-3">
                <button
                  className="px-6 py-2.5 btn-premium technical-label"
                  onClick={() => runResolve(false)}
                  disabled={refreshBusy || busy}
                >
                  {refreshBusy ? "Зареждане..." : "Синхронизирай със Salex"}
                </button>
                <button
                  className="px-6 py-2.5 btn-blueprint technical-label"
                  onClick={() => runResolve(true)}
                  disabled={refreshBusy || busy}
                >
                  {refreshBusy ? "Парсване..." : "Прегенерирай (FORCE AI)"}
                </button>
              </div>
            </div>

            <div className="border border-slate-200/60 overflow-hidden rounded-3xl shadow-2xl bg-white/80 backdrop-blur-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between metallic-sidebar">
                <span className="text-sm font-bold uppercase tracking-widest text-slate-900">Разчет по материали (Salex)</span>
                <div className="flex items-center gap-5 text-[10px] text-slate-500 uppercase tracking-widest font-black">
                  <span>Редове: {table.summary.totalItems}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>Приети: {table.summary.resolvedExact}</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300" />
                  <span>За проверка: {table.summary.needsReview}</span>
                </div>
              </div>
              <div className="max-h-[65vh] overflow-auto">
                <table className="table-luxury min-w-[980px] text-xs">
                  <thead className="bg-slate-50/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Снимка</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Материал проект</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Код проект</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Брой</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">м2</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Артикул в Salex</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Цена/ед.</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Сума</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Размери</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Наличност</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Качество</th>
                      <th className="text-left px-4 py-4 text-slate-400 font-black uppercase tracking-widest text-[9px]">Линк</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic font-light">
                    {table.items
                      .filter(item => {
                        if (filter === "exact") return item.exactMatch;
                        if (filter === "review") return !item.exactMatch;
                        return true;
                      })
                      .map(item => (
                      <tr key={item.key} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-4">
                          {hasRealImage(item.imageUrl) ? (
                            <img
                              src={item.imageUrl}
                              alt={item.material}
                              className="w-14 h-14 rounded-xl object-cover border border-slate-200 shadow-sm group-hover:scale-110 transition-transform"
                              onError={e => {
                                (e.currentTarget as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200">
                              Null
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 text-sm tracking-tight">{item.material}</div>
                        </td>
                        <td className="px-4 py-4 text-slate-500 font-mono text-[10px]">{item.code || "—"}</td>
                        <td className="px-4 py-4 text-center font-medium">{item.qtyTotal ?? 0}</td>
                        <td className="px-4 py-4 text-center font-medium">{item.areaM2Total ?? 0}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{item.productName || "—"}</div>
                          <div className="text-[10px] text-slate-400 font-mono italic">{item.productCode || "—"}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="font-bold text-slate-900">{money(item.priceValue || 0)}</span>
                          <span className="text-slate-400 ml-1">/ {item.priceUnit || "—"}</span>
                        </td>
                        <td className="px-4 py-4 font-black text-slate-900 text-base">{money(item.lineTotal || 0)}</td>
                        <td className="px-4 py-4 text-slate-400 font-light italic text-[11px]">
                          {(item.availableSizes || []).slice(0, 1).join(" · ") || "—"}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${item.availabilityText ? "bg-slate-100 text-slate-700 border border-slate-200" : "text-slate-300"}`}>
                            {item.availabilityText || "n/a"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-1">
                            <div className={`text-[10px] font-black uppercase tracking-widest ${item.accepted ? "text-slate-400" : "text-amber-500 animate-pulse"}`}>
                              {item.accepted ? "ПРИЕТ" : "ПРЕГЛЕД"} · {(item.confidence || 0).toFixed(2)}
                            </div>
                            {item.reason ? <div className="text-[9px] text-slate-400 leading-tight truncate max-w-[140px] font-light">{item.reason}</div> : null}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {item.sourceUrl ? (
                            <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="text-[11px] font-bold underline text-slate-400 hover:text-slate-900 transition-colors">
                              SALEX →
                            </a>
                          ) : (
                            <a
                              href={`https://salex.bg/?s=${encodeURIComponent(item.code || item.material || "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold underline text-slate-300 hover:text-slate-600 italic"
                            >
                              ТЪРСИ...
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* === 2. КАЛКУЛАТОР === */}
          <section className="space-y-8">
            <div className="card-luxury p-10 space-y-8 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles className="h-20 w-20 text-slate-900" />
              </div>
              
              <div className="flex items-center justify-between border-b border-slate-200 pb-6 relative z-10">
                <div>
                  <div className="text-base font-black uppercase tracking-[0.2em] text-slate-900">Калкулатор на Стойността</div>
                  <div className="text-xs text-slate-500 mt-1 font-light tracking-wide">Въведете допълнителните параметри за финализиране на офертата</div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setAnalysisTrigger(prev => prev + 1)}
                    disabled={refreshBusy || busy}
                    className="text-xs px-6 py-3 border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-900 hover:text-white transition-all duration-500 flex items-center gap-2 font-bold uppercase tracking-[0.1em] rounded-xl shadow-sm"
                  >
                    <Sparkles className="h-4 w-4" />
                    Анализ на Маржа
                  </button>
                  <button
                    onClick={generateAiDescription}
                    disabled={aiDescLoading || refreshBusy || busy}
                    className="text-xs px-6 py-3 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all duration-500 flex items-center gap-2 font-bold uppercase tracking-[0.1em] rounded-xl shadow-sm"
                  >
                    {aiDescLoading ? "AI мисли..." : "✦ Генерира описание"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Дни Монтаж</label>
                  <input type="text" placeholder="0" value={laborDays} onChange={e => setLaborDays(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ставка €/ден</label>
                  <input type="text" placeholder="0" value={dailyRate} onChange={e => setDailyRate(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Надценка %</label>
                  <input type="text" placeholder="0" value={markupPct} onChange={e => setMarkupPct(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Транспорт €</label>
                  <input type="text" placeholder="0" value={transportCost} onChange={e => setTransportCost(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Монтаж € (Доп.)</label>
                  <input type="text" placeholder="0" value={installationCost} onChange={e => setInstallationCost(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
                <div className="md:col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Друго описание (Детайли)</label>
                  <input type="text" placeholder="Напр. сложност на обкова, услуги..." value={otherDescription} onChange={e => setOtherDescription(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl" />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Друга стойност €</label>
                  <input type="text" placeholder="0" value={otherCost} onChange={e => setOtherCost(e.target.value)} disabled={refreshBusy || busy}
                    className="w-full bg-slate-50/50 border border-slate-200 px-5 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all rounded-2xl font-bold" />
                </div>
              </div>
            </div>

            <ValueAnalysisPanel 
              uploadId={uploadId} 
              activeTrigger={analysisTrigger} 
              payload={{
                transportCost: Number(transportCost) || 0,
                installationCost: Number(installationCost) || 0,
                otherCost: Number(otherCost) || 0,
                marginPct: (Number(markupPct) || 0) / 100
              }} 
            />

            {aiDescription && (
              <div className="card-luxury p-10 border-l-[6px] border-slate-900 bg-white shadow-xl animate-enter">
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 mb-4">Резюме и AI Анализ</div>
                <p className="text-base leading-relaxed text-slate-600 font-light italic">{aiDescription}</p>
              </div>
            )}
          </section>

          {/* === 3. СНИМКИ === */}
          {table.projectId && (
            <section className="card-luxury p-10">
               <PhotoGallery projectId={table.projectId} />
            </section>
          )}

          {/* === 4. ФИНАЛНО ОБОБЩЕНИЕ (ALL-IN-ONE) === */}
          <section className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="card-luxury p-8 flex flex-col justify-between bg-slate-50/40 relative overflow-hidden h-full">
                <div className="absolute -bottom-4 -right-4 opacity-5 pointer-events-none">
                  <LayoutDashboard className="h-32 w-32" />
                </div>
                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-6 relative z-10">Проектни Метрики</div>
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Брой материали:</span>
                    <span className="text-slate-900 font-bold">{table.summary.totalItems} poz.</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">Точни съвпадения:</span>
                    <span className="text-slate-900 font-bold">{table.summary.resolvedExact}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">За редакция:</span>
                    <span className="text-slate-900 font-bold">{table.summary.needsReview}</span>
                  </div>
                </div>
                <div className="mt-8 pt-4 border-t border-slate-200/50 text-[10px] text-slate-400 font-medium relative z-10 italic">
                  Последна синхронизация: {table.resolvedAt ? new Date(table.resolvedAt).toLocaleString("bg-BG") : "—"}
                </div>
              </div>

              <div className="md:col-span-3 card-luxury p-12 flex flex-col gap-10 metallic-sidebar border-slate-300 shadow-2xl relative">
                <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-12">
                  <div>
                    <div className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 mb-4 text-center md:text-left">ОКОНЧАТЕЛНА СТОЙНОСТ ЗА КЛИЕНТА</div>
                    <div className="text-8xl font-black tracking-tighter text-slate-900 drop-shadow-xl text-center md:text-left">{money(grandTotal)}</div>
                  </div>
                  
                  <div className="w-full md:w-auto min-w-[320px] space-y-3 p-8 rounded-3xl bg-white/50 backdrop-blur-2xl border border-white/60 shadow-2xl relative">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 pb-2 border-b border-slate-200/50">Разбивка на разходите</div>
                    
                    <div className="flex justify-between items-center text-xs group">
                      <span className="text-slate-500 group-hover:text-slate-800 transition-colors">Материали (Salex):</span>
                      <span className="text-slate-900 font-mono font-bold">{money(materialTotal)}</span>
                    </div>
                    
                    {laborTotal > 0 && (
                      <div className="flex justify-between items-center text-xs group">
                        <span className="text-slate-500 group-hover:text-slate-800 transition-colors">Труд ({laborDays}д × {dailyRate}€):</span>
                        <span className="text-slate-900 font-mono font-bold">{money(laborTotal)}</span>
                      </div>
                    )}
                    
                    {markupAmount > 0 && (
                      <div className="flex justify-between items-center text-xs group">
                        <span className="text-slate-500 group-hover:text-slate-800 transition-colors">Надценка ({markupPct}%):</span>
                        <span className="text-slate-900 font-mono font-bold">{money(markupAmount)}</span>
                      </div>
                    )}
                    
                    {(Number(transportCost) || Number(installationCost) || Number(otherCost)) > 0 && (
                      <div className="flex justify-between items-center text-xs group">
                        <span className="text-slate-500 group-hover:text-slate-800 transition-colors">Трансп. & Допълнителни:</span>
                        <span className="text-slate-900 font-mono font-bold">
                          {money((Number(transportCost)||0)+(Number(installationCost)||0)+(Number(otherCost)||0))}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-4 mt-2 border-t-[2px] border-slate-900 flex justify-between items-center">
                      <span className="text-[10px] font-black uppercase text-slate-900">ОБЩА СУМА:</span>
                      <span className="text-xl font-black text-slate-900">{money(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ГЛАВНА ЕКШЪН ЛЕНТА (BOTTOM STICKY FEEL) */}
            <div className="flex flex-wrap items-center gap-5 p-6 bg-white/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/50 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] relative z-50">
              <button 
                className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white border border-slate-200 text-slate-400 hover:text-slate-900 hover:border-slate-900 hover:bg-slate-50 rounded-2xl transition-all active:scale-95 disabled:opacity-20 flex items-center gap-2" 
                onClick={closeProject} 
                disabled={closingProject || !table || refreshBusy || busy} 
              >
                ЗАТВОРИ
              </button>
              
              <button
                className="px-12 py-6 btn-premium technical-label rounded-2xl shadow-xl active:scale-95"
                onClick={saveProject}
                disabled={savingProject || !table || refreshBusy || busy}
              >
                {savingProject ? "ЗАПАЗВАНЕ..." : "ЗАПАЗИ ПРОЕКТА"}
              </button>

              <div className="flex-1 hidden md:block" />

              {table?.projectId ? (
                <a 
                  href={`/app/builder/${table.projectId}?forceUpload=1`} 
                  className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.2em] bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-500 rounded-2xl transition-all shadow-md flex items-center justify-center gap-4 active:scale-95"
                >
                  <UploadCloud className="h-5 w-5 opacity-40" />
                  КАЧИ НОВ ФАЙЛ
                </a>
              ) : null}

              <button 
                className="px-20 py-6 btn-blueprint text-base font-black min-w-[340px] flex items-center justify-center gap-4 rounded-2xl shadow-blueprint relative overflow-hidden group active:scale-95 transition-all" 
                onClick={() => setShowPreview(true)} 
                disabled={busy || !table || refreshBusy} 
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 pointer-events-none" />
                <Sparkles className="h-6 w-6 relative z-10" />
                <span className="relative z-10 uppercase tracking-[0.1em]">{busy ? "ГЕНЕРИРАНЕ..." : "ГЕНЕРИРАЙ ОФЕРТА →"}</span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="mt-40 flex flex-col items-center justify-center space-y-8 py-40 animate-enter">
          <div className="relative">
            <div className="h-20 w-20 border-[6px] border-slate-100 border-t-slate-900 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-slate-300 animate-pulse" />
            </div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="text-slate-900 text-sm font-black uppercase tracking-[0.4em] ml-2">Синхронизиране</div>
            <div className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Търсим най-добрите материали в Salex...</div>
          </div>
        </div>
      )}

      {showPreview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/40 backdrop-blur-3xl animate-enter p-4">
          <div className="bg-white max-w-xl w-full rounded-[2.5rem] p-10 shadow-[0_32px_128px_-16px_rgba(0,0,0,0.1)] border border-slate-100 relative">
            <button 
              onClick={() => setShowPreview(false)}
              className="absolute top-6 right-6 h-10 w-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">ПРЕГЛЕД НА СТОЙНОСТТА</h2>
            <p className="text-sm font-medium text-slate-500 mb-8">Преглед на финалната стойност преди създаване на линка за клиента</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Материали & Услуги</span>
                <span className="font-bold text-slate-900">{money(materialTotal)}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Труд / Монтаж</span>
                <span className="font-bold text-slate-900">{money(laborTotal + (Number(installationCost) || 0))}</span>
              </div>
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Транспорт & Други</span>
                <span className="font-bold text-slate-900">{money((Number(transportCost) || 0) + (Number(otherCost) || 0))}</span>
              </div>
              <div className="flex justify-between items-center bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <span className="text-xs font-black uppercase tracking-widest text-amber-900">Вашата надценка</span>
                <span className="font-bold text-amber-700">+{money(markupAmount)}</span>
              </div>
            </div>
            
            <div className="flex justify-between items-end border-t border-slate-100 pt-6 mb-10">
               <div>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">КРАЙНА СУМА</span><br/>
                 <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">ЗА КЛИЕНТА (С ДДС)</span>
               </div>
              <span className="text-4xl font-black text-slate-900 tracking-tighter">{money(grandTotal)}</span>
            </div>
            
            <button
              onClick={() => { setShowPreview(false); createOffer(); }}
              className="w-full py-6 btn-blueprint text-base font-black flex items-center justify-center gap-4 rounded-2xl shadow-blueprint active:scale-95 transition-all"
            >
              <Sparkles className="h-6 w-6" />
              <span>ГЕНЕРИРАЙ ОФЕРТА →</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
