"use client";

import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Building2, User, Phone, Mail, MapPin, CreditCard, Globe, FileText, ChevronRight, Save, Loader2, BadgeEuro, Calendar } from "lucide-react";

type MasterProfile = {
  userId: string;
  companyName: string;
  ownerName: string;
  vatNumber: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  website: string;
  bio: string;
  defaultDailyRate: number;
  defaultMarkupPct: number;
  bankIban: string;
  bankName: string;
};

const emptyProfile: Omit<MasterProfile, "userId"> = {
  companyName: "",
  ownerName: "",
  vatNumber: "",
  address: "",
  phone: "",
  email: "",
  logoUrl: "",
  website: "",
  bio: "",
  defaultDailyRate: 0,
  defaultMarkupPct: 0.2,
  bankIban: "",
  bankName: "",
};

function Field({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">
        <Icon className="h-3 w-3" />
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full bg-white border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-gray-400 transition-colors placeholder:text-gray-400";

export default function ProfilePage() {
  const [userId, setUserId] = React.useState<string | null>(null);
  const [profile, setProfile] = React.useState<Omit<MasterProfile, "userId">>(emptyProfile);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) { setLoading(false); return; }
      setUserId(uid);
      try {
        const res = await fetch(`/api/profile?userId=${uid}`, { cache: "no-store" });
        const data2 = await res.json();
        if (data2.profile) {
          const { userId: _uid, createdAt: _c, updatedAt: _u, ...rest } = data2.profile;
          setProfile({ ...emptyProfile, ...rest });
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...profile }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Грешка при запазване");
    } finally {
      setSaving(false);
    }
  }

  function update(key: keyof typeof emptyProfile, value: string | number) {
    setProfile(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="max-w-[900px] space-y-6">
      {/* Header */}
      <div className="pb-6 border-b border-gray-200 animate-enter">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-4">
            <div className="line-divider" />
            <span className="text-small">Профилни Данни</span>
            <h1 className="text-4xl font-light tracking-tight">Вашата Фирма</h1>
            <p className="text-sm text-gray-600">
              Тези данни се включват автоматично в офертата и PDF документа.
            </p>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="btn-acherno flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saved ? "ЗАПАЗЕНО ✓" : saving ? "ЗАПАЗВАНЕ..." : "ЗАПАЗИ ПРОФИЛА"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Фирмени данни */}
      <div className="card-luxury p-8 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <Building2 className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-900">Фирмени Данни</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Наименование на Фирмата" icon={Building2}>
            <input className={inputCls} placeholder="МЕБЕЛИ ИВАНОВ ЕООД" value={profile.companyName} onChange={e => update("companyName", e.target.value)} />
          </Field>
          <Field label="Собственик / МОЛ" icon={User}>
            <input className={inputCls} placeholder="Иван Иванов" value={profile.ownerName} onChange={e => update("ownerName", e.target.value)} />
          </Field>
          <Field label="ЕИК / ДДС Номер" icon={FileText}>
            <input className={inputCls} placeholder="BG123456789" value={profile.vatNumber} onChange={e => update("vatNumber", e.target.value)} />
          </Field>
          <Field label="Адрес" icon={MapPin}>
            <input className={inputCls} placeholder="ул. България 1, Пловдив" value={profile.address} onChange={e => update("address", e.target.value)} />
          </Field>
          <Field label="Телефон" icon={Phone}>
            <input className={inputCls} type="tel" placeholder="+359 88 888 8888" value={profile.phone} onChange={e => update("phone", e.target.value)} />
          </Field>
          <Field label="Имейл" icon={Mail}>
            <input className={inputCls} type="email" placeholder="office@firma.bg" value={profile.email} onChange={e => update("email", e.target.value)} />
          </Field>
          <Field label="Уебсайт" icon={Globe}>
            <input className={inputCls} placeholder="https://firma.bg" value={profile.website} onChange={e => update("website", e.target.value)} />
          </Field>
          <Field label="Лого URL" icon={Building2}>
            <input className={inputCls} placeholder="https://firma.bg/logo.png" value={profile.logoUrl} onChange={e => update("logoUrl", e.target.value)} />
          </Field>
        </div>
        <Field label="Кратко описание (за офертата)" icon={FileText}>
          <textarea
            className={`${inputCls} resize-none`}
            rows={3}
            placeholder="Производство и монтаж на мебели по поръчка. Над 15 години опит в бранша."
            value={profile.bio}
            onChange={e => update("bio", e.target.value)}
          />
        </Field>
      </div>

      {/* Стойности по подразбиране */}
      <div className="card-luxury p-8 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <BadgeEuro className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-900">Стойности по Подразбиране</span>
          <span className="text-xs text-gray-500 ml-auto">Автоматично попълвани при нова оферта</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Дневна Ставка (€/ден)" icon={Calendar}>
            <div className="relative">
              <input
                className={inputCls}
                type="number"
                placeholder="150"
                value={profile.defaultDailyRate || ""}
                onChange={e => update("defaultDailyRate", Number(e.target.value))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">€/ден</span>
            </div>
          </Field>
          <Field label="Надценка (%)" icon={ChevronRight}>
            <div className="relative">
              <input
                className={inputCls}
                type="number"
                placeholder="20"
                value={profile.defaultMarkupPct ? Math.round(profile.defaultMarkupPct * 100) : ""}
                onChange={e => update("defaultMarkupPct", Number(e.target.value) / 100)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
            </div>
          </Field>
        </div>
      </div>

      {/* Банкова информация */}
      <div className="card-luxury p-8 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-200">
          <CreditCard className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-semibold uppercase tracking-wider text-gray-900">Банкова Информация</span>
          <span className="text-xs text-gray-500 ml-auto">Показва се в PDF офертата</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="IBAN" icon={CreditCard}>
            <input className={inputCls} placeholder="BG80BNBG96611020345678" value={profile.bankIban} onChange={e => update("bankIban", e.target.value)} />
          </Field>
          <Field label="Банка" icon={Building2}>
            <input className={inputCls} placeholder="УниКредит Дълбанк АД" value={profile.bankName} onChange={e => update("bankName", e.target.value)} />
          </Field>
        </div>
      </div>

      {/* Logo Preview */}
      {profile.logoUrl && (
        <div className="card-luxury p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Преглед на Лого</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.logoUrl} alt="Лого" className="max-h-16 object-contain" />
        </div>
      )}

      {/* Save button bottom */}
      <div className="flex justify-end pb-6">
        <button
          type="submit"
          disabled={saving}
          className="btn-acherno flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {saved ? "ЗАПАЗЕНО ✓" : saving ? "ЗАПАЗВАНЕ..." : "ЗАПАЗИ ПРОФИЛА"}
        </button>
      </div>
    </form>
  );
}
