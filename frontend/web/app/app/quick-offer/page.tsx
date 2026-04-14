"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useWorkspaces } from "@/lib/workspace-context";
import { Loader2, Plus, Zap, ArrowRight, Trash2 } from "lucide-react";

type QuickItem = {
  id: string;
  material: string;
  code: string;
  qty: number;
  unit: string;
  priceEur: number;
};

export default function QuickOfferPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaces();
  const [items, setItems] = React.useState<QuickItem[]>([
    { id: "1", material: "", code: "", qty: 1, unit: "бр", priceEur: 0 }
  ]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function addItem() {
    setItems(prev => [...prev, { id: Math.random().toString(), material: "", code: "", qty: 1, unit: "бр", priceEur: 0 }]);
  }

  function updateItem(id: string, field: keyof QuickItem, value: any) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id));
  }

  async function createOffer() {
    if (!currentWorkspace) return;
    setBusy(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const userId = data.session?.user?.id;
      if (!userId) throw new Error("Не си влязъл в профила си");

      const validItems = items.filter(i => i.material.trim() !== "");
      if (validItems.length === 0) throw new Error("Добави поне един валиден материал");

      const res = await fetch("/api/quick-offer/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          workspaceId: currentWorkspace.id,
          items: validItems.map(i => ({
            material: i.material,
            code: i.code || null,
            qty: Number(i.qty) || 0,
            unit: i.unit,
            priceEur: Number(i.priceEur) || 0
          }))
        })
      });

      if (!res.ok) throw new Error(await res.text());
      const resData = await res.json();
      router.push(`/app/pricing/${resData.uploadId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при създаване");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-[1000px] space-y-6">
      <div className="pb-6 border-b border-gray-200 animate-enter">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-4">
            <div className="line-divider" />
            <span className="text-small flex items-center gap-2">
              <Zap className="h-3 w-3" /> Бърза Оферта
            </span>
            <h1 className="text-4xl font-light tracking-tight">Ръчно Въвеждане</h1>
            <p className="text-sm text-gray-600">
              Създай оферта без PRO100 като въведеш материалите ръчно. След това ще бъдеш пренасочен към Калкулатора.
            </p>
          </div>
          <button
            onClick={createOffer}
            disabled={busy || !currentWorkspace}
            className="btn-acherno flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "КЪМ СТОЙНОСТТА"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="card-luxury p-8">
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 text-xs font-semibold uppercase tracking-wider text-gray-500 pb-2 border-b border-gray-200 px-2">
            <div className="col-span-4">Материал / Артикул</div>
            <div className="col-span-2">Код (опц.)</div>
            <div className="col-span-2">К-во</div>
            <div className="col-span-1">Мярка</div>
            <div className="col-span-2">Ед. Цена (€)</div>
            <div className="col-span-1 text-right"></div>
          </div>

          {items.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-3 items-center bg-gray-50 p-2 border border-gray-200 hover:bg-gray-100 transition-colors">
              <div className="col-span-4">
                <input
                  autoFocus
                  placeholder="Напр. ПДЧ Бяло 18мм"
                  value={item.material}
                  onChange={e => updateItem(item.id, "material", e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  placeholder="W980"
                  value={item.code}
                  onChange={e => updateItem(item.id, "code", e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="10"
                  value={item.qty || ""}
                  onChange={e => updateItem(item.id, "qty", e.target.value)}
                  className="w-full bg-white border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
              </div>
              <div className="col-span-1">
                 <select
                  value={item.unit}
                  onChange={e => updateItem(item.id, "unit", e.target.value)}
                  className="w-full bg-white border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:border-gray-400 appearance-none"
                 >
                   <option value="бр">бр</option>
                   <option value="м²">м²</option>
                   <option value="м">м</option>
                 </select>
              </div>
              <div className="col-span-2 relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="12.50"
                  value={item.priceEur || ""}
                  onChange={e => updateItem(item.id, "priceEur", e.target.value)}
                  className="w-full bg-white border border-gray-200 pl-3 pr-7 py-1.5 text-sm focus:outline-none focus:border-gray-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs pointer-events-none">€</span>
              </div>
              <div className="col-span-1 text-right">
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Изтрий ред"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2">
            <button
              onClick={addItem}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors px-2 py-1 uppercase tracking-wider"
            >
              <Plus className="h-4 w-4" /> Добави ред
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
