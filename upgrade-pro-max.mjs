// upgrade-pro-max.mjs — Обновление до UI/UX Pro Max (shadcn/ui + Astryx) + Модуль Портфолио
import fs from 'fs';
import path from 'path';

const files = {
  'supabase_portfolio_migration.sql': `-- Миграция для добавления таблицы примеров работ (Портфолио)
CREATE TABLE IF NOT EXISTS public.portfolio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    car_model TEXT NOT NULL,
    description TEXT DEFAULT '',
    image_url TEXT NOT NULL,
    before_image_url TEXT DEFAULT '',
    price_tag NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.portfolio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public access portfolio" ON public.portfolio;
CREATE POLICY "Public access portfolio" ON public.portfolio FOR ALL USING (true) WITH CHECK (true);
`,

  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --brand: #6366f1;
}

body {
  background-color: #09090b;
  color: #fafafa;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
}

/* Архитектурная сетка Astryx */
.astryx-grid {
  background-size: 36px 36px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

/* Тонкий кастомный скроллбар */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: #09090b;
}
::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
`,

  'components/ui/primitives.tsx': `'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, Car, Maximize2, X, ArrowUpRight } from 'lucide-react';

export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

/* --- SHADCN + ASTRYX CARD --- */
export function Card({
  className,
  children,
  glow = false,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_30px_-10px_rgba(0,0,0,0.6)]',
        glow && 'hover:border-white/[0.16] transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

/* --- SHADCN BADGE --- */
export function Badge({
  children,
  variant = 'default',
  className,
  style,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'outline' | 'brand';
  className?: string;
  style?: React.CSSProperties;
}) {
  const styles = {
    default: 'bg-zinc-900 text-zinc-300 border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    destructive: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    outline: 'bg-transparent text-zinc-400 border-white/15',
    brand: 'text-white border-white/20',
  };

  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/* --- SHADCN INPUT --- */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 px-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100',
        'placeholder:text-zinc-500 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition',
        props.className
      )}
    />
  );
}

/* --- SHADCN TEXTAREA --- */
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100',
        'placeholder:text-zinc-500 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition',
        props.className
      )}
    />
  );
}

