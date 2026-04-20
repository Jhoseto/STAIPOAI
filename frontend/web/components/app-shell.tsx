"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Compass,
  House,
  FolderKanban,
  Upload,
  Settings,
  Sparkles,
  LayoutDashboard,
  Trash2,
  LogOut,
  Users,
  UserCircle,
  Zap,
  Box,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/lib/workspace-context";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { aiFetch } from "@/lib/api";

type UserInfo = {
  fullName: string | null;
  email: string | null;
  avatarUrl: string | null;
};

// Private groups for logged-in users
const privateGroups = [
  {
    id: "main",
    label: "Управление",
    icon: LayoutDashboard,
    items: [
      { href: "/app", label: "Табло", icon: House },
      { href: "/app/projects", label: "Проекти", icon: FolderKanban },
      { href: "/app/quick-offer", label: "Бърза Оферта", icon: Zap },
    ],
  },
  {
    id: "cad",
    label: "Проектиране",
    icon: Compass,
    items: [
      { href: "/kitchen-designer", label: "Kitchen Designer", icon: Box },
    ],
  },
  {
    id: "business",
    label: "Бизнес",
    icon: Users,
    items: [
      { href: "/app/clients", label: "Клиенти", icon: Users },
    ],
  },
];

// Public groups for guests
const publicGroups = [
  {
    id: "landing",
    label: "STAIPO AI",
    icon: Sparkles,
    items: [
      { href: "/", label: "Начало", icon: House },
      { href: "/#features", label: "Функции", icon: Zap },
      { href: "/#workflow", label: "Как работи", icon: Compass },
    ],
  },
  {
      id: "auth",
      label: "Достъп",
      icon: UserCircle,
      items: [
          { href: "/login", label: "Вход в системата", icon: LogOut }
      ]
  }
];

// import { BarChart3 } from "lucide-react";

function getAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("googleusercontent.com")) url.searchParams.set("sz", "256");
    return url.toString();
  } catch {
    return raw;
  }
}

