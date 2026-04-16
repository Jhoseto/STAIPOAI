import Link from "next/link";
import { aiUrl } from "@/lib/api";
import { ScraperTrigger } from "@/components/scraper-trigger";

export default async function SettingsPage() {
  return (
    <div className="w-full space-y-10 px-4 md:px-8 max-w-full">
      <div className="pb-6 border-b border-gray-200">
        <div className="line-divider" />
        <span className="text-small">Конфигурация</span>
        <h1 className="text-4xl font-light tracking-tight mt-4">Настройки</h1>
        <p className="text-sm text-gray-600 mt-3">
          Управлявайте предпочитанията на вашия профил и актуализирайте данните за продуктите.
        </p>
      </div>
      
      <div className="card-luxury p-4 md:p-8 w-full max-w-full overflow-x-hidden">
        <ScraperTrigger />
      </div>

      <div className="pt-4">
        <Link href="/app" className="text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-900 transition-colors">
          ← Назад към таблото
        </Link>
      </div>
    </div>
  );
}
