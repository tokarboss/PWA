// upgrade-qr.mjs — Генератор брендированных QR-стендов (PNG + Печать А4) и глубокие ссылки по вкладкам
import fs from 'fs';
import path from 'path';

const files = {
  'app/globals.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

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

/* Чистая печать QR-стенда на листе А4 */
@media print {
  body {
    background: #ffffff !important;
    color: #000000 !important;
  }
  .no-print {
    display: none !important;
  }
  .print-only-stand {
    margin: 0 auto !important;
    box-shadow: none !important;
    border: 2px solid #18181b !important;
    max-width: 420px !important;
  }
}
`,

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

  // Автоматическое открытие нужной вкладки при сканировании QR-кода (?tab=reviews | portfolio | services)
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
  const filteredServices =
    selectedCategory === 'Все' ? services : services.filter((s) => s.category === selectedCategory);

  const portfolioCategories = ['Все', ...Array.from(new Set(portfolio.map((p) => p.category)))];
  const filteredPortfolio =
    portfolioCategory === 'Все' ? portfolio : portfolio.filter((p) => p.category === portfolioCategory);

  const calculatePrice = (basePrice: number) => Math.round(basePrice * carMultipliers[carClass].mult);

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
      : '5.0';

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
    const matchedService =
      services.find((s) => s.category.toLowerCase() === item.category.toLowerCase()) ||
      services[0] || {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-8 text-zinc-400 text-sm">
        Загрузка цифровой витрины автосервиса...
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 p-6 text-center">
        <h1 className="text-2xl font-bold text-rose-400 mb-2">Автосервис «{tenantId}» не найден</h1>
        <p className="text-zinc-400 text-sm mb-6">Создайте этот тенант в Супер-Админке или откройте демо-сервис.</p>
        <div className="flex gap-3">
          <Link href="/client/apex" className="px-5 py-2.5 bg-zinc-800 rounded-xl text-xs font-semibold">
            Открыть /client/apex
          </Link>
          <Link href="/superadmin" className="px-5 py-2.5 bg-indigo-600 rounded-xl text-xs font-semibold">
            Супер-Админка
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant.is_paid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-zinc-950 bg-astryx-grid text-center">
        <div className="max-w-md w-full bg-zinc-900/90 backdrop-blur-xl border border-rose-500/20 p-8 rounded-3xl shadow-2xl">
          <div className="w-14 h-14 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">{tenant.name}</h1>
          <p className="text-zinc-400 text-xs leading-relaxed mb-6">
            Онлайн-терминал этого автосервиса временно приостановлен. Для записи свяжитесь с мастером-приемщиком напрямую.
          </p>
          <a
            href={'tel:' + tenant.phone}
            className="block w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl font-semibold text-sm transition"
          >
            Позвонить: {tenant.phone}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 pb-20 relative overflow-x-hidden">
      <div
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[550px] h-[260px] blur-[135px] opacity-25 rounded-full"
        style={{ backgroundColor: tenant.brand_color }}
      />

      <div className="max-w-2xl mx-auto relative z-10 px-4 pt-4">
        <header className="rounded-3xl bg-zinc-900/80 backdrop-blur-xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
          <div
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: tenant.brand_color }}
          />
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] font-medium text-zinc-300">
                  <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: tenant.brand_color }} />
                  Боксы открыты
                </div>

                <button
                  onClick={() => setActiveTab('reviews')}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>{averageRating}</span>
                  <span className="text-amber-400/70 font-normal">({reviews.length} отз.)</span>
                </button>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 tracking-tight">
                {tenant.name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-3">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-500" />
                  {tenant.address}
                </span>
                <a href={'tel:' + tenant.phone} className="flex items-center gap-1.5 hover:text-white transition">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  {tenant.phone}
                </a>
              </div>
            </div>

            <Link
              href={'/client/' + tenant.id + '/admin'}
              className="p-2.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 border border-white/10 text-zinc-300 transition flex items-center gap-1.5 text-xs font-medium"
              title="Панель владельца"
            >
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Кабинет</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 mt-6 rounded-2xl bg-zinc-950/90 border border-white/[0.07]">
            <button
              onClick={() => setActiveTab('services')}
              style={activeTab === 'services' ? { backgroundColor: tenant.brand_color } : {}}
              className={
                activeTab === 'services'
                  ? 'py-2.5 px-2.5 rounded-xl text-xs font-bold text-white shadow flex items-center justify-center gap-1.5 transition'
                  : 'py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition'
              }
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Услуги ({services.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('portfolio')}
              style={activeTab === 'portfolio' ? { backgroundColor: tenant.brand_color } : {}}
              className={
                activeTab === 'portfolio'
                  ? 'py-2.5 px-2.5 rounded-xl text-xs font-bold text-white shadow flex items-center justify-center gap-1.5 transition'
                  : 'py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition'
              }
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Работы ({portfolio.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('reviews')}
              style={activeTab === 'reviews' ? { backgroundColor: tenant.brand_color } : {}}
              className={
                activeTab === 'reviews'
                  ? 'py-2.5 px-2.5 rounded-xl text-xs font-bold text-white shadow flex items-center justify-center gap-1.5 transition'
                  : 'py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition'
              }
            >
              <Star className="w-3.5 h-3.5" />
              <span>Отзывы ({reviews.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              style={activeTab === 'ai' ? { backgroundColor: tenant.brand_color } : {}}
              className={
                activeTab === 'ai'
                  ? 'py-2.5 px-2.5 rounded-xl text-xs font-bold text-white shadow flex items-center justify-center gap-1.5 transition'
                  : 'py-2.5 px-2.5 rounded-xl text-xs font-medium text-zinc-400 hover:text-white flex items-center justify-center gap-1.5 transition'
              }
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI-Подбор</span>
            </button>
          </div>
        </header>

        {activeTab === 'services' && (
          <div className="mt-6 space-y-6">
            <section className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-3xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-zinc-300" />
                  1. Выберите тип кузова
                </span>
                <span className="text-[11px] text-zinc-500">Автоматический пересчет цен</span>
              </div>
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
                          ? 'p-3.5 rounded-2xl text-left border-2 bg-zinc-900 text-white shadow-lg transition'
                          : 'p-3.5 rounded-2xl text-left border border-white/[0.07] bg-zinc-950/60 text-zinc-400 hover:bg-zinc-900 transition'
                      }
                    >
                      <div className="font-bold text-xs text-white">{item.name}</div>
                      <div className="text-[11px] text-zinc-500 mt-1">{item.desc}</div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {serviceCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    style={selectedCategory === cat ? { backgroundColor: tenant.brand_color } : {}}
                    className={
                      selectedCategory === cat
                        ? 'px-4 py-2 rounded-xl text-xs font-bold text-white whitespace-nowrap shadow'
                        : 'px-4 py-2 rounded-xl text-xs font-medium bg-zinc-900/80 text-zinc-400 border border-white/[0.08] hover:text-white whitespace-nowrap'
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="space-y-3 mt-3">
                {filteredServices.map((service) => {
                  const finalPrice = calculatePrice(service.base_price);
                  return (
                    <div
                      key={service.id}
                      className="bg-zinc-900/70 backdrop-blur-xl border border-white/[0.08] hover:border-white/20 p-5 rounded-2xl flex justify-between items-center gap-4 transition"
                    >
                      <div>
                        <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-md bg-white/[0.06] text-zinc-300 uppercase tracking-wider">
                          {service.category}
                        </span>
                        <h3 className="font-bold text-base text-white mt-2">{service.title}</h3>
                        <p className="text-xs text-zinc-400 mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          Длительность работ: ~{service.duration_min} мин
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-xl font-extrabold text-white">{finalPrice.toLocaleString('ru-RU')} ₽</div>
                        <button
                          onClick={() => {
                            setSelectedService(service);
                            setBookingStatusMsg('');
                          }}
                          style={{ backgroundColor: tenant.brand_color }}
                          className="mt-2.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg hover:opacity-90 transition inline-flex items-center gap-1.5"
                        >
                          Записаться
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white">Выполненные работы мастеров</h2>
                <p className="text-xs text-zinc-400">Реальные кейсы автосервиса «{tenant.name}»</p>
              </div>
              <div className="flex gap-1.5 overflow-x-auto">
                {portfolioCategories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setPortfolioCategory(cat)}
                    style={portfolioCategory === cat ? { backgroundColor: tenant.brand_color } : {}}
                    className={
                      portfolioCategory === cat
                        ? 'px-3 py-1.5 rounded-xl text-xs font-bold text-white'
                        : 'px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-900 text-zinc-400 border border-white/10'
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {filteredPortfolio.length === 0 ? (
              <div className="p-12 rounded-3xl bg-zinc-900/60 border border-white/[0.08] text-center text-zinc-400 text-sm">
                Владелец еще не загрузил примеры работ в эту категорию.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {filteredPortfolio.map((item) => {
                  const isShowingBefore = Boolean(showBeforeMap[item.id]);
                  const activeImg = isShowingBefore && item.before_image_url ? item.before_image_url : item.image_url;

                  return (
                    <div
                      key={item.id}
                      className="rounded-3xl bg-zinc-900/75 backdrop-blur-xl border border-white/10 overflow-hidden shadow-xl"
                    >
                      <div className="relative h-64 sm:h-72 w-full bg-zinc-950 overflow-hidden">
                        <img
                          src={activeImg}
                          alt={item.title}
                          className="w-full h-full object-cover transition duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-black/30" />

                        <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/70 backdrop-blur-md text-white border border-white/15">
                            🚘 {item.car_model}
                          </span>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-zinc-200 border border-white/10">
                            {item.category}
                          </span>
                        </div>

                        {item.before_image_url && (
                          <div className="absolute top-3.5 right-3.5 flex rounded-xl bg-black/75 backdrop-blur-md p-1 border border-white/15">
                            <button
                              type="button"
                              onClick={() => setShowBeforeMap((prev) => ({ ...prev, [item.id]: true }))}
                              className={
                                isShowingBefore
                                  ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white'
                                  : 'px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-300'
                              }
                            >
                              ДО
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowBeforeMap((prev) => ({ ...prev, [item.id]: false }))}
                              className={
                                !isShowingBefore
                                  ? 'px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white'
                                  : 'px-2.5 py-1 rounded-lg text-[11px] font-medium text-zinc-300'
                              }
                            >
                              ПОСЛЕ
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setLightboxItem(item)}
                          className="absolute bottom-3.5 right-3.5 p-2 rounded-xl bg-black/60 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md text-xs flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Увеличить
                        </button>
                      </div>

                      <div className="p-5">
                        <div className="flex justify-between items-start gap-4">
                          <h3 className="font-bold text-base text-white">{item.title}</h3>
                          <span className="text-base font-extrabold text-emerald-400 whitespace-nowrap">
                            {Number(item.price).toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        {item.description && (
                          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{item.description}</p>
                        )}

                        <div className="mt-4 pt-4 border-t border-white/[0.07] flex justify-between items-center">
                          <span className="text-[11px] text-zinc-500">Выполнено в {tenant.name}</span>
                          <button
                            type="button"
                            onClick={() => handleBookFromPortfolio(item)}
                            style={{ backgroundColor: tenant.brand_color }}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow hover:opacity-90 transition"
                          >
                            Хочу так же →
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="mt-6 space-y-6">
            <section className="rounded-3xl bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 shadow-xl">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
                <div className="sm:col-span-5 text-center sm:text-left sm:border-r border-white/10 sm:pr-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    Индекс доверия клиентов
                  </span>
                  <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-2">
                    <span className="text-5xl font-extrabold text-white tracking-tight">{averageRating}</span>
                    <span className="text-sm text-zinc-500">из 5.0</span>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-1 mt-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={
                          s <= Math.round(Number(averageRating))
                            ? 'w-4 h-4 fill-amber-400 text-amber-400'
                            : 'w-4 h-4 text-zinc-700'
                        }
                      />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    На основе <b>{reviews.length}</b> проверенных оценок
                  </p>
                </div>

                <div className="sm:col-span-7 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const pct = getStarPercentage(star);
                    return (
                      <div key={star} className="flex items-center gap-3 text-xs">
                        <span className="w-12 flex items-center gap-1 text-zinc-300 font-medium">
                          {star} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        </span>
                        <div className="flex-1 h-2 rounded-full bg-zinc-950 overflow-hidden border border-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: pct + '%',
                              backgroundColor: star >= 4 ? tenant.brand_color : '#f59e0b',
                            }}
                          />
                        </div>
                        <span className="w-9 text-right text-zinc-400 font-mono text-[11px]">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-base text-white">Оставить отзыв о работе сервиса</h3>
                  <p className="text-xs text-zinc-400">Оцените качество обслуживания в «{tenant.name}»</p>
                </div>
                <MessageSquare className="w-5 h-5 text-zinc-500" />
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div className="p-4 rounded-2xl bg-zinc-950/90 border border-white/[0.07] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-zinc-300">Ваша оценка:</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => {
                      const active = (hoverRating || revRating) >= star;
                      return (
                        <button
                          type="button"
                          key={star}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          onClick={() => setRevRating(star)}
                          className="p-1.5 rounded-xl hover:scale-110 transition transform"
                        >
                          <Star
                            className={
                              active
                                ? 'w-7 h-7 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]'
                                : 'w-7 h-7 text-zinc-700'
                            }
                          />
                        </button>
                      );
                    })}
                    <span className="ml-2 text-sm font-extrabold text-amber-400">{revRating}.0</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-zinc-400">Ваше имя</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Артем С."
                      value={revName}
                      onChange={(e) => setRevName(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1 focus:outline-none focus:border-white/30"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-zinc-400">Марка и модель авто</label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Opel Astra H / BMW X5"
                      value={revCar}
                      onChange={(e) => setRevCar(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1 focus:outline-none focus:border-white/30"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400">Какую услугу выполняли?</label>
                  <select
                    value={revService}
                    onChange={(e) => setRevService(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1 focus:outline-none"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.title}>
                        {s.title}
                      </option>
                    ))}
                    <option value="Комплексное обслуживание">Другая услуга / Комплексное обслуживание</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-400">Ваш комментарий</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Поделитесь впечатлениями о качестве работы мастеров, чистоте бокса и скорости..."
                    value={revComment}
                    onChange={(e) => setRevComment(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1 focus:outline-none focus:border-white/30"
                  />
                </div>

                {revSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Спасибо! Ваш отзыв опубликован и учтен в рейтинге автосервиса.
                  </div>
                )}

                <button
                  type="submit"
                  style={{ backgroundColor: tenant.brand_color }}
                  className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-lg hover:opacity-95 transition"
                >
                  Опубликовать отзыв ({revRating} ★)
                </button>
              </form>
            </section>

            <section className="space-y-4">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-3xl bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-5 space-y-3"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white shadow"
                        style={{ backgroundColor: tenant.brand_color }}
                      >
                        {rev.client_name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{rev.client_name}</span>
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <ShieldCheck className="w-3 h-3" /> Проверенный клиент
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                          <span>🚘 {rev.car_model}</span>
                          <span>•</span>
                          <span>{rev.service_title}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={
                              s <= rev.rating
                                ? 'w-3.5 h-3.5 fill-amber-400 text-amber-400'
                                : 'w-3.5 h-3.5 text-zinc-700'
                            }
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-zinc-500 mt-1">
                        {new Date(rev.created_at).toLocaleDateString('ru-RU')}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed pt-1">{rev.comment}</p>

                  {rev.owner_reply && (
                    <div
                      className="mt-3 p-3.5 rounded-2xl bg-zinc-950/90 border-l-2 border border-white/[0.06] text-xs"
                      style={{ borderLeftColor: tenant.brand_color }}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                        <CornerDownRight className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Ответ {tenant.name}</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{rev.owner_reply}</p>
                    </div>
                  )}
                </div>
              ))}
            </section>
          </div>
        )}

        {activeTab === 'ai' && (
          <section className="mt-6 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow"
                style={{ backgroundColor: tenant.brand_color }}
              >
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-base text-white">AI-Диспетчер «{tenant.name}»</h2>
                <p className="text-xs text-zinc-400">
                  Рассчитает стоимость под ваш {carMultipliers[carClass].name} и подберет услугу
                </p>
              </div>
            </div>

            <form onSubmit={handleAiAsk} className="flex gap-2">
              <input
                type="text"
                placeholder="Например: сколько стоит полировка или шиномонтаж?"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                className="flex-1 p-3.5 rounded-2xl bg-zinc-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={aiLoading}
                style={{ backgroundColor: tenant.brand_color }}
                className="px-5 py-3.5 rounded-2xl text-xs font-bold text-white flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                {aiLoading ? '...' : 'Спросить'}
              </button>
            </form>

            {aiResponse && (
              <div className="mt-4 p-4 rounded-2xl bg-zinc-950 border border-white/10 text-xs text-zinc-200 leading-relaxed">
                {aiResponse}
              </div>
            )}
          </section>
        )}
      </div>

      {lightboxItem && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-white/15 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="relative h-80 bg-black">
              <img src={lightboxItem.image_url} alt={lightboxItem.title} className="w-full h-full object-cover" />
              <button
                onClick={() => setLightboxItem(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <span className="text-xs font-bold text-indigo-400">{lightboxItem.car_model}</span>
              <h3 className="text-lg font-bold text-white mt-1">{lightboxItem.title}</h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">{lightboxItem.description}</p>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                <span className="text-lg font-extrabold text-emerald-400">
                  Стоимость кейса: {Number(lightboxItem.price).toLocaleString('ru-RU')} ₽
                </span>
                <button
                  onClick={() => handleBookFromPortfolio(lightboxItem)}
                  style={{ backgroundColor: tenant.brand_color }}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white"
                >
                  Записаться на эту услугу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedService && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-zinc-900 border border-white/10 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 space-y-4 max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Онлайн-бронирование бокса</h3>
              </div>
              <button
                onClick={() => setSelectedService(null)}
                className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950 border border-white/10 p-4 rounded-2xl">
              <p className="font-bold text-sm text-white">{selectedService.title}</p>
              <p className="text-xs text-zinc-400 mt-1">
                Авто: <b>{carMultipliers[carClass].name}</b> • Итого к оплате:{' '}
                <span className="text-emerald-400 font-extrabold">
                  {calculatePrice(selectedService.base_price).toLocaleString('ru-RU')} ₽
                </span>
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-zinc-400">Выберите дату визита</label>
                <input
                  type="date"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2">
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
                        className={
                          isBusy
                            ? 'py-2 rounded-xl text-xs font-medium bg-rose-950/30 border border-rose-500/20 text-rose-500/50 line-through cursor-not-allowed'
                            : isSelected
                            ? 'py-2 rounded-xl text-xs font-bold text-white shadow-lg'
                            : 'py-2 rounded-xl text-xs font-medium bg-zinc-950 border border-white/10 text-zinc-300 hover:border-white/30'
                        }
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Ваше имя</label>
                <input
                  type="text"
                  required
                  placeholder="Артем"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400">Контактный телефон</label>
                <input
                  type="tel"
                  required
                  placeholder="+7 (999) 000-00-00"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-sm text-white mt-1"
                />
              </div>

              {bookingStatusMsg && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-center font-semibold text-emerald-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  {bookingStatusMsg}
                </div>
              )}

              <button
                type="submit"
                style={{ backgroundColor: tenant.brand_color }}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition hover:opacity-95"
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
} from 'lucide-react';

export default function TenantAdminPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeSection, setActiveSection] = useState<
    'bookings' | 'services' | 'portfolio' | 'reviews' | 'qr'
  >('bookings');

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState('');

  // Новая услуга
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Детейлинг');
  const [newPrice, setNewPrice] = useState('3000');
  const [newDuration, setNewDuration] = useState('60');

  // Новый пример работы
  const [pfTitle, setPfTitle] = useState('');
  const [pfCarModel, setPfCarModel] = useState('');
  const [pfCategory, setPfCategory] = useState('Детейлинг');
  const [pfImageUrl, setPfImageUrl] = useState('');
  const [pfBeforeImageUrl, setPfBeforeImageUrl] = useState('');
  const [pfPrice, setPfPrice] = useState('15000');
  const [pfDescription, setPfDescription] = useState('');

  // Конфигуратор QR-стенда для бокса / ресепшена
  const [qrTarget, setQrTarget] = useState<'reviews' | 'services' | 'portfolio'>('reviews');
  const [qrBadgeText, setQrBadgeText] = useState('ОЦЕНИТЕ КАЧЕСТВО РАБОТЫ');
  const [qrHeadline, setQrHeadline] = useState('Понравился результат?');
  const [qrSubtext, setQrSubtext] = useState(
    'Наведите камеру смартфона на QR-код, чтобы оставить отзыв или записаться онлайн без очереди'
  );
  const [qrWifiNote, setQrWifiNote] = useState('');
  const [originUrl, setOriginUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginUrl(window.location.origin);
    }
  }, []);

  const handleQrPresetChange = (target: 'reviews' | 'services' | 'portfolio') => {
    setQrTarget(target);
    if (target === 'reviews') {
      setQrBadgeText('ОТЗЫВЫ И РЕЙТИНГ ★ 5.0');
      setQrHeadline('Оцените работу мастеров!');
      setQrSubtext('Отсканируйте QR-код камерой телефона — форма отзыва откроется за 2 секунды');
    } else if (target === 'services') {
      setQrBadgeText('ОНЛАЙН-ЗАПИСЬ 24/7');
      setQrHeadline('Запишитесь в бокс без звонка');
      setQrSubtext('Выберите удобную дату, время и узнайте точную стоимость под ваш кузов');
    } else {
      setQrBadgeText('ПОРТФОЛИО ДО / ПОСЛЕ');
      setQrHeadline('Посмотрите наши работы');
      setQrSubtext('Примеры выполненного детейлинга, шиномонтажа и ремонта в нашем сервисе');
    }
  };

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
      alert('Неверный PIN-код владельца! (Для apex: 1234, для matsuri: 0000)');
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
    rData.forEach((r) => {
      drafts[r.id] = r.owner_reply || '';
    });
    setReplyDrafts(drafts);
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
    if (!confirm('Удалить эту работу из портфолио?')) return;
    await db.deletePortfolioItem(id);
    loadAdminData();
  };

  const handleSaveReply = async (reviewId: string) => {
    const replyText = (replyDrafts[reviewId] || '').trim();
    await db.replyToReview(reviewId, replyText);
    setSaveMessage('Ответ представителя опубликован!');
    setTimeout(() => setSaveMessage(''), 2500);
    loadAdminData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Удалить этот отзыв?')) return;
    await db.deleteReview(reviewId);
    loadAdminData();
  };

  // Полная ссылка, зашитая в QR-код
  const qrFullDestinationUrl = originUrl + '/client/' + tenantId + '?tab=' + qrTarget;
  const qrImageSrc =
    'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&ecc=H&data=' +
    encodeURIComponent(qrFullDestinationUrl);

  const handleCopyQrLink = () => {
    navigator.clipboard.writeText(qrFullDestinationUrl);
    setSaveMessage('Прямая ссылка скопирована!');
    setTimeout(() => setSaveMessage(''), 2000);
  };

  // Генерация брендированного PNG-постера 1080x1350px через HTML5 Canvas
  const handleDownloadPosterPng = async () => {
    if (!tenant) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Темный обсидиановый фон Astryx
      ctx.fillStyle = '#09090b';
      ctx.fillRect(0, 0, 1080, 1350);

      // 2. Брендовая верхняя полоса
      ctx.fillStyle = tenant.brand_color || '#e11d48';
      ctx.fillRect(0, 0, 1080, 36);

      // 3. Плашка категории
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.roundRect(140, 100, 800, 68, 34);
      ctx.fill();

      ctx.fillStyle = tenant.brand_color || '#e11d48';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(qrBadgeText.toUpperCase(), 540, 144);

      // 4. Название автосервиса
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 62px sans-serif';
      ctx.fillText(tenant.name, 540, 260);

      // 5. Призыв к действию (Заголовок)
      ctx.fillStyle = '#e4e4e7';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText(qrHeadline, 540, 340);

      // 6. Белая подложка под QR-код с цветной рамкой
      ctx.strokeStyle = tenant.brand_color || '#e11d48';
      ctx.lineWidth = 10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(240, 400, 600, 600, 48);
      ctx.fill();
      ctx.stroke();

      // Загружаем изображение QR-кода
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = qrImageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      ctx.drawImage(img, 270, 430, 540, 540);

      // 7. Подпись под QR-кодом
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '30px sans-serif';
      ctx.fillText(qrSubtext.slice(0, 62), 540, 1080);
      if (qrSubtext.length > 62) {
        ctx.fillText(qrSubtext.slice(62, 124), 540, 1125);
      }

      // 8. Футер с адресом и телефоном сервиса
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(tenant.address + '  •  ' + tenant.phone, 540, 1220);

      if (qrWifiNote) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '26px monospace';
        ctx.fillText(qrWifiNote, 540, 1280);
      }

      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'qr-stand-' + tenant.id + '-' + qrTarget + '.png';
      a.click();

      setSaveMessage('Брендированный PNG-стенд скачан!');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch {
      window.open(qrImageSrc, '_blank');
    }
  };

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
            placeholder="PIN владельца (1234)"
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
            ← Открыть клиентскую витрину
          </Link>
        </form>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + Number(b.price || 0), 0);
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1)
      : '5.0';

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="no-print flex flex-wrap justify-between items-center gap-4 mb-6 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
          <div>
            <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">
              Панель владельца автосервиса
            </span>
            <h1 className="text-2xl font-extrabold text-white mt-0.5">
              {tenant?.name || tenantId}
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadAdminData}
              className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-300"
              title="Обновить данные"
            >
              <RefreshCw className="w-4 h-4" />
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
        <div className="no-print grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Активные записи</span>
            <div className="text-2xl font-extrabold text-white mt-1">{confirmedBookings.length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Выручка</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">
              {totalRevenue.toLocaleString('ru-RU')} ₽
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Средний рейтинг</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-1 flex items-center gap-1.5">
              ★ {avgRating} <span className="text-xs text-zinc-500 font-normal">({reviews.length})</span>
            </div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Услуг в прайсе</span>
            <div className="text-2xl font-extrabold text-white mt-1">{services.length}</div>
          </div>
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Работ в портфолио</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{portfolio.length}</div>
          </div>
        </div>

        {/* Section Switcher Tabs */}
        <div className="no-print flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveSection('bookings')}
            className={
              activeSection === 'bookings'
                ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 flex items-center gap-2 shadow'
                : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white flex items-center gap-2'
            }
          >
            <CalendarCheck className="w-4 h-4" />
            Журнал записей ({bookings.length})
          </button>

          <button
            onClick={() => setActiveSection('portfolio')}
            className={
              activeSection === 'portfolio'
                ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 flex items-center gap-2 shadow'
                : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white flex items-center gap-2'
            }
          >
            <Camera className="w-4 h-4" />
            Примеры работ ({portfolio.length})
          </button>

          <button
            onClick={() => setActiveSection('reviews')}
            className={
              activeSection === 'reviews'
                ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 flex items-center gap-2 shadow'
                : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white flex items-center gap-2'
            }
          >
            <Star className="w-4 h-4" />
            Отзывы клиентов ({reviews.length})
          </button>

          <button
            onClick={() => setActiveSection('services')}
            className={
              activeSection === 'services'
                ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 flex items-center gap-2 shadow'
                : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10 hover:text-white flex items-center gap-2'
            }
          >
            <Wrench className="w-4 h-4" />
            Прайс-лист ({services.length})
          </button>

          <button
            onClick={() => setActiveSection('qr')}
            style={activeSection === 'qr' ? { backgroundColor: tenant?.brand_color || '#e11d48' } : {}}
            className={
              activeSection === 'qr'
                ? 'px-4 py-2.5 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg'
                : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 flex items-center gap-2'
            }
          >
            <QrCode className="w-4 h-4" />
            QR-стенд для бокса
          </button>

          {saveMessage && (
            <span className="ml-auto self-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
              ✓ {saveMessage}
            </span>
          )}
        </div>

        {/* РАЗДЕЛ 5: ГЕНЕРАТОР БРЕНДИРОВАННОГО QR-КОДА ДЛЯ БОКСА / РЕСЕПШЕНА */}
        {activeSection === 'qr' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Панель настроек QR-макета (скрывается при печати) */}
            <div className="no-print lg:col-span-6 bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                  style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}
                >
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Генератор QR-стенда для ресепшена и боксов</h2>
                  <p className="text-xs text-zinc-400">
                    Распечатайте тейбл-тент или скачайте PNG для сбора 5-звездочных отзывов и онлайн-записи
                  </p>
                </div>
              </div>

              {/* Выбор назначения QR-кода */}
              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">
                  1. Куда должен вести QR-код при сканировании?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQrPresetChange('reviews')}
                    className={
                      qrTarget === 'reviews'
                        ? 'p-3 rounded-2xl border-2 border-amber-400 bg-zinc-950 text-left'
                        : 'p-3 rounded-2xl border border-white/10 bg-zinc-950/50 text-left hover:bg-zinc-950'
                    }
                  >
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Отзывы
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Открывает форму оценки 1-5 ★</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQrPresetChange('services')}
                    className={
                      qrTarget === 'services'
                        ? 'p-3 rounded-2xl border-2 border-indigo-400 bg-zinc-950 text-left'
                        : 'p-3 rounded-2xl border border-white/10 bg-zinc-950/50 text-left hover:bg-zinc-950'
                    }
                  >
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <CalendarCheck className="w-3.5 h-3.5 text-indigo-400" /> Запись
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Открывает каталог и слоты</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQrPresetChange('portfolio')}
                    className={
                      qrTarget === 'portfolio'
                        ? 'p-3 rounded-2xl border-2 border-emerald-400 bg-zinc-950 text-left'
                        : 'p-3 rounded-2xl border border-white/10 bg-zinc-950/50 text-left hover:bg-zinc-950'
                    }
                  >
                    <div className="text-xs font-bold text-white flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" /> Работы
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Кейсы «До / После»</div>
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400">Верхний бейдж на постере</label>
                  <input
                    type="text"
                    value={qrBadgeText}
                    onChange={(e) => setQrBadgeText(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Главный призыв (Заголовок)</label>
                  <input
                    type="text"
                    value={qrHeadline}
                    onChange={(e) => setQrHeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Поясняющий текст под QR-кодом</label>
                  <textarea
                    rows={2}
                    value={qrSubtext}
                    onChange={(e) => setQrSubtext(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">
                    Дополнительная строка внизу (например, пароль от Wi-Fi в клиентской зоне или скидка)
                  </label>
                  <input
                    type="text"
                    placeholder="Например: Бесплатный Wi-Fi в зале ожидания: Apex_Guest / 12345678"
                    value={qrWifiNote}
                    onChange={(e) => setQrWifiNote(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>
              </div>

              {/* Прямая ссылка */}
              <div className="p-3.5 rounded-2xl bg-zinc-950 border border-white/10 flex items-center justify-between gap-2">
                <div className="truncate text-xs font-mono text-zinc-300">{qrFullDestinationUrl}</div>
                <button
                  type="button"
                  onClick={handleCopyQrLink}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-white flex items-center gap-1.5 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Копировать
                </button>
              </div>

              {/* Кнопки экспорта */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownloadPosterPng}
                  style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}
                  className="py-3.5 px-4 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:opacity-95 transition"
                >
                  <Download className="w-4 h-4" />
                  Скачать готовый PNG-постер
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-3.5 px-4 rounded-xl text-xs font-bold bg-white text-zinc-950 hover:bg-zinc-200 flex items-center justify-center gap-2 transition shadow"
                >
                  <Printer className="w-4 h-4" />
                  Распечатать стойку А4
                </button>
              </div>
            </div>

            {/* Живое превью брендированного стенда (печатается на А4) */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="print-only-stand w-full max-w-md rounded-[32px] bg-zinc-900 border border-white/15 shadow-2xl overflow-hidden relative text-center p-8">
                {/* Верхняя брендовая полоса */}
                <div
                  className="absolute top-0 left-0 right-0 h-2.5"
                  style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}
                />

                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-zinc-950 border border-white/10 text-[11px] font-extrabold tracking-wider uppercase text-white mt-2">
                  <Sparkles className="w-3.5 h-3.5" style={{ color: tenant?.brand_color || '#e11d48' }} />
                  <span>{qrBadgeText}</span>
                </div>

                <h3 className="text-2xl font-extrabold text-white mt-4 tracking-tight">
                  {tenant?.name}
                </h3>
                <p className="text-sm font-semibold text-zinc-300 mt-1">{qrHeadline}</p>

                {/* Рамка с QR-кодом */}
                <div
                  className="my-6 mx-auto w-64 h-64 rounded-3xl bg-white p-4 shadow-2xl border-4 flex items-center justify-center"
                  style={{ borderColor: tenant?.brand_color || '#e11d48' }}
                >
                  <img
                    src={qrImageSrc}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Рейтинг */}
                <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-300 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                  <span className="ml-1">{avgRating} / 5.0</span>
                </div>

                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">
                  {qrSubtext}
                </p>

                {qrWifiNote && (
                  <div className="mt-4 p-2.5 rounded-xl bg-zinc-950/90 border border-white/10 text-[11px] font-mono text-amber-300">
                    {qrWifiNote}
                  </div>
                )}

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-center gap-4 text-[11px] text-zinc-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {tenant?.address}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {tenant?.phone}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 1: ЖУРНАЛ ЗАПИСЕЙ */}
        {activeSection === 'bookings' && (
          <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl">
            <h2 className="font-bold text-lg text-white mb-4">Бронирования боксов клиентами</h2>
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">
                  Записей пока нет. Создайте тестовую запись через витрину PWA.
                </div>
              ) : (
                bookings.map((b) => {
                  const isCancelled = b.status === 'cancelled';
                  return (
                    <div
                      key={b.id}
                      className={
                        isCancelled
                          ? 'p-4 rounded-2xl border border-rose-500/20 bg-zinc-950/60 opacity-60 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
                          : 'p-4 rounded-2xl border border-white/10 bg-zinc-950/90 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'
                      }
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{b.service_title}</span>
                          <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                            {b.car_class}
                          </span>
                          {isCancelled ? (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> Отменено
                            </span>
                          ) : (
                            <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Подтверждено
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 mt-2">
                          <span>👤 Клиент: <b className="text-zinc-200">{b.client_name}</b></span>
                          <a href={'tel:' + b.client_phone} className="flex items-center gap-1 text-indigo-400 hover:underline">
                            <Phone className="w-3 h-3" /> {b.client_phone}
                          </a>
                          <span className="text-zinc-200 font-semibold">
                            📅 {b.booking_date} в {b.booking_time}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        <span className="font-extrabold text-emerald-400 text-base">
                          {Number(b.price).toLocaleString('ru-RU')} ₽
                        </span>
                        <button
                          onClick={() => toggleBookingStatus(b.id, b.status)}
                          className={
                            isCancelled
                              ? 'px-3.5 py-2 text-xs bg-zinc-800 text-zinc-300 rounded-xl border border-white/10'
                              : 'px-3.5 py-2 text-xs bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl border border-rose-500/20 font-semibold'
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
        )}

        {/* РАЗДЕЛ 2: ПРИМЕРЫ РАБОТ (ПОРТФОЛИО) */}
        {activeSection === 'portfolio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl h-fit">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-4 h-4 text-indigo-400" />
                <h2 className="font-bold text-base text-white">Опубликовать пример работы</h2>
              </div>

              <form onSubmit={handleAddPortfolio} className="space-y-3.5">
                <div>
                  <label className="text-xs text-zinc-400">Выполненная работа (Заголовок)</label>
                  <input
                    type="text"
                    required
                    placeholder="Например: Полировка + Керамика 9H"
                    value={pfTitle}
                    onChange={(e) => setPfTitle(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-400">Автомобиль клиента</label>
                    <input
                      type="text"
                      required
                      placeholder="BMW X5 / Opel Astra H"
                      value={pfCarModel}
                      onChange={(e) => setPfCarModel(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-400">Категория</label>
                    <input
                      type="text"
                      required
                      placeholder="Детейлинг / Шиномонтаж / Ремонт"
                      value={pfCategory}
                      onChange={(e) => setPfCategory(e.target.value)}
                      className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Ссылка на фото результата («ПОСЛЕ»)</label>
                  <input
                    type="url"
                    required
                    placeholder="https://images.unsplash.com/..."
                    value={pfImageUrl}
                    onChange={(e) => setPfImageUrl(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Ссылка на фото «ДО» (необязательно)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={pfBeforeImageUrl}
                    onChange={(e) => setPfBeforeImageUrl(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Итоговая стоимость работы (₽)</label>
                  <input
                    type="number"
                    required
                    value={pfPrice}
                    onChange={(e) => setPfPrice(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400">Описание процесса</label>
                  <textarea
                    rows={3}
                    placeholder="Какие материалы использовались..."
                    value={pfDescription}
                    onChange={(e) => setPfDescription(e.target.value)}
                    className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl text-xs font-bold transition shadow-lg"
                >
                  Опубликовать в витрине PWA
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-4">
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/70 border border-white/10 p-4 rounded-3xl flex flex-col sm:flex-row gap-4 items-start sm:items-center"
                >
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full sm:w-36 h-28 object-cover rounded-2xl bg-zinc-950 flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {item.car_model}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                        {item.category}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-white mt-1.5">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{item.description}</p>
                    <div className="text-sm font-extrabold text-emerald-400 mt-2">
                      {Number(item.price).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeletePortfolio(item.id)}
                    className="p-2.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 3: МОДЕРАЦИЯ ОТЗЫВОВ И ОТВЕТЫ ВЛАДЕЛЬЦА */}
        {activeSection === 'reviews' && (
          <div className="bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h2 className="font-bold text-lg text-white">Отзывы клиентов и официальные ответы</h2>
                <p className="text-xs text-zinc-400">
                  Отвечайте клиентам от лица автосервиса — ваш ответ отобразится в клиентском PWA
                </p>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Отзывов пока нет.</div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-5 rounded-2xl bg-zinc-950/90 border border-white/10 space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-sm text-white">{rev.client_name}</span>
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300">
                          🚘 {rev.car_model}
                        </span>
                        <span className="text-xs text-indigo-400">{rev.service_title}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={
                              s <= rev.rating
                                ? 'w-3.5 h-3.5 fill-amber-400 text-amber-400'
                                : 'w-3.5 h-3.5 text-zinc-700'
                            }
                          />
                        ))}
                        <span className="text-[11px] text-zinc-500 ml-2">
                          {new Date(rev.created_at).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteReview(rev.id)}
                      className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
                      title="Удалить отзыв"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs text-zinc-200 leading-relaxed">{rev.comment}</p>

                  <div className="pt-3 border-t border-white/[0.07] flex flex-col sm:flex-row gap-2.5">
                    <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-white/10 rounded-xl px-3">
                      <MessageSquareReply className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                      <input
                        type="text"
                        placeholder="Написать официальный ответ автосервиса..."
                        value={replyDrafts[rev.id] ?? ''}
                        onChange={(e) =>
                          setReplyDrafts((prev) => ({ ...prev, [rev.id]: e.target.value }))
                        }
                        className="w-full py-2.5 bg-transparent text-xs text-white focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={() => handleSaveReply(rev.id)}
                      className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition whitespace-nowrap"
                    >
                      Сохранить ответ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* РАЗДЕЛ 4: ПРАЙС-ЛИСТ */}
        {activeSection === 'services' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-5 bg-zinc-900/70 border border-white/10 p-6 rounded-3xl h-fit">
              <h2 className="font-bold text-base text-white mb-4">Добавить услугу в прайс</h2>
              <form onSubmit={handleAddService} className="space-y-3.5">
                <input
                  type="text"
                  placeholder="Название услуги"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Категория (Мойка, Детейлинг, Шиномонтаж, Ремонт)"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400">Базовая цена (₽)</label>
                    <input
                      type="number"
                      required
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400">Длительность (мин)</label>
                    <input
                      type="number"
                      required
                      value={newDuration}
                      onChange={(e) => setNewDuration(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl text-xs font-bold"
                >
                  + Добавить услугу
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 space-y-3">
              {services.map((s) => (
                <div key={s.id} className="p-4 bg-zinc-900/70 border border-white/10 rounded-2xl space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] uppercase text-indigo-400 font-bold">{s.category}</span>
                      <p className="font-bold text-sm text-white">{s.title}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteService(s.id)}
                      className="text-zinc-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5 items-end">
                    <div>
                      <label className="text-[10px] text-zinc-400">Базовая цена (₽)</label>
                      <input
                        type="number"
                        value={s.base_price}
                        onChange={(e) => updateLocalService(s.id, 'base_price', e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-white/10 text-xs font-bold text-emerald-400 mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400">Длительность (мин)</label>
                      <input
                        type="number"
                        value={s.duration_min}
                        onChange={(e) => updateLocalService(s.id, 'duration_min', e.target.value)}
                        className="w-full p-2 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1"
                      />
                    </div>
                    <button
                      onClick={() => handleUpdateService(s)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Сохранить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
  console.log('📲 Обновлен файл:', filePath);
}

console.log('\n🚀 Генератор брендированных QR-стендов успешно установлен!');