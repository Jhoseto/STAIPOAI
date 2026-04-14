"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Mail, Phone, X, Search, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { aiFetch } from "@/lib/api";
import { useWorkspaces } from "@/lib/workspace-context";
import { cn } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
};

export default function ClientsPage() {
  const { currentWorkspace } = useWorkspaces();
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    notes: "",
  });

  const fetchClients = async () => {
    if (!currentWorkspace) return;
    setIsLoading(true);
    try {
      const res = await aiFetch<{ items: Client[] }>(`/v1/clients?workspace_id=${currentWorkspace.id}`);
      setClients(res.items);
    } catch (error) {
      console.error("Failed to fetch clients:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentWorkspace]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;
    try {
      await aiFetch("/v1/clients", {
        method: "POST",
        body: JSON.stringify({
          workspaceId: currentWorkspace.id,
          name: formData.name,
          contactEmail: formData.email,
          contactPhone: formData.phone,
          notes: formData.notes,
        }),
      });
      setIsAdding(false);
      setFormData({ name: "", email: "", phone: "", notes: "" });
      fetchClients();
    } catch (error) {
      console.error("Failed to create client:", error);
    }
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <h1 className="text-4xl font-light tracking-tight">Клиенти</h1>
          <p className="text-sm text-gray-600">Управлявайте контактите и историята на вашите проекти</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="btn-acherno flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          НОВ КЛИЕНТ
        </button>
      </motion.div>

      {/* SEARCH BAR */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="relative max-w-sm"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input 
          type="text"
          placeholder="Търсене на клиент..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-gray-400 transition-colors"
        />
      </motion.div>

      {/* LOADING STATE */}
      {isLoading && (
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-center py-12 text-gray-500 text-sm"
        >
          Зареждане на клиентите...
        </motion.div>
      )}

      {/* EMPTY STATE */}
      {!isLoading && filteredClients.length === 0 && !searchTerm && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 space-y-6 border border-dashed border-gray-200 rounded p-12"
        >
          <Users className="w-12 h-12 text-gray-300 mx-auto" />
          <div className="text-gray-500 text-sm">
            <p className="mb-2">Все още нямате добавени клиенти</p>
            <p className="text-xs text-gray-400">Създайте първия си клиент, за да започнете</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="btn-acherno mx-auto"
          >
            ДОБАВИ КЛИЕНТ
          </button>
        </motion.div>
      )}

      {/* NO SEARCH RESULTS */}
      {!isLoading && filteredClients.length === 0 && searchTerm && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 text-gray-500 text-sm"
        >
          Няма намерени клиенти за "{searchTerm}"
        </motion.div>
      )}

      {/* CLIENT CARDS GRID */}
      {!isLoading && filteredClients.length > 0 && (
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          <AnimatePresence mode="popLayout">
            {filteredClients.map((client) => (
              <motion.div
                key={client.id}
                layout
                variants={itemVariants}
                className="group"
              >
                <div className="card-luxury p-8 h-full flex flex-col justify-between">
                  {/* TOP SECTION */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-light tracking-tight text-gray-900 mb-3">
                        {client.name}
                      </h3>
                      <div className="space-y-2">
                        {client.contactEmail && (
                          <div className="flex items-center gap-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                            <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="break-all">{client.contactEmail}</span>
                          </div>
                        )}
                        {client.contactPhone && (
                          <div className="flex items-center gap-3 text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                            <Phone className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span>{client.contactPhone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {client.notes && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-600 line-clamp-3 italic">
                          "{client.notes}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* BOTTOM SECTION */}
                  <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                      Преглед
                    </span>
                    <motion.div
                      animate={{ x: [0, 3, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ADD CLIENT MODAL */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-white/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white border border-gray-200 rounded p-8 space-y-8 shadow-lg"
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setIsAdding(false)}
                className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>

              {/* HEADER */}
              <div className="space-y-2">
                <h2 className="text-2xl font-light tracking-tight">Нов Клиент</h2>
                <p className="text-sm text-gray-600">
                  Добавете информация за нов клиент
                </p>
              </div>

              {/* FORM */}
              <form onSubmit={handleCreate} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Име / Фирма
                  </label>
                  <input 
                    required
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded py-2.5 px-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Имейл
                    </label>
                    <input 
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded py-2 px-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                      Телефон
                    </label>
                    <input 
                      type="text"
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-white border border-gray-200 rounded py-2 px-3 text-sm focus:outline-none focus:border-gray-400 transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                    Бележки
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    className="w-full bg-white border border-gray-200 rounded py-2 px-3 text-sm focus:outline-none focus:border-gray-400 transition-colors resize-none"
                  />
                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
                  <button 
                    type="button" 
                    onClick={() => setIsAdding(false)}
                    className="px-6 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors rounded"
                  >
                    Отказ
                  </button>
                  <button 
                    type="submit"
                    className="btn-acherno"
                  >
                    ЗАПАЗИ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
