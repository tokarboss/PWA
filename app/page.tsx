import Link from 'next/link';
import { ShieldCheck, Sparkles, Wrench, ArrowUpRight, Layers, Smartphone, Camera, Zap, CheckCircle, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-gray-950 bg-astryx-grid text-gray-100 flex flex-col justify-between overflow-hidden">
      {/* Футуристичные градиентные сферы фона */}
      <div className="pointer-events-none fixed inset-0 flex justify-center items-start">
        <div className="w-[800px] h-[400px] bg-indigo-600/20 blur-[160px] rounded-full -top-32 absolute animate-pulse" />
        <div className="w-[600px] h-[350px] bg-rose-600/15 blur-[160px] rounded-full top-1/3 right-10 absolute" />
      </div>

      <header className="relative z-10 max-w-7xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.06] backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-rose-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-black tracking-wider text-white text-lg">ASTRYX <span className="text-indigo-400">AUTO</span></span>
            <span className="ml-2.5 text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Production v2.5
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin"
            className="text-xs font-semibold px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 border border-white/10 text-gray-200 transition flex items-center gap-2 shadow-inner"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Master Control
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full astryx-card-glass text-xs font-medium text-indigo-300 shadow-2xl">
          <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>Готовая SaaS-платформа для запуска автобизнеса в вашем городе</span>
        </div>

        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tight text-white max-w-5xl mx-auto leading-[1.05]">
          Облачная экосистема для{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
            автосервисов
          </span>
        </h1>

        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mt-8 leading-relaxed font-normal">
          White-Label PWA витрины с динамическим пересчетом цен под кузов, галереи «До / После», сбор 5-звездочных отзывов и QR-стенды для боксов.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mt-12">
          <Link
            href="/superadmin"
            className="px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition flex items-center gap-2.5 shadow-2xl shadow-indigo-600/40 transform hover:-translate-y-0.5"
          >
            <ShieldCheck className="w-4 h-4" />
            Открыть Супер-Админку (PIN: 9999)
          </Link>
          <Link
            href="/client/apex"
            className="px-8 py-4 rounded-2xl astryx-card-glass hover:bg-gray-800 text-white font-bold text-sm transition flex items-center gap-2.5 border border-white/15"
          >
            Демо PWA: Apex Detailing
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </Link>
        </div>

        {/* Bento Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 text-left">
          <div className="astryx-card-glass p-8 rounded-3xl relative overflow-hidden group hover:border-indigo-500/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6">
              <Layers className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Multi-Tenant White-Label</h3>
            <p className="text-sm text-gray-400 mt-2.5 leading-relaxed">
              Создавайте неограниченное число автосервисов в 1 клик. Каждый получает персональный URL, логотип, цвета и PIN-код админки.
            </p>
          </div>

          <div className="astryx-card-glass p-8 rounded-3xl relative overflow-hidden group hover:border-rose-500/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6">
              <Camera className="w-6 h-6 text-rose-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Портфолио & QR-стенды</h3>
            <p className="text-sm text-gray-400 mt-2.5 leading-relaxed">
              Интерактивный переключатель «До / После» для кейсов мастеров и мгновенная генерация готовых постер-стендов для ресепшена.
            </p>
          </div>

          <div className="astryx-card-glass p-8 rounded-3xl relative overflow-hidden group hover:border-emerald-500/40 transition duration-300">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-bold text-white text-lg">Монетизация & Экспорт CSV</h3>
            <p className="text-sm text-gray-400 mt-2.5 leading-relaxed">
              Контроль оплаты подписок владельцами СТО, аналитика выручки и выгрузка отчетов в Excel/CSV с корректной русской кодировкой.
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-8 text-center text-xs text-gray-500">
        Astryx Design Engine • Next.js App Router • Supabase Cloud Ready
      </footer>
    </div>
  );
}
