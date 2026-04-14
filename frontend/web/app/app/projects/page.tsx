"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/lib/workspace-context";
import { motion } from "framer-motion";
import { staggerContainer, fadeUp } from "@/lib/animations";
import { StageBadge } from "@/components/ui/stage-badge";
import { Plus, Trash2, ArrowRight } from "lucide-react";

type Project = {
  id: string;
  name: string;
  clientName: string | null;
  workspaceName: string;
  stage?: string | null;
  createdAt: string;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [items, setItems] = React.useState<Project[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [deletingId, setDeletingId] = React.useState<string | null>(null);

  const { currentWorkspace } = useWorkspaces();

  React.useEffect(() => {
    async function load() {
      if (!currentWorkspace) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/projects?workspace_id=${currentWorkspace.id}`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { items: Project[] };
        setItems(data.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Неизвестна грешка");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentWorkspace]);

  async function deleteProject(projectId: string) {
    const ok1 = window.confirm("Сигурен ли си, че искаш да преместиш проекта в кошчето?");
    if (!ok1) return;
    const ok2 = window.confirm("Потвърди отново: проектът ще отиде в кошчето.");
    if (!ok2) return;
    setDeletingId(projectId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      setItems(prev => prev.filter(p => p.id !== projectId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестна грешка");
    } finally {
      setDeletingId(null);
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.4,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between gap-6 pb-6 border-b border-gray-200"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-light tracking-tight">Проекти</h1>
          <p className="text-sm text-gray-600">Управлявайте и организирайте всички ваши проекти</p>
        </div>
        <Link href="/app/projects/new">
          <button className="btn-acherno flex items-center gap-2">
            <Plus className="w-4 h-4" />
            НОВ ПРОЕКТ
          </button>
        </Link>
      </motion.div>

      {/* ERROR STATE */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 border border-red-200 bg-red-50 text-red-700 text-sm"
        >
          {error}
        </motion.div>
      )}

      {/* LOADING STATE */}
      {loading && (
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center py-12 text-gray-500 text-sm"
        >
          Зареждане на проектите...
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!loading && items.length === 0 && !error && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 space-y-6"
        >
          <div className="text-gray-400 text-sm uppercase tracking-wider">Няма проекти</div>
          <p className="text-gray-600 max-w-md mx-auto">Създайте първия си проект, за да започнете</p>
          <Link href="/app/projects/new">
            <button className="btn-acherno mx-auto">
              СЪЗДАЙ ПРОЕКТ
            </button>
          </Link>
        </motion.div>
      )}

      {/* PROJECTS GRID */}
      {!loading && items.length > 0 && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {items.map(p => (
            <motion.div
              key={p.id}
              variants={itemVariants}
              className="group"
            >
              <div 
                onClick={() => router.push(`/app/builder/${p.id}`)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    router.push(`/app/builder/${p.id}`);
                  }
                }}
                role="button"
                tabIndex={0}
                className="card-luxury p-8 cursor-pointer h-full flex flex-col justify-between"
              >
                {/* TOP SECTION */}
                <div className="space-y-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-light tracking-tight text-gray-900 mb-2">
                        {p.name}
                      </h3>
                      <div className="space-y-1">
                        <p className="text-xs text-gray-600 uppercase tracking-wider">
                          Клиент: <span className="font-medium">{p.clientName || "—"}</span>
                        </p>
                        <p className="text-xs text-gray-600 uppercase tracking-wider">
                          Пространство: <span className="font-medium">{p.workspaceName}</span>
                        </p>
                      </div>
                    </div>
                    <StageBadge stage={p.stage} />
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      Създаден: {new Date(p.createdAt).toLocaleString("bg-BG", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>

                {/* BOTTOM SECTION */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Отвори проекта
                  </span>
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </motion.div>
                </div>
              </div>

              {/* DELETE BUTTON - OVERLAY */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3"
              >
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    deleteProject(p.id);
                  }}
                  disabled={deletingId === p.id}
                  className="w-full py-2 px-4 text-xs font-semibold uppercase tracking-wider border border-red-200 text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  {deletingId === p.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-3 h-3 border border-red-700 border-t-transparent rounded-full"
                      />
                      Преместване...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Trash2 className="w-3 h-3" />
                      ПРЕМЕСТИ В КОШЧЕ
                    </span>
                  )}
                </button>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
