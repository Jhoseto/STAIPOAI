"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Database, Zap, RefreshCw, CheckCircle2, Image as ImageIcon, Search, ChevronLeft, ChevronRight, Download, Filter } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ScraperStatus = {
  is_running: boolean;
  current_category: string | null;
  run_id?: string | null;
  items_added: number;
  items_processed: number;
  categories_discovered: number;
  categories_processed: number;
  products_discovered_total: number;
  unique_products_total: number;
  pending_new?: number;
  pending_updated?: number;
  pending_missing?: number;
  last_item_name: string | null;
  started_at: string | null;
  finished_at: string | null;
  error_message?: string;
};

type ScrapeItem = {
  id: string;
  action: "insert" | "update" | "delete" | "existing";
  catalog_id: string | null;
  payload: any;
};

type SyncPreview = {
  ok: boolean;
  runId?: string;
  counts?: { new: number; updated: number; missing: number; unchanged: number };
  items?: ScrapeItem[];
};

export function ScraperTrigger() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ScraperStatus | null>(null);
  const [preview, setPreview] = useState<SyncPreview | null>(null);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [applying, setApplying] = useState(false);
  
  // Table state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterAction, setFilterAction] = useState<"all" | "existing" | "insert" | "update" | "delete">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedThickness, setSelectedThickness] = useState<string>("all");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({ key: 'name', direction: 'asc' });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Derive filter options from catalog
  const categories = useMemo(() => {
    const cats = [...new Set(catalog
      .map(item => item.category)
      .filter((cat): cat is string => Boolean(cat))
    )];
    return cats.sort();
  }, [catalog]);

  const brands = useMemo(() => {
    const brds = [...new Set(catalog
      .map(item => item.brand)
      .filter((br): br is string => Boolean(br))
    )];
    return brds.sort();
  }, [catalog]);

  const thicknesses = useMemo(() => {
    const thks = [...new Set(catalog
      .map(item => item.thicknessMm)
      .filter((t): t is number => typeof t === 'number')
    )];
    return thks.sort((a, b) => a - b).map(t => t.toString());
  }, [catalog]);

  const categoryProgressPct = status?.categories_discovered
    ? Math.min(100, Math.round((status.categories_processed / status.categories_discovered) * 100))
    : 0;

  // Load catalog on mount
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch("/api/catalog");
        if (res.ok) {
          const data = await res.json();
          setCatalog(data.items || []);
        }
      } catch (e) {
        console.error("Failed to load catalog", e);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Poll status while busy
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (busy) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/api/scrape/salex/status");
          if (res.ok) {
            const data = await res.json();
            setStatus(data);
            
            // Check if status in DB says it's failed (we don't have explicit status enum exported, but we can check error_message or if it stopped running but has an error)
            if (!data.is_running && busy) {
              setBusy(false);
              if (data.error_message) {
                toast.error("Грешка при синхронизация", { description: data.error_message });
              } else {
                toast.success("Синхронизацията завърши!");
              }
            }
            if (!data.is_running && data.run_id && !data.error_message) {
              const p = await fetch(`/api/scrape/salex/preview?run_id=${encodeURIComponent(data.run_id)}`);
              if (p.ok) {
                setPreview(await p.json());
              }
            }
          }
        } catch (e) {
          console.error("Polling error:", e);
        }
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [busy]);

  async function runScraper() {
    console.log("Starting scraper sync...");
    setBusy(true);
    setStatus(null);
    setPreview(null);
    try {
      const res = await fetch("/api/scrape/salex/run", { method: "POST" });
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }
      toast.info("Стартиране на процеса...");
    } catch (e) {
      setBusy(false);
      toast.error("Грешка при стартиране", {
        description: e instanceof Error ? e.message : "Неизвестна грешка"
      });
    }
  }

  async function applyChanges(opts: { applyNew: boolean; applyUpdated: boolean; deleteMissing: boolean; clearAfter?: boolean }) {
    if (!status?.run_id) return;
    setApplying(true);
    try {
      const res = await fetch("/api/scrape/salex/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: status.run_id,
          selectedIds: selectedIds.size > 0 ? Array.from(selectedIds) : null, // null means apply all requested
          clearAfter: Boolean(opts.clearAfter),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(JSON.stringify(data));
      toast.success(`Приложено: +${data.inserted} / обновени ${data.updated} / изтрити ${data.deleted}`);
      
      // Refresh catalog after apply
      const c = await fetch("/api/catalog");
      if (c.ok) setCatalog((await c.json()).items || []);

      if (opts.clearAfter) {
        setPreview(null);
        setSelectedIds(new Set());
      } else {
        const p = await fetch(`/api/scrape/salex/preview?run_id=${encodeURIComponent(status.run_id)}`);
        if (p.ok) setPreview(await p.json());
      }
    } catch (e) {
      toast.error("Грешка при прилагане", { description: e instanceof Error ? e.message : "Неизвестна грешка" });
    } finally {
      setApplying(false);
    }
  }

  async function applySelected() {
    if (!status?.run_id || selectedIds.size === 0) return;
    setApplying(true);
    try {
      const res = await fetch("/api/scrape/salex/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          runId: status.run_id,
          selectedIds: Array.from(selectedIds),
          clearAfter: false,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(JSON.stringify(data));
      toast.success(`Успешно обработени ${selectedIds.size} записа: +${data.inserted} / обновени ${data.updated} / изтрити ${data.deleted}`);
      
      // Refresh catalog after apply
      const c = await fetch("/api/catalog");
      if (c.ok) setCatalog((await c.json()).items || []);

      // Refresh preview to remove applied items
      const p = await fetch(`/api/scrape/salex/preview?run_id=${encodeURIComponent(status.run_id)}`);
      if (p.ok) setPreview(await p.json());
      setSelectedIds(new Set());
    } catch (e) {
      toast.error("Грешка при прилагане", { description: e instanceof Error ? e.message : "Неизвестна грешка" });
    } finally {
      setApplying(false);
    }
  }

  async function commitAll() {
    if (!status?.run_id) return;
    setApplying(true);
    try {
      const res = await fetch("/api/scrape/salex/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId: status.run_id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(JSON.stringify(data));
      toast.success("Всички промени са приложени и списъкът е изчистен.");
      
      // Refresh catalog after apply
      const c = await fetch("/api/catalog");
      if (c.ok) setCatalog((await c.json()).items || []);

      setPreview(null);
      setSelectedIds(new Set());
    } catch (e) {
      toast.error("Грешка при запис", { description: e instanceof Error ? e.message : "Неизвестна грешка" });
    } finally {
      setApplying(false);
    }
  }

  // Merge catalog with preview
  const mergedItems = useMemo(() => {
    const list: ScrapeItem[] = [];
    
    // Create a map of catalog items
    const catalogMap = new Map(catalog.map(c => [c.id, c]));
    
    // Add preview items (these override or delete catalog items)
    const previewIds = new Set<string>();
    
    if (preview?.items) {
      for (const pi of preview.items) {
        // If it's an update or delete, we track the catalog_id to avoid duplicates
        const refId = pi.catalog_id || pi.id;
        previewIds.add(refId);
        list.push(pi);
      }
    }
    
    // Add existing catalog items that are not modified/deleted by the preview
    for (const cat of catalog) {
      if (!previewIds.has(cat.id)) {
        list.push({
          id: cat.id,
          action: "existing",
          catalog_id: cat.id,
          payload: cat
        } as any);
      }
    }
    
    return list;
  }, [catalog, preview]);

  const sortedAndFilteredItems = useMemo(() => {
    let result = mergedItems.filter(item => {
      // 1. Action Filter (Tabs)
      if (filterAction !== "all" && item.action !== filterAction) return false;
      
      // 2. Category Filter
      if (selectedCategory !== "all" && item.payload.category !== selectedCategory) return false;
      
      // 3. Brand Filter
      if (selectedBrand !== "all" && item.payload.brand !== selectedBrand) return false;
      
      // 4. Thickness Filter
      if (selectedThickness !== "all" && item.payload.thicknessMm?.toString() !== selectedThickness) return false;
      
      // 5. Price Range Filter
      if (minPrice && (item.payload.priceEur || 0) < parseFloat(minPrice)) return false;
      if (maxPrice && (item.payload.priceEur || 0) > parseFloat(maxPrice)) return false;
      
      // 6. Image Toggle
      if (onlyWithImages && !item.payload.imageUrl) return false;

      // 7. Search Query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const n = (item.payload.name || "").toLowerCase();
        const c = (item.payload.code || "").toLowerCase();
        if (!n.includes(q) && !c.includes(q)) return false;
      }
      return true;
    });

    // 8. Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = "";
        let bValue: any = "";

        switch (sortConfig.key) {
          case 'name':
            aValue = a.payload.name || "";
            bValue = b.payload.name || "";
            break;
          case 'code':
            aValue = a.payload.code || "";
            bValue = b.payload.code || "";
            break;
          case 'category':
            aValue = a.payload.category || "";
            bValue = b.payload.category || "";
            break;
          case 'price':
            aValue = a.payload.priceEur || 0;
            bValue = b.payload.priceEur || 0;
            break;
          case 'brand':
            aValue = a.payload.brand || "";
            bValue = b.payload.brand || "";
            break;
          case 'status':
            aValue = a.action || "";
            bValue = b.action || "";
            break;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [mergedItems, filterAction, searchQuery, sortConfig, selectedCategory, selectedBrand, selectedThickness, minPrice, maxPrice, onlyWithImages]);

  // Pagination logic
  const totalPages = Math.ceil(sortedAndFilteredItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedAndFilteredItems.slice(start, start + itemsPerPage);
  }, [sortedAndFilteredItems, currentPage, itemsPerPage]);

  // Scroll to top of table when page changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tableElement = document.getElementById("catalog-table-container");
      if (tableElement) {
        tableElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterAction, searchQuery, selectedCategory, selectedBrand, selectedThickness, minPrice, maxPrice, onlyWithImages, itemsPerPage]);

  const exportToCSV = () => {
    const headers = ["#,Име,Код,Категория,Дебелина,Цена (EUR),Марка,Статус,URL"];
    const rows = sortedAndFilteredItems.map((item, idx) => [
      idx + 1,
      `"${item.payload.name?.replace(/"/g, '""')}"`,
      `"${item.payload.code}"`,
      `"${item.payload.category}"`,
      item.payload.thicknessMm || "",
      item.payload.priceEur || "",
      `"${item.payload.brand}"`,
      item.action,
      item.payload.sourceUrl || ""
    ].join(","));
    
    const csvContent = "\uFEFF" + headers.concat(rows).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `staipo_catalog_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (current?.key === key) {
        return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => {
    // Only allow selecting items that are actually changes (not existing)
    const selectable = sortedAndFilteredItems.filter(i => i.action !== "existing");
    if (selectable.length === 0) return;

    // Check if all selectable are already selected
    const allSelected = selectable.every(i => selectedIds.has(i.id));

    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectable.map(i => i.id)));
    }
  };

  const resetFilters = () => {
    setFilterAction("all");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setSelectedThickness("all");
    setMinPrice("");
    setMaxPrice("");
    setOnlyWithImages(false);
    setSearchQuery("");
  };

  return (
    <div className="mt-8 pt-8 border-t border-border/40 w-full">
      <div className="flex flex-col gap-8 w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-primary text-xs font-medium uppercase tracking-widest">
              <Database className="w-3 h-3" />
              <span>Каталог & Цени</span>
            </div>
            <h3 className="text-xl font-semibold">Синхронизация със Salex</h3>
            <p className="text-sm text-muted-foreground font-light max-w-md">
              Обновете каталога в базата данни с актуални цени и наличности директно от Salex.bg. Процесът отнема няколко минути.
            </p>
          </div>
          
          <Button 
            onClick={runScraper} 
            disabled={busy} 
            className="btn-premium gap-2 px-8 h-12 min-w-[200px]"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            {busy ? "Синхронизиране..." : "Стартирай актуализация"}
          </Button>
        </div>

        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass-premium rounded-xl p-6 border border-primary/20 bg-primary/5">
                <div className="flex flex-col gap-4">
                  {/* Status Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {status.is_running ? (
                        <div className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                        </div>
                      ) : (
                        status.error_message ? 
                          <span className="text-red-500 font-bold px-2">X</span> :
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                      )}
                      <span className="font-medium text-sm">
                        {status.is_running ? `В момента: ${status.current_category || "Инициализация"}` : 
                         status.error_message ? "Грешка при синхронизация" : "Последна синхронизация завършена"}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {status.items_processed} артикула проверени · {status.categories_processed}/{status.categories_discovered || "?"} категории
                    </div>
                  </div>

                  {status.is_running && (
                    <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-primary rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${categoryProgressPct}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!status?.is_running && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-4 w-full"
            >
              <div className="flex flex-col gap-4 glass-premium rounded-xl p-4 border border-border/50">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button 
                      variant={filterAction === "all" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setFilterAction("all")}
                    >
                      Всички ({mergedItems.length})
                    </Button>
                    <Button 
                      variant={filterAction === "existing" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setFilterAction("existing")}
                      className="text-muted-foreground"
                    >
                      Текущи
                    </Button>
                    <Button 
                      variant={filterAction === "insert" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setFilterAction("insert")}
                      className="text-emerald-500 hover:text-emerald-600 border-emerald-500/20"
                    >
                      Нови ({preview?.counts?.new || 0})
                    </Button>
                    <Button 
                      variant={filterAction === "update" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setFilterAction("update")}
                      className="text-amber-500 hover:text-amber-600 border-amber-500/20"
                    >
                      Променени ({preview?.counts?.updated || 0})
                    </Button>
                    <Button 
                      variant={filterAction === "delete" ? "default" : "outline"} 
                      size="sm" 
                      onClick={() => setFilterAction("delete")}
                      className="text-rose-500 hover:text-rose-600 border-rose-500/20"
                    >
                      Липсващи ({preview?.counts?.missing || 0})
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={exportToCSV} className="gap-2">
                      <Download className="w-4 h-4" />
                      Експорт (CSV)
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 items-end">
                  <div className="space-y-1.5 h-full">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Категория</label>
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring outline-none"
                    >
                      <option value="all">Всички категории</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 h-full">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Марка</label>
                    <select 
                      value={selectedBrand}
                      onChange={(e) => setSelectedBrand(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring outline-none"
                    >
                      <option value="all">Всички марки</option>
                      {brands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 h-full">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Дебелина</label>
                    <select 
                      value={selectedThickness}
                      onChange={(e) => setSelectedThickness(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring outline-none"
                    >
                      <option value="all">Всички дебелини</option>
                      {thicknesses.map(t => (
                        <option key={t} value={t}>{t} мм</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5 h-full">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Цена (€)</label>
                    <div className="flex items-center gap-1">
                      <input 
                        type="number" 
                        placeholder="От" 
                        className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                      />
                      <input 
                        type="number" 
                        placeholder="До" 
                        className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 h-full lg:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-muted-foreground ml-1">Търсене</label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Търсене по код или име..."
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors pl-9 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="only-images" 
                        checked={onlyWithImages} 
                        onCheckedChange={(checked) => setOnlyWithImages(!!checked)} 
                      />
                      <label htmlFor="only-images" className="text-xs cursor-pointer select-none">Само със снимки</label>
                    </div>
                  </div>

                  {(filterAction !== "all" || selectedCategory !== "all" || selectedBrand !== "all" || selectedThickness !== "all" || minPrice !== "" || maxPrice !== "" || searchQuery !== "" || onlyWithImages) && (
                    <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-muted-foreground hover:text-foreground underline h-auto p-0">
                      Изчисти всички филтри
                    </Button>
                  )}
                </div>
              </div>

              {/* ACTION BAR (Only show if there is a preview) */}
              <AnimatePresence>
                {preview && preview.items && preview.items.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-muted/30 border border-border/40 overflow-hidden"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox 
                        checked={selectedIds.size > 0}
                        onCheckedChange={selectAllFiltered}
                        id="select-all"
                      />
                      <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">
                        {selectedIds.size > 0 ? `Избрани ${selectedIds.size} промени` : "Избери всички промени"}
                      </label>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={applySelected}
                        disabled={applying || selectedIds.size === 0}
                        size="sm"
                      >
                        Приложи избраните ({selectedIds.size})
                      </Button>
                      <Button
                        variant="default"
                        className="bg-primary text-primary-foreground"
                        onClick={commitAll}
                        disabled={applying}
                        size="sm"
                      >
                        Приложи ВСИЧКИ промени
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div id="catalog-table-container" className="rounded-xl border border-border/50 bg-background overflow-hidden w-full relative min-h-[400px]">
                {loadingCatalog && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary" />
                  </div>
                )}
                <div className="overflow-x-auto w-full max-h-[800px]">
                  <table className="w-full text-sm text-left relative border-collapse">
                    <thead className="text-xs uppercase bg-slate-100 dark:bg-slate-800 border-b border-border/50 sticky top-0 z-20">
                      <tr>
                        <th className="px-4 py-3 w-10 text-center">
                          {preview && preview.items && preview.items.length > 0 && (
                            <Checkbox 
                              checked={selectedIds.size > 0}
                              onCheckedChange={selectAllFiltered}
                            />
                          )}
                        </th>
                        <th className="px-2 py-3 w-12 text-center text-muted-foreground font-mono">#</th>
                        <th className="px-4 py-3 w-16 text-center">Снимка</th>
                        <th className="px-4 py-3 min-w-[250px] cursor-pointer hover:bg-muted/80" onClick={() => handleSort('name')}>
                          Име на артикул {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 w-32 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('code')}>
                          Код {sortConfig?.key === 'code' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 w-32 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('category')}>
                          Категория {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 w-24 text-center">Дебелина</th>
                        <th className="px-4 py-3 w-32 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('price')}>
                          Цена (EUR) {sortConfig?.key === 'price' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 w-32 cursor-pointer hover:bg-muted/80" onClick={() => handleSort('brand')}>
                          Марка {sortConfig?.key === 'brand' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 w-16 text-center">Линк</th>
                        <th className="px-4 py-3 w-32 text-center cursor-pointer hover:bg-muted/80" onClick={() => handleSort('status')}>
                          Статус {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedItems.length === 0 && !loadingCatalog ? (
                        <tr>
                          <td colSpan={11} className="px-4 py-16 text-center text-muted-foreground">
                            Няма намерени артикули.
                          </td>
                        </tr>
                      ) : (
                        paginatedItems.map((item, localIdx) => {
                          const idx = (currentPage - 1) * itemsPerPage + localIdx;
                          const isChange = item.action !== "existing";
                          const isSelected = selectedIds.has(item.id);
                          
                          return (
                            <tr 
                              key={item.id} 
                              className={`border-b border-border/10 hover:bg-muted/30 transition-colors ${isSelected ? 'bg-primary/5' : ''} ${!isChange ? 'opacity-80' : ''}`}
                              onClick={() => {
                                if (isChange) toggleSelection(item.id);
                              }}
                            >
                              <td className="px-4 py-3 text-center" onClick={e => {
                                if (isChange) e.stopPropagation();
                              }}>
                                {isChange && (
                                  <Checkbox 
                                    checked={isSelected}
                                    onCheckedChange={() => toggleSelection(item.id)}
                                  />
                                )}
                              </td>
                              <td className="px-2 py-3 text-center text-muted-foreground font-mono text-[10px]">
                                {idx + 1}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.payload.imageUrl ? (
                                  <div className="w-10 h-10 rounded overflow-hidden border border-border/50 mx-auto bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={item.payload.imageUrl} alt={item.payload.code} className="w-full h-full object-contain" loading="lazy" />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                    <ImageIcon className="w-4 h-4" />
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 font-medium">
                                <div className="line-clamp-2" title={item.payload.name}>
                                  {item.payload.name}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {item.payload.code || "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {item.payload.category || "—"}
                              </td>
                              <td className="px-4 py-3 text-xs text-center text-muted-foreground">
                                {item.payload.thicknessMm ? `${item.payload.thicknessMm} мм` : "—"}
                              </td>
                              <td className="px-4 py-3 font-semibold">
                                {item.payload.priceEur ? `${item.payload.priceEur.toFixed(2)}` : "—"}
                                <span className="text-xs text-muted-foreground font-normal ml-1">{item.payload.unit}</span>
                              </td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">
                                {item.payload.brand || "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.payload.sourceUrl ? (
                                  <a href={item.payload.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs" onClick={e => e.stopPropagation()}>
                                    Salex ↗
                                  </a>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-center">
                                {item.action === "existing" && (
                                  <span className="inline-flex items-center text-xs text-muted-foreground">
                                    Активен
                                  </span>
                                )}
                                {item.action === "insert" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                    Нов
                                  </span>
                                )}
                                {item.action === "update" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                    Променен
                                  </span>
                                )}
                                {item.action === "delete" && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-rose-500/10 text-rose-500 border border-rose-500/20">
                                    Липсващ
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PAGINATION BAR */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 glass-premium rounded-xl border border-border/50">
                <div className="text-sm text-muted-foreground">
                  Показани <strong>{sortedAndFilteredItems.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(sortedAndFilteredItems.length, currentPage * itemsPerPage)}</strong> от <strong>{sortedAndFilteredItems.length}</strong> артикула
                </div>
                
                <div className="flex flex-wrap items-center gap-4 sm:gap-6 justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Покажи:</span>
                    <select 
                      value={itemsPerPage} 
                      onChange={(e) => setItemsPerPage(parseInt(e.target.value))}
                      className="h-10 rounded border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring cursor-pointer hover:bg-muted/50"
                    >
                      {[25, 50, 100, 200, 500, 1000].map(val => (
                        <option key={val} value={val}>{val}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      title="Първа страница"
                    >
                      <ChevronLeft className="w-4 h-4 mr-[-4px]" /><ChevronLeft className="w-4 h-4 ml-[-4px]" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    
                    <div className="flex items-center px-4 py-1 rounded-md bg-muted/50 text-sm font-medium">
                      Страница {currentPage} от {totalPages || 1}
                    </div>

                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="h-8 w-8" 
                      disabled={currentPage === totalPages || totalPages === 0}
                      onClick={() => setCurrentPage(totalPages)}
                      title="Последна страница"
                    >
                      <ChevronRight className="w-4 h-4 mr-[-4px]" /><ChevronRight className="w-4 h-4 ml-[-4px]" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