function initials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    const chunks = name.trim().split(/\s+/).filter(Boolean);
    return chunks.slice(0, 2).map(x => x[0]?.toUpperCase() ?? "").join("") || "S";
  }
  return email?.[0]?.toUpperCase() ?? "S";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>({});
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [avatarBroken, setAvatarBroken] = React.useState(false);
  const { workspaces, currentWorkspace, setCurrentWorkspace, isLoading, refreshWorkspaces } = useWorkspaces();
  const [isCreatingWorkspace, setIsCreatingWorkspace] = React.useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = React.useState("");

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;

      const newWs = await aiFetch<{id: string, name: string, ownerId: string}>("/v1/workspaces", {
        method: "POST",
        body: JSON.stringify({ name: newWorkspaceName.trim(), ownerId: userId })
      });
      setIsCreatingWorkspace(false);
      setNewWorkspaceName("");
      await refreshWorkspaces();
      if (newWs && newWs.id) {
        // Find it in the newly refreshed array or just set it
        const fetchedWs = workspaces.find(w => w.id === newWs.id) || newWs;
        setCurrentWorkspace(fetchedWs as any);
      }
    } catch (e) {
      console.error(e);
    }
  }


  React.useEffect(() => {
    const stored = localStorage.getItem("staipo-sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  React.useEffect(() => {
    localStorage.setItem("staipo-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      if (!u) return;
      setUser({
        fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
        email: u.email ?? null,
        avatarUrl: getAvatarUrl(
          ((u.user_metadata?.avatar_url as string | undefined) ??
            (u.user_metadata?.picture as string | undefined) ??
            null),
        ),
      });
      setAvatarBroken(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-foreground flex app-blueprint">
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 288 }}
        transition={{ type: "spring", stiffness: 260, damping: 28 }}
        className={cn(
          "h-screen sticky top-0 border-r border-slate-200 metallic-sidebar flex flex-col",
        )}
      >
        <div className="h-16 px-4 border-b border-slate-200/50 flex items-center justify-between">
          <Link href="/" className={cn("flex items-center gap-2", collapsed && "justify-center w-full")} title="Към начална страница">
            <motion.div
              whileHover={{ rotate: -6, scale: 1.05 }}
              className="h-8 w-8 border border-slate-300 bg-white shadow-[0_0_10px_rgba(0,0,0,0.05)] flex items-center justify-center rounded-sm"
            >
              <Sparkles className="h-4 w-4 text-slate-800" />
            </motion.div>
            {!collapsed ? <div className="font-bold tracking-tighter text-slate-900">STAIPO <span className="text-[10px] text-slate-500 font-black">AI</span></div> : null}
          </Link>
          {!collapsed ? (
            <button
              aria-label="Collapse sidebar"
              onClick={() => setCollapsed(true)}
              className="h-8 w-8 border border-slate-200 hover:bg-white/80 transition-colors flex items-center justify-center rounded-md"
            >
              <ChevronLeft className="h-4 w-4 text-slate-500" />
            </button>
          ) : null}
        </div>

        <div className={cn("px-3 pt-3 pb-2 border-b border-gray-200", collapsed ? "hidden" : "block")}>
          <Link 
            href="/app/profile" 
            className="flex items-center gap-3 mb-4 p-1.5 -mx-1.5 rounded-xl hover:bg-slate-100 transition-colors group cursor-pointer"
            title="Към Моят Профил"
          >
            <div className="h-10 w-10 shrink-0 rounded-full border border-slate-200 bg-white overflow-hidden flex items-center justify-center shadow-sm group-hover:border-slate-300 transition-colors">
              {user?.avatarUrl && !avatarBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatarUrl}
                  alt="avatar"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <span className="text-xs font-semibold text-slate-700">{initials(user?.fullName ?? null, user?.email ?? null)}</span>
              )}
            </div>
            <div className="min-w-0 pr-2">
              <div className="text-sm font-medium text-slate-900 truncate group-hover:text-black transition-colors">{user?.fullName || "Потребител"}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email || "—"}</div>
            </div>
          </Link>

          {/* Workspace Switcher */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <label className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">
                Работна среда
              </label>
              <InfoTooltip 
                content="Ако работите за множество фирми или с различни екипи, може да ги разделите в отделни 'Работни среди'. Те изолират вашите клиенти, настройки и проекти едни от други."
                className="mr-1"
              />
            </div>
            <div className="relative group">
              <select
                value={currentWorkspace?.id || ""}
                onChange={(e) => {
                  if (e.target.value === "CREATE_NEW") {
                    setIsCreatingWorkspace(true);
                  } else {
                    const ws = workspaces.find((w) => w.id === e.target.value);
                    if (ws) setCurrentWorkspace(ws);
                  }
                }}
                className="w-full bg-white border border-gray-200 py-1.5 pl-2 pr-8 text-xs appearance-none focus:outline-none focus:border-gray-400 transition-colors cursor-pointer hover:bg-gray-50"
              >
                {isLoading ? (
                  <option>Зареждане...</option>
                ) : (
                  <>
                    {workspaces.length === 0 && (
                      <option value="" disabled>Няма средни</option>
                    )}
                    {workspaces.map((ws) => (
                      <option key={ws.id} value={ws.id}>
                        {ws.name}
                      </option>
                    ))}
                    <option value="CREATE_NEW" className="font-semibold text-primary">
                      + Нова работна среда
                    </option>
                  </>
                )}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Create Workspace Modal Overlay */}
        <AnimatePresence>
          {isCreatingWorkspace && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsCreatingWorkspace(false)}
                className="absolute inset-0 bg-white/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="relative w-full max-w-sm bg-white border border-gray-200 shadow-2xl p-6 space-y-4"
              >
                <div className="space-y-1">
                  <h2 className="text-xl font-bold">Нова Работна среда</h2>
                  <p className="text-xs text-gray-500 font-light">
                    Въведете име за вашата нова организация на работа.
                  </p>
                </div>

                <form onSubmit={handleCreateWorkspace} className="space-y-4">
                  <div className="space-y-2">
                    <input 
                      required
                      type="text"
                      placeholder="Име (напр. 'Фирма А')"
                      value={newWorkspaceName}
                      onChange={e => setNewWorkspaceName(e.target.value)}
                      className="w-full bg-white border border-gray-200 py-2 px-3 text-sm focus:outline-none focus:border-gray-400 transition-colors font-light"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button type="button" variant="ghost" className="h-8 text-xs px-3" onClick={() => setIsCreatingWorkspace(false)}>Отказ</Button>
                    <button type="submit" className="btn-acherno h-8 text-xs px-5">СЪЗДАЙ</button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <nav className="p-2 flex-1 min-h-0 space-y-1 overflow-y-auto">
          {collapsed ? (
            <button
              aria-label="Expand sidebar"
              onClick={() => setCollapsed(false)}
              className="h-10 w-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center mb-2"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}

          <Link
            href="/"
            title="Публична начална страница"
            className={cn(
              "h-10 rounded-md border transition-colors flex items-center mb-1",
              collapsed ? "justify-center" : "px-3 gap-3",
              "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50",
            )}
          >
            <Compass className="h-4 w-4" />
            {!collapsed ? <span className="text-sm">Публична начална</span> : null}
          </Link>

          {!user ? (
              <div className="px-2 py-4">
                  <Link href="/login" className="flex items-center justify-center">
                    <Button className="w-full btn-premium py-6 flex flex-col gap-0">
                        <span className="text-xs uppercase tracking-widest font-bold">Влез в STAIPO</span>
                        <span className="text-[10px] opacity-70 font-light">Започни проект сега</span>
                    </Button>
                  </Link>
              </div>
          ) : null}

          <div className="px-2 pt-2 pb-4 space-y-6">
          {(user ? privateGroups : publicGroups).map(group => {
            return (
              <div key={group.id} className="space-y-1">
                {!collapsed && (
                  <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {group.label}
                  </div>
                )}
                {group.items.map(item => {
                  const ItemIcon = item.icon;
                  const active = pathname === item.href || pathname.startsWith(item.href) && item.href !== "/";
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "h-11 rounded-lg flex items-center transition-all duration-300 group relative",
                        collapsed ? "justify-center" : "px-4 gap-3",
                        active
                          ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(37,99,235,0.08),_inset_4px_0_0_0_#38BDF8] border border-slate-200/60 font-bold"
                          : "text-slate-500 hover:text-slate-900 hover:bg-white/40"
                      )}
                      title={item.label}
                    >
                      <ItemIcon className={cn("h-4 w-4 transition-colors", active ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600")} />
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
          </div>
        </nav>
        <div className="p-2 border-t border-slate-200 space-y-2 bg-white/50 backdrop-blur-md">
          <Link
            href="/app/settings"
            className={cn(
              "h-10 rounded-lg flex items-center transition-all duration-300 group",
              collapsed ? "justify-center" : "px-3 gap-3",
              pathname === "/app/settings"
                ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(0,0,0,0.05),_inset_4px_0_0_0_#38BDF8] border border-slate-200/60 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            )}
            title="Настройки"
          >
            <Settings className={cn("h-4 w-4 transition-colors", pathname === "/app/settings" ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600")} />
            {!collapsed && <span className="text-sm">Настройки</span>}
          </Link>

          <Link
            href="/app/trash"
            className={cn(
              "h-10 rounded-lg flex items-center transition-all duration-300 group",
              collapsed ? "justify-center" : "px-3 gap-3",
              pathname === "/app/trash"
                ? "bg-white text-slate-900 shadow-[0_4px_12px_rgba(37,99,235,0.08),_inset_4px_0_0_0_#38BDF8] border border-slate-200/60 font-bold"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-100/50"
            )}
            title="Кошче"
          >
            <Trash2 className={cn("h-4 w-4 transition-colors", pathname === "/app/trash" ? "text-slate-800" : "text-slate-400 group-hover:text-slate-600")} />
            {!collapsed && <span className="text-sm">Кошче</span>}
          </Link>
          <button className={cn("w-full h-10 rounded-lg flex items-center transition-all duration-200 text-gray-600 hover:text-red-600 hover:bg-red-50", collapsed ? "justify-center" : "px-3 gap-3")} onClick={logout} title="Изход">
            <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500" />
            {!collapsed && <span className="text-sm font-medium">Изход</span>}
          </button>
        </div>
      </motion.aside>

      <div className="flex-1 min-w-0 relative">
        <main className={cn(
          "animate-enter h-full", 
          pathname === "/kitchen-designer" ? "p-0" : "p-6 md:p-8"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