/* --- КЛИЕНТСКОЕ СЖАТИЕ ФОТО В WEBP (БЕЗ НАСТРОЙКИ S3 BUCKET) --- */
export function compressImageFile(file: File, maxWidth = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/* --- КАРТОЧКА ПОРТФОЛИО С ИНТЕРАКТИВНЫМ СЛАЙДЕРОМ "ДО / ПОСЛЕ" --- */
export interface PortfolioCardData {
  id: string;
  title: string;
  category: string;
  car_model: string;
  description?: string;
  image_url: string;
  before_image_url?: string;
  price_tag?: number;
}

export function PortfolioShowcaseCard({
  item,
  brandColor,
  onSelectAction,
  onDelete,
}: {
  item: PortfolioCardData;
  brandColor: string;
  onSelectAction?: (category: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [lightbox, setLightbox] = useState(false);
  const hasBefore = Boolean(item.before_image_url && item.before_image_url.trim().length > 5);

  return (
    <>
      <Card glow className="overflow-hidden flex flex-col group">
        {/* Медиа-блок с поддержкой До/После */}
        <div className="relative h-56 w-full bg-zinc-900 overflow-hidden select-none">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />

          {hasBefore && (
            <>
              <img
                src={item.before_image_url}
                alt="До работ"
                style={{ clipPath: 'inset(0 ' + (100 - sliderPos) + '% 0 0)' }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                style={{ left: sliderPos + '%' }}
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.9)] z-10 pointer-events-none"
              >
                <div
                  style={{ backgroundColor: brandColor }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-xl text-white"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="absolute bottom-3 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/70 text-zinc-200 backdrop-blur-md border border-white/10">
                До
              </span>
              <span
                style={{ backgroundColor: brandColor }}
                className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white shadow-lg"
              >
                После
              </span>
              <input
                type="range"
                min={4}
                max={96}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Сравнение До и После"
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
            </>
          )}

          {/* Верхние бейджи */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
            <Badge className="bg-black/65 backdrop-blur-md text-white border-white/15">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {item.category}
            </Badge>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition"
              title="Увеличить"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Контент кейса */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1">
              <span className="inline-flex items-center gap-1 font-medium text-zinc-300">
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                {item.car_model}
              </span>
              {item.price_tag && item.price_tag > 0 ? (
                <span className="font-bold text-emerald-400">
                  {item.price_tag.toLocaleString('ru-RU')} ₽
                </span>
              ) : null}
            </div>
            <h3 className="font-bold text-sm text-zinc-100 leading-snug">{item.title}</h3>
            {item.description && (
              <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            {onSelectAction && (
              <button
                type="button"
                onClick={() => onSelectAction(item.category)}
                style={{ backgroundColor: brandColor }}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition shadow-lg"
              >
                <span>Хочу так же</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
              >
                Удалить из портфолио
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Полноэкранный Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-zinc-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 text-white border border-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={item.image_url} alt={item.title} className="w-full max-h-[70vh] object-contain bg-black" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{item.category}</Badge>
                <span className="text-xs text-zinc-400">{item.car_model}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              {item.description && <p className="text-sm text-zinc-400 mt-1">{item.description}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
`,

  'lib/db.ts': `import { supabase } from './supabase';

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  address: string;
  brand_color: string;
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
  category: string;
  car_model: string;
  description: string;
  image_url: string;
  before_image_url?: string;
  price_tag?: number;
  created_at?: string;
}

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'apex',
    name: 'Apex Detailing Studio',
    phone: '+7 (999) 111-22-33',
    address: 'ул. Ленина, 45',
    brand_color: '#e11d48',
    pin_code: '1234',
    is_paid: true,
  },
  {
    id: 'matsuri',
    name: 'Matsuri Tire & Service',
    phone: '+7 (999) 777-88-99',
    address: 'пр. Мира, 102',
    brand_color: '#10b981',
    pin_code: '0000',
    is_paid: true,
  },
];

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', tenant_id: 'apex', title: 'Трехфазная детейлинг-мойка', category: 'Мойка', base_price: 2500, duration_min: 60 },
  { id: 's2', tenant_id: 'apex', title: 'Восстановительная полировка + Керамика 9H', category: 'Детейлинг', base_price: 28000, duration_min: 240 },
  { id: 's3', tenant_id: 'apex', title: 'Химчистка салона с разбором', category: 'Детейлинг', base_price: 14000, duration_min: 180 },
  { id: 's4', tenant_id: 'apex', title: 'Оклейка зон риска полиуретаном PPF', category: 'Защита', base_price: 45000, duration_min: 300 },
  { id: 's5', tenant_id: 'matsuri', title: 'Комплексный шиномонтаж R16-R19', category: 'Шиномонтаж', base_price: 3200, duration_min: 45 },
  { id: 's6', tenant_id: 'matsuri', title: 'Порошковая покраска и проточка дисков', category: 'Шиномонтаж', base_price: 18000, duration_min: 240 },
  { id: 's7', tenant_id: 'matsuri', title: 'Замена тормозных дисков и колодок ATE', category: 'Ремонт', base_price: 3500, duration_min: 90 },
];

const DEFAULT_PORTFOLIO: PortfolioItem[] = [
  {
    id: 'p1',
    tenant_id: 'apex',
    title: 'Глубокая полировка и 2 слоя керамики Gyeon',
    category: 'Детейлинг',
    car_model: 'Porsche 911 Carrera S',
    description: 'Убрали 98% голограмм и паутинки, нанесли гидрофобный состав и антидождь на полусферу.',
    image_url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1000&q=80',
    before_image_url: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1000&q=80',
    price_tag: 34000,
  },
  {
    id: 'p2',
    tenant_id: 'apex',
    title: 'Оклейка матовым полиуретаном + Антихром',
    category: 'Защита',
    car_model: 'BMW M4 Competition',
    description: 'Полная защита кузова сатиновой пленкой Llumar 200 мкм и детейлинг подкапотного пространства.',
    image_url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1000&q=80',
    before_image_url: '',
    price_tag: 165000,
  },
  {
    id: 'p3',
    tenant_id: 'matsuri',
    title: 'Реставрация кованых дисков R20 + Шиномонтаж RunFlat',
    category: 'Шиномонтаж',
    car_model: 'Audi RS6 Avant',
    description: 'Бережный монтаж низкопрофильной резины без монтировки на стенде Hunter и лазерная балансировка в ноль.',
    image_url: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?auto=format&fit=crop&w=1000&q=80',
    before_image_url: '',
    price_tag: 22000,
  },
  {
    id: 'p4',
    tenant_id: 'matsuri',
    title: 'Обслуживание тормозной системы и ступиц',
    category: 'Ремонт',
    car_model: 'Opel Astra / VAG',
    description: 'Чистка посадочных мест ступиц, медная смазка направляющих, установка новых перфорированных дисков.',
    image_url: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1000&q=80',
    before_image_url: '',
    price_tag: 6500,
  },
];

function getLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  const raw = localStorage.getItem(key);
  if (!raw) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, data: T) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

export const db = {
  async checkCloudStatus(): Promise<{ ok: boolean; portfolioTableOk: boolean; errorMsg?: string }> {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) {
      return { ok: false, portfolioTableOk: false, errorMsg: error.message };
    }
    const { error: pErr } = await supabase.from('portfolio').select('id').limit(1);
    return { ok: true, portfolioTableOk: !pErr };
  },

  async seedIfEmpty(): Promise<void> {
    const { data, error } = await supabase.from('tenants').select('id').limit(1);
    if (!error && data && data.length === 0) {
      await supabase.from('tenants').insert(DEFAULT_TENANTS);
      await supabase.from('services').insert(
        DEFAULT_SERVICES.map(({ tenant_id, title, category, base_price, duration_min }) => ({
          tenant_id,
          title,
          category,
          base_price,
          duration_min,
        }))
      );
    }
    const { data: pData, error: pError } = await supabase.from('portfolio').select('id').limit(1);
    if (!pError && pData && pData.length === 0) {
      await supabase.from('portfolio').insert(
        DEFAULT_PORTFOLIO.map(({ tenant_id, title, category, car_model, description, image_url, before_image_url, price_tag }) => ({
          tenant_id,
          title,
          category,
          car_model,
          description,
          image_url,
          before_image_url,
          price_tag,
        }))
      );
    }
  },

  async getTenants(): Promise<Tenant[]> {
    await this.seedIfEmpty();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) return data;
    return getLocal<Tenant[]>('saas_tenants', DEFAULT_TENANTS);
  },

  async getTenantById(id: string): Promise<Tenant | null> {
    const cleanId = decodeURIComponent(id).toLowerCase().trim();
    await this.seedIfEmpty();
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', cleanId)
      .maybeSingle();
    if (!error && data) return data;
    const list = getLocal<Tenant[]>('saas_tenants', DEFAULT_TENANTS);
    return list.find((t) => t.id.toLowerCase() === cleanId) || null;
  },

  async createTenant(tenant: Tenant): Promise<void> {
    const { error } = await supabase.from('tenants').insert([tenant]);
    if (!error) {
      await supabase.from('services').insert([
        {
          tenant_id: tenant.id,
          title: 'Комплексная диагностика / Мойка',
          category: 'Базовые услуги',
          base_price: 2000,
          duration_min: 60,
        },
      ]);
    }
    const list = getLocal<Tenant[]>('saas_tenants', DEFAULT_TENANTS);
    setLocal('saas_tenants', [tenant, ...list.filter((t) => t.id !== tenant.id)]);
  },

  async toggleTenantPaid(id: string, is_paid: boolean): Promise<void> {
    await supabase.from('tenants').update({ is_paid }).eq('id', id);
    const list = getLocal<Tenant[]>('saas_tenants', DEFAULT_TENANTS);
    setLocal(
      'saas_tenants',
      list.map((t) => (t.id === id ? { ...t, is_paid } : t))
    );
  },

  async deleteTenant(id: string): Promise<void> {
    await supabase.from('tenants').delete().eq('id', id);
    const list = getLocal<Tenant[]>('saas_tenants', DEFAULT_TENANTS);
    setLocal(
      'saas_tenants',
      list.filter((t) => t.id !== id)
    );
  },

  async getServices(tenantId: string): Promise<Service[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('tenant_id', cleanId)
      .order('created_at', { ascending: true });
    if (!error && data && data.length > 0) return data;
    const list = getLocal<Service[]>('saas_services', DEFAULT_SERVICES);
    return list.filter((s) => s.tenant_id === cleanId);
  },

  async addService(service: Omit<Service, 'id'>): Promise<void> {
    const { error } = await supabase.from('services').insert([service]);
    if (error) {
      const list = getLocal<Service[]>('saas_services', DEFAULT_SERVICES);
      list.push({ ...service, id: 'srv_' + Date.now() });
      setLocal('saas_services', list);
    }
  },

  async updateService(id: string, base_price: number, duration_min: number): Promise<void> {
    await supabase.from('services').update({ base_price, duration_min }).eq('id', id);
    const list = getLocal<Service[]>('saas_services', DEFAULT_SERVICES);
    setLocal(
      'saas_services',
      list.map((s) => (s.id === id ? { ...s, base_price, duration_min } : s))
    );
  },

  async deleteService(id: string): Promise<void> {
    await supabase.from('services').delete().eq('id', id);
    const list = getLocal<Service[]>('saas_services', DEFAULT_SERVICES);
    setLocal(
      'saas_services',
      list.filter((s) => s.id !== id)
    );
  },

  async getBookings(tenantId: string): Promise<Booking[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('tenant_id', cleanId)
      .order('booking_date', { ascending: false });
    if (!error && data) return data;
    const list = getLocal<Booking[]>('saas_bookings', []);
    return list.filter((b) => b.tenant_id === cleanId);
  },

  async addBooking(booking: Omit<Booking, 'id'>): Promise<void> {
    const { error } = await supabase.from('bookings').insert([booking]);
    if (error) {
      const list = getLocal<Booking[]>('saas_bookings', []);
      list.unshift({ ...booking, id: 'bk_' + Date.now() });
      setLocal('saas_bookings', list);
    }
  },

  async updateBookingStatus(id: string, status: string): Promise<void> {
    await supabase.from('bookings').update({ status }).eq('id', id);
    const list = getLocal<Booking[]>('saas_bookings', []);
    setLocal(
      'saas_bookings',
      list.map((b) => (b.id === id ? { ...b, status } : b))
    );
  },

  /* --- ПОРТФОЛИО (ПРИМЕРЫ РАБОТ СЕРВИСА) --- */
  async getPortfolio(tenantId: string): Promise<PortfolioItem[]> {
    const cleanId = decodeURIComponent(tenantId).toLowerCase().trim();
    await this.seedIfEmpty();
    const { data, error } = await supabase
      .from('portfolio')
      .select('*')
      .eq('tenant_id', cleanId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      const localOnly = getLocal<PortfolioItem[]>('saas_portfolio_custom', []).filter(
        (p) => p.tenant_id === cleanId
      );
      return [...localOnly, ...data];
    }

    const fallbackList = getLocal<PortfolioItem[]>('saas_portfolio', DEFAULT_PORTFOLIO);
    return fallbackList.filter((p) => p.tenant_id === cleanId);
  },

  async addPortfolioItem(item: Omit<PortfolioItem, 'id'>): Promise<void> {
    const { error } = await supabase.from('portfolio').insert([item]);
    if (error) {
      const list = getLocal<PortfolioItem[]>('saas_portfolio', DEFAULT_PORTFOLIO);
      list.unshift({ ...item, id: 'pf_' + Date.now() });
      setLocal('saas_portfolio', list);
    }
  },

  async deletePortfolioItem(id: string): Promise<void> {
    await supabase.from('portfolio').delete().eq('id', id);
    const list = getLocal<PortfolioItem[]>('saas_portfolio', DEFAULT_PORTFOLIO);
    setLocal(
      'saas_portfolio',
      list.filter((p) => p.id !== id)
    );
  },
};
`,

  'app/page.tsx': `import Link from 'next/link';
import { Sparkles, ShieldCheck, Layers, Camera, Bot, ArrowRight, Wrench } from 'lucide-react';
import { Card, Badge } from '@/components/ui/primitives';

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-zinc-950 astryx-grid overflow-hidden flex flex-col justify-between">
      {/* Радиальное свечение Astryx */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[450px] rounded-full blur-[130px] opacity-30"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, #e11d48 50%, transparent 75%)' }}
      />

      <header className="relative z-10 max-w-6xl w-full mx-auto px-6 py-6 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center shadow-lg">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white">
            ASTRYX <span className="text-zinc-500 font-medium">AUTO SaaS</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/superadmin"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 transition"
          >
            Master Control
          </Link>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl w-full mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <Badge className="mb-5 py-1 px-3 bg-indigo-500/10 text-indigo-300 border-indigo-500/25">
            <Sparkles className="w-3.5 h-3.5" />
            White-Label PWA Engine • Multi-Tenant SaaS
          </Badge>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-[1.08]">
            Цифровая экосистема для{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-rose-400 bg-clip-text text-transparent">
              автосервисов и детейлинга
            </span>
          </h1>

          <p className="text-zinc-400 text-base sm:text-lg mt-5 max-w-2xl mx-auto leading-relaxed">
            Брендированные клиентские PWA-приложения, интерактивное портфолио «До / После», умное расписание боксов и AI-диспетчер в едином облаке.
          </p>

          <div className="flex flex-wrap justify-center gap-3.5 mt-9">
            <Link
              href="/client/apex"
              className="px-6 py-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm inline-flex items-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)] transition"
            >
              <span>Витрина: Apex Detailing</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/client/matsuri"
              className="px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-sm transition"
            >
              Витрина: Matsuri Шиномонтаж
            </Link>
            <Link
              href="/superadmin"
              className="px-6 py-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 font-semibold text-sm transition"
            >
              Супер-Админка (PIN: 9999)
            </Link>
          </div>
        </div>

        {/* Bento-сетка возможностей */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-16">
          <Card glow className="p-6">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-400 mb-4">
              <Camera className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Портфолио «До / После»</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Каждый владелец загружает фото своих работ с телефона или ПК. Встроенный интерактивный слайдер наглядно продает детейлинг и кузовной ремонт.
            </p>
          </Card>

          <Card glow className="p-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mb-4">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">Динамический White-Label</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Персональный фирменный цвет, расчет цен по кузову (Седан / Кроссовер / SUV), контроль слотов бокса и мгновенная блокировка при неоплате.
            </p>
          </Card>

          <Card glow className="p-6">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-400 mb-4">
              <Bot className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-white">AI-Диспетчер 24/7</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Консультирует клиента по прайс-листу конкретного автосервиса с учетом выбранного класса авто и помогает подобрать свободное окно.
            </p>
          </Card>
        </div>
      </main>

      <footer className="relative z-10 border-t border-white/[0.06] py-6 text-center text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          UI/UX Pro Max • shadcn/ui + Astryx Architecture • Next.js + Supabase
        </span>
      </footer>
    </div>
  );
}
`,

  'app/superadmin/page.tsx': `'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Plus,
  ExternalLink,
  Trash2,
  Lock,
  Building2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  LogOut,
  Sparkles,
} from 'lucide-react';
import { db, Tenant } from '@/lib/db';
import { Card, Badge, Input } from '@/components/ui/primitives';

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cloudOk, setCloudOk] = useState<boolean | null>(null);
  const [portfolioOk, setPortfolioOk] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#e11d48');
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
    const status = await db.checkCloudStatus();
    setCloudOk(status.ok);
    setPortfolioOk(status.portfolioTableOk);
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
      pin_code: pinCode,
      is_paid: isPaid,
    });

    setId('');
    setName('');
    setPhone('');
    setAddress('');
    fetchTenants();
  };

  const togglePayment = async (tenantId: string, currentStatus: boolean) => {
    await db.toggleTenantPaid(tenantId, !currentStatus);
    fetchTenants();
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('Удалить автосервис «' + tenantId + '» и все его данные?')) return;
    await db.deleteTenant(tenantId);
    fetchTenants();
  };

  if (!authenticated) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 astryx-grid p-4 overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full blur-[120px] opacity-25"
          style={{ backgroundColor: '#6366f1' }}
        />
        <Card className="w-full max-w-sm p-8 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-5 text-indigo-400">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-center mb-6">
            <Badge className="mb-2 bg-indigo-500/10 text-indigo-300 border-indigo-500/20">Master Access</Badge>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Control Center</h1>
            <p className="text-xs text-zinc-400 mt-1">Введите мастер-код платформы (по умолчанию 9999)</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-xl tracking-[0.5em] font-bold h-12"
            />
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition shadow-lg"
            >
              Войти в панель
            </button>
          </form>
        </Card>
      </div>
    );
  }

  const paidCount = tenants.filter((t) => t.is_paid).length;

  return (
    <div className="min-h-screen bg-zinc-950 astryx-grid text-zinc-100">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Topbar */}
        <header className="flex flex-wrap justify-between items-center gap-4 border-b border-white/[0.08] pb-5">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30">
                <Sparkles className="w-3 h-3" />
                Astryx Master Control
              </Badge>
              {cloudOk ? (
                <Badge variant="success">Supabase Connected</Badge>
              ) : (
                <Badge variant="warning">Local Fallback</Badge>
              )}
              {!portfolioOk && (
                <Badge variant="warning">Выполните supabase_portfolio_migration.sql для облачного портфолио</Badge>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-2">
              Управление автосервисами (SaaS)
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchTenants}
              className="h-10 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить
            </button>
            <Link
              href="/"
              className="h-10 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold inline-flex items-center"
            >
              Лендинг
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="h-10 px-3.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Выйти
            </button>
          </div>
        </header>

        {/* KPI Bento Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="p-5">
            <span className="text-xs text-zinc-400 font-medium">Всего автосервисов</span>
            <div className="text-3xl font-extrabold text-white mt-1">{tenants.length}</div>
          </Card>
          <Card className="p-5">
            <span className="text-xs text-zinc-400 font-medium">Активные подписки</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{paidCount}</div>
          </Card>
          <Card className="p-5">
            <span className="text-xs text-zinc-400 font-medium">Приостановлены</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-1">{tenants.length - paidCount}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Форма создания тенанта */}
          <Card className="lg:col-span-4 p-6 h-fit">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">Новый арендатор</h2>
                <p className="text-[11px] text-zinc-400">Мгновенный выпуск White-Label PWA</p>
              </div>
            </div>

            <form onSubmit={handleCreateTenant} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">URL-идентификатор (slug)</label>
                <Input
                  required
                  placeholder="например: pro-detailing"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Название сервиса</label>
                <Input
                  required
                  placeholder="Pro Detailing Lounge"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Телефон диспетчера</label>
                <Input
                  required
                  placeholder="+7 (999) 123-45-67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 block">Адрес боксов</label>
                <Input
                  required
                  placeholder="ул. Индустриальная, 18"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Цвет бренда</label>
                  <div className="flex items-center gap-2 h-10 px-2.5 rounded-xl bg-zinc-900/80 border border-white/10">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-xs font-mono text-zinc-300">{brandColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">PIN владельца</label>
                  <Input
                    required
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
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
                <span className="text-xs text-zinc-300">Подписка оплачена (PWA активно)</span>
              </label>

              <button
                type="submit"
                className="w-full h-11 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition shadow-lg mt-2"
              >
                Создать и развернуть PWA
              </button>
            </form>
          </Card>

          {/* Список тенантов */}
          <div className="lg:col-span-8 space-y-3.5">
            {loading ? (
              <Card className="p-10 text-center text-sm text-zinc-400">Синхронизация с базой данных...</Card>
            ) : (
              tenants.map((t) => (
                <Card key={t.id} glow className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-start gap-4">
                    <div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold shadow-lg flex-shrink-0 border border-white/20"
                      style={{ backgroundColor: t.brand_color }}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-white">{t.name}</h3>
                        <Badge variant="outline" className="font-mono text-[10px]">
                          /client/{t.id}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-400 mt-1">
                        {t.address} • {t.phone}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-400">
                        <span>
                          PIN кабинета: <b className="text-zinc-200 font-mono">{t.pin_code}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <button
                      onClick={() => togglePayment(t.id, t.is_paid)}
                      className={
                        t.is_paid
                          ? 'h-9 px-3 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 inline-flex items-center gap-1.5 transition'
                          : 'h-9 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 inline-flex items-center gap-1.5 transition'
                      }
                    >
                      {t.is_paid ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                      {t.is_paid ? 'Оплачено' : 'Заблокирован'}
                    </button>

                    <Link
                      href={'/client/' + t.id}
                      className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 border border-white/10 inline-flex items-center gap-1.5 transition"
                    >
                      <span>PWA</span>
                      <ExternalLink className="w-3 h-3 text-zinc-400" />
                    </Link>

                    <Link
                      href={'/client/' + t.id + '/admin'}
                      className="h-9 px-3.5 rounded-xl text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 inline-flex items-center gap-1.5 transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Админка</span>
                    </Link>

                    <button
                      onClick={() => deleteTenant(t.id)}
                      className="h-9 w-9 rounded-xl bg-zinc-900 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-zinc-400 flex items-center justify-center transition"
                      title="Удалить сервис"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
`,

  'app/client/[tenantId]/page.tsx': `'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Clock,
  Sparkles,
  Bot,
  Send,
  Calendar,
  Car,
  ShieldAlert,
  CheckCircle2,
  X,
  Camera,
  Wrench,
  Lock,
} from 'lucide-react';
import { db, Tenant, Service, PortfolioItem } from '@/lib/db';
import {
  Card,
  Badge,
  Input,
  PortfolioShowcaseCard,
  cn,
} from '@/components/ui/primitives';

const TIME_SLOTS = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00', '19:00', '20:00',
];

export default function TenantClientPWA() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'services' | 'portfolio'>('services');
  const [carClass, setCarClass] = useState<'sedan' | 'crossover' | 'suv'>('sedan');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [portfolioCategory, setPortfolioCategory] = useState<string>('Все');

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
    sedan: { name: 'Седан', sub: 'Базовый тариф', mult: 1.0 },
    crossover: { name: 'Кроссовер', sub: 'Коэф. +20%', mult: 1.2 },
    suv: { name: 'Внедорожник', sub: 'Коэф. +40%', mult: 1.4 },
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
    const tenantData = await db.getTenantById(tenantId);
    if (tenantData) {
      setTenant(tenantData);
      if (tenantData.is_paid) {
        const [servicesData, portfolioData] = await Promise.all([
          db.getServices(tenantId),
          db.getPortfolio(tenantId),
        ]);
        setServices(servicesData);
        setPortfolio(portfolioData);
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

  const calculatePrice = (basePrice: number) =>
    Math.round(basePrice * carMultipliers[carClass].mult);

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !bookingDate || !bookingTime || !clientName || !clientPhone) return;

    if (busySlots.includes(bookingTime)) {
      setBookingStatusMsg('Выбранное время уже занято. Выберите свободный слот.');
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

    setBookingStatusMsg('Запись подтверждена на ' + bookingDate + ' в ' + bookingTime + '!');
    fetchBusySlots(bookingDate);
    setTimeout(() => {
      setSelectedService(null);
      setBookingStatusMsg('');
      setClientName('');
      setClientPhone('');
    }, 1600);
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
      setAiResponse(data.reply || 'Выберите услугу в каталоге ниже.');
    } catch {
      setAiResponse('Не удалось связаться с AI-диспетчером.');
    }
    setAiLoading(false);
  };

  const handleWantSameFromPortfolio = (category: string) => {
    setActiveTab('services');
    const matchingCategory = services.some((s) => s.category.toLowerCase() === category.toLowerCase());
    setSelectedCategory(matchingCategory ? category : 'Все');
    window.scrollTo({ top: 280, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 text-sm">
        Загрузка цифрового сервиса...
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="min-h-screen bg-zinc-950 astryx-grid flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-white">Автосервис «{tenantId}» не найден</h1>
          <p className="text-xs text-zinc-400 mt-2 mb-6">
            Создайте тенант в Master Control Center или откройте демо-студию Apex.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/client/apex" className="px-4 py-2.5 rounded-xl bg-zinc-800 text-xs font-semibold">
              Открыть Apex
            </Link>
            <Link href="/superadmin" className="px-4 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-bold">
              Супер-Админка
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (!tenant.is_paid) {
    return (
      <div className="min-h-screen bg-zinc-950 astryx-grid flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-rose-500/30">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center mx-auto mb-4 text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{tenant.name}</h1>
          <p className="text-xs text-zinc-400 mt-2 mb-6 leading-relaxed">
            Онлайн-запись временно приостановлена администратором платформы. Для записи свяжитесь с сервисом по телефону.
          </p>
          <a
            href={'tel:' + tenant.phone}
            className="w-full h-11 rounded-xl bg-white text-zinc-950 font-bold text-sm flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>{tenant.phone}</span>
          </a>
        </Card>
      </div>
    );
  }

  const serviceCategories = ['Все', ...Array.from(new Set(services.map((s) => s.category)))];
  const filteredServices =
    selectedCategory === 'Все' ? services : services.filter((s) => s.category === selectedCategory);

  const portfolioCategories = ['Все', ...Array.from(new Set(portfolio.map((p) => p.category)))];
  const filteredPortfolio =
    portfolioCategory === 'Все' ? portfolio : portfolio.filter((p) => p.category === portfolioCategory);

  return (
    <div
      style={{ '--brand': tenant.brand_color } as React.CSSProperties}
      className="relative min-h-screen bg-zinc-950 astryx-grid text-zinc-100 pb-20 overflow-x-hidden"
    >
      {/* Динамическое свечение Astryx под цвет конкретного автосервиса */}
      <div
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[760px] h-[340px] rounded-full blur-[125px] opacity-30"
        style={{ backgroundColor: tenant.brand_color }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-4 pt-5 space-y-6">
        {/* Брендированный Hero-блок */}
        <Card className="p-6 sm:p-7 overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ backgroundColor: tenant.brand_color }}
          />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Badge
                  variant="brand"
                  style={{ backgroundColor: tenant.brand_color }}
                >
                  <Sparkles className="w-3 h-3" />
                  Онлайн-запись 24/7
                </Badge>
                <Badge variant="outline">Боксы свободны сегодня</Badge>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {tenant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-300" />
                  {tenant.address}
                </span>
                <a
                  href={'tel:' + tenant.phone}
                  className="inline-flex items-center gap-1.5 text-zinc-200 hover:underline font-medium"
                >
                  <Phone className="w-3.5 h-3.5" />
                  {tenant.phone}
                </a>
              </div>
            </div>

            <Link
              href={'/client/' + tenant.id + '/admin'}
              className="self-start sm:self-center h-9 px-3.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 text-xs font-semibold text-zinc-300 inline-flex items-center gap-1.5 transition"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Кабинет владельца</span>
            </Link>
          </div>
        </Card>

        {/* Сегментированный переключатель: Услуги vs Примеры работ (shadcn Tabs) */}
        <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            style={activeTab === 'services' ? { backgroundColor: tenant.brand_color } : {}}
            className={cn(
              'h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
              activeTab === 'services'
                ? 'text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Wrench className="w-4 h-4" />
            <span>Услуги и запись ({services.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            style={activeTab === 'portfolio' ? { backgroundColor: tenant.brand_color } : {}}
            className={cn(
              'h-11 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all',
              activeTab === 'portfolio'
                ? 'text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-200'
            )}
          >
            <Camera className="w-4 h-4" />
            <span>Примеры работ ({portfolio.length})</span>
          </button>
        </div>

        {/* === ВКЛАДКА 1: КАТАЛОГ УСЛУГ + КАЛЬКУЛЯТОР КУЗОВА + AI === */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            {/* Селектор класса авто */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  1. Выберите класс автомобиля
                </span>
                <span className="text-[11px] text-zinc-500">Автоматический пересчет прайса</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(Object.keys(carMultipliers) as Array<keyof typeof carMultipliers>).map((key) => {
                  const item = carMultipliers[key];
                  const active = carClass === key;
                  return (
                    <button
                      type="button"
                      key={key}
                      onClick={() => setCarClass(key)}
                      style={active ? { borderColor: tenant.brand_color } : {}}
                      className={cn(
                        'p-3.5 rounded-2xl border text-left transition-all',
                        active
                          ? 'bg-zinc-900 border-2 shadow-lg'
                          : 'bg-zinc-950/70 border-white/[0.08] hover:border-white/20'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <Car className={cn('w-4 h-4', active ? 'text-white' : 'text-zinc-500')} />
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                          x{item.mult}
                        </span>
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-white">{item.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{item.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* AI-Диспетчер */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: tenant.brand_color }}
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">AI-Диспетчер автосервиса</h3>
                    <p className="text-[11px] text-zinc-400">Подскажет стоимость и длительность под ваш кузов</p>
                  </div>
                </div>
              </div>
              <form onSubmit={handleAiAsk} className="flex gap-2">
                <Input
                  placeholder="Спросите: сколько стоит полировка, шиномонтаж или тормоза?"
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={aiLoading}
                  style={{ backgroundColor: tenant.brand_color }}
                  className="h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 flex-shrink-0 hover:opacity-90 transition"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{aiLoading ? '...' : 'Спросить'}</span>
                </button>
              </form>
              {aiResponse && (
                <div className="mt-3 p-3.5 rounded-xl bg-zinc-900/90 border border-white/10 text-xs text-zinc-200 leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </Card>

            {/* Категории и прайс-лист */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  2. Выберите услугу для онлайн-записи
                </span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-2.5">
                {serviceCategories.map((cat) => {
                  const active = selectedCategory === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      style={active ? { backgroundColor: tenant.brand_color } : {}}
                      className={cn(
                        'px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                        active
                          ? 'text-white shadow'
                          : 'bg-zinc-900/80 text-zinc-400 border border-white/[0.08] hover:text-zinc-200'
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-2">
                {filteredServices.map((service) => {
                  const finalPrice = calculatePrice(service.base_price);
                  return (
                    <Card key={service.id} glow className="p-5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <Badge>{service.category}</Badge>
                          <span className="inline-flex items-center gap-1 text-xs text-zinc-400">
                            <Clock className="w-3.5 h-3.5" />
                            {service.duration_min} мин
                          </span>
                        </div>
                        <h3 className="font-bold text-sm sm:text-base text-white leading-snug">
                          {service.title}
                        </h3>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-zinc-500 block">
                            Тариф: {carMultipliers[carClass].name}
                          </span>
                          <span className="text-xl font-extrabold text-emerald-400">
                            {finalPrice.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedService(service);
                            setBookingStatusMsg('');
                          }}
                          style={{ backgroundColor: tenant.brand_color }}
                          className="h-10 px-4 rounded-xl text-xs font-bold text-white shadow-lg hover:opacity-90 transition"
                        >
                          Записаться
                        </button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Превью портфолио прямо под услугами */}
            {portfolio.length > 0 && (
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">Выполненные работы мастеров</h2>
                    <p className="text-xs text-zinc-400">Потяните ползунок на фото для сравнения До / После</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('portfolio')}
                    className="text-xs font-semibold text-zinc-300 hover:text-white underline"
                  >
                    Смотреть все ({portfolio.length})
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolio.slice(0, 2).map((item) => (
                    <PortfolioShowcaseCard
                      key={item.id}
                      item={item}
                      brandColor={tenant.brand_color}
                      onSelectAction={handleWantSameFromPortfolio}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* === ВКЛАДКА 2: ПОЛНАЯ ГАЛЕРЕЯ ПРИМЕРОВ РАБОТ СЕРВИСА === */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-extrabold text-white">Портфолио «{tenant.name}»</h2>
                <p className="text-xs text-zinc-400">
                  Реальные примеры детейлинга, шиномонтажа и ремонта наших мастеров
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {portfolioCategories.map((cat) => {
                  const active = portfolioCategory === cat;
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setPortfolioCategory(cat)}
                      style={active ? { backgroundColor: tenant.brand_color } : {}}
                      className={cn(
                        'px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition',
                        active
                          ? 'text-white shadow'
                          : 'bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white'
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {filteredPortfolio.length === 0 ? (
              <Card className="p-12 text-center">
                <Camera className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-zinc-300">Примеры работ пока не добавлены</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Владелец автосервиса может загрузить фото кейсов в своем личном кабинете.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredPortfolio.map((item) => (
                  <PortfolioShowcaseCard
                    key={item.id}
                    item={item}
                    brandColor={tenant.brand_color}
                    onSelectAction={handleWantSameFromPortfolio}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно онлайн-бронирования (shadcn Dialog style) */}
      {selectedService && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
          <Card className="w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto border-white/15">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
              <div>
                <span className="text-[11px] text-zinc-400 font-medium">Онлайн-бронирование бокса</span>
                <h3 className="font-extrabold text-lg text-white">{selectedService.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/10 flex items-center justify-between">
              <div className="text-xs text-zinc-300">
                Кузов: <b className="text-white">{carMultipliers[carClass].name}</b>
                <span className="block text-[11px] text-zinc-500 mt-0.5">
                  Длительность: ~{selectedService.duration_min} мин
                </span>
              </div>
              <div className="text-lg font-extrabold text-emerald-400">
                {calculatePrice(selectedService.base_price).toLocaleString('ru-RU')} ₽
              </div>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Выберите дату визита
                </label>
                <Input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 mb-2 block">
                  Свободное время ({bookingDate})
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
                        className={cn(
                          'h-9 rounded-xl text-xs font-semibold transition',
                          isBusy
                            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400/50 line-through cursor-not-allowed'
                            : isSelected
                            ? 'text-white font-bold shadow-lg'
                            : 'bg-zinc-900 border border-white/10 text-zinc-300 hover:border-white/25'
                        )}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Ваше имя</label>
                  <Input
                    required
                    placeholder="Артем"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-400 mb-1 block">Телефон</label>
                  <Input
                    type="tel"
                    required
                    placeholder="+7 (999) 000-00-00"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
              </div>

              {bookingStatusMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{bookingStatusMsg}</span>
                </div>
              )}

              <button
                type="submit"
                style={{ backgroundColor: tenant.brand_color }}
                className="w-full h-11 rounded-xl font-bold text-sm text-white shadow-xl hover:opacity-95 transition"
              >
                Подтвердить запись на {bookingTime}
              </button>
            </form>
          </Card>
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
import {
  Lock,
  Calendar,
  Wrench,
  Camera,
  Upload,
  Plus,
  Trash2,
  ExternalLink,
  LogOut,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { db, Tenant, Service, Booking, PortfolioItem } from '@/lib/db';
import {
  Card,
  Badge,
  Input,
  Textarea,
  PortfolioShowcaseCard,
  compressImageFile,
  cn,
} from '@/components/ui/primitives';

export default function TenantAdminPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'portfolio'>('bookings');

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [saveMessage, setSaveMessage] = useState('');

  // Стейт новой услуги
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Детейлинг');
  const [newPrice, setNewPrice] = useState('2500');
  const [newDuration, setNewDuration] = useState('60');

  // Стейт нового кейса в портфолио
  const [pfTitle, setPfTitle] = useState('');
  const [pfCategory, setPfCategory] = useState('Детейлинг');
  const [pfCarModel, setPfCarModel] = useState('');
  const [pfPriceTag, setPfPriceTag] = useState('');
  const [pfDesc, setPfDesc] = useState('');
  const [pfAfterImage, setPfAfterImage] = useState('');
  const [pfBeforeImage, setPfBeforeImage] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await db.getTenantById(tenantId);
    if (!t) {
      alert('Автосервис не найден');
      return;
    }
    if (t.pin_code === pin) {
      setTenant(t);
      setAuthenticated(true);
      loadAdminData();
    } else {
      alert('Неверный PIN-код владельца!');
    }
  };

  const loadAdminData = async () => {
    const [sData, bData, pData] = await Promise.all([
      db.getServices(tenantId),
      db.getBookings(tenantId),
      db.getPortfolio(tenantId),
    ]);
    setServices(sData);
    setBookings(bData);
    setPortfolio(pData);
  };

  const notifySaved = (msg: string) => {
    setSaveMessage(msg);
    setTimeout(() => setSaveMessage(''), 2500);
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
    notifySaved('Услуга добавлена в каталог');
    loadAdminData();
  };

  const handleUpdateService = async (service: Service) => {
    await db.updateService(service.id, Number(service.base_price), Number(service.duration_min));
    notifySaved('Прайс обновлен');
    loadAdminData();
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу из прайса?')) return;
    await db.deleteService(id);
    loadAdminData();
  };

  const updateLocalService = (id: string, field: 'base_price' | 'duration_min', value: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: Number(value) } : s))
    );
  };

  const toggleBookingStatus = async (bookingId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'cancelled' ? 'confirmed' : 'cancelled';
    await db.updateBookingStatus(bookingId, nextStatus);
    loadAdminData();
  };

  // Загрузка и сжатие фото с устройства
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'after' | 'before'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const compressedDataUrl = await compressImageFile(file, 1000);
      if (target === 'after') setPfAfterImage(compressedDataUrl);
      else setPfBeforeImage(compressedDataUrl);
    } catch {
      alert('Не удалось обработать фото. Попробуйте другой файл.');
    }
    setUploadingImg(false);
  };

  const handleAddPortfolio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pfAfterImage.trim()) {
      alert('Загрузите основное фото результата или вставьте ссылку на изображение');
      return;
    }

    await db.addPortfolioItem({
      tenant_id: tenantId,
      title: pfTitle,
      category: pfCategory,
      car_model: pfCarModel,
      description: pfDesc,
      image_url: pfAfterImage,
      before_image_url: pfBeforeImage,
      price_tag: Number(pfPriceTag) || 0,
    });

    setPfTitle('');
    setPfCarModel('');
    setPfPriceTag('');
    setPfDesc('');
    setPfAfterImage('');
    setPfBeforeImage('');
    notifySaved('Кейс опубликован в портфолио!');
    loadAdminData();
  };

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm('Удалить эту работу из портфолио?')) return;
    await db.deletePortfolioItem(id);
    loadAdminData();
  };

  const brandColor = tenant?.brand_color || '#6366f1';

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 astryx-grid flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-8">
          <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto mb-4 text-zinc-200">
            <Lock className="w-5 h-5" />
          </div>
          <div className="text-center mb-6">
            <Badge variant="outline" className="mb-2 font-mono">
              {tenantId}
            </Badge>
            <h1 className="text-2xl font-extrabold text-white">Кабинет владельца</h1>
            <p className="text-xs text-zinc-400 mt-1">Введите PIN-код вашего автосервиса</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="PIN (например 1234)"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              className="text-center text-lg tracking-widest font-bold h-12"
            />
            <button
              type="submit"
              className="w-full h-11 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 font-bold text-sm transition"
            >
              Открыть управление
            </button>
          </form>
          <Link
            href={'/client/' + tenantId}
            className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-5"
          >
            ← Вернуться на витрину клиента
          </Link>
        </Card>
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalRevenue = activeBookings.reduce((acc, b) => acc + Number(b.price || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 astryx-grid text-zinc-100 pb-16">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Шапка админки */}
        <header className="flex flex-wrap justify-between items-center gap-4 border-b border-white/[0.08] pb-5">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold shadow-lg"
              style={{ backgroundColor: brandColor }}
            >
              {tenant?.name?.slice(0, 1) || 'A'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white">{tenant?.name}</h1>
                {saveMessage && (
                  <Badge variant="success">
                    <CheckCircle2 className="w-3 h-3" />
                    {saveMessage}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400">Управление записями, прайсом и примерами работ</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAdminData}
              className="h-9 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Обновить
            </button>
            <Link
              href={'/client/' + tenantId}
              className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <span>Витрина PWA</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </Link>
            <button
              onClick={() => setAuthenticated(false)}
              className="h-9 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              Выйти
            </button>
          </div>
        </header>

        {/* Bento-аналитика владельца */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>Выручка по записям</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </div>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-zinc-400">Активные брони</span>
            <div className="text-2xl font-extrabold text-white mt-1">{activeBookings.length}</div>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-zinc-400">Услуг в каталоге</span>
            <div className="text-2xl font-extrabold text-white mt-1">{services.length}</div>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-zinc-400">Работ в портфолио</span>
            <div className="text-2xl font-extrabold text-white mt-1">{portfolio.length}</div>
          </Card>
        </div>

        {/* Навигация по разделам кабинета */}
        <div className="grid grid-cols-3 p-1.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08] max-w-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            style={activeTab === 'bookings' ? { backgroundColor: brandColor } : {}}
            className={cn(
              'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition',
              activeTab === 'bookings' ? 'text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Записи ({bookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            style={activeTab === 'services' ? { backgroundColor: brandColor } : {}}
            className={cn(
              'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition',
              activeTab === 'services' ? 'text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Прайс ({services.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('portfolio')}
            style={activeTab === 'portfolio' ? { backgroundColor: brandColor } : {}}
            className={cn(
              'h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition',
              activeTab === 'portfolio' ? 'text-white shadow' : 'text-zinc-400 hover:text-white'
            )}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Примеры работ ({portfolio.length})</span>
          </button>
        </div>

        {/* === РАЗДЕЛ 1: ЖУРНАЛ ЗАПИСЕЙ === */}
        {activeTab === 'bookings' && (
          <Card className="p-6">
            <h2 className="font-bold text-base text-white mb-4">Журнал онлайн-бронирований боксов</h2>
            {bookings.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">Записей от клиентов пока нет.</div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b) => {
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <div
                      key={b.id}
                      className={cn(
                        'p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4',
                        isCancelled
                          ? 'bg-zinc-950/50 border-white/5 opacity-55'
                          : 'bg-zinc-900/70 border-white/10'
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{b.service_title}</span>
                          <Badge>{b.car_class}</Badge>
                          {isCancelled ? (
                            <Badge variant="destructive">Отменено</Badge>
                          ) : (
                            <Badge variant="success">Подтверждено</Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5">
                          Клиент: <b>{b.client_name}</b> •{' '}
                          <a href={'tel:' + b.client_phone} className="underline text-zinc-200">
                            {b.client_phone}
                          </a>
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Дата: <b className="text-white">{b.booking_date}</b> в{' '}
                          <b className="text-white">{b.booking_time}</b>
                        </p>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-extrabold text-emerald-400 text-base">
                          {Number(b.price).toLocaleString('ru-RU')} ₽
                        </span>
                        <button
                          onClick={() => toggleBookingStatus(b.id, b.status)}
                          className={cn(
                            'h-9 px-3.5 rounded-xl text-xs font-semibold border transition',
                            isCancelled
                              ? 'bg-zinc-900 border-white/10 text-zinc-300'
                              : 'bg-rose-500/10 border-rose-500/25 text-rose-400 hover:bg-rose-500/20'
                          )}
                        >
                          {isCancelled ? 'Восстановить' : 'Отменить'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {/* === РАЗДЕЛ 2: УПРАВЛЕНИЕ ПРАЙС-ЛИСТОМ === */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-4 p-6 h-fit">
              <h2 className="font-bold text-base text-white mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Добавить услугу
              </h2>
              <form onSubmit={handleAddService} className="space-y-3.5">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Название услуги</label>
                  <Input
                    required
                    placeholder="Например: Мойка подвески"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Категория</label>
                  <Input
                    required
                    placeholder="Детейлинг / Шиномонтаж / Ремонт"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Базовая цена (₽)</label>
                    <Input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Длительность (мин)</label>
                    <Input
                      type="number"
                      required
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  style={{ backgroundColor: brandColor }}
                  className="w-full h-10 rounded-xl text-xs font-bold text-white shadow-lg hover:opacity-90 transition"
                >
                  Добавить в прайс
                </button>
              </form>
            </Card>

            <div className="lg:col-span-8 space-y-3">
              {services.map((s) => (
                <Card key={s.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <Badge className="mb-1">{s.category}</Badge>
                    <h3 className="font-bold text-sm text-white">{s.title}</h3>
                  </div>
                  <div className="flex items-end gap-2.5 w-full sm:w-auto">
                    <div className="w-28">
                      <label className="text-[10px] text-zinc-500">Цена (₽)</label>
                      <Input
                        type="number"
                        value={s.base_price}
                        onChange={(e) => updateLocalService(s.id, 'base_price', e.target.value)}
                        className="h-9 text-xs font-bold text-emerald-400"
                      />
                    </div>
                    <div className="w-24">
                      <label className="text-[10px] text-zinc-500">Мин.</label>
                      <Input
                        type="number"
                        value={s.duration_min}
                        onChange={(e) => updateLocalService(s.id, 'duration_min', e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateService(s)}
                      className="h-9 px-3.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-bold transition"
                    >
                      Сохранить
                    </button>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="h-9 w-9 rounded-xl bg-zinc-900 hover:bg-rose-500/20 hover:text-rose-400 border border-white/10 text-zinc-400 flex items-center justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* === РАЗДЕЛ 3: ПОРТФОЛИО И ПРИМЕРЫ РАБОТ ВЛАДЕЛЬЦА === */}
        {activeTab === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Card className="lg:col-span-5 p-6 h-fit">
              <div className="mb-4">
                <h2 className="font-bold text-base text-white flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Опубликовать пример работы
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Загрузите фото результата (и опционально фото «До» для интерактивного слайдера сравнения).
                </p>
              </div>

              <form onSubmit={handleAddPortfolio} className="space-y-3.5">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Заголовок выполненной работы</label>
                  <Input
                    required
                    placeholder="Например: Полировка + Керамика 9H / Покраска дисков R19"
                    value={pfTitle}
                    onChange={(e) => setPfTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Автомобиль</label>
                    <Input
                      required
                      placeholder="BMW X5 / Opel Astra"
                      value={pfCarModel}
                      onChange={(e) => setPfCarModel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400 mb-1 block">Направление</label>
                    <select
                      value={pfCategory}
                      onChange={(e) => setPfCategory(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100 focus:outline-none"
                    >
                      <option value="Детейлинг">Детейлинг</option>
                      <option value="Шиномонтаж">Шиномонтаж</option>
                      <option value="Ремонт">Автосервис / Ремонт</option>
                      <option value="Защита">Бронепленка / Защита</option>
                      <option value="Мойка">Мойка / Химчистка</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Стоимость кейса в ₽ (необязательно)</label>
                  <Input
                    type="number"
                    placeholder="Например: 18500"
                    value={pfPriceTag}
                    onChange={(e) => setPfPriceTag(e.target.value)}
                  />
                </div>

                {/* Загрузка основного фото ПОСЛЕ */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-dashed border-white/15 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">1. Фото результата (ПОСЛЕ) *</span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{uploadingImg ? 'Сжатие...' : 'С устройства'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <Input
                    placeholder="Или вставьте прямую ссылку https://..."
                    value={pfAfterImage.startsWith('data:') ? 'Загружено фото с устройства (WebP)' : pfAfterImage}
                    onChange={(e) => setPfAfterImage(e.target.value)}
                  />
                  {pfAfterImage && (
                    <img
                      src={pfAfterImage}
                      alt="Превью После"
                      className="h-28 w-full object-cover rounded-xl border border-white/10"
                    />
                  )}
                </div>

                {/* Загрузка опционального фото ДО */}
                <div className="p-3.5 rounded-2xl bg-zinc-900/40 border border-dashed border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-400">
                      2. Фото ДО работ (включает слайдер До/После)
                    </span>
                    <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 inline-flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Выбрать</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <Input
                    placeholder="Необязательно: ссылка на фото ДО..."
                    value={pfBeforeImage.startsWith('data:') ? 'Загружено фото ДО с устройства (WebP)' : pfBeforeImage}
                    onChange={(e) => setPfBeforeImage(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Описание выполненных работ</label>
                  <Textarea
                    rows={3}
                    placeholder="Какие материалы использовались, что было исправлено..."
                    value={pfDesc}
                    onChange={(e) => setPfDesc(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  style={{ backgroundColor: brandColor }}
                  className="w-full h-11 rounded-xl font-bold text-sm text-white shadow-lg hover:opacity-90 transition"
                >
                  Добавить работу на витрину сервиса
                </button>
              </form>
            </Card>

            {/* Галерея загруженных работ владельца */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-base text-white">
                  Опубликованные работы вашего сервиса ({portfolio.length})
                </h2>
              </div>

              {portfolio.length === 0 ? (
                <Card className="p-12 text-center text-zinc-500 text-sm">
                  У вашего автосервиса пока нет загруженных примеров работ. Добавьте первый кейс слева!
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {portfolio.map((item) => (
                    <PortfolioShowcaseCard
                      key={item.id}
                      item={item}
                      brandColor={brandColor}
                      onDelete={handleDeletePortfolio}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
`,
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✨ Обновлен файл:', filePath);
}

console.log('\n🚀 Дизайн UI/UX Pro Max (shadcn/ui + Astryx) и модуль «Примеры работ» успешно установлены!');
console.log('1. Выполните SQL из файла supabase_portfolio_migration.sql в Supabase SQL Editor');
console.log('2. Перезапустите dev-сервер: npm run dev');