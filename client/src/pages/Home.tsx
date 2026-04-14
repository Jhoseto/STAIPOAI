import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, FileUp, Zap, BarChart3, Palette } from "lucide-react";

/**
 * STAIPO AI - Sophisticated Color Palette
 * Graphite Black, Platinum Silver, Matte Gold, Deep Navy Blue
 * 
 * Premium, refined, professional aesthetic without playful elements
 * Elegant typography with Playfair Display
 * Sophisticated animations and luxurious details
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.3,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
    },
  },
};

const scaleVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.8,
    },
  },
};

const lineDrawVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 1.5,
    },
  },
};

const floatVariants = {
  initial: { y: 0 },
  animate: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      repeat: Infinity,
    },
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="container flex items-center justify-between h-16">
          <motion.div
            className="text-xl font-bold tracking-tight"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="font-playfair">STAIPO AI</span>
          </motion.div>
          <div className="flex gap-8 items-center">
            <motion.a
              href="#features"
              className="text-sm hover:text-primary transition-colors duration-300"
              whileHover={{ y: -2 }}
            >
              Функции
            </motion.a>
            <motion.a
              href="#workflow"
              className="text-sm hover:text-primary transition-colors duration-300"
              whileHover={{ y: -2 }}
            >
              Как работи
            </motion.a>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90 btn-premium">
                Начало
              </Button>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Refined blueprint grid background */}
        <div className="absolute inset-0 blueprint-grid opacity-40" />
        
        {/* Subtle background accents */}
        <motion.div
          className="absolute top-20 right-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div
          className="absolute bottom-20 left-10 w-72 h-72 bg-secondary/3 rounded-full blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
        />
        
        {/* Diagonal divider */}
        <svg
          className="absolute top-0 left-0 w-full h-40 opacity-20"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 0 50 Q 300 0, 600 50 T 1200 50 L 1200 0 L 0 0 Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            variants={lineDrawVariants}
            initial="hidden"
            animate="visible"
          />
        </svg>

        <motion.div
          className="container relative z-10"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left content */}
            <motion.div variants={itemVariants} className="space-y-8">
              <div className="space-y-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  className="flex items-center gap-2 text-primary"
                >
                  <div className="w-1 h-1 rounded-full bg-primary" />
                  <span className="text-sm font-medium tracking-wide">Платформа за автоматизирани оферти</span>
                </motion.div>
                <h1 className="text-6xl lg:text-7xl font-bold leading-tight">
                  STAIPO AI
                </h1>
                <p className="text-2xl text-muted-foreground font-light">
                  Интелигентна система за генериране на премиум оферти
                </p>
              </div>
              
              <p className="text-lg text-muted-foreground leading-relaxed max-w-xl font-light">
                Превърнете хаотичния процес на сметки и писане на оферти в безпроблемно, автоматизирано преживяване. Платформата анализира, синхронизира и генерира премиум оферти, които продават труда на по-висока цена.
              </p>
              
              <motion.div className="flex gap-4 pt-6" variants={itemVariants}>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 btn-premium">
                    Начало <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 btn-premium">
                    Видео демо
                  </Button>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Right - Hero image with floating effect */}
            <motion.div
              variants={scaleVariants}
              className="relative h-96 lg:h-[500px] rounded-lg overflow-hidden glow"
            >
              <motion.div
                variants={floatVariants}
                initial="initial"
                animate="animate"
                className="w-full h-full"
              >
                <img
                  src="https://d2xsxph8kpxj0f.cloudfront.net/310519663493766147/R569fKsLMx729PP7feox7R/hero-blueprint-architecture-kbmScG7CvgdZbyDJ9YRBcr.webp"
                  alt="Архитектурна визуализация"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
            </motion.div>
          </div>
        </motion.div>

        {/* Diagonal divider bottom */}
        <svg
          className="absolute bottom-0 left-0 w-full h-40 opacity-20"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 0 150 Q 300 200, 600 150 T 1200 150 L 1200 200 L 0 200 Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            variants={lineDrawVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4 }}
          />
        </svg>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 relative">
        <div className="absolute inset-0 blueprint-grid opacity-30" />
        
        {/* Background accent */}
        <motion.div
          className="absolute top-1/2 right-0 w-96 h-96 bg-primary/2 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 12, repeat: Infinity }}
        />
        
        <motion.div
          className="container relative z-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6">
              Интелигентни решения
            </h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-primary via-primary to-transparent mx-auto mb-6" />
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
              Автоматизирана система, която решава основните проблеми на производителите на мебели
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: FileUp,
                title: "Интелигентен импорт",
                description: "Системата разпознава и анализира PRO100 файлове с точност, извличайки всички критични данни",
              },
              {
                icon: Zap,
                title: "AI анализ",
                description: "Напреднал анализ на многоезични текстове с точно разпознаване на артикули и материали",
              },
              {
                icon: BarChart3,
                title: "Синхронизация",
                description: "Реално време синхронизация с доставчици за актуални цени и наличност",
              },
              {
                icon: Palette,
                title: "Премиум оферти",
                description: "Автоматично генериране на професионални оферти с елегантен дизайн",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="glass-premium rounded-lg p-8 hover:shadow-2xl transition-all duration-500 group cursor-pointer border border-border/50"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                <div className="flex items-start gap-6">
                  <motion.div
                    className="p-4 rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-all duration-300"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                  >
                    <feature.icon className="w-7 h-7 text-primary stroke-[1.5]" />
                  </motion.div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-3 group-hover:text-primary transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-light">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                {/* Accent line on hover */}
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary to-transparent"
                  initial={{ width: 0 }}
                  whileHover={{ width: "100%" }}
                  transition={{ duration: 0.4 }}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 blueprint-grid opacity-30" />
        
        {/* Diagonal divider */}
        <svg
          className="absolute top-0 left-0 w-full h-40 opacity-20"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 0 50 Q 300 0, 600 50 T 1200 50 L 1200 0 L 0 0 Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            variants={lineDrawVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          />
        </svg>

        <motion.div
          className="container relative z-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div variants={itemVariants} className="text-center mb-20">
            <h2 className="text-5xl lg:text-6xl font-bold mb-6">
              Процес на работа
            </h2>
            <div className="w-20 h-0.5 bg-gradient-to-r from-primary via-primary to-transparent mx-auto mb-6" />
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed font-light">
              Четири прости стъпки до професионална оферта
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            {[
              { step: "01", title: "Импорт", desc: "Качване на PRO100 файл" },
              { step: "02", title: "Анализ", desc: "AI разпознаване на данни" },
              { step: "03", title: "Синхронизация", desc: "Актуализиране на цени" },
              { step: "04", title: "Оферта", desc: "Генериране на документ" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="relative"
              >
                <motion.div
                  className="glass-premium rounded-lg p-8 text-center h-full flex flex-col items-center justify-center border border-border/50"
                  whileHover={{ y: -10, scale: 1.05 }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-bold text-lg mb-6 shadow-lg"
                    whileHover={{ scale: 1.15, rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    {item.step}
                  </motion.div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground font-light">{item.desc}</p>
                </motion.div>
                
                {idx < 3 && (
                  <motion.div
                    className="hidden md:flex absolute top-1/2 -right-4 transform -translate-y-1/2"
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <ArrowRight className="w-6 h-6 text-primary/40" />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Diagonal divider bottom */}
        <svg
          className="absolute bottom-0 left-0 w-full h-40 opacity-20"
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
        >
          <motion.path
            d="M 0 150 Q 300 200, 600 150 T 1200 150 L 1200 200 L 0 200 Z"
            stroke="currentColor"
            strokeWidth="1"
            fill="none"
            variants={lineDrawVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
          />
        </svg>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative">
        <div className="absolute inset-0 blueprint-grid opacity-40" />
        
        {/* Animated background circles */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
          transition={{ duration: 15, repeat: Infinity }}
        />
        
        <motion.div
          className="container relative z-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <motion.div
            variants={itemVariants}
            className="glass-premium rounded-xl p-16 text-center max-w-3xl mx-auto glow-strong border border-border/50"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              <h2 className="text-5xl lg:text-6xl font-bold mb-6">
                Трансформирайте вашия бизнес
              </h2>
            </motion.div>
            
            <motion.p
              className="text-lg text-muted-foreground mb-10 leading-relaxed font-light"
              variants={itemVariants}
            >
              Присъединете се към производителите, които вече спестяват часове на работа и продават на по-висока цена с автоматизирани премиум оферти
            </motion.p>
            
            <motion.div className="flex gap-4 justify-center flex-wrap" variants={itemVariants}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 btn-premium">
                  Начало сега <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary/5 btn-premium">
                  Контакт
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-background/50 backdrop-blur-sm">
        <div className="container">
          <motion.div
            className="flex flex-col md:flex-row justify-between items-center gap-8 text-sm text-muted-foreground"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div>© 2026 STAIPO AI. Всички права запазени.</div>
            <div className="flex gap-8">
              <motion.a href="#" className="hover:text-foreground transition-colors" whileHover={{ x: 2 }}>
                Политика
              </motion.a>
              <motion.a href="#" className="hover:text-foreground transition-colors" whileHover={{ x: 2 }}>
                Условия
              </motion.a>
              <motion.a href="#" className="hover:text-foreground transition-colors" whileHover={{ x: 2 }}>
                Контакт
              </motion.a>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
