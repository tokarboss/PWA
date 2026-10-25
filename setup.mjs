// setup.mjs — Автоматический сборщик проекта AutoService SaaS
import fs from 'fs';
import path from 'path';

const files = {
  'package.json': JSON.stringify({
    name: 'autoservice-saas-pwa',
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start'
    },
    dependencies: {
      '@supabase/supabase-js': '^2.45.4',
      'next': '14.2.15',
      'react': '^18.3.1',
      'react-dom': '^18.3.1',
      'lucide-react': '^0.454.0'
    },
    devDependencies: {
      '@types/node': '^20.16.10',
      '@types/react': '^18.3.11',
      '@types/react-dom': '^18.3.1',
      'autoprefixer': '^10.4.20',
      'postcss': '^8.4.47',
      'tailwindcss': '^3.4.13',
      'typescript': '^5.6.3'
    }
  }, null, 2),

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      lib: ['dom', 'dom.iterable', 'esnext'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'esnext',
      moduleResolution: 'bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'preserve',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] }
    },
    include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
    exclude: ['node_modules']
  }, null, 2),

  'next.config.mjs': `/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};
export default nextConfig;
`,

  'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
export default config;
`,

  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
`,

  '.env.local': `NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
`,

  'public/manifest.json': JSON.stringify({
    name: 'AutoService White-Label PWA',
    short_name: 'AutoService',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#2563eb',
    icons: [
      {
        src: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  }, null, 2),

  'supabase_schema.sql': `-- Выполните этот скрипт в Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    brand_color TEXT NOT NULL DEFAULT '#2563eb',
    pin_code TEXT NOT NULL DEFAULT '1234',
    is_paid BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    base_price NUMERIC NOT NULL,
    duration_min INTEGER NOT NULL DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    service_title TEXT NOT NULL,
    car_class TEXT NOT NULL,
    price NUMERIC NOT NULL,
    client_name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access tenants" ON public.tenants;
CREATE POLICY "Public access tenants" ON public.tenants FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access services" ON public.services;
CREATE POLICY "Public access services" ON public.services FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public access bookings" ON public.bookings;
CREATE POLICY "Public access bookings" ON public.bookings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.tenants (id, name, phone, address, brand_color, pin_code, is_paid)
VALUES
  ('apex', 'Apex Detailing Studio', '+7 (999) 111-22-33', 'ул. Ленина, 45', '#dc2626', '1234', true),
  ('matsuri', 'Matsuri Tire & Service', '+7 (999) 777-88-99', 'пр. Мира, 102', '#16a34a', '0000', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (tenant_id, title, category, base_price, duration_min)
VALUES
  ('apex', 'Трехфазная детейлинг-мойка', 'Мойка', 2500, 60),
  ('apex', 'Полировка кузова + Керамика 9H', 'Детейлинг', 28000, 240),
  ('apex', 'Полная химчистка салона', 'Детейлинг', 14000, 180),
  ('apex', 'Антидождь всех стекол', 'Защита', 3500, 45),
  ('matsuri', 'Комплексный шиномонтаж R16-R18', 'Шиномонтаж', 3200, 45),
  ('matsuri', 'Лазерная балансировка 4 колес', 'Шиномонтаж', 1600, 30),
  ('matsuri', 'Замена тормозных колодок (ось)', 'Ремонт', 2000, 60);
`,

  'lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
`,

  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  background-color: #020617;
  color: #f8fafc;
}
`,

  'app/layout.tsx': `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoService SaaS Platform',
  description: 'White-Label PWA платформа для автосервисов, детейлинга и шиномонтажа',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
`,

  'app/page.tsx': `import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <div className="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider text-indigo-400 uppercase bg-indigo-950/60 border border-indigo-800/60 rounded-full">
        White-Label Multi-Tenant SaaS
      </div>
      <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight text-white">
        AutoService <span className="text-indigo-500">Cloud PWA</span>
      </h1>
      <p className="text-slate-400 text-base md:text-lg max-w-xl mb-8">
        Единая платформа управления автосервисами: брендированные клиентские PWA-приложения, умное бронирование боксов и AI-диспетчер.
      </p>
      <div className="flex flex-wrap justify-center gap-4">
        <Link
          href="/superadmin"
          className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition shadow-lg shadow-indigo-600/20"
        >
          Супер-Админка (PIN: 9999)
        </Link>
        <Link
          href="/client/apex"
          className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-semibold transition"
        >
          Витрина: Apex Detailing
        </Link>
        <Link
          href="/client/apex/admin"
          className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl font-semibold transition"
        >
          Админка Apex (PIN: 1234)
        </Link>
      </div>
    </div>
  );
}
`,

  'app/superadmin/page.tsx': `'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  address: string;
  brand_color: string;
  pin_code: string;
  is_paid: boolean;
  created_at: string;
}

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#2563eb');
  const [pinCode, setPinCode] = useState('1234');
  const [isPaid, setIsPaid] = useState(true);

  const MASTER_PIN = '9999';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === MASTER_PIN) {
      setAuthenticated(true);
      fetchTenants();
    } else {
      alert('Неверный Мастер-PIN! Используйте 9999');
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTenants(data);
    if (error) alert('Ошибка Supabase: ' + error.message);
    setLoading(false);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
    if (!cleanId) {
      alert('ID должен содержать латинские буквы или цифры');
      return;
    }

    const { error } = await supabase.from('tenants').insert([
      {
        id: cleanId,
        name,
        phone,
        address,
        brand_color: brandColor,
        pin_code: pinCode,
        is_paid: isPaid,
      },
    ]);

    if (error) {
      alert('Ошибка создания: ' + error.message);
    } else {
      await supabase.from('services').insert([
        {
          tenant_id: cleanId,
          title: 'Комплексная диагностика / Мойка',
          category: 'Базовые услуги',
          base_price: 2000,
          duration_min: 60,
        },
      ]);
      setId('');
      setName('');
      setPhone('');
      setAddress('');
      fetchTenants();
    }
  };

  const togglePayment = async (tenantId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('tenants')
      .update({ is_paid: !currentStatus })
      .eq('id', tenantId);
    if (error) alert(error.message);
    else fetchTenants();
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Удалить автосервис ' + tenantId + ' и все его записи?')) return;
    const { error } = await supabase.from('tenants').delete().eq('id', tenantId);
    if (error) alert(error.message);
    else fetchTenants();
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <div className="text-center mb-6">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">SaaS Control</span>
            <h1 className="text-2xl font-extrabold text-white mt-1">Master Control Center</h1>
            <p className="text-xs text-slate-400 mt-2">Мастер PIN-код по умолчанию: 9999</p>
          </div>
          <input
            type="password"
            placeholder="Введите Мастер-PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-lg tracking-widest mb-4 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3.5 rounded-xl font-bold transition"
          >
            Разблокировать
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b border-slate-800 pb-5">
        <div>
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">SuperAdmin</span>
          <h1 className="text-3xl font-extrabold text-white">Управление SaaS-арендаторами</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/" className="text-sm bg-slate-900 border border-slate-800 hover:bg-slate-800 px-4 py-2 rounded-xl">
            На главную
          </Link>
          <button
            onClick={() => setAuthenticated(false)}
            className="text-sm bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 px-4 py-2 rounded-xl"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl h-fit">
          <h2 className="text-xl font-bold mb-4">Регистрация Тенанта</h2>
          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400">Slug / ID в ссылке (например: apex)</label>
              <input
                type="text"
                required
                placeholder="garage77"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Название Автосервиса</label>
              <input
                type="text"
                required
                placeholder="Detailing Pro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Телефон</label>
              <input
                type="text"
                required
                placeholder="+7 (999) 000-00-00"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400">Адрес</label>
              <input
                type="text"
                required
                placeholder="ул. Гагарина, 12"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400">Брендовый цвет</label>
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-full h-11 p-1 rounded-xl bg-slate-800 border border-slate-700 mt-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400">PIN владельца</label>
                <input
                  type="text"
                  required
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 mt-1 text-sm"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              <span className="text-sm text-slate-300">Подписка активна (Оплачено)</span>
            </label>
            <button
              type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3.5 rounded-xl transition"
            >
              Создать Автосервис
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Подключенные Автосервисы ({tenants.length})</h2>
            <button onClick={fetchTenants} className="text-xs text-indigo-400 hover:underline">
              Обновить список
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Загрузка из базы данных...</div>
          ) : tenants.length === 0 ? (
            <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl text-slate-400">
              Тенанты не найдены. Выполните SQL-скрипт supabase_schema.sql или добавьте первый сервис слева.
            </div>
          ) : (
            tenants.map((t) => (
              <div
                key={t.id}
                className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div
                    className="w-6 h-6 rounded-full mt-1 flex-shrink-0 border border-white/20 shadow"
                    style={{ backgroundColor: t.brand_color }}
                  />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-lg text-white">{t.name}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                        /client/{t.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t.address} • {t.phone}
                    </p>
                    <p className="text-xs text-indigo-400 font-mono mt-1">PIN владельца: {t.pin_code}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                  <button
                    onClick={() => togglePayment(t.id, t.is_paid)}
                    className={
                      t.is_paid
                        ? 'px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 hover:bg-emerald-900'
                        : 'px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-950 text-rose-400 border border-rose-800 hover:bg-rose-900'
                    }
                  >
                    {t.is_paid ? 'Оплачено' : 'Заблокировано'}
                  </button>
                  <Link
                    href={'/client/' + t.id}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700"
                  >
                    Открыть PWA
                  </Link>
                  <Link
                    href={'/client/' + t.id + '/admin'}
                    className="px-3.5 py-2 text-xs font-semibold bg-indigo-950 text-indigo-300 hover:bg-indigo-900 rounded-xl border border-indigo-800"
                  >
                    Кабинет владельца
                  </Link>
                  <button
                    onClick={() => deleteTenant(t.id)}
                    className="px-3 py-2 text-xs bg-red-950/60 text-red-400 hover:bg-red-900 rounded-xl border border-red-900"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
`,

  'app/client/[tenantId]/layout.tsx': `export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-950 text-slate-100">{children}</div>;
}
`,

  'app/client/[tenantId]/page.tsx': `'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Tenant {
  id: string;
  name: string;
  phone: string;
  address: string;
  brand_color: string;
  is_paid: boolean;
}

interface Service {
  id: string;
  title: string;
  category: string;
  base_price: number;
  duration_min: number;
}

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function TenantClientPWA() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const [carClass, setCarClass] = useState<'sedan' | 'crossover' | 'suv'>('sedan');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00');
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [bookingStatusMsg, setBookingStatusMsg] = useState('');

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const carMultipliers = {
    sedan: { name: 'Седан', mult: 1.0, icon: '🚗' },
    crossover: { name: 'Кроссовер', mult: 1.2, icon: '🚙' },
    suv: { name: 'Джип / SUV', mult: 1.4, icon: '🛻' },
  };

  useEffect(() => {
    if (tenantId) loadData();
  }, [tenantId]);

  useEffect(() => {
    if (selectedService && bookingDate) {
      fetchBusySlots(bookingDate);
    }
  }, [selectedService, bookingDate]);

  const loadData = async () => {
    setLoading(true);
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();

    if (tenantData) {
      setTenant(tenantData);
      if (tenantData.is_paid) {
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: true });
        if (servicesData) setServices(servicesData);
      }
    }
    setLoading(false);
  };

  const fetchBusySlots = async (dateStr: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('booking_time')
      .eq('tenant_id', tenantId)
      .eq('booking_date', dateStr)
      .eq('status', 'confirmed');

    if (data) {
      const occupied = data.map((b) => b.booking_time.slice(0, 5));
      setBusySlots(occupied);
      if (occupied.includes(bookingTime)) {
        const firstFree = TIME_SLOTS.find((s) => !occupied.includes(s));
        if (firstFree) setBookingTime(firstFree);
      }
    }
  };

  const categories = ['Все', ...Array.from(new Set(services.map((s) => s.category)))];
  const filteredServices =
    selectedCategory === 'Все' ? services : services.filter((s) => s.category === selectedCategory);

  const calculatePrice = (basePrice: number) => Math.round(basePrice * carMultipliers[carClass].mult);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !bookingDate || !bookingTime || !clientName || !clientPhone) return;

    if (busySlots.includes(bookingTime)) {
      setBookingStatusMsg('❌ Выбранный слот уже занят. Выберите другое время.');
      return;
    }

    setBookingStatusMsg('Отправка бронирования...');

    const finalPrice = calculatePrice(selectedService.base_price);
    const { error } = await supabase.from('bookings').insert([
      {
        tenant_id: tenantId,
        service_id: selectedService.id,
        service_title: selectedService.title,
        car_class: carMultipliers[carClass].name,
        price: finalPrice,
        client_name: clientName,
        client_phone: clientPhone,
        booking_date: bookingDate,
        booking_time: bookingTime,
        status: 'confirmed',
      },
    ]);

    if (error) {
      setBookingStatusMsg('❌ Ошибка: ' + error.message);
    } else {
      setBookingStatusMsg('✅ Вы успешно записаны на ' + bookingDate + ' в ' + bookingTime + '!');
      fetchBusySlots(bookingDate);
      setTimeout(() => {
        setSelectedService(null);
        setBookingStatusMsg('');
        setClientName('');
        setClientPhone('');
      }, 1800);
    }
  };

  const handleAiAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiQuery,
          tenantName: tenant?.name,
          carClass: carMultipliers[carClass].name,
          multiplier: carMultipliers[carClass].mult,
          services,
        }),
      });
      const data = await res.json();
      setAiResponse(data.reply || 'Не удалось получить ответ.');
    } catch {
      setAiResponse('Ошибка соединения с AI-диспетчером.');
    }
    setAiLoading(false);
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Загрузка PWA приложения...</div>;
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <h1 className="text-2xl font-bold text-rose-400 mb-2">Автосервис не найден</h1>
        <p className="text-slate-400 text-sm mb-6">Проверьте правильность ссылки или создайте тенант в Супер-Админке.</p>
        <Link href="/superadmin" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-semibold">
          Перейти в /superadmin
        </Link>
      </div>
    );
  }

  if (!tenant.is_paid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-slate-950 text-center">
        <div className="max-w-md w-full bg-slate-900 border border-rose-900/50 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-rose-950 text-rose-400 border border-rose-800 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
            🔒
          </div>
          <h1 className="text-2xl font-extrabold mb-2">{tenant.name}</h1>
          <p className="text-slate-400 text-sm mb-6">
            Доступ к онлайн-записи этого автосервиса временно приостановлен (подписка не оплачена).
          </p>
          <a
            href={'tel:' + tenant.phone}
            className="block w-full bg-slate-800 hover:bg-slate-700 text-white py-3.5 rounded-xl font-bold transition"
          >
            Позвонить: {tenant.phone}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto min-h-screen pb-16 bg-slate-950 shadow-2xl border-x border-slate-900">
      <header
        className="p-6 rounded-b-3xl shadow-xl relative overflow-hidden"
        style={{ backgroundColor: tenant.brand_color }}
      >
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[11px] font-bold tracking-widest uppercase bg-black/25 px-2.5 py-1 rounded-full">
              Онлайн-запись 24/7
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-2">{tenant.name}</h1>
            <p className="text-xs text-white/90 mt-2">📍 {tenant.address}</p>
            <p className="text-xs text-white/90 mt-0.5">📞 {tenant.phone}</p>
          </div>
          <Link
            href={'/client/' + tenant.id + '/admin'}
            className="text-xs bg-black/30 hover:bg-black/40 text-white px-3 py-1.5 rounded-xl font-medium"
          >
            Владельцу
          </Link>
        </div>
      </header>

      <section className="p-4 mt-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          1. Выберите кузов (пересчет цен)
        </h2>
        <div className="grid grid-cols-3 gap-2.5">
          {(Object.keys(carMultipliers) as Array<keyof typeof carMultipliers>).map((key) => {
            const item = carMultipliers[key];
            const active = carClass === key;
            return (
              <button
                key={key}
                onClick={() => setCarClass(key)}
                style={active ? { borderColor: tenant.brand_color } : {}}
                className={
                  active
                    ? 'p-3 rounded-2xl text-xs font-bold border-2 bg-slate-900 text-white shadow-lg flex flex-col items-center'
                    : 'p-3 rounded-2xl text-xs font-medium border border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-900 flex flex-col items-center'
                }
              >
                <span className="text-xl mb-1">{item.icon}</span>
                <span>{item.name}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">коэф. x{item.mult}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-4 py-1">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-400">🤖 AI-Диспетчер автосервиса</span>
            <span className="text-[10px] text-slate-500">Подбор услуг и времени</span>
          </div>
          <form onSubmit={handleAiAsk} className="flex gap-2">
            <input
              type="text"
              placeholder="Например: сколько стоит полировка или мойка?"
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              className="flex-1 p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={aiLoading}
              style={{ backgroundColor: tenant.brand_color }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition"
            >
              {aiLoading ? '...' : 'Спросить'}
            </button>
          </form>
          {aiResponse && (
            <div className="text-xs text-slate-200 mt-3 p-3 bg-slate-800/80 border border-slate-700 rounded-xl leading-relaxed">
              {aiResponse}
            </div>
          )}
        </div>
      </section>

      <section className="px-4 pt-4 pb-2">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
          2. Каталог услуг ({filteredServices.length})
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={selectedCategory === cat ? { backgroundColor: tenant.brand_color } : {}}
              className={
                selectedCategory === cat
                  ? 'px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap'
                  : 'px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800 whitespace-nowrap'
              }
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      <section className="px-4 space-y-3 mt-1">
        {filteredServices.map((service) => {
          const finalPrice = calculatePrice(service.base_price);
          return (
            <div
              key={service.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex justify-between items-center gap-3 hover:border-slate-700 transition"
            >
              <div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                  {service.category}
                </span>
                <h3 className="font-bold text-sm text-white mt-1.5">{service.title}</h3>
                <p className="text-xs text-slate-400 mt-1">⏱ Длительность: ~{service.duration_min} мин</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-extrabold text-emerald-400">{finalPrice} ₽</div>
                <button
                  onClick={() => {
                    setSelectedService(service);
                    setBookingStatusMsg('');
                  }}
                  style={{ backgroundColor: tenant.brand_color }}
                  className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition"
                >
                  Выбрать слот
                </button>
              </div>
            </div>
          );
        })}
      </section>

      {selectedService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-lg">Бронирование бокса</h3>
              <button
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-800/70 border border-slate-700 p-3.5 rounded-2xl">
              <p className="font-bold text-sm text-white">{selectedService.title}</p>
              <p className="text-xs text-slate-300 mt-1">
                Кузов: <b>{carMultipliers[carClass].name}</b> • К оплате:{' '}
                <span className="text-emerald-400 font-extrabold">
                  {calculatePrice(selectedService.base_price)} ₽
                </span>
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400">Дата визита</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-2">
                  Доступные слоты ({bookingDate})
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map((slot) => {
                    const isBusy = busySlots.includes(slot);
                    const isSelected = bookingTime === slot && !isBusy;
                    return (
                      <button
                        type="button"
                        key={slot}
                        disabled={isBusy}
                        onClick={() => setBookingTime(slot)}
                        style={isSelected ? { backgroundColor: tenant.brand_color } : {}}
                        className={
                          isBusy
                            ? 'py-2 rounded-xl text-xs font-medium bg-rose-950/40 border border-rose-900/40 text-rose-500/60 line-through cursor-not-allowed'
                            : isSelected
                            ? 'py-2 rounded-xl text-xs font-bold text-white shadow'
                            : 'py-2 rounded-xl text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-500'
                        }
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Ваше имя</label>
                <input
                  type="text"
                  required
                  placeholder="Алексей"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400">Телефон для связи</label>
                <input
                  type="tel"
                  required
                  placeholder="+7 (999) 000-00-00"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white mt-1"
                />
              </div>

              {bookingStatusMsg && (
                <div className="p-3 rounded-xl bg-slate-800 text-xs text-center font-semibold text-amber-300">
                  {bookingStatusMsg}
                </div>
              )}

              <button
                type="submit"
                style={{ backgroundColor: tenant.brand_color }}
                className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition hover:opacity-95"
              >
                Подтвердить запись на {bookingTime}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`,

  'app/client/[tenantId]/admin/page.tsx': `'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Service {
  id: string;
  title: string;
  category: string;
  base_price: number;
  duration_min: number;
}

interface Booking {
  id: string;
  service_title: string;
  car_class: string;
  price: number;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
}

export default function TenantAdminPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [saveMessage, setSaveMessage] = useState('');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Детейлинг');
  const [newPrice, setNewPrice] = useState('2500');
  const [newDuration, setNewDuration] = useState('60');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase
      .from('tenants')
      .select('pin_code')
      .eq('id', tenantId)
      .single();

    if (error || !data) {
      alert('Автосервис не найден');
      return;
    }

    if (data.pin_code === pin) {
      setAuthenticated(true);
      loadAdminData();
    } else {
      alert('Неверный PIN-код владельца!');
    }
  };

  const loadAdminData = async () => {
    const { data: sData } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true });
    if (sData) setServices(sData);

    const { data: bData } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('booking_date', { ascending: false });
    if (bData) setBookings(bData);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('services').insert([
      {
        tenant_id: tenantId,
        title: newTitle,
        category: newCategory,
        base_price: Number(newPrice),
        duration_min: Number(newDuration),
      },
    ]);

    if (!error) {
      setNewTitle('');
      loadAdminData();
    } else {
      alert(error.message);
    }
  };

  const handleUpdateService = async (service: Service) => {
    const { error } = await supabase
      .from('services')
      .update({
        base_price: Number(service.base_price),
        duration_min: Number(service.duration_min),
      })
      .eq('id', service.id);

    if (!error) {
      setSaveMessage('✅ Цены и длительность обновлены!');
      setTimeout(() => setSaveMessage(''), 2000);
      loadAdminData();
    } else {
      alert(error.message);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу из прайса?')) return;
    await supabase.from('services').delete().eq('id', id);
    loadAdminData();
  };

  const updateLocalService = (id: string, field: 'base_price' | 'duration_min', value: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: Number(value) } : s))
    );
  };

  const toggleBookingStatus = async (bookingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'cancelled' ? 'confirmed' : 'cancelled';
    await supabase.from('bookings').update({ status: nextStatus }).eq('id', bookingId);
    loadAdminData();
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl"
        >
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-400 block text-center">
            Кабинет Владельца
          </span>
          <h2 className="text-2xl font-extrabold text-center mt-1 mb-6">Сервис: {tenantId}</h2>
          <input
            type="password"
            placeholder="PIN-код сервиса"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-center text-lg tracking-widest mb-4 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-3.5 rounded-xl font-bold text-white transition"
          >
            Войти в систему
          </button>
          <Link
            href={'/client/' + tenantId}
            className="block text-center text-xs text-slate-400 hover:text-white mt-4"
          >
            ← Вернуться в клиентское PWA
          </Link>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8 border-b border-slate-800 pb-4">
        <div>
          <span className="text-xs text-indigo-400 font-bold uppercase">Панель владельца</span>
          <h1 className="text-2xl font-extrabold">Управление сервисом: {tenantId}</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href={'/client/' + tenantId}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-4 py-2.5 rounded-xl font-semibold"
          >
            Открыть витрину PWA
          </Link>
          <button
            onClick={() => setAuthenticated(false)}
            className="text-xs bg-rose-950/70 text-rose-300 border border-rose-800 px-4 py-2.5 rounded-xl font-semibold"
          >
            Выйти
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <h2 className="font-bold text-lg mb-4">Добавить новую услугу</h2>
            <form onSubmit={handleAddService} className="space-y-3">
              <input
                type="text"
                placeholder="Название услуги"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs"
              />
              <input
                type="text"
                placeholder="Категория (Мойка, Детейлинг, Шиномонтаж)"
                required
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700 text-xs"
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400">Базовая цена (₽)</label>
                  <input
                    type="number"
                    required
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400">Длительность (мин)</label>
                  <input
                    type="number"
                    required
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-xs mt-1"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-bold text-white"
              >
                + Добавить в прайс-лист
              </button>
            </form>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-lg">Цены и длительность ({services.length})</h2>
              {saveMessage && <span className="text-xs text-emerald-400 font-semibold">{saveMessage}</span>}
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {services.map((s) => (
                <div key={s.id} className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase text-indigo-400 font-bold">{s.category}</span>
                      <p className="font-bold text-xs text-white">{s.title}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="text-xs text-slate-500 hover:text-rose-400"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <label className="text-[10px] text-slate-400">Цена (₽)</label>
                      <input
                        type="number"
                        value={s.base_price}
                        onChange={(e) => updateLocalService(s.id, 'base_price', e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-bold text-emerald-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Время (мин)</label>
                      <input
                        type="number"
                        value={s.duration_min}
                        onChange={(e) => updateLocalService(s.id, 'duration_min', e.target.value)}
                        className="w-full p-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateService(s)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-lg text-xs font-bold"
                    >
                      Сохранить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 p-5 rounded-3xl h-fit">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-lg">Журнал записей клиентов ({bookings.length})</h2>
            <button onClick={loadAdminData} className="text-xs text-indigo-400 hover:underline">
              Обновить
            </button>
          </div>

          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">Записей пока нет.</div>
            ) : (
              bookings.map((b) => {
                const isCancelled = b.status === 'cancelled';
                return (
                  <div
                    key={b.id}
                    className={
                      isCancelled
                        ? 'p-4 rounded-2xl border border-rose-900/30 bg-slate-950/60 opacity-60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'
                        : 'p-4 rounded-2xl border border-slate-700 bg-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3'
                    }
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-white">{b.service_title}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-200">
                          {b.car_class}
                        </span>
                        {isCancelled && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-950 text-rose-400 border border-rose-800">
                            Отменено
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5">
                        👤 <b>{b.client_name}</b> • 📞 <a href={'tel:' + b.client_phone} className="underline">{b.client_phone}</a>
                      </p>
                      <p className="text-xs text-indigo-400 font-semibold mt-1">
                        📅 {b.booking_date} в {b.booking_time}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="font-extrabold text-emerald-400 text-base">{b.price} ₽</span>
                      <button
                        onClick={() => toggleBookingStatus(b.id, b.status)}
                        className={
                          isCancelled
                            ? 'px-3 py-1.5 text-xs bg-slate-800 text-slate-300 rounded-xl border border-slate-700'
                            : 'px-3 py-1.5 text-xs bg-rose-950 text-rose-400 hover:bg-rose-900 rounded-xl border border-rose-800 font-semibold'
                        }
                      >
                        {isCancelled ? 'Восстановить' : 'Отменить'}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`,

  'app/api/ai-assistant/route.ts': `import { NextResponse } from 'next/server';

interface ServiceItem {
  title: string;
  category: string;
  base_price: number;
  duration_min: number;
}

export async function POST(req: Request) {
  try {
    const { prompt, tenantName, carClass, multiplier = 1, services = [] } = await req.json();
    const q = (prompt || '').toLowerCase();

    const matched = (services as ServiceItem[]).filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );

    const listToFormat = matched.length > 0 ? matched : (services as ServiceItem[]).slice(0, 3);

    const formatted = listToFormat
      .map(
        (s) =>
          s.title +
          ' — ' +
          Math.round(s.base_price * Number(multiplier)) +
          ' ₽ (~' +
          s.duration_min +
          ' мин)'
      )
      .join('; ');

    const reply =
      matched.length > 0
        ? 'Для вашего авто (' +
          carClass +
          ') в «' +
          tenantName +
          '» отлично подойдут: ' +
          formatted +
          '. Нажмите «Выбрать слот» напротив нужной услуги, чтобы занять свободный бокс!'
        : 'В «' +
          tenantName +
          '» для кузова «' +
          carClass +
          '» популярны следующие услуги: ' +
          formatted +
          '. Выберите любую услугу ниже, чтобы посмотреть свободные часы на сегодня.';

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { reply: 'Не удалось обработать запрос. Попробуйте выбрать услугу из каталога.' },
      { status: 500 }
    );
  }
}
`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Создан файл:', filePath);
}

console.log('\n🚀 Проект успешно собран!');
console.log('1. Выполните: npm install');
console.log('2. Загрузите файл supabase_schema.sql в SQL Editor вашего проекта Supabase');
console.log('3. Укажите ваши NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в файле .env.local');
console.log('4. Запустите проект: npm run dev');