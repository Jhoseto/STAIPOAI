"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/lib/workspace-context";
import { motion, AnimatePresence } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/animations";

type TrashedProject = {
  id: string;
  name: string;
  clientName: string | null;
  workspaceName: string;
  createdAt: string;
  trashedAt?: string | null;
};

export default function TrashPage() {
  const [items, setItems] = React.useState<TrashedProject[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const { currentWorkspace } = useWorkspaces();

  async function loadTrash() {
    if (!currentWorkspace) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/trash?workspace_id=${currentWorkspace.id}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { items: TrashedProject[] };
      setItems(data.items || []);
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadTrash();
  }, [currentWorkspace]);


  const selectedIds = React.useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  async function restoreOne(projectId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/restore`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      setItems(prev => prev.filter(p => p.id !== projectId));
      setSelected(prev => ({ ...prev, [projectId]: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  async function permanentDeleteOne(projectId: string) {
    const ok1 = window.confirm("Сигурен ли си за крайно изтриване?");
    if (!ok1) return;
    const ok2 = window.confirm("Второ потвърждение: това действие е необратимо.");
    if (!ok2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}?permanent=1`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setItems(prev => prev.filter(p => p.id !== projectId));
      setSelected(prev => ({ ...prev, [projectId]: false }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  async function bulkAction(action: "restore" | "delete") {
    if (!selectedIds.length) return;
    if (action === "delete") {
      const ok1 = window.confirm(`Сигурен ли си за крайно изтриване на ${selectedIds.length} проекта?`);
      if (!ok1) return;
      const ok2 = window.confirm("Второ потвърждение: това действие е необратимо.");
      if (!ok2) return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/trash/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectIds: selectedIds, action }),
      });
      if (!res.ok) throw new Error(await res.text());
      await loadTrash();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  async function emptyTrash() {
    const ok1 = window.confirm("Сигурен ли си, че искаш да изпразниш цялото кошче?");
    if (!ok1) return;
    const ok2 = window.confirm("Второ потвърждение: всички проекти в кошчето ще се изтрият окончателно.");
    if (!ok2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/trash/empty", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      setItems([]);
      setSelected({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }

  const allSelected = items.length > 0 && selectedIds.length === items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">Кошче</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => bulkAction("restore")} disabled={busy || !selectedIds.length}>
            Възстанови избраните
          </Button>
          <Button variant="outline" onClick={() => bulkAction("delete")} disabled={busy || !selectedIds.length}>
            Изтрий избраните окончателно
          </Button>
          <Button variant="outline" onClick={emptyTrash} disabled={busy || !items.length}>
            Изпразни кошчето
          </Button>
        </div>
      </div>

      {error ? <div className="text-sm text-red-500">{error}</div> : null}
      {loading ? <div className="text-muted-foreground">Зареждане...</div> : null}

      {!loading ? (
        <div className="rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 text-sm text-muted-foreground">
            Проекти в кошчето: {items.length}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left w-10">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={e => {
                        const value = e.target.checked;
                        const next: Record<string, boolean> = {};
                        items.forEach(x => {
                          next[x.id] = value;
                        });
                        setSelected(next);
                      }}
                    />
                  </th>
                  <th className="px-3 py-2 text-left">Проект</th>
                  <th className="px-3 py-2 text-left">Клиент</th>
                  <th className="px-3 py-2 text-left">Изтрит на</th>
                  <th className="px-3 py-2 text-left">Действия</th>
                </tr>
              </thead>
              <motion.tbody
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <AnimatePresence mode="popLayout">
                  {items.map(item => (
                    <motion.tr 
                      key={item.id} 
                      variants={fadeUp}
                      layout
                      className="border-t border-border/40"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[item.id])}
                          onChange={e => setSelected(prev => ({ ...prev, [item.id]: e.target.checked }))}
                        />
                      </td>
                      <td className="px-3 py-2">{item.name}</td>
                      <td className="px-3 py-2">{item.clientName || "—"}</td>
                      <td className="px-3 py-2">{item.trashedAt ? new Date(item.trashedAt).toLocaleString("bg-BG") : "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => restoreOne(item.id)} disabled={busy}>
                            Възстанови
                          </Button>
                          <Button variant="outline" onClick={() => permanentDeleteOne(item.id)} disabled={busy}>
                            Крайно изтрий
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                  {!items.length && (
                    <motion.tr variants={fadeUp}>
                      <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                        Кошчето е празно.
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

