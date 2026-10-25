// fix.mjs — Прописывает ваши ключи Supabase и обновляет логику работы с БД
import fs from 'fs';
import path from 'path';

const files = {
  '.env.local': `NEXT_PUBLIC_SUPABASE_URL=https://dczjhmrgcgptzegyhvfq.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG
`,

  'lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dczjhmrgcgptzegyhvfq.supabase.co';

const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG';

export const supabase = createClient(supabaseUrl, supabaseKey);
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

const DEFAULT_TENANTS: Tenant[] = [
  {
    id: 'apex',
    name: 'Apex Detailing Studio',
    phone: '+7 (999) 111-22-33',
    address: 'ул. Ленина, 45',
    brand_color: '#dc2626',
    pin_code: '1234',
    is_paid: true,
  },
  {
    id: 'matsuri',
    name: 'Matsuri Tire & Service',
    phone: '+7 (999) 777-88-99',
    address: 'пр. Мира, 102',
    brand_color: '#16a34a',
    pin_code: '0000',
    is_paid: true,
  },
];

const DEFAULT_SERVICES: Service[] = [
  { id: 's1', tenant_id: 'apex', title: 'Трехфазная детейлинг-мойка', category: 'Мойка', base_price: 2500, duration_min: 60 },
  { id: 's2', tenant_id: 'apex', title: 'Полировка кузова + Керамика 9H', category: 'Детейлинг', base_price: 28000, duration_min: 240 },
  { id: 's3', tenant_id: 'apex', title: 'Полная химчистка салона', category: 'Детейлинг', base_price: 14000, duration_min: 180 },
  { id: 's4', tenant_id: 'apex', title: 'Антидождь всех стекол', category: 'Защита', base_price: 3500, duration_min: 45 },
  { id: 's5', tenant_id: 'matsuri', title: 'Комплексный шиномонтаж R16-R18', category: 'Шиномонтаж', base_price: 3200, duration_min: 45 },
  { id: 's6', tenant_id: 'matsuri', title: 'Лазерная балансировка 4 колес', category: 'Шиномонтаж', base_price: 1600, duration_min: 30 },
  { id: 's7', tenant_id: 'matsuri', title: 'Замена тормозных колодок (ось)', category: 'Ремонт', base_price: 2000, duration_min: 60 },
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
  async checkCloudStatus(): Promise<{ ok: boolean; errorMsg?: string }> {
    const { error } = await supabase.from('tenants').select('id').limit(1);
    if (error) {
      return { ok: false, errorMsg: error.message };
    }
    return { ok: true };
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

    const services = getLocal<Service[]>('saas_services', DEFAULT_SERVICES);
    services.push({
      id: 'srv_' + Date.now(),
      tenant_id: tenant.id,
      title: 'Комплексная диагностика / Мойка',
      category: 'Базовые услуги',
      base_price: 2000,
      duration_min: 60,
    });
    setLocal('saas_services', services);
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
};
`,

  'app/superadmin/page.tsx': `'use client';

import { useState } from 'react';
import { db, Tenant } from '@/lib/db';
import Link from 'next/link';

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [cloudOk, setCloudOk] = useState<boolean | null>(null);
  const [cloudError, setCloudError] = useState('');
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
    const status = await db.checkCloudStatus();
    setCloudOk(status.ok);
    setCloudError(status.errorMsg || '');
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
    if (!confirm('Удалить автосервис ' + tenantId + '?')) return;
    await db.deleteTenant(tenantId);
    fetchTenants();
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
            <p className="text-xs text-slate-400 mt-2">Мастер PIN-код: 9999</p>
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
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">SuperAdmin</span>
            {cloudOk ? (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">
                🟢 Подключено к Supabase (dczjhmrgcgptzegyhvfq)
              </span>
            ) : (
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                ⚡ Автономный режим (выполните supabase_schema.sql в Supabase)
              </span>
            )}
          </div>
          <h1 className="text-3xl font-extrabold text-white mt-1">Управление SaaS-арендаторами</h1>
          {!cloudOk && cloudError && (
            <p className="text-xs text-amber-400/90 mt-1">
              Ответ Supabase: {cloudError}. Скопируйте файл supabase_schema.sql в SQL Editor вашего проекта Supabase.
            </p>
          )}
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
            <div className="p-8 text-center text-slate-500">Загрузка...</div>
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

  'app/client/[tenantId]/page.tsx': `'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, Tenant, Service } from '@/lib/db';

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
    const tenantData = await db.getTenantById(tenantId);
    if (tenantData) {
      setTenant(tenantData);
      if (tenantData.is_paid) {
        const servicesData = await db.getServices(tenantId);
        setServices(servicesData);
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

    setBookingStatusMsg('✅ Вы успешно записаны на ' + bookingDate + ' в ' + bookingTime + '!');
    fetchBusySlots(bookingDate);
    setTimeout(() => {
      setSelectedService(null);
      setBookingStatusMsg('');
      setClientName('');
      setClientPhone('');
    }, 1500);
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
        <h1 className="text-2xl font-bold text-rose-400 mb-2">Автосервис «{tenantId}» не найден</h1>
        <p className="text-slate-400 text-sm mb-6">Добавьте этот ID в Супер-Админке или перейдите в демо-сервис Apex.</p>
        <div className="flex gap-3">
          <Link href="/client/apex" className="px-5 py-2.5 bg-slate-800 rounded-xl text-sm font-semibold">
            Открыть /client/apex
          </Link>
          <Link href="/superadmin" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-sm font-semibold">
            Перейти в /superadmin
          </Link>
        </div>
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
import { db, Service, Booking } from '@/lib/db';

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
    const tenant = await db.getTenantById(tenantId);
    if (!tenant) {
      alert('Автосервис не найден');
      return;
    }

    if (tenant.pin_code === pin) {
      setAuthenticated(true);
      loadAdminData();
    } else {
      alert('Неверный PIN-код владельца! (Для apex по умолчанию: 1234)');
    }
  };

  const loadAdminData = async () => {
    const sData = await db.getServices(tenantId);
    setServices(sData);

    const bData = await db.getBookings(tenantId);
    setBookings(bData);
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
    setSaveMessage('✅ Сохранено!');
    setTimeout(() => setSaveMessage(''), 2000);
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
            placeholder="PIN-код сервиса (1234)"
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
`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Обновлен файл:', filePath);
}

console.log('\n🎉 Ключи dczjhmrgcgptzegyhvfq.supabase.co успешно подключены!');
console.log('Перезапустите сервер: Ctrl+C и затем npm run dev');