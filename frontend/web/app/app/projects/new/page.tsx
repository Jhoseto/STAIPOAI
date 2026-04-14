"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { aiFetch } from "@/lib/api";
import { useWorkspaces } from "@/lib/workspace-context";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { scaleIn } from "@/lib/animations";

type Client = {
  id: string;
  name: string;
};

export default function NewProjectPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaces();
  const [name, setName] = React.useState("");
  const [selectedClientId, setSelectedClientId] = React.useState<string>("");
  const [clients, setClients] = React.useState<Client[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [loadingClients, setLoadingClients] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isNewClient, setIsNewClient] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState("");

  React.useEffect(() => {
    async function fetchClients() {
      if (!currentWorkspace) return;
      try {
        const res = await aiFetch<{ items: Client[] }>(`/v1/clients?workspace_id=${currentWorkspace.id}`);
        setClients(res.items);
      } catch (err) {
        console.error("Failed to fetch clients", err);
      } finally {
        setLoadingClients(false);
      }
    }
    fetchClients();
  }, [currentWorkspace]);

  const projectName = name.trim();
  const canCreate = projectName.length > 0 && !busy && !!currentWorkspace && (!isNewClient || newClientName.trim().length > 0);

  async function createProject() {
    if (!projectName || !currentWorkspace) {
      setError("Името на проекта и работната среда са задължителни.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let clientId = selectedClientId || null;
      let clientName = clients.find(c => c.id === selectedClientId)?.name || "Неизвестен";

      if (isNewClient && newClientName.trim()) {
        const newClient = await aiFetch<{ id: string }>(`/v1/clients`, {
          method: "POST",
          body: JSON.stringify({
            workspaceId: currentWorkspace.id,
            name: newClientName.trim(),
          }),
        });
        clientId = newClient.id;
        clientName = newClientName.trim();
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: projectName,
          clientName: clientName,
          workspaceName: currentWorkspace.name,
          workspaceId: currentWorkspace.id,
          clientId: clientId,
          userId: session?.user?.id || null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      router.push(`/app/builder/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setBusy(false);
    }
  }


  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      className="max-w-2xl"
    >
      <div className="space-y-10">
        <div className="pb-6 border-b border-gray-200">
          <div className="line-divider" />
          <span className="text-small">Създаване</span>
          <h1 className="text-4xl font-light tracking-tight mt-4">Нов Проект</h1>
          <p className="text-sm text-gray-600 mt-2">Създай проект и продължи към импорт на PRO100.</p>
        </div>
        <div className="card-luxury p-8">
          <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Име на Проекта</label>
          <input
            className="w-full bg-white border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
            placeholder="Име на проект"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">Клиент</label>
            <select
              className="w-full bg-white border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
              value={isNewClient ? "NEW" : selectedClientId}
              onChange={e => {
                if (e.target.value === "NEW") {
                  setIsNewClient(true);
                  setSelectedClientId("");
                } else {
                  setIsNewClient(false);
                  setSelectedClientId(e.target.value);
                }
              }}
            >
              <option value="">Избери съществуващ клиент (незадължително)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="NEW" className="font-semibold text-primary">+ Добави нов клиент...</option>
            </select>

            {isNewClient && (
              <motion.input
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full bg-white border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                placeholder="Име на нов клиент"
                value={newClientName}
                onChange={e => setNewClientName(e.target.value)}
                required
              />
            )}
          </div>

          {error ? <div className="text-sm text-red-600">{error}</div> : null}
          <button className="btn-acherno disabled:opacity-50" onClick={createProject} disabled={!canCreate} type="button">
            {busy ? "СЪЗДАВАНЕ..." : "СЪЗДАЙ И ПРОДЪЛЖИ"}
          </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
