"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Loader2, Copy, CheckCircle2, Factory, Send, Flag, Check, Building2, User, Phone, Mail, FileText, ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabase";

function money(n: number) {
  return new Intl.NumberFormat("bg-BG", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(n || 0);
}

type OfferData = {
  id: string;
  slug: string;
  status: string;
  version?: number;
  projectId: string;
  createdAt: string;
  masterApprovedAt: string | null;
  clientApprovedAt: string | null;
  totals: {
    total: number;
    subtotal?: number;
    margin?: number;
  };
  pricing?: {
    items: any[];
    waste?: { cost: number };
    edging?: { cost: number };
    labor?: { cost: number };
    transport?: { cost: number };
  }
};

export default function InteractiveOfferPage() {
  const { slug } = useParams() as { slug: string };
  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<{ offer: OfferData; comments: any[]; alternatives: any[] } | null>(null);
  const [profile, setProfile] = React.useState<any | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [approving, setApproving] = React.useState(false);
  const [showItems, setShowItems] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/offers/${encodeURIComponent(slug)}/interactive`, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const json = await res.json();
        setData(json);

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.user?.id) {
            const prf = await fetch(`/api/profile?userId=${sessionData.session.user.id}`).then(r => r.json());
            if (prf.profile) setProfile(prf.profile);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Грешка");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function approve() {
    if (!data) return;
    setApproving(true);
    try {
        const res = await fetch(`/api/offers/${encodeURIComponent(slug)}/client-approve`, {
          method: "POST"
        });
        if (!res.ok) throw new Error("Failed to approve");
        setData(prev => prev ? {
          ...prev, 
          offer: {
            ...prev.offer,
            clientApprovedAt: new Date().toISOString()
          }
        } : null);
    } catch {
       alert("Възникна грешка при одобрението. Моля, опитайте отново.");
    } finally {
        setApproving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-almond-silk flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="font-luxury text-lg text-slate-500 animate-pulse italic">Зареждане на офертата...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-almond-silk flex items-center justify-center p-6">
        <div className="bg-white rounded-[2rem] p-10 max-w-sm w-full text-center border border-amber-100 shadow-xl">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-6 text-red-500 font-luxury italic text-2xl">!</div>
          <h2 className="font-luxury text-2xl font-bold mb-2">Офертата не е намерена</h2>
          <p className="text-sm text-slate-500 mb-8">{error}</p>
          <Link href="/" className="px-8 py-3 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors inline-block w-full">Към началото</Link>
        </div>
      </div>
    );
  }

  const o = data.offer;
  const isApproved = !!o.clientApprovedAt;
  const items = o.pricing?.items || [];

  return (
    <div className="min-h-[100dvh] bg-almond-silk text-slate-900 pb-24 selection:bg-gold/20">
      
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl border-b border-amber-100/50">
        <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {profile?.logoUrl ? 
               // eslint-disable-next-line @next/next/no-img-element
               <img src={profile.logoUrl} className="h-10 object-contain" alt="Logo" /> : 
               <div className="font-luxury text-2xl tracking-wide text-slate-900 font-bold">{profile?.companyName || "STAIPO"}</div>
             }
          </div>
          <button
              onClick={copyLink}
              className="text-[10px] uppercase bg-amber-50 hover:bg-amber-100 font-bold tracking-[0.2em] rounded-full px-5 py-2.5 transition-colors flex items-center gap-2 text-amber-900 border border-amber-200/50"
          >
              {copied ? <Check className="h-4 w-4 text-emerald-600"/> : <Copy className="h-4 w-4" />}
              {copied ? "КОПИРАНО" : "СПОДЕЛИ ЛИНК"}
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-5 pt-12 md:pt-20 space-y-12">
        
        {/* Luxury Hero */}
        <div className="text-center space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] uppercase bg-white border border-amber-200 text-amber-800 shadow-sm relative z-10">
            ОФЕРТА #{o.slug.toUpperCase()}
          </div>
          
          <h1 className="font-luxury text-5xl md:text-7xl font-semibold text-slate-900 leading-[1.1] tracking-tight">
            Инвестиционно <br/>Предложение
          </h1>
          
          <p className="text-slate-500 font-medium max-w-xl mx-auto text-sm md:text-base leading-relaxed">
            Изготвено специално за Вас. Крайна стойност с включени всички материали, висококачествена изработка, доставка и професионален монтаж.
          </p>

          <div className="pt-8 pb-4">
             <div className="inline-block relative">
               <div className="absolute -inset-10 bg-gradient-to-r from-amber-100/0 via-amber-200/40 to-amber-100/0 blur-2xl opacity-50" />
               <div className="relative font-luxury text-7xl md:text-[8rem] leading-none text-slate-900 tracking-tighter">
                 {money(o.totals.total)}
               </div>
             </div>
          </div>
        </div>

        {/* Detailed Breakdown Accordion */}
        {items.length > 0 && (
          <div className="bg-white rounded-[2rem] border border-amber-100/60 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] overflow-hidden">
            <button 
              onClick={() => setShowItems(!showItems)}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-700">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm uppercase tracking-widest text-slate-900">Спецификация на материалите</h3>
                  <p className="text-xs text-slate-500 mt-1">{items.length} позиции включени в офертата</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform duration-300 ${showItems ? 'rotate-180' : ''}`} />
            </button>
            
            {showItems && (
              <div className="px-8 pb-8 animate-enter">
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row justify-between sm:items-center py-3 border-b border-slate-50 gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-slate-400">
                          {idx + 1}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 leading-tight">{item.material}</div>
                          {item.catalogName && <div className="text-xs text-slate-500 mt-1">{item.catalogName}</div>}
                          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-2">
                             {item.areaM2Total ? `${item.areaM2Total.toFixed(2)} кв.м` : ''} 
                             {item.edgeMTotal ? ` / ${item.edgeMTotal.toFixed(2)} л.м кант` : ''}
                          </div>
                        </div>
                      </div>
                      {/* Hide exact pricing of individual items in client preview to protect margin, just show inclusion checkmark */}
                      <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                        <Check className="h-3.5 w-3.5" /> Включено
                      </div>
                    </div>
                  ))}
                  
                  <div className="pt-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center text-sm py-2 text-slate-500 border-b border-slate-50">
                       <span>Труд & Производствени процеси</span>
                       <span className="font-medium text-slate-900 tracking-wide text-xs bg-slate-100 px-2 py-1 rounded">Включено</span>
                    </div>
                    <div className="flex justify-between items-center text-sm py-2 text-slate-500">
                       <span>Логистика & Инсталация</span>
                       <span className="font-medium text-slate-900 tracking-wide text-xs bg-slate-100 px-2 py-1 rounded">Включено</span>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

        {/* Approval Card */}
        <div className="bg-slate-900 text-white rounded-[2rem] p-8 md:p-12 shadow-2xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
            <Flag className="w-40 h-40 rotate-12" />
          </div>
          <div className="relative z-10 space-y-6 text-center max-w-lg mx-auto">
            <h3 className="font-luxury text-3xl md:text-4xl">Потвърждение</h3>
            <p className="text-slate-400 text-sm md:text-base leading-relaxed">
              Със съгласието си потвърждавате стойността и спецификацията. Следващата стъпка е сключване на официален договор с изпълнителя.
            </p>
            <button 
              onClick={approve}
              disabled={isApproved || approving}
              className={`w-full py-5 rounded-2xl font-bold uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-3 ${
                isApproved 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : 'bg-gold hover:bg-gold-dark text-slate-900 shadow-[0_0_40px_rgba(212,175,55,0.3)] hover:scale-[1.02] active:scale-95'
              }`}
            >
              {approving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-5 w-5" />}
              {isApproved ? "ВЕЧЕ СТЕ ОДОБРИЛИ" : "ПРИЕМАМ ПРОЕКТА"}
            </button>
            {isApproved && (
               <p className="text-xs text-emerald-500/80 mt-4">Одобрено на: {new Date(o.clientApprovedAt || "").toLocaleString("bg-BG")}</p>
            )}
          </div>
        </div>

        {/* Contractor Profile Footer */}
        {profile && (
          <div className="flex flex-col md:flex-row items-center gap-8 justify-center pt-8 pb-12 border-t border-amber-200/40">
            {profile.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.logoUrl} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-xl" alt="Майстор"/>
            ) : (
                <div className="w-20 h-20 rounded-full bg-white text-gold flex items-center justify-center shadow-xl border border-amber-100">
                    <User className="h-8 w-8"/>
                </div>
            )}
            <div className="text-center md:text-left space-y-3">
              <h4 className="font-luxury text-2xl font-bold text-slate-900">{profile.companyName}</h4>
              <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                {profile.phone && <a href={`tel:${profile.phone}`} className="flex items-center gap-1.5 hover:text-gold transition-colors"><Phone className="h-3 w-3"/> ТЕЛЕФОН</a>}
                {profile.email && <a href={`mailto:${profile.email}`} className="flex items-center gap-1.5 hover:text-gold transition-colors"><Mail className="h-3 w-3"/> ИМЕЙЛ</a>}
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
