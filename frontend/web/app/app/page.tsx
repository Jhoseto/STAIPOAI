"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { FolderOpen, FileUp, Calculator, ArrowRight, TrendingUp, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

type UserInfo = {
  email: string | null;
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  providers: string[];
  emailConfirmed: boolean;
};

function getAvatarUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.hostname.includes("googleusercontent.com")) {
      url.searchParams.set("sz", "256");
    }
    return url.toString();
  } catch {
    return raw;
  }
}

export default function AppPage() {
  const router = useRouter();
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<UserInfo | null>(null);
  const [stats, setStats] = React.useState<{
    projects: number;
    uploads: number;
    offers: number;
    needsReview: number;
    revenue: number;
    successRate: number;
    pipeline: Record<string, number>;
  } | null>(null);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const u = data.session?.user;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser({
        id: u.id,
        email: u.email ?? null,
        fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
        avatarUrl: getAvatarUrl(
          ((u.user_metadata?.avatar_url as string | undefined) ??
            (u.user_metadata?.picture as string | undefined) ??
            null),
        ),
        providers: (u.app_metadata?.providers as string[] | undefined) ?? [],
        emailConfirmed: Boolean(u.email_confirmed_at),
      });
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (!u) {
        router.replace("/login");
        return;
      }
      setUser({
        id: u.id,
        email: u.email ?? null,
        fullName: (u.user_metadata?.full_name as string | undefined) ?? null,
        avatarUrl: getAvatarUrl(
          ((u.user_metadata?.avatar_url as string | undefined) ??
            (u.user_metadata?.picture as string | undefined) ??
            null),
        ),
        providers: (u.app_metadata?.providers as string[] | undefined) ?? [],
        emailConfirmed: Boolean(u.email_confirmed_at),
      });
    });

    fetch("/api/stats", { cache: "no-store" })
      .then(async res => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then(data => setStats(data))
      .catch(() => {
        // Keep defaults if backend is unavailable.
      });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [router]);

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
      },
    },
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <motion.div
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-sm text-gray-500"
        >
          Зареждане...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="pb-6 border-b border-gray-200"
      >
        <div className="max-w-3xl space-y-6">
          <div className="line-divider" />
          <span className="text-small">Контролно Табло</span>
          <h1 className="text-4xl font-light tracking-tight">
            Добре дошъл, {user?.fullName || "майсторе"}
          </h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            Стартирай проект, качи PRO100 и изготви оферта с live верификация към Salex в един подреден работен поток.
          </p>
          <div className="flex flex-wrap gap-4 pt-2">
            <Link href="/app/projects/new">
              <button className="btn-acherno flex items-center gap-2">
                НОВ ПРОЕКТ <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/app/quick-offer">
              <button className="btn-acherno-outline flex items-center gap-2">
                БЪРЗА ОФЕРТА
              </button>
            </Link>
            <Link href="/app/projects">
              <button className="btn-acherno-outline">
                МОИТЕ ПРОЕКТИ
              </button>
            </Link>
          </div>
        </div>
      </motion.div>

      {/* STATS GRID */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6"
      >
        <motion.div variants={itemVariants}>
          <Link href="/app/projects" className="glass-cad p-6 block group blueprint-callout hover:border-slate-400 transition-all duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 group-hover:bg-slate-200 transition-colors rounded-lg">
                <FolderOpen className="w-4 h-4 text-slate-700" />
              </div>
              <span className="technical-label">Проекти</span>
            </div>
            <div className="text-3xl font-light tracking-tight text-slate-900">{stats.projects}</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link href="/app/projects/new" className="glass-cad p-6 block group blueprint-callout hover:border-slate-400 transition-all duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 group-hover:bg-slate-200 transition-colors rounded-lg">
                <FileUp className="w-4 h-4 text-slate-700" />
              </div>
              <span className="technical-label">Качвания</span>
            </div>
            <div className="text-3xl font-light tracking-tight text-slate-900">{stats.uploads}</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Link href="/app/projects" className="glass-cad p-6 block group blueprint-callout hover:border-slate-400 transition-all duration-500">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 group-hover:bg-slate-200 transition-colors rounded-lg">
                <Calculator className="w-4 h-4 text-slate-700" />
              </div>
              <span className="technical-label">Оферти</span>
            </div>
            <div className="text-3xl font-light tracking-tight text-slate-900">{stats.offers}</div>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="glass-cad p-6 blueprint-callout">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-slate-700" />
              </div>
              <span className="technical-label">Одобрени</span>
            </div>
            <div className="text-3xl font-light tracking-tight text-slate-900">
              {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(stats.revenue)}
            </div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="glass-cad p-6 blueprint-callout">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-slate-100 rounded-lg">
                <TrendingUp className="w-4 h-4 text-slate-700" />
              </div>
              <span className="technical-label">Успеваемост</span>
            </div>
            <div className="text-3xl font-light tracking-tight text-slate-900">{stats.successRate}%</div>
          </div>
        </motion.div>
      </motion.div>

      {/* PIPELINE & ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 card-luxury p-8"
        >
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2">
              <div className="line-divider" />
              <h3 className="technical-label">
                Активен Pipeline
              </h3>
            </div>
            <Link href="/app/projects" className="technical-label hover:text-slate-900 transition-colors flex items-center gap-2">
              Виж Всички <ArrowRight className="w-3 h-3 text-slate-400" />
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Нови (Lead)", key: "lead" },
              { label: "Оферта", key: "offer" },
              { label: "Производство", key: "production" },
              { label: "Приключени", key: "done" }
            ].map(st => (
              <div key={st.key} className="border border-slate-200/50 p-5 space-y-3 bg-white/30 rounded-lg">
                <span className="technical-label opacity-70">{st.label}</span>
                <div className="text-2xl font-light text-slate-900">{stats.pipeline[st.key] || 0}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card-luxury p-8"
        >
          <div className="space-y-2 mb-8">
            <div className="line-divider" />
            <h3 className="technical-label">
              Активност
            </h3>
          </div>

          <div className="space-y-5">
            {[
              { label: "Общо проекти", value: stats.projects },
              { label: "Качени PRO100 / Excel", value: stats.uploads },
              { label: "Издадени оферти", value: stats.offers },
              { label: "За ръчна проверка", value: stats.needsReview, highlight: true }
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-gray-100 pb-3">
                <span className="text-gray-600">{item.label}</span>
                <span className={`font-semibold ${item.highlight ? "text-red-600" : "text-gray-900"}`}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
