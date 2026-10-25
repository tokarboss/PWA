// build-prod.mjs — Полная сборка SaaS-платформы автосервисов (Production Ready)
import fs from 'fs';
import path from 'path';

const files = {
  'package.json': JSON.stringify({
    name: 'autoservice-saas-production',
    version: '2.0.0',
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
const nextConfig = { reactStrictMode: true };
export default nextConfig;`,

  'postcss.config.mjs': `/** @type {import('postcss-load-config').Config} */
const config = { plugins: { tailwindcss: {}, autoprefixer: {} } };
export default config;`,

  'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './lib/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
};`,

  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: dark; }
body {
  background-color: #09090b;
  color: #fafafa;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}
.bg-astryx-grid {
  background-size: 32px 32px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: #09090b; }
::-webkit-scrollbar-thumb { background: #27272a; border-radius: 9999px; }
::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

@media print {
  body { background: #ffffff !important; color: #000000 !important; }
  .no-print { display: none !important; }
  .print-only-stand { margin: 0 auto !important; box-shadow: none !important; border: 2px solid #18181b !important; max-width: 420px !important; }
}`,

  'lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dczjhmrgcgptzegyhvfq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG';

export const supabase = createClient(supabaseUrl, supabaseKey);`,

  'lib/db.ts': `import { supabase } from './supabase';

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  address: string;
  brand_color: string;
  logo_url?: string;
  pin_code: string;
  is_paid: boolean;
  created_at?: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  title: string;
  category: string;
  base_price: number;
  duration_min: number;
}

export interface Booking {
  id: string;
  tenant_id: string;
  service_id: string;
  service_title: string;
  car_class: string;
  price: number;
  client_name: string;
  client_phone: string;
  booking_date: string;
  booking_time: string;
  status: string;
}

export interface PortfolioItem {
  id: string;
  tenant_id: string;
  title: string;
  car_model: string;
  category: string;
  image_url: string;
  before_image_url?: string;
  price: number;
  description: string;
}

export interface ReviewItem {
  id: string;
  tenant_id: string;
  client_name: string;
  car_model: string;
  service_title: string;
  rating: number;
  comment: string;
  owner_reply?: string;
  created_at: string;
}

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'apex',
    name: 'Apex Detailing Studio',
    phone: '+7 (999) 111-22-33',
    address: 'ул. Ленина, 45, бокс 1-4',
    brand_color: '#e11d48',
    logo_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=200&q=80',
    pin_code: '1234',
    is_paid: true,
  },
  {
    id: 'matsuri',
    name: 'Matsuri Tire & Garage',
    phone: '+7 (999) 777-88-99',
    address: 'пр. Мира, 102',
    brand_color: '#10b981',
    logo_url: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=200&q=80',
    pin_code: '0000',
    is_paid: true,
  },
];

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', tenant_id: 'apex', title: 'Трехфазная детейлинг-мойка', category: 'Мойка', base_price: 2500, duration_min: 60 },
  { id: 's2', tenant_id: 'apex', title: 'Глубокая полировка + Керамика 9H', category: 'Детейлинг', base_price: 28000, duration_min: 240 },
  { id: 's3', tenant_id: 'apex', title: 'Химчистка салона с разбором', category: 'Интерьер', base_price: 14000, duration_min: 180 },
  { id: 's4', tenant_id: 'matsuri', title: 'Комплексный шиномонтаж R16-R20', category: 'Шиномонтаж', base_price: 3200, duration_min: 45 },
];

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'p1',
    tenant_id: 'apex',
    title: 'Восстановительная полировка и 2 слоя керамики',
    car_model: 'Porsche 911 Carrera S',
    category: 'Детейлинг',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=85',
    before_image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=60',
    price: 34000,
    description: 'Убрали 98% голограмм и глубоких царапин на ЛКП.',
  },
];

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: 'r1',
    tenant_id: 'apex',
    client_name: 'Дмитрий В.',
    car_model: 'BMW X5 M50d',
    service_title: 'Глубокая полировка + Керамика 9H',
    rating: 5,
    comment: 'Машина горит как из салона! Гидрофоб сумасшедший.',
    owner_reply: 'Дмитрий, благодарим за доверие!',
    created_at: '2026-10-18T14:30:00Z',
  },
];

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try { return JSON.parse(raw); } catch { return fallback; }
}

function setLocal<T>(key: string, data: T) {
  if (typeof window !== 'undefined') localStorage.setItem(key, JSON.stringify(data));
}

export const db = {
  async checkCloudStatus(): Promise<{ ok: boolean; errorMsg?: string }> {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) return { ok: false, errorMsg: error.message };
    return { ok: true };
  },

  async seedIfEmpty(): Promise<void> {
    const { data, error } = await supabase.from('tenants').select('id').limit(1);
    if (!error && data && data.length === 0) {
      await supabase.from('tenants').insert(DEFAULT_TENANTS);
      await supabase.from('services').insert(DEFAULT_SERVICES.map(({ tenant_id, title, category, base_price, duration_min }) => ({ tenant_id, title, category, base_price, duration_min })));
      await supabase.from('portfolio').insert(DEFAULT_PORTFOLIO.map(({ tenant_id, title, car_model, category, image_url, before_image_url, price, description }) => ({ tenant_id, title, car_model, category, image_url, before_image_url, price, description })));
      await supabase.from('reviews').insert(DEFAULT_REVIEWS.map(({ tenant_id, client_name, car_model, service_title, rating, comment, owner_reply }) => ({ tenant_id, client_name, car_model, service_title, rating, comment, owner_reply })));
    }
  },

  async getTenants(): Promise<Tenant[]> {
    await this.seedIfEmpty();
    const { data, error } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    if (!error && data) return data;
    return getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
  },

  async getTenantById(id: string): Promise<Tenant | null> {
    const cleanId = decodeURIComponent(id).toLowerCase().trim();
    await this.seedIfEmpty();
    const { data, error } = await supabase.from('tenants').select('*').eq('id', cleanId).maybeSingle();
    if (!error && data) return data;
    const list = getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
    return list.find((t) => t.id.toLowerCase() === cleanId) || null;
  },

  async createTenant(tenant: Tenant): Promise<void> {
    await supabase.from('tenants').insert([tenant]);
    const list = getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
    setLocal('saas_tenants_v5', [tenant, ...list.filter((t) => t.id !== tenant.id)]);
  },

  async updateTenantProfile(id: string, updates: Partial<Tenant>): Promise<void> {
    await supabase.from('tenants').update(updates).eq('id', id);
    const list = getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
    setLocal('saas_tenants_v5', list.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  },

  async toggleTenantPaid(id: string, is_paid: boolean): Promise<void> {
    await supabase.from('tenants').update({ is_paid }).eq('id', id);
    const list = getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
    setLocal('saas_tenants_v5', list.map((t) => (t.id === id ? { ...t, is_paid } : t)));
  },

  async deleteTenant(id: string): Promise<void> {
    await supabase.from('tenants').delete().eq('id', id);
    const list = getLocal<Tenant[]>('saas_tenants_v5', DEFAULT_TENANTS);
    setLocal('saas_tenants_v5', list.filter((t) => t.id !== id));
  },

  async getServices(tenantId: string): Promise<Service[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase.from('services').select('*').eq('tenant_id', cleanId);
    if (!error && data && data.length > 0) return data;
    const list = getLocal<Service[]>('saas_services_v5', DEFAULT_SERVICES);
    return list.filter((s) => s.tenant_id === cleanId);
  },

  async addService(service: Omit<Service, 'id'>): Promise<void> {
    await supabase.from('services').insert([service]);
    const list = getLocal<Service[]>('saas_services_v5', DEFAULT_SERVICES);
    list.push({ ...service, id: 'srv_' + Date.now() });
    setLocal('saas_services_v5', list);
  },

  async updateService(id: string, base_price: number, duration_min: number): Promise<void> {
    await supabase.from('services').update({ base_price, duration_min }).eq('id', id);
    const list = getLocal<Service[]>('saas_services_v5', DEFAULT_SERVICES);
    setLocal('saas_services_v5', list.map((s) => (s.id === id ? { ...s, base_price, duration_min } : s)));
  },

  async deleteService(id: string): Promise<void> {
    await supabase.from('services').delete().eq('id', id);
    const list = getLocal<Service[]>('saas_services_v5', DEFAULT_SERVICES);
    setLocal('saas_services_v5', list.filter((s) => s.id !== id));
  },

  async getBookings(tenantId: string): Promise<Booking[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase.from('bookings').select('*').eq('tenant_id', cleanId);
    if (!error && data) return data;
    const list = getLocal<Booking[]>('saas_bookings_v5', []);
    return list.filter((b) => b.tenant_id === cleanId);
  },

  async addBooking(booking: Omit<Booking, 'id'>): Promise<void> {
    await supabase.from('bookings').insert([booking]);
    const list = getLocal<Booking[]>('saas_bookings_v5', []);
    list.unshift({ ...booking, id: 'bk_' + Date.now() });
    setLocal('saas_bookings_v5', list);
  },

  async updateBookingStatus(id: string, status: string): Promise<void> {
    await supabase.from('bookings').update({ status }).eq('id', id);
    const list = getLocal<Booking[]>('saas_bookings_v5', []);
    setLocal('saas_bookings_v5', list.map((b) => (b.id === id ? { ...b, status } : b)));
  },

  async getPortfolio(tenantId: string): Promise<PortfolioItem[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase.from('portfolio').select('*').eq('tenant_id', cleanId);
    if (!error && data && data.length > 0) return data;
    const list = getLocal<PortfolioItem[]>('saas_portfolio_v5', DEFAULT_PORTFOLIO);
    return list.filter((p) => p.tenant_id === cleanId);
  },

  async addPortfolioItem(item: Omit<PortfolioItem, 'id'>): Promise<void> {
    await supabase.from('portfolio').insert([item]);
    const list = getLocal<PortfolioItem[]>('saas_portfolio_v5', DEFAULT_PORTFOLIO);
    list.unshift({ ...item, id: 'pf_' + Date.now() });
    setLocal('saas_portfolio_v5', list);
  },

  async deletePortfolioItem(id: string): Promise<void> {
    await supabase.from('portfolio').delete().eq('id', id);
    const list = getLocal<PortfolioItem[]>('saas_portfolio_v5', DEFAULT_PORTFOLIO);
    setLocal('saas_portfolio_v5', list.filter((p) => p.id !== id));
  },

  async getReviews(tenantId: string): Promise<ReviewItem[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase.from('reviews').select('*').eq('tenant_id', cleanId);
    if (!error && data && data.length > 0) return data;
    const list = getLocal<ReviewItem[]>('saas_reviews_v5', DEFAULT_REVIEWS);
    return list.filter((r) => r.tenant_id === cleanId);
  },

  async addReview(review: Omit<ReviewItem, 'id' | 'created_at'>): Promise<void> {
    const nowIso = new Date().toISOString();
    await supabase.from('reviews').insert([{ ...review, created_at: nowIso }]);
    const list = getLocal<ReviewItem[]>('saas_reviews_v5', DEFAULT_REVIEWS);
    list.unshift({ ...review, id: 'rev_' + Date.now(), created_at: nowIso });
    setLocal('saas_reviews_v5', list);
  },

  async replyToReview(reviewId: string, owner_reply: string): Promise<void> {
    await supabase.from('reviews').update({ owner_reply }).eq('id', reviewId);
    const list = getLocal<ReviewItem[]>('saas_reviews_v5', DEFAULT_REVIEWS);
    setLocal('saas_reviews_v5', list.map((r) => (r.id === reviewId ? { ...r, owner_reply } : r)));
  },

  async deleteReview(reviewId: string): Promise<void> {
    await supabase.from('reviews').delete().eq('id', reviewId);
    const list = getLocal<ReviewItem[]>('saas_reviews_v5', DEFAULT_REVIEWS);
    setLocal('saas_reviews_v5', list.filter((r) => r.id !== reviewId));
  },
};`,

  'app/layout.tsx': `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoService SaaS Platform',
  description: 'White-Label PWA platform for auto services',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-zinc-950 text-zinc-100 antialiased min-h-screen selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}`,

  'app/page.tsx': `import Link from 'next/link';
import { ShieldCheck, Sparkles, Wrench, ArrowUpRight, Layers, Smartphone, Camera } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 flex flex-col justify-between overflow-hidden">
      <div className="pointer-events-none fixed inset-0 flex justify-center">
        <div className="w-[700px] h-[350px] bg-indigo-600/15 blur-[140px] rounded-full -top-24 absolute" />
        <div className="w-[500px] h-[300px] bg-rose-600/10 blur-[140px] rounded-full bottom-0 right-10 absolute" />
      </div>

      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold tracking-tight text-white text-base">ASTRYX AUTO</span>
            <span className="ml-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md bg-white/[0.06] text-zinc-400 border border-white/[0.08]">
              SaaS Engine v2.5
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin"
            className="text-xs font-medium px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 transition flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            Master Admin
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 mb-6 rounded-full bg-zinc-900/90 border border-white/10 text-xs text-zinc-300 shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          <span>White-Label PWA платформа для детейлинга, шиномонтажа и СТО</span>
        </div>

        <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.08]">
          Цифровая экосистема{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-rose-400 bg-clip-text text-transparent">
            автосервисов
          </span>
        </h1>

        <p className="text-zinc-400 text-base sm:text-lg max-w-2xl mx-auto mt-6 leading-relaxed">
          Мультитенантная архитектура с брендированными PWA-витринами, портфолио работ, отзывами, QR-стендами и экспортом выручки в CSV.
        </p>

        <div className="flex flex-wrap justify-center gap-3.5 mt-10">
          <Link
            href="/superadmin"
            className="px-6 py-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-semibold text-sm transition flex items-center gap-2 shadow-xl shadow-white/10"
          >
            <ShieldCheck className="w-4 h-4" />
            Супер-Админка (PIN: 9999)
          </Link>
          <Link
            href="/client/apex"
            className="px-6 py-3.5 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white font-semibold text-sm transition flex items-center gap-2 shadow-xl shadow-rose-600/20"
          >
            PWA: Apex Detailing
            <ArrowUpRight className="w-4 h-4" />
          </Link>
          <Link
            href="/client/apex/admin"
            className="px-6 py-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold text-sm transition"
          >
            Кабинет владельца (PIN: 1234)
          </Link>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-5 text-center text-xs text-zinc-500">
        Astryx UI • shadcn/ui Design System • Next.js App Router & Supabase
      </footer>
    </div>
  );
}`,

  'app/superadmin/page.tsx': `'use client';

import { useState } from 'react';
import { db, Tenant } from '@/lib/db';
import Link from 'next/link';
import { Shield, Plus, ExternalLink, Settings, Trash2, CheckCircle2, XCircle, Lock, RefreshCw, Building2, Phone, MapPin, KeyRound, Home, Save } from 'lucide-react';

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#e11d48');
  const [logoUrl, setLogoUrl] = useState('');
  const [pinCode, setPinCode] = useState('1234');
  const [isPaid, setIsPaid] = useState(true);

  const MASTER_PIN = '9999';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === MASTER_PIN) {
      setAuthenticated(true);
      fetchTenants();
    } else {
      alert('Неверный Мастер-PIN! По умолчанию: 9999');
    }
  };

  const fetchTenants = async () => {
    setLoading(true);
    const data = await db.getTenants();
    setTenants(data);
    setLoading(false);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = id.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '');
    if (!cleanId) {
      alert('ID должен содержать латинские буквы или цифры');
      return;
    }

    await db.createTenant({
      id: cleanId,
      name,
      phone,
      address,
      brand_color: brandColor,
      logo_url: logoUrl,
      pin_code: pinCode,
      is_paid: isPaid,
    });

    setId('');
    setName('');
    setPhone('');
    setAddress('');
    setLogoUrl('');
    fetchTenants();
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    await db.updateTenantProfile(editingTenant.id, {
      name: editingTenant.name,
      phone: editingTenant.phone,
      address: editingTenant.address,
      brand_color: editingTenant.brand_color,
      logo_url: editingTenant.logo_url,
      pin_code: editingTenant.pin_code,
    });
    setEditingTenant(null);
    fetchTenants();
    alert('Данные тенанта обновлены!');
  };

  const togglePayment = async (tenantId: string, currentStatus: boolean) => {
    await db.toggleTenantPaid(tenantId, !currentStatus);
    fetchTenants();
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Удалить автосервис ' + tenantId + ' и все связанные данные?')) return;
    await db.deleteTenant(tenantId);
    fetchTenants();
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 bg-astryx-grid p-4 relative overflow-hidden">
        <div className="w-96 h-96 bg-indigo-600/15 blur-[130px] rounded-full absolute -top-20" />
        <form
          onSubmit={handleLogin}
          className="relative z-10 w-full max-w-sm bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-indigo-400" />
          </div>
          <div className="text-center mb-6">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-indigo-400">
              Astryx Master Node
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Супер-Админка SaaS</h1>
            <p className="text-xs text-zinc-400 mt-1.5">Введите мастер-ключ доступа (PIN: 9999)</p>
          </div>
          <input
            type="password"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-center text-xl tracking-[0.5em] mb-4 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl font-semibold text-sm transition shadow-lg"
          >
            Авторизоваться
          </button>
          <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-4">
            ← На главную страницу
          </Link>
        </form>
      </div>
    );
  }

  const paidCount = tenants.filter((t) => t.is_paid).length;

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-white">Master Control Center</h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  ● SaaS Node Online
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Управление подписками, брендингом и данными автосервисов
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchTenants}
              className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 transition"
              title="Обновить"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/"
              className="text-xs font-medium bg-zinc-900 border border-white/10 hover:bg-zinc-800 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              <Home className="w-3.5 h-3.5" />
              Главная
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 px-3.5 py-2.5 rounded-xl transition"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Всего автосервисов</span>
            <div className="text-3xl font-extrabold text-white mt-1">{tenants.length}</div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Активные подписки</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{paidCount}</div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Приостановлено</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-1">{tenants.length - paidCount}</div>
          </div>
        </div>

        {editingTenant && (
          <div className="mb-8 bg-zinc-900/90 backdrop-blur-xl border border-indigo-500/40 p-6 rounded-3xl shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-base text-white">Редактирование тенанта: {editingTenant.id}</h2>
              <button onClick={() => setEditingTenant(null)} className="text-xs text-zinc-400 hover:text-white">Отмена</button>
            </div>
            <form onSubmit={handleSaveEdit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-400">Название</label>
                <input type="text" value={editingTenant.name} onChange={(e) => setEditingTenant({...editingTenant, name: e.target.value})} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs mt-1 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Телефон</label>
                <input type="text" value={editingTenant.phone} onChange={(e) => setEditingTenant({...editingTenant, phone: e.target.value})} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs mt-1 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Адрес</label>
                <input type="text" value={editingTenant.address} onChange={(e) => setEditingTenant({...editingTenant, address: e.target.value})} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs mt-1 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">PIN админки</label>
                <input type="text" value={editingTenant.pin_code} onChange={(e) => setEditingTenant({...editingTenant, pin_code: e.target.value})} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs mt-1 text-white font-mono" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Логотип (URL)</label>
                <input type="url" value={editingTenant.logo_url || ''} onChange={(e) => setEditingTenant({...editingTenant, logo_url: e.target.value})} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs mt-1 text-white" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">Брендовый цвет</label>
                <input type="color" value={editingTenant.brand_color || '#e11d48'} onChange={(e) => setEditingTenant({...editingTenant, brand_color: e.target.value})} className="w-full h-10 p-1 rounded-xl bg-zinc-950 border border-white/10 mt-1 cursor-pointer" />
              </div>
              <div className="sm:col-span-2 pt-2">
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow">
                  Сохранить изменения тенанта
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Create Form */}
          <div className="lg:col-span-4 bg-zinc-900/70 backdrop-blur-xl border border-white/[0.08] p-6 rounded-2xl h-fit">
            <div className="flex items-center gap-2 mb-5">
              <Plus className="w-4 h-4 text-indigo-400" />
              <h2 className="text-base font-bold text-white">Подключить автосервис</h2>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400">URL-идентификатор (slug)</label>
                <div className="flex items-center mt-1 rounded-xl bg-zinc-950 border border-white/10 px-3 focus-within:border-indigo-500">
                  <span className="text-xs text-zinc-500">/client/</span>
                  <input
                    type="text"
                    required
                    placeholder="apex"
                    value={id}
                    onChange={(e) => setId(e.target.value)}
                    className="w-full py-2.5 pl-1 bg-transparent text-sm text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Название бизнеса</label>
                <input
                  type="text"
                  required
                  placeholder="Apex Detailing"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Телефон</label>
                <input
                  type="text"
                  required
                  placeholder="+7 (999) 000-00-00"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Адрес</label>
                <input
                  type="text"
                  required
                  placeholder="ул. Ленина, 45"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Логотип (URL картинки)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Цвет бренда</label>
                  <div className="flex items-center gap-2 mt-1 p-1.5 rounded-xl bg-zinc-950 border border-white/10">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0"
                    />
                    <span className="text-xs font-mono text-zinc-300">{brandColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">PIN владельца</label>
                  <input
                    type="text"
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPaid}
                  onChange={(e) => setIsPaid(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span className="text-xs text-zinc-300">Подписка активна (Оплачено)</span>
              </label>

              <button
                type="submit"
                className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 rounded-xl text-sm transition shadow-lg"
              >
                Создать автосервис
              </button>
            </form>
          </div>

          {/* Tenants List */}
          <div className="lg:col-span-8 space-y-3.5">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Загрузка арендаторов...</div>
            ) : (
              tenants.map((t) => (
                <div
                  key={t.id}
                  className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] hover:border-white/15 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition"
                >
                  <div className="flex items-start gap-4">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="Logo" className="w-11 h-11 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20 shadow-lg text-white font-bold"
                        style={{ backgroundColor: t.brand_color }}
                      >
                        {t.id.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-white">{t.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 border border-white/5 text-zinc-300 font-mono">
                          /client/{t.id}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" /> {t.address}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" /> {t.phone}
                        </span>
                        <span className="flex items-center gap-1 text-indigo-400 font-mono">
                          <KeyRound className="w-3.5 h-3.5" /> PIN: {t.pin_code}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <button
                      onClick={() => togglePayment(t.id, t.is_paid)}
                      className={
                        t.is_paid
                          ? 'px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 flex items-center gap-1.5 transition'
                          : 'px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 flex items-center gap-1.5 transition'
                      }
                    >
                      {t.is_paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.is_paid ? 'Оплачено' : 'Блок'}
                    </button>

                    <button
                      onClick={() => setEditingTenant(t)}
                      className="px-3 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl border border-white/10 flex items-center gap-1.5 transition"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-400" />
                      Правка
                    </button>

                    <Link
                      href={'/client/' + t.id}
                      className="px-3 py-2 text-xs font-medium bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 rounded-xl border border-white/10 flex items-center gap-1.5 transition"
                    >
                      PWA
                      <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </Link>

                    <Link
                      href={'/client/' + t.id + '/admin'}
                      className="px-3 py-2 text-xs font-medium bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 rounded-xl border border-indigo-500/20 flex items-center gap-1.5 transition"
                    >
                      Админка
                    </Link>

                    <button
                      onClick={() => deleteTenant(t.id)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}`,

  'app/client/[tenantId]/admin/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, Tenant, Service, Booking, PortfolioItem, ReviewItem } from '@/lib/db';
import {
  Lock,
  CalendarCheck,
  Wrench,
  Camera,
  Plus,
  Trash2,
  Save,
  ExternalLink,
  RefreshCw,
  Phone,
  CheckCircle2,
  XCircle,
  Star,
  MessageSquareReply,
  QrCode,
  Download,
  Printer,
  Copy,
  Sparkles,
  MapPin,
  Building2,
  FileSpreadsheet,
} from 'lucide-react';

export default function TenantAdminPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeSection, setActiveSection] = useState<
    'bookings' | 'services' | 'portfolio' | 'reviews' | 'qr' | 'settings'
  >('bookings');

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState('');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBrandColor, setEditBrandColor] = useState('#e11d48');
  const [editLogoUrl, setEditLogoUrl] = useState('');
  const [editPinCode, setEditPinCode] = useState('1234');

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Детейлинг');
  const [newPrice, setNewPrice] = useState('3000');
  const [newDuration, setNewDuration] = useState('60');

  const [pfTitle, setPfTitle] = useState('');
  const [pfCarModel, setPfCarModel] = useState('');
  const [pfCategory, setPfCategory] = useState('Детейлинг');
  const [pfImageUrl, setPfImageUrl] = useState('');
  const [pfBeforeImageUrl, setPfBeforeImageUrl] = useState('');
  const [pfPrice, setPfPrice] = useState('15000');
  const [pfDescription, setPfDescription] = useState('');

  const [qrTarget, setQrTarget] = useState<'reviews' | 'services' | 'portfolio'>('reviews');
  const [qrBadgeText, setQrBadgeText] = useState('ОЦЕНИТЕ КАЧЕСТВО РАБОТЫ');
  const [qrHeadline, setQrHeadline] = useState('Понравился результат?');
  const [qrSubtext, setQrSubtext] = useState('Наведите камеру смартфона для отзыва или записи');
  const [qrWifiNote, setQrWifiNote] = useState('');
  const [originUrl, setOriginUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') setOriginUrl(window.location.origin);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await db.getTenantById(tenantId);
    if (!t) {
      alert('Автосервис не найден');
      return;
    }

    if (t.pin_code === pin) {
      setTenant(t);
      setEditName(t.name);
      setEditPhone(t.phone);
      setEditAddress(t.address);
      setEditBrandColor(t.brand_color || '#e11d48');
      setEditLogoUrl(t.logo_url || '');
      setEditPinCode(t.pin_code);

      setAuthenticated(true);
      loadAdminData();
    } else {
      alert('Неверный PIN-код владельца!');
    }
  };

  const loadAdminData = async () => {
    const [sData, bData, pData, rData] = await Promise.all([
      db.getServices(tenantId),
      db.getBookings(tenantId),
      db.getPortfolio(tenantId),
      db.getReviews(tenantId),
    ]);
    setServices(sData);
    setBookings(bData);
    setPortfolio(pData);
    setReviews(rData);

    const drafts: Record<string, string> = {};
    rData.forEach((r) => { drafts[r.id] = r.owner_reply || ''; });
    setReplyDrafts(drafts);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.updateTenantProfile(tenantId, {
      name: editName,
      phone: editPhone,
      address: editAddress,
      brand_color: editBrandColor,
      logo_url: editLogoUrl,
      pin_code: editPinCode,
    });
    const updated = await db.getTenantById(tenantId);
    if (updated) setTenant(updated);
    setSaveMessage('Профиль автосервиса успешно обновлен!');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  // ФИКС КОДИРОВКИ CSV: Добавление BOM '\\uFEFF' для корректного открытия в Excel
  const handleExportCsv = () => {
    const confirmed = bookings.filter((b) => b.status === 'confirmed');
    const headers = ['ID записи', 'Услуга', 'Класс авто', 'Клиент', 'Телефон', 'Дата', 'Время', 'Сумма (₽)'];
    const rows = confirmed.map((b) => [
      b.id,
      '"' + b.service_title + '"',
      b.car_class,
      '"' + b.client_name + '"',
      b.client_phone,
      b.booking_date,
      b.booking_time,
      b.price,
    ]);

    const csvContent = '\\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'revenue-report-' + tenantId + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.addService({
      tenant_id: tenantId,
      title: newTitle,
      category: newCategory,
      base_price: Number(newPrice),
      duration_min: Number(newDuration),
    });
    setNewTitle('');
    loadAdminData();
  };

  const handleUpdateService = async (service: Service) => {
    await db.updateService(service.id, Number(service.base_price), Number(service.duration_min));
    setSaveMessage('Прайс успешно сохранен');
    setTimeout(() => setSaveMessage(''), 2000);
    loadAdminData();
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу из прайса?')) return;
    await db.deleteService(id);
    loadAdminData();
  };

  const updateLocalService = (id: string, field: 'base_price' | 'duration_min', value: string) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: Number(value) } : s)));
  };

  const toggleBookingStatus = async (bookingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'cancelled' ? 'confirmed' : 'cancelled';
    await db.updateBookingStatus(bookingId, nextStatus);
    loadAdminData();
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pfTitle || !pfCarModel || !pfImageUrl) return;

    await db.addPortfolioItem({
      tenant_id: tenantId,
      title: pfTitle,
      car_model: pfCarModel,
      category: pfCategory,
      image_url: pfImageUrl.trim(),
      before_image_url: pfBeforeImageUrl.trim() || undefined,
      price: Number(pfPrice) || 0,
      description: pfDescription,
    });

    setPfTitle('');
    setPfCarModel('');
    setPfImageUrl('');
    setPfBeforeImageUrl('');
    setPfDescription('');
    setSaveMessage('Работа добавлена в портфолио!');
    setTimeout(() => setSaveMessage(''), 2500);
    loadAdminData();
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('Удалить работу?')) return;
    await db.deletePortfolioItem(id);
    loadAdminData();
  };

  const handleSaveReply = async (reviewId: string) => {
    const replyText = (replyDrafts[reviewId] || '').trim();
    await db.replyToReview(reviewId, replyText);
    setSaveMessage('Ответ опубликован!');
    setTimeout(() => setSaveMessage(''), 2500);
    loadAdminData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Удалить отзыв?')) return;
    await db.deleteReview(reviewId);
    loadAdminData();
  };

  const qrFullDestinationUrl = originUrl + '/client/' + tenantId + '?tab=' + qrTarget;
  const qrImageSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&ecc=H&data=' + encodeURIComponent(qrFullDestinationUrl);

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 bg-astryx-grid p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm bg-zinc-900/85 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 block text-center">
            Owner Workspace
          </span>
          <h2 className="text-2xl font-extrabold text-center text-white mt-1 mb-6">
            Админка: {tenantId}
          </h2>
          <input
            type="password"
            placeholder="PIN владельца"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-center text-lg tracking-widest mb-4 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3.5 rounded-xl font-bold text-sm transition"
          >
            Войти в панель управления
          </button>
          <Link
            href={'/client/' + tenantId}
            className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-4"
          >
            ← Открыть витрину PWA
          </Link>
        </form>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + Number(b.price || 0), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) : '5.0';

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}
              >
                {tenantId.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">
                Кабинет владельца
              </span>
              <h1 className="text-2xl font-extrabold text-white mt-0.5">{tenant?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Скачать отчет CSV
            </button>
            <Link
              href={'/client/' + tenantId}
              className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-1.5"
            >
              Витрина PWA
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 px-4 py-2.5 rounded-xl"
            >
              Выйти
            </button>
          </div>
        </div>

        {/* KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Записи</span>
            <div className="text-2xl font-extrabold text-white mt-1">{confirmedBookings.length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Выручка</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Рейтинг</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1">★ {avgRating}</div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Прайс</span>
            <div className="text-2xl font-extrabold text-white mt-1">{services.length} усл.</div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Портфолио</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{portfolio.length} работ</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveSection('bookings')}
            className={activeSection === 'bookings' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            Записи ({bookings.length})
          </button>
          <button
            onClick={() => setActiveSection('portfolio')}
            className={activeSection === 'portfolio' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            Работы ({portfolio.length})
          </button>
          <button
            onClick={() => setActiveSection('reviews')}
            className={activeSection === 'reviews' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            Отзывы ({reviews.length})
          </button>
          <button
            onClick={() => setActiveSection('services')}
            className={activeSection === 'services' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            Прайс
          </button>
          <button
            onClick={() => setActiveSection('qr')}
            className={activeSection === 'qr' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            QR-стенд
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={activeSection === 'settings' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}
          >
            ⚙️ Настройки и брендинг
          </button>

          {saveMessage && (
            <span className="ml-auto self-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
              ✓ {saveMessage}
            </span>
          )}
        </div>

        {/* НАСТРОЙКИ ПРОФИЛЯ */}
        {activeSection === 'settings' && (
          <div className="bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-2xl">
            <h2 className="font-bold text-lg text-white mb-2">Название, адрес, телефон и брендинг сервиса</h2>
            <p className="text-xs text-zinc-400 mb-6">Изменения сразу применяются в клиентском PWA и на QR-стендах.</p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400">Название автосервиса</label>
                <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400">Телефон</label>
                  <input type="text" required value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400">PIN-код админки</label>
                  <input type="text" required value={editPinCode} onChange={(e) => setEditPinCode(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1 font-mono" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Адрес</label>
                <input type="text" required value={editAddress} onChange={(e) => setEditAddress(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">URL логотипа</label>
                <input type="url" value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Фирменный цвет бренда</label>
                <div className="flex items-center gap-3 mt-1 p-2 rounded-xl bg-zinc-950 border border-white/10">
                  <input type="color" value={editBrandColor} onChange={(e) => setEditBrandColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-0" />
                  <span className="text-xs font-mono text-zinc-300">{editBrandColor}</span>
                </div>
              </div>
              <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3.5 rounded-xl text-xs font-bold transition shadow-lg">
                Сохранить настройки профиля
              </button>
            </form>
          </div>
        )}

        {/* ЗАПИСИ */}
        {activeSection === 'bookings' && (
          <div className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl">
            <h2 className="font-bold text-lg text-white mb-4">Журнал бронирований клиентов</h2>
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">Записей пока нет.</div>
              ) : (
                bookings.map((b) => (
                  <div key={b.id} className="p-4 rounded-2xl border border-white/10 bg-zinc-950 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sm text-white">{b.service_title} ({b.car_class})</p>
                      <p className="text-xs text-zinc-400 mt-1">👤 {b.client_name} • 📞 {b.client_phone} • 📅 {b.booking_date} в {b.booking_time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-emerald-400">{b.price} ₽</span>
                      <button onClick={() => toggleBookingStatus(b.id, b.status)} className="px-3 py-1.5 text-xs bg-rose-500/10 text-rose-400 rounded-xl">
                        {b.status === 'cancelled' ? 'Восстановить' : 'Отменить'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ПОРТФОЛИО */}
        {activeSection === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-zinc-900/70 border border-white/10 p-6 rounded-3xl h-fit">
              <h2 className="font-bold text-base text-white mb-4">Добавить работу в портфолио</h2>
              <form onSubmit={handleAddPortfolio} className="space-y-3.5">
                <input type="text" required placeholder="Название работы" value={pfTitle} onChange={(e) => setPfTitle(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="text" required placeholder="Авто (Porsche 911)" value={pfCarModel} onChange={(e) => setPfCarModel(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                  <input type="text" required placeholder="Категория" value={pfCategory} onChange={(e) => setPfCategory(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                </div>
                <input type="url" required placeholder="URL фото ПОСЛЕ" value={pfImageUrl} onChange={(e) => setPfImageUrl(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <input type="url" placeholder="URL фото ДО (опционально)" value={pfBeforeImageUrl} onChange={(e) => setPfBeforeImageUrl(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <input type="number" required placeholder="Цена (₽)" value={pfPrice} onChange={(e) => setPfPrice(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <textarea rows={3} placeholder="Описание..." value={pfDescription} onChange={(e) => setPfDescription(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl text-xs font-bold">Опубликовать</button>
              </form>
            </div>
            <div className="lg:col-span-7 space-y-3">
              {portfolio.map((item) => (
                <div key={item.id} className="p-4 bg-zinc-900/70 border border-white/10 rounded-2xl flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <img src={item.image_url} alt="" className="w-20 h-16 object-cover rounded-xl" />
                    <div>
                      <p className="font-bold text-sm text-white">{item.title}</p>
                      <p className="text-xs text-zinc-400">{item.car_model} • {item.price} ₽</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeletePortfolio(item.id)} className="text-zinc-500 hover:text-rose-400 p-2"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ОТЗЫВЫ */}
        {activeSection === 'reviews' && (
          <div className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl space-y-4">
            <h2 className="font-bold text-lg text-white mb-2">Модерация отзывов клиентов</h2>
            {reviews.map((rev) => (
              <div key={rev.id} className="p-4 rounded-2xl bg-zinc-950 border border-white/10 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-white">{rev.client_name}</span> <span className="text-xs text-zinc-400">({rev.car_model})</span>
                    <div className="flex items-center gap-1 mt-1 text-amber-400 text-xs">★ {rev.rating}.0</div>
                  </div>
                  <button onClick={() => handleDeleteReview(rev.id)} className="text-zinc-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <p className="text-xs text-zinc-200">{rev.comment}</p>
                <div className="flex gap-2 pt-2">
                  <input type="text" placeholder="Ответ сервиса..." value={replyDrafts[rev.id] ?? ''} onChange={(e) => setReplyDrafts({ ...replyDrafts, [rev.id]: e.target.value })} className="flex-1 p-2 rounded-xl bg-zinc-900 border border-white/10 text-xs text-white" />
                  <button onClick={() => handleSaveReply(rev.id)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">Ответить</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ПРАЙС */}
        {activeSection === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-zinc-900/70 border border-white/10 p-6 rounded-3xl h-fit">
              <h2 className="font-bold text-base text-white mb-4">Добавить услугу</h2>
              <form onSubmit={handleAddService} className="space-y-3.5">
                <input type="text" required placeholder="Название услуги" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <input type="text" required placeholder="Категория" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" required placeholder="Цена (₽)" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                  <input type="number" required placeholder="Мин." value={newDuration} onChange={(e) => setNewDuration(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
                </div>
                <button type="submit" className="w-full bg-white text-zinc-950 py-3 rounded-xl text-xs font-bold">Добавить</button>
              </form>
            </div>
            <div className="lg:col-span-7 space-y-3">
              {services.map((s) => (
                <div key={s.id} className="p-4 bg-zinc-900/70 border border-white/10 rounded-2xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-sm text-white">{s.title}</p>
                    <p className="text-xs text-zinc-400">{s.category} • {s.duration_min} мин</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-emerald-400">{s.base_price} ₽</span>
                    <button onClick={() => handleDeleteService(s.id)} className="text-zinc-500 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR СТЕНД */}
        {activeSection === 'qr' && (
          <div className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl max-w-xl mx-auto text-center space-y-4">
            <h2 className="font-bold text-lg text-white">QR-код витрины</h2>
            <div className="bg-white p-4 rounded-3xl w-64 h-64 mx-auto flex items-center justify-center">
              <img src={qrImageSrc} alt="QR" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-zinc-400">Распечатайте этот код для установки в боксе.</p>
          </div>
        )}
      </div>
    </div>
  );
}`,

  'app/client/[tenantId]/page.tsx': `'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db, Tenant, Service, PortfolioItem, ReviewItem } from '@/lib/db';
import {
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Calendar,
  Car,
  CheckCircle2,
  Lock,
  Wrench,
  Camera,
  Eye,
  Send,
  X,
  ArrowRight,
  Settings,
  Star,
  MessageSquare,
  ShieldCheck,
  CornerDownRight,
} from 'lucide-react';

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

export default function TenantClientPWA() {
  const params = useParams<{ tenantId: string }>();
  const searchParams = useSearchParams();
  const tenantId = params?.tenantId || '';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'services' | 'portfolio' | 'reviews' | 'ai'>('services');

  const [carClass, setCarClass] = useState<'sedan' | 'crossover' | 'suv'>('sedan');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [portfolioCategory, setPortfolioCategory] = useState<string>('Все');

  const [showBeforeMap, setShowBeforeMap] = useState<Record<string, boolean>>({});
  const [lightboxItem, setLightboxItem] = useState<PortfolioItem | null>(null);

  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState('10:00');
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [bookingStatusMsg, setBookingStatusMsg] = useState('');

  const [revName, setRevName] = useState('');
  const [revCar, setRevCar] = useState('');
  const [revService, setRevService] = useState('');
  const [revRating, setRevRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [revComment, setRevComment] = useState('');
  const [revSuccess, setRevSuccess] = useState(false);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const carMultipliers = {
    sedan: { name: 'Седан', mult: 1.0, desc: 'Базовый тариф' },
    crossover: { name: 'Кроссовер', mult: 1.2, desc: '+20% к прайсу' },
    suv: { name: 'Джип / SUV', mult: 1.4, desc: '+40% к прайсу' },
  };

  useEffect(() => {
    const tabParam = searchParams?.get('tab');
    if (tabParam === 'reviews' || tabParam === 'portfolio' || tabParam === 'services' || tabParam === 'ai') {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

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
    const tenantData = await db.getTenantById(tenantId);
    if (tenantData) {
      setTenant(tenantData);
      if (tenantData.is_paid) {
        const [servicesData, portfolioData, reviewsData] = await Promise.all([
          db.getServices(tenantId),
          db.getPortfolio(tenantId),
          db.getReviews(tenantId),
        ]);
        setServices(servicesData);
        setPortfolio(portfolioData);
        setReviews(reviewsData);
        if (servicesData.length > 0) setRevService(servicesData[0].title);
      }
    }
    setLoading(false);
  };

  const fetchBusySlots = async (dateStr: string) => {
    const allBookings = await db.getBookings(tenantId);
    const occupied = allBookings
      .filter((b) => b.booking_date === dateStr && b.status === 'confirmed')
      .map((b) => b.booking_time.slice(0, 5));
    setBusySlots(occupied);
    if (occupied.includes(bookingTime)) {
      const firstFree = TIME_SLOTS.find((s) => !occupied.includes(s));
      if (firstFree) setBookingTime(firstFree);
    }
  };

  const serviceCategories = ['Все', ...Array.from(new Set(services.map((s) => s.category)))];
  const filteredServices = selectedCategory === 'Все' ? services : services.filter((s) => s.category === selectedCategory);

  const portfolioCategories = ['Все', ...Array.from(new Set(portfolio.map((p) => p.category)))];
  const filteredPortfolio = portfolioCategory === 'Все' ? portfolio : portfolio.filter((p) => p.category === portfolioCategory);

  const calculatePrice = (basePrice: number) => Math.round(basePrice * carMultipliers[carClass].mult);

  const averageRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) : '5.0';

  const getStarPercentage = (star: number) => {
    if (reviews.length === 0) return star === 5 ? 100 : 0;
    const count = reviews.filter((r) => Number(r.rating) === star).length;
    return Math.round((count / reviews.length) * 100);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !bookingDate || !bookingTime || !clientName || !clientPhone) return;

    if (busySlots.includes(bookingTime)) {
      setBookingStatusMsg('❌ Выбранный слот уже занят. Выберите другое время.');
      return;
    }

    setBookingStatusMsg('Бронируем бокс...');
    const finalPrice = calculatePrice(selectedService.base_price);

    await db.addBooking({
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
    });

    setBookingStatusMsg('✅ Запись подтверждена на ' + bookingDate + ' в ' + bookingTime + '!');
    fetchBusySlots(bookingDate);
    setTimeout(() => {
      setSelectedService(null);
      setBookingStatusMsg('');
      setClientName('');
      setClientPhone('');
    }, 1500);
  };

  const handleBookFromPortfolio = (item: PortfolioItem) => {
    const matchedService = services.find((s) => s.category.toLowerCase() === item.category.toLowerCase()) || services[0] || {
      id: 'custom',
      tenant_id: tenantId,
      title: item.title,
      category: item.category,
      base_price: item.price,
      duration_min: 120,
    };
    setLightboxItem(null);
    setSelectedService(matchedService);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revName.trim() || !revComment.trim()) return;

    await db.addReview({
      tenant_id: tenantId,
      client_name: revName.trim(),
      car_model: revCar.trim() || 'Автомобиль клиента',
      service_title: revService || 'Обслуживание в сервисе',
      rating: revRating,
      comment: revComment.trim(),
    });

    setRevName('');
    setRevCar('');
    setRevComment('');
    setRevRating(5);
    setRevSuccess(true);
    setTimeout(() => setRevSuccess(false), 3000);

    const updatedReviews = await db.getReviews(tenantId);
    setReviews(updatedReviews);
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

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8 text-zinc-400 text-sm">Загрузка витрины...</div>;
  if (!tenant) return <div className="p-12 text-center text-rose-400">Сервис не найден</div>;
  if (!tenant.is_paid) return <div className="p-12 text-center text-rose-400">Обслуживание временно приостановлено.</div>;

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 pb-20 relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[550px] h-[260px] blur-[135px] opacity-25 rounded-full" style={{ backgroundColor: tenant.brand_color }} />

      <div className="max-w-2xl mx-auto relative z-10 px-4 pt-4">
        <header className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: tenant.brand_color }} />
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-3">
              {tenant.logo_url && (
                <img src={tenant.logo_url} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-medium text-zinc-300">
                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: tenant.brand_color }} />
                    Боксы открыты
                  </div>
                  <button onClick={() => setActiveTab('reviews')} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span>{averageRating}</span>
                    <span className="text-amber-400/70 font-normal">({reviews.length})</span>
                  </button>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">{tenant.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2">
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> {tenant.address}</span>
                  <a href={'tel:' + tenant.phone} className="flex items-center gap-1 hover:text-white"><Phone className="w-3.5 h-3.5 text-zinc-500" /> {tenant.phone}</a>
                </div>
              </div>
            </div>

            <Link href={'/client/' + tenant.id + '/admin'} className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300 text-xs font-medium flex items-center gap-1">
              <Settings className="w-4 h-4" /> Кабинет
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 mt-6 rounded-2xl bg-zinc-950/90 border border-white/[0.07]">
            <button onClick={() => setActiveTab('services')} style={activeTab === 'services' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'services' ? 'py-2.5 rounded-xl text-xs font-bold text-white shadow' : 'py-2.5 rounded-xl text-xs font-medium text-zinc-400'}>Услуги</button>
            <button onClick={() => setActiveTab('portfolio')} style={activeTab === 'portfolio' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'portfolio' ? 'py-2.5 rounded-xl text-xs font-bold text-white shadow' : 'py-2.5 rounded-xl text-xs font-medium text-zinc-400'}>Работы</button>
            <button onClick={() => setActiveTab('reviews')} style={activeTab === 'reviews' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'reviews' ? 'py-2.5 rounded-xl text-xs font-bold text-white shadow' : 'py-2.5 rounded-xl text-xs font-medium text-zinc-400'}>Отзывы</button>
            <button onClick={() => setActiveTab('ai')} style={activeTab === 'ai' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'ai' ? 'py-2.5 rounded-xl text-xs font-bold text-white shadow' : 'py-2.5 rounded-xl text-xs font-medium text-zinc-400'}>AI</button>
          </div>
        </header>

        {activeTab === 'services' && (
          <div className="mt-6 space-y-6">
            <section className="bg-zinc-900/60 border border-white/[0.08] p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"><Car className="w-4 h-4 text-zinc-300" /> Выберите тип кузова</span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(carMultipliers) as Array<keyof typeof carMultipliers>).map((key) => (
                  <button key={key} onClick={() => setCarClass(key)} style={carClass === key ? { borderColor: tenant.brand_color } : {}} className={carClass === key ? 'p-3 rounded-2xl text-left border-2 bg-zinc-900 text-white shadow-lg' : 'p-3 rounded-2xl text-left border border-white/10 bg-zinc-950 text-zinc-400'}>
                    <div className="font-bold text-xs text-white">{carMultipliers[key].name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{carMultipliers[key].desc}</div>
                  </button>
                ))}
              </div>
            </section>

            <div className="space-y-3">
              {filteredServices.map((service) => (
                <div key={service.id} className="bg-zinc-900/70 border border-white/[0.08] p-5 rounded-2xl flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white/[0.06] text-zinc-300 uppercase">{service.category}</span>
                    <h3 className="font-bold text-base text-white mt-2">{service.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1">⏱ ~{service.duration_min} мин</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-extrabold text-white">{calculatePrice(service.base_price).toLocaleString('ru-RU')} ₽</div>
                    <button onClick={() => setSelectedService(service)} style={{ backgroundColor: tenant.brand_color }} className="mt-2.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow">
                      Записаться
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="mt-6 space-y-4">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-3xl bg-zinc-900/75 border border-white/10 overflow-hidden shadow-xl p-4">
                <img src={item.image_url} alt="" className="w-full h-56 object-cover rounded-2xl mb-3" />
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-xs text-zinc-400 mt-1">{item.description}</p>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                  <span className="font-extrabold text-emerald-400">{item.price} ₽</span>
                  <button onClick={() => handleBookFromPortfolio(item)} style={{ backgroundColor: tenant.brand_color }} className="px-4 py-2 rounded-xl text-xs font-bold text-white">Записаться</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="mt-6 space-y-5">
            <div className="bg-zinc-900/75 border border-white/10 p-6 rounded-3xl text-center">
              <span className="text-4xl font-extrabold text-amber-400">★ {averageRating}</span>
              <p className="text-xs text-zinc-400 mt-1">Средняя оценка на основе {reviews.length} отзывов</p>
            </div>

            <form onSubmit={handleReviewSubmit} className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl space-y-3">
              <h3 className="font-bold text-sm text-white">Оставить отзыв</h3>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRevRating(s)} className={(hoverRating || revRating) >= s ? 'w-6 h-6 fill-amber-400 text-amber-400 cursor-pointer' : 'w-6 h-6 text-zinc-700 cursor-pointer'} />
                ))}
              </div>
              <input type="text" required placeholder="Ваше имя" value={revName} onChange={(e) => setRevName(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <input type="text" required placeholder="Авто (например Opel Astra)" value={revCar} onChange={(e) => setRevCar(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <textarea rows={3} required placeholder="Ваш отзыв..." value={revComment} onChange={(e) => setRevComment(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-3 rounded-xl text-xs font-bold text-white">Отправить отзыв</button>
            </form>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-zinc-900/75 border border-white/10 p-5 rounded-3xl space-y-2">
                  <div className="flex justify-between">
                    <span className="font-bold text-sm text-white">{rev.client_name} ({rev.car_model})</span>
                    <span className="text-amber-400 text-xs">★ {rev.rating}.0</span>
                  </div>
                  <p className="text-xs text-zinc-200">{rev.comment}</p>
                  {rev.owner_reply && <p className="text-xs text-zinc-400 bg-zinc-950 p-2.5 rounded-xl border-l-2" style={{ borderLeftColor: tenant.brand_color }}>Ответ сервиса: {rev.owner_reply}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="mt-6 bg-zinc-900/70 border border-white/10 p-6 rounded-3xl space-y-3">
            <h2 className="font-bold text-base text-white">AI-Диспетчер</h2>
            <form onSubmit={handleAiAsk} className="flex gap-2">
              <input type="text" placeholder="Что вас интересует?" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} className="flex-1 p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="px-4 py-3 rounded-xl text-xs font-bold text-white">Спросить</button>
            </form>
            {aiResponse && <div className="p-3 bg-zinc-950 rounded-xl text-xs text-zinc-200">{aiResponse}</div>}
          </div>
        )}
      </div>

      {selectedService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-white">Запись: {selectedService.title}</h3>
              <button onClick={() => setSelectedService(null)} className="text-zinc-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="space-y-3">
              <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white">
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" required placeholder="Ваше имя" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <input type="tel" required placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              {bookingStatusMsg && <div className="text-xs text-center text-emerald-400">{bookingStatusMsg}</div>}
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-3.5 rounded-xl font-bold text-white">Подтвердить запись</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}`,

  'app/api/ai-assistant/route.ts': `import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, tenantName, carClass, multiplier = 1, services = [] } = await req.json();
    const q = (prompt || '').toLowerCase();
    const matched = services.filter((s: { title: string; category: string }) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    const list = matched.length > 0 ? matched : services.slice(0, 3);
    const reply = 'В «' + tenantName + '» для авто (' + carClass + ') доступны: ' + list.map((s: { title: string; base_price: number }) => s.title + ' (от ' + Math.round(s.base_price * Number(multiplier)) + ' ₽)').join(', ');
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: 'Ошибка обработки запроса.' }, { status: 500 });
  }
}`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Собран файл:', filePath);
}

console.log('\\n🎉 Полная сборка SaaS-платформы успешно завершена!');