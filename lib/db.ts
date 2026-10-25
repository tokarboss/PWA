import { supabase } from './supabase';

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
};