"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle2, CopyPlus } from "lucide-react";

export function OfferActions({ slug }: { slug: string }) {
  const [busy, setBusy] = React.useState(false);
  const [approving, setApproving] = React.useState(false);

  async function approveOffer() {
    setApproving(true);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(slug)}/master-approve`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Офертата е одобрена от майстора.");
    } catch (e) {
      toast.error("Одобрение: грешка", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setApproving(false);
    }
  }

  async function createVersion() {
    const ok = window.confirm("Ще бъде създадено ново копие на офертата. Сигурни ли сте?");
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(slug)}/revise`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      toast.success(`Версия ${data.version} е създадена.`);
      window.location.href = `/offer/${data.slug}`;
    } catch (e) {
      toast.error("Версия: грешка", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
      setBusy(false);
    }
  }

  async function downloadPdf() {
    setBusy(true);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(slug)}/pdf`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `offer-${slug}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF офертата е изтеглена.");
    } catch (e) {
      toast.error("PDF: грешка", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  async function downloadSalexCsv() {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/offers/${encodeURIComponent(slug)}/salex-order`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { filename: string; content: string };
      const blob = new Blob([data.content], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename || `salex-order-${slug}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Експортът е готов.");
    } catch (e) {
      toast.error("Експорт: грешка", {
        description: e instanceof Error ? e.message : "Неизвестна грешка",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-3 mt-4 justify-center md:justify-start">
      <Button className="btn-premium bg-emerald-600 hover:bg-emerald-500 text-white gap-2" onClick={approveOffer} disabled={approving}>
        <CheckCircle2 className="w-4 h-4" />
        {approving ? "Одобряване..." : "Потвърди (За Майстор)"}
      </Button>
      <Button
        className="btn-premium gap-2"
        variant="outline"
        onClick={downloadPdf}
        disabled={busy}
      >
        <FileText className="w-4 h-4" />
        PDF Оферта
      </Button>
      <Button
        className="btn-premium gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
        variant="outline"
        onClick={createVersion}
        disabled={busy}
      >
        <CopyPlus className="w-4 h-4" />
        Изготви Нова Версия
      </Button>
      <Button
        className="btn-premium gap-2"
        variant="outline"

        onClick={downloadSalexCsv}
        disabled={busy}
      >
        <Download className="w-4 h-4" />
        Експорт за Salex (CSV)
      </Button>
    </div>
  );
}

