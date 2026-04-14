"use client";
import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight, CheckCircle2, TrendingUp, LayoutDashboard, Database, Zap,
  PenTool, Shield, FileText, BarChart3, Star, Layers, Box, Cpu,
  Sparkles, Lightbulb, Rocket, Target, Lock, Gauge
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { AppShell } from "@/components/app-shell";
import { BlueprintAnimation } from "@/components/ui/blueprint-animation";
export default function Home() {
  const [authChecked, setAuthChecked] = React.useState(false);
  const [hoveredCard, setHoveredCard] = React.useState<number | null>(null);

  React.useEffect(() => {
    supabase.auth.getSession().then(() => {
      setAuthChecked(true);
    });
  }, []);

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-small"
          >
            ИНИЦИАЛИЗАЦИЯ НА СИСТЕМАТА...
          </motion.div>
        </div>
      </div>
    );
  }

  const functions = [
    {
      id: "01",
      title: "Контролно Бизнес Табло",
      desc: "Финансови метрики и Pipeline мониторинг.",
      image: "https://images.unsplash.com/photo-1558522195-e1201b090344?q=80&w=800&auto=format&fit=crop",
      icon: LayoutDashboard,
    },
    {
      id: "02",
      title: "Управление на Проекти",
      desc: "Дигитално досие за всеки клиент с визуално движение.",
      image: "https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=800&auto=format&fit=crop",
      icon: Layers,
    },
    {
      id: "03",
      title: "Автоматизирано Ценообразуване",
      desc: "Импорт от PRO100 и Live връзка към Salex.",
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop",
      icon: Cpu,
    },
    {
      id: "04",
      title: "Интелигентен Марж",
      desc: "AI анализ на печалбата за всеки проект.",
      image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?q=80&w=800&auto=format&fit=crop",
      icon: TrendingUp,
    },
    {
      id: "05",
      title: "Интерактивна Оферта",
      desc: "Mobile-first дизайн с AI описание на проекта.",
      image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=800&auto=format&fit=crop",
      icon: FileText,
    },
    {
      id: "06",
      title: "Електронен Подпис",
      desc: "Одобрение от клиента с IP и времеви запис.",
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?q=80&w=800&auto=format&fit=crop",
      icon: PenTool,
    },
    {
      id: "07",
      title: "Версиониране",
      desc: "Пълна проследимост на промените във времето.",
      image: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=800&auto=format&fit=crop",
      icon: Box,
    },
    {
      id: "08",
      title: "Галерия и AI Анализ",
      desc: "AI анализ на стилове за разбиране на нужди.",
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=800&auto=format&fit=crop",
      icon: Star,
    },
    {
      id: "09",
      title: "Документация",
      desc: "Автоматично генериране на PDF и CSV.",
      image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?q=80&w=800&auto=format&fit=crop",
      icon: Database,
    }
  ];

  const benefits = [
    {
      title: "Спестяване на време",
      desc: "Автоматизирайте до 80% от ръчната работа.",
      icon: Zap,
    },
    {
      title: "По-висока печалба",
      desc: "AI анализ на маржа и разходите.",
      icon: TrendingUp,
    },
    {
      title: "Премиум имидж",
      desc: "Впечатлете клиентите си с професионални оферти.",
      icon: Sparkles,
    },
    {
      title: "Сигурност",
      desc: "Пълна защита на всички документи.",
      icon: Shield,
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.25, 0.1, 0.25, 1] as const,
      },
    },
  };

  return (
    <AppShell>
      <div className="relative min-h-screen text-slate-900 font-sans app-shell-bg selection:bg-indigo-500 selection:text-white">

        {/* ===== ULTRA PREMIUM INTERIOR DESIGNER HERO ===== */}
        <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-28 pb-24">

          {/* BACKGROUND WITH LUXURY IMAGE */}
          <div className="absolute inset-0 z-0 bg-[#F2F4F7]">
            <img
              src="/premium_kitchen_bg.png"
              alt="Luxury Kitchen Interior Architecture"
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            />
            {/* PALE BACKGROUND ANIMATION */}
            <div className="absolute inset-0 z-0 opacity-[0.15] pointer-events-none scale-150 transform-gpu origin-center">
              <BlueprintAnimation strokeClass="stroke-slate-900" />
            </div>
            {/* Fade gradient so text stays readable on the left */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#F2F4F7] via-[#F2F4F7]/95 to-transparent z-10" />
            <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-[0.03] mix-blend-overlay pointer-events-none z-20" />
            <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-white blur-[130px] opacity-60 pointer-events-none z-20" />
          </div>

          <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">

            {/* LEFT: COPYWRITING */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="lg:col-span-6 space-y-10"
            >
              {/* SUBTITLE BADGE */}
              <motion.div
                variants={itemVariants}
                className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-slate-300/60 bg-white/50 shadow-sm backdrop-blur-md"
              >
                <div className="w-2 h-2 rounded-full bg-slate-800 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800">
                  ЗА ПРОИЗВОДИТЕЛИ НА МЕБЕЛИ И МАЙСТОРИ
                </span>
              </motion.div>

              {/* MAIN HEADLINE */}
              <motion.div variants={itemVariants} className="space-y-6">
                <h1 className="text-5xl lg:text-[4.5rem] font-medium tracking-tight text-black leading-[1.05]">
                  Мостът между изпълнител <br className="hidden lg:block" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-800 to-slate-400">
                    и клиент е тук.
                  </span>
                </h1>

                <p className="text-lg text-slate-600 max-w-xl leading-relaxed">
                  Спри да губиш време. STAIPO подготвя професионалната оферта на мига, изчиства комуникацията с клиента и автоматично генерира точния списък с материали и цени за магазина. Всичко на едно място.
                </p>
              </motion.div>

              {/* CTA BUTTONS */}
              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center gap-4 pt-4"
              >
                <Link href="/login" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto btn-premium px-8 py-4 text-[14px] group">
                    <span className="flex items-center justify-center gap-3">
                      СТАРТИРАЙ СЕГА
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </button>
                </Link>
                <Link href="#functions" className="w-full sm:w-auto">
                  <button className="w-full sm:w-auto btn-acherno-outline px-8 py-4 text-[14px]">
                    ВИЖ КАК РАБОТИ
                  </button>
                </Link>
              </motion.div>
            </motion.div>

            {/* RIGHT: MASSIVE INTERIOR VISUAL */}
            <motion.div
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ delay: 0.4, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-6 relative h-full min-h-[500px] hidden lg:flex items-center justify-center"
            >
              {/* Massive Floating Image Panel */}
              <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="w-[110%] ml-10 rounded-[2rem] overflow-hidden border border-white/60 shadow-2xl bg-white/20 backdrop-blur-md p-3 transform rotate-1 hover:rotate-0 transition-transform duration-700 hover:scale-[1.02]"
              >
                <div className="relative rounded-2xl overflow-hidden shadow-inner">
                  <img src="/premium_kitchen_bg.png" alt="Kitchen Blueprint" className="w-full object-cover aspect-video" />
                  <div className="absolute inset-0 z-10 mix-blend-screen pointer-events-none">
                    <BlueprintAnimation />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* FUNCTIONS GRID */}
        <section id="functions" className="section bg-card relative z-30 shadow-2xl rounded-t-[3rem]">
          <div className="max-w-7xl mx-auto px-8 space-y-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="max-w-3xl space-y-8"
            >
              <div className="line-divider" />
              <span className="text-small">Възможности</span>
              <h2 className="text-4xl md:text-5xl leading-tight">
                Изцяло нова екосистема за Вашия бизнес
              </h2>
              <p className="text-base text-gray-600 leading-relaxed">
                Всеки инструмент е проектиран с мисъл за ефективност, прецизност и премиум представяне пред клиента.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {functions.map((f, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  className="group relative cursor-pointer overflow-hidden rounded-[2rem] border border-slate-200/50 hover:border-slate-300 shadow-sm hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 bg-slate-50 flex flex-col"
                >
                  {/* PREMIUM THUMBNAIL AREA */}
                  <div className="relative h-48 w-full overflow-hidden p-2">
                    <div className="w-full h-full rounded-[1.5rem] overflow-hidden relative">
                      {/* Overlay gradient using Silver Glass colors */}
                      <div className="absolute inset-0 bg-slate-900/60 group-hover:bg-slate-900/40 mix-blend-multiply transition-colors duration-500 z-10" />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent z-10" />

                      <img
                        src={f.image}
                        alt={f.title}
                        className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-700 ease-out grayscale group-hover:grayscale-0"
                      />

                      {/* Blueprint Animation exactly like Hero, revealing on hover */}
                      <div className="absolute inset-0 z-15 opacity-0 group-hover:opacity-[0.35] transition-opacity duration-700 pointer-events-none mix-blend-screen scale-125">
                        <BlueprintAnimation />
                      </div>

                      {/* Floating Badge / Icon */}
                      <div className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
                        <f.icon className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>

                  {/* CONTENT AREA */}
                  <div className="p-6 pt-4 flex flex-col flex-1 bg-white relative z-20">
                    <h3 className="text-[15px] font-bold tracking-tight text-slate-900 group-hover:text-black transition-colors mb-2">
                      {f.title}
                    </h3>
                    <p className="text-[14px] text-slate-500 leading-relaxed mb-6">
                      {f.desc}
                    </p>

                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100 font-bold uppercase tracking-widest text-[11px] text-slate-400 group-hover:text-slate-900 transition-colors">
                      <span>Открий повече</span>
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-colors">
                        <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* BENEFITS SECTION */}
        <section className="section relative bg-slate-50/50 border-t border-slate-200/50 py-32 overflow-hidden">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-indigo-50/50 blur-[120px] rounded-full pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
              <motion.div
                initial={{ opacity: 0, x: -40, filter: "blur(10px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="space-y-12"
              >
                <div className="space-y-8">
                  <div className="line-divider" />
                  <span className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Оптимизация на процеса</span>
                  <h2 className="text-4xl md:text-5xl leading-tight font-medium tracking-tight text-slate-900">
                    Защо гигантите избират <br /> STAIPO AI?
                  </h2>
                </div>

                <motion.div
                  className="space-y-8"
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-50px" }}
                >
                  {benefits.map((b, i) => (
                    <motion.div
                      key={i}
                      variants={itemVariants}
                      className="group flex gap-6 items-start p-4 -ml-4 rounded-2xl hover:bg-white hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="p-3 bg-slate-200/50 rounded-xl group-hover:bg-slate-800 transition-colors flex-shrink-0">
                        <b.icon className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[15px] font-bold uppercase tracking-wider text-slate-900 mb-2">
                          {b.title}
                        </h4>
                        <p className="text-[15px] text-slate-600 leading-relaxed">
                          {b.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                whileInView={{ opacity: 1, x: 0, scale: 1 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="relative h-[600px] w-full rounded-[2rem] border border-white bg-white/40 shadow-2xl backdrop-blur-md p-3"
              >
                <div className="w-full h-full rounded-xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-slate-900/10 mix-blend-overlay z-10" />
                  <img
                    src="https://images.unsplash.com/photo-1556912173-3bb406ef7e77?q=80&w=1000&auto=format&fit=crop"
                    alt="Premium Furniture Design"
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* FEATURES SECTION */}
        <section className="section bg-white py-32 border-t border-slate-100">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <motion.div
              initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="text-center mb-24"
            >
              <div className="line-divider mx-auto mb-8" />
              <span className="text-[11px] font-bold tracking-[0.2em] text-slate-500 uppercase">Технологичен стек</span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight text-slate-900 mt-6 mb-8">
                Технология на Световно Ниво
              </h2>
              <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Изградена с архитектурна прецизност, най-новите технологии и безкомпромисни практики за максимална производителност.
              </p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
            >
              {[
                { icon: Rocket, title: "Молниеносна Скорост", desc: "Оптимизирана производителност за мигновени изчисления." },
                { icon: Lock, title: "Максимална Сигурност", desc: "Криптиране на всички данни и пълна защита на проектите." },
                { icon: Gauge, title: "Прецизност", desc: "Математическа точност до последния милиметър във всяка оферта." },
                { icon: Target, title: "Целево Решение", desc: "Проектирано изключително за мебелния и интериорен бизнес." },
                { icon: Lightbulb, title: "Интелигентност", desc: "Сложни алгоритми за калкулация на марж, труд и фирура." },
                { icon: Sparkles, title: "Премиум Опит", desc: "Всеки пиксел е проектиран за удоволствие при ползване." }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="relative p-10 rounded-3xl bg-slate-50/50 border border-slate-200/50 hover:bg-white hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-all duration-500 group"
                >
                  <div className="p-4 bg-white shadow-sm border border-slate-200 rounded-2xl w-fit mb-8 group-hover:bg-slate-900 group-hover:border-slate-900 transition-colors">
                    <feature.icon className="w-6 h-6 text-slate-700 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider mb-4 text-slate-900">
                    {feature.title}
                  </h3>
                  <p className="text-[15px] text-slate-600 leading-relaxed">
                    {feature.desc}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="relative py-40 text-center bg-[#F2F4F7] overflow-hidden">
          {/* Subtle glow behind CTA */}
          <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[60%] h-[60%] rounded-full bg-white blur-[150px] opacity-80 pointer-events-none" />

          <div className="relative z-10 max-w-4xl mx-auto px-6 md:px-12 space-y-16">
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="space-y-10"
            >
              <span className="text-[11px] font-bold tracking-[0.2em] text-slate-600 uppercase bg-white/50 px-4 py-2 rounded-full border border-slate-300">Готови ли сте?</span>
              <h2 className="text-5xl md:text-7xl font-medium tracking-tight text-black leading-[1.05]">
                Стартирайте новото <br /> ниво днес.
              </h2>
              <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Присъединете се към професионалистите, които избират безкомпромисното решение за своя бизнес и клиенти.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center gap-8"
            >
              <Link href="/login">
                <button className="btn-premium px-12 py-5 text-[15px] group">
                  <span className="flex items-center gap-3">
                    СЪЗДАЙ БЕЗПЛАТЕН АКАУНТ
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                  </span>
                </button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="py-20 border-t border-slate-200/60 bg-white">
          <div className="max-w-[1400px] mx-auto px-6 md:px-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
              <div className="md:col-span-2 pr-8">
                <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-900 mb-6 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-900" />
                  STAIPO
                </h3>
                <p className="text-[15px] text-slate-500 leading-relaxed max-w-sm">
                  Абсолютната платформа за автоматизация, ценообразуване и комуникация в съвременното мебелно производство.
                </p>
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-6">Продукт</h3>
                <ul className="space-y-4 text-[14px] font-medium text-slate-600">
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Функции</a></li>
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Оферти и Цени</a></li>
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Калкулатор Дизайн</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-6">Правни</h3>
                <ul className="space-y-4 text-[14px] font-medium text-slate-600">
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Условия за ползване</a></li>
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Поверителност</a></li>
                  <li><a href="#" className="hover:text-black hover:translate-x-1 inline-block transition-all">Контакт с поддръжка</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                © 2026 STAIPO. ВСИЧКИ ПРАВА ЗАПАЗЕНИ.
              </div>
              <div className="flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <a href="#" className="hover:text-gray-900 transition">Условия</a>
                <a href="#" className="hover:text-gray-900 transition">Поверителност</a>
                <a href="#" className="hover:text-gray-900 transition">Контакт</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </AppShell>
  );
}
