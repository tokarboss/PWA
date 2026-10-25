// upgrade-luxury-ui.mjs — Премиальный дизайн клиентского PWA (Astryx Luxury Glass UI)
import fs from 'fs';
import path from 'path';

const files = {
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
  Zap,
  ChevronRight,
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
    sedan: { name: 'Седан', mult: 1.0, badge: 'Базовый' },
    crossover: { name: 'Кроссовер', mult: 1.2, badge: '+20%' },
    suv: { name: 'Джип / SUV', mult: 1.4, badge: '+40%' },
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

    setBookingStatusMsg('✅ Запись успешно подтверждена!');
    fetchBusySlots(bookingDate);
    setTimeout(() => {
      setSelectedService(null);
      setBookingStatusMsg('');
      setClientName('');
      setClientPhone('');
    }, 1800);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-8 text-indigo-400 font-medium">
        <div className="animate-pulse flex items-center gap-2">
          <Sparkles className="w-5 h-5 animate-spin" /> Загрузка цифровой витрины...
        </div>
      </div>
    );
  }

  if (!tenant) return <div className="p-12 text-center text-rose-400 font-bold">Автосервис не найден</div>;
  if (!tenant.is_paid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-gray-950 text-center">
        <div className="max-w-md w-full bg-gray-900 border border-rose-500/30 p-8 rounded-3xl shadow-2xl">
          <div className="w-16 h-16 bg-rose-500/10 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">🔒</div>
          <h1 className="text-2xl font-bold text-white mb-2">{tenant.name}</h1>
          <p className="text-gray-400 text-sm mb-6">Обслуживание временно приостановлено. Свяжитесь с администрацией.</p>
          <a href={'tel:' + tenant.phone} className="block w-full bg-white text-gray-950 py-3.5 rounded-2xl font-bold text-sm shadow-xl">Позвонить: {tenant.phone}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 bg-astryx-grid text-gray-100 pb-24 relative overflow-x-hidden">
      {/* Неоновое свечение под бренд */}
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[150px] opacity-30 rounded-full" style={{ backgroundColor: tenant.brand_color }} />

      <div className="max-w-xl mx-auto relative z-10 px-4 pt-6">
        {/* Премиальная карточка шапки */}
        <header className="rounded-3xl bg-gray-900/80 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 shadow-lg" style={{ backgroundColor: tenant.brand_color }} />
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="Logo" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10 shadow-xl" />
              ) : (
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-lg shadow-xl" style={{ backgroundColor: tenant.brand_color }}>
                  {tenantId.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Боксы открыты
                  </span>
                  <button onClick={() => setActiveTab('reviews')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300 hover:bg-amber-500/20 transition">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {averageRating} ({reviews.length})
                  </button>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-2.5 tracking-tight">{tenant.name}</h1>
                <div className="flex flex-wrap items-center gap-4 text-xs text-gray-400 mt-2">
                  <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-500" /> {tenant.address}</span>
                  <a href={'tel:' + tenant.phone} className="flex items-center gap-1.5 hover:text-white transition"><Phone className="w-3.5 h-3.5 text-gray-500" /> {tenant.phone}</a>
                </div>
              </div>
            </div>

            <Link href={'/client/' + tenant.id + '/admin'} className="p-2.5 rounded-2xl bg-gray-800/80 hover:bg-gray-800 border border-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md">
              <Settings className="w-4 h-4 text-indigo-400" /> Кабинет
            </Link>
          </div>

          {/* Инновационный селектор вкладок */}
          <div className="grid grid-cols-4 gap-1.5 p-1.5 mt-6 rounded-2xl bg-gray-950/90 border border-white/[0.08]">
            <button onClick={() => setActiveTab('services')} style={activeTab === 'services' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'services' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow-xl transition' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition'}>Услуги</button>
            <button onClick={() => setActiveTab('portfolio')} style={activeTab === 'portfolio' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'portfolio' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow-xl transition' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition'}>Работы</button>
            <button onClick={() => setActiveTab('reviews')} style={activeTab === 'reviews' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'reviews' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow-xl transition' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition'}>Отзывы</button>
            <button onClick={() => setActiveTab('ai')} style={activeTab === 'ai' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'ai' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow-xl transition' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition'}>AI</button>
          </div>
        </header>

        {/* ВКЛАДКА 1: УСЛУГИ */}
        {activeTab === 'services' && (
          <div className="mt-6 space-y-5 animate-fadeIn">
            {/* Карточка выбора кузова */}
            <div className="bg-gray-900/70 backdrop-blur-xl border border-white/10 p-5 rounded-3xl shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-2">
                  <Car className="w-4 h-4 text-indigo-400" /> Выберите класс автомобиля
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(carMultipliers) as Array<keyof typeof carMultipliers>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCarClass(key)}
                    style={carClass === key ? { borderColor: tenant.brand_color, background: 'rgba(255,255,255,0.05)' } : {}}
                    className={
                      carClass === key
                        ? 'p-3.5 rounded-2xl text-left border-2 bg-gray-900 text-white shadow-2xl transition transform scale-[1.02]'
                        : 'p-3.5 rounded-2xl text-left border border-white/10 bg-gray-950/60 text-gray-400 hover:bg-gray-900 transition'
                    }
                  >
                    <div className="font-extrabold text-xs text-white">{carMultipliers[key].name}</div>
                    <div className="text-[11px] font-bold mt-1 text-indigo-400">{carMultipliers[key].badge}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Категории */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {serviceCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={selectedCategory === cat ? { backgroundColor: tenant.brand_color } : {}}
                  className={
                    selectedCategory === cat
                      ? 'px-4 py-2 rounded-2xl text-xs font-bold text-white shadow-lg whitespace-nowrap'
                      : 'px-4 py-2 rounded-2xl text-xs font-semibold bg-gray-900/80 text-gray-400 border border-white/10 whitespace-nowrap hover:text-white'
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Список услуг */}
            <div className="space-y-3.5">
              {filteredServices.map((service) => {
                const finalPrice = calculatePrice(service.base_price);
                return (
                  <div
                    key={service.id}
                    className="bg-gray-900/80 backdrop-blur-xl border border-white/10 hover:border-white/25 p-5 rounded-3xl flex justify-between items-center gap-4 shadow-xl transition group"
                  >
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/[0.06] text-indigo-300 uppercase tracking-widest border border-white/10">
                        {service.category}
                      </span>
                      <h3 className="font-extrabold text-base text-white mt-2.5 group-hover:text-indigo-300 transition">{service.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-500" /> ~{service.duration_min} минут
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-emerald-400 tracking-tight">{finalPrice.toLocaleString('ru-RU')} ₽</div>
                      <button
                        onClick={() => setSelectedService(service)}
                        style={{ backgroundColor: tenant.brand_color }}
                        className="mt-2.5 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white shadow-lg hover:opacity-95 transition flex items-center gap-1 ml-auto"
                      >
                        Записаться <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 2: РАБОТЫ (ПОРТФОЛИО) */}
        {activeTab === 'portfolio' && (
          <div className="mt-6 space-y-5 animate-fadeIn">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {portfolioCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setPortfolioCategory(cat)}
                  style={portfolioCategory === cat ? { backgroundColor: tenant.brand_color } : {}}
                  className={
                    portfolioCategory === cat
                      ? 'px-4 py-2 rounded-2xl text-xs font-bold text-white shadow'
                      : 'px-4 py-2 rounded-2xl text-xs font-semibold bg-gray-900 text-gray-400 border border-white/10'
                  }
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredPortfolio.map((item) => {
              const isShowingBefore = Boolean(showBeforeMap[item.id]);
              const activeImg = isShowingBefore && item.before_image_url ? item.before_image_url : item.image_url;

              return (
                <div key={item.id} className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="relative h-64 w-full bg-gray-950 overflow-hidden">
                    <img src={activeImg} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-black/40" />

                    <div className="absolute top-3.5 left-3.5 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-black/75 backdrop-blur-md text-white border border-white/20">
                        🚘 {item.car_model}
                      </span>
                    </div>

                    {item.before_image_url && (
                      <div className="absolute top-3.5 right-3.5 flex rounded-xl bg-black/80 backdrop-blur-md p-1 border border-white/20">
                        <button
                          type="button"
                          onClick={() => setShowBeforeMap((prev) => ({ ...prev, [item.id]: true }))}
                          className={isShowingBefore ? 'px-3 py-1 rounded-lg text-[11px] font-bold bg-rose-600 text-white' : 'px-3 py-1 rounded-lg text-[11px] font-medium text-gray-300'}
                        >
                          ДО
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowBeforeMap((prev) => ({ ...prev, [item.id]: false }))}
                          className={!isShowingBefore ? 'px-3 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white' : 'px-3 py-1 rounded-lg text-[11px] font-medium text-gray-300'}
                        >
                          ПОСЛЕ
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setLightboxItem(item)}
                      className="absolute bottom-3.5 right-3.5 p-2 rounded-xl bg-black/70 hover:bg-black text-white border border-white/20 backdrop-blur-md text-xs flex items-center gap-1 shadow-lg"
                    >
                      <Eye className="w-4 h-4" /> Увеличить
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex justify-between items-start gap-4">
                      <h3 className="font-extrabold text-base text-white">{item.title}</h3>
                      <span className="text-xl font-black text-emerald-400 whitespace-nowrap">{Number(item.price).toLocaleString('ru-RU')} ₽</span>
                    </div>
                    {item.description && <p className="text-xs text-gray-400 mt-2.5 leading-relaxed">{item.description}</p>}
                    <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[11px] text-gray-500 font-medium">Мастера: {tenant.name}</span>
                      <button onClick={() => handleBookFromPortfolio(item)} style={{ backgroundColor: tenant.brand_color }} className="px-5 py-2.5 rounded-2xl text-xs font-bold text-white shadow-xl hover:opacity-95 transition">
                        Хочу так же →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ВКЛАДКА 3: ОТЗЫВЫ */}
        {activeTab === 'reviews' && (
          <div className="mt-6 space-y-6 animate-fadeIn">
            <div className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 shadow-2xl text-center">
              <span className="text-6xl font-black text-amber-400 tracking-tight">★ {averageRating}</span>
              <p className="text-xs text-gray-400 mt-2 font-medium">Рейтинг доверия на основе {reviews.length} отзывов</p>
            </div>

            <form onSubmit={handleReviewSubmit} className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 space-y-4 shadow-2xl">
              <h3 className="font-extrabold text-base text-white">Оставить отзыв о сервисе</h3>
              <div className="p-4 rounded-2xl bg-gray-950 border border-white/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Ваша оценка:</span>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRevRating(star)} className="p-1">
                      <Star className={(hoverRating || revRating) >= star ? 'w-7 h-7 fill-amber-400 text-amber-400 transform scale-110 transition' : 'w-7 h-7 text-gray-700'} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" required placeholder="Ваше имя" value={revName} onChange={(e) => setRevName(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white focus:border-indigo-500" />
                <input type="text" required placeholder="Авто (например BMW X5)" value={revCar} onChange={(e) => setRevCar(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white focus:border-indigo-500" />
              </div>
              <textarea rows={3} required placeholder="Ваш отзыв о работе мастеров и сервисе..." value={revComment} onChange={(e) => setRevComment(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white focus:border-indigo-500" />

              {revSuccess && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center">✓ Отзыв успешно опубликован!</div>}
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-4 rounded-2xl text-xs font-extrabold text-white shadow-xl">Опубликовать отзыв ★</button>
            </form>

            <div className="space-y-4">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 space-y-3 shadow-xl">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-bold text-sm text-white">{rev.client_name}</span>
                      <span className="text-xs text-gray-400 block mt-0.5">🚘 {rev.car_model} • {rev.service_title}</span>
                    </div>
                    <span className="text-amber-400 font-bold text-sm flex items-center gap-1">★ {rev.rating}.0</span>
                  </div>
                  <p className="text-xs text-gray-200 leading-relaxed">{rev.comment}</p>
                  {rev.owner_reply && (
                    <div className="p-3.5 rounded-2xl bg-gray-950 border-l-4 border border-white/10 text-xs text-gray-300" style={{ borderLeftColor: tenant.brand_color }}>
                      <b>Ответ {tenant.name}:</b> {rev.owner_reply}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ВКЛАДКА 4: AI-ДИСПЕТЧЕР */}
        {activeTab === 'ai' && (
          <div className="mt-6 rounded-3xl bg-gray-900/80 backdrop-blur-xl border border-white/10 p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: tenant.brand_color }}>
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-white">AI-Консультант {tenant.name}</h2>
                <p className="text-xs text-gray-400">Мгновенный подбор услуг под ваш {carMultipliers[carClass].name}</p>
              </div>
            </div>

            <form onSubmit={handleAiAsk} className="flex gap-2.5">
              <input type="text" placeholder="Например: сколько стоит полировка или замена колодок?" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} className="flex-1 p-4 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white focus:border-indigo-500" />
              <button type="submit" disabled={aiLoading} style={{ backgroundColor: tenant.brand_color }} className="px-6 py-4 rounded-2xl text-xs font-extrabold text-white shadow-xl">
                {aiLoading ? '...' : 'Спросить'}
              </button>
            </form>

            {aiResponse && <div className="p-4 rounded-2xl bg-gray-950 border border-white/10 text-xs text-gray-200 leading-relaxed">{aiResponse}</div>}
          </div>
        )}
      </div>

      {/* МОДАЛКА БРОНИРОВАНИЯ */}
      {selectedService && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-white/15 w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-black text-lg text-white">Онлайн-бронирование бокса</h3>
              <button onClick={() => setSelectedService(null)} className="w-8 h-8 rounded-full bg-gray-800 text-gray-400 flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>

            <div className="bg-gray-950 border border-white/10 p-4 rounded-2xl">
              <p className="font-bold text-sm text-white">{selectedService.title}</p>
              <p className="text-xs text-gray-400 mt-1">
                Кузов: <b className="text-white">{carMultipliers[carClass].name}</b> • Итого: <span className="text-emerald-400 font-black">{calculatePrice(selectedService.base_price).toLocaleString('ru-RU')} ₽</span>
              </p>
            </div>

            <form onSubmit={handleBookingSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs text-gray-400">Дата визита</label>
                <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-2">Свободное время</label>
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
                        className={isBusy ? 'py-2 rounded-xl text-xs bg-rose-950/40 text-rose-500/50 line-through' : isSelected ? 'py-2 rounded-xl text-xs font-bold text-white shadow-lg' : 'py-2 rounded-xl text-xs font-semibold bg-gray-950 border border-white/10 text-gray-300'}
                      >
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Ваше имя</label>
                <input type="text" required placeholder="Артем" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white mt-1" />
              </div>

              <div>
                <label className="text-xs text-gray-400">Телефон</label>
                <input type="tel" required placeholder="+7 (999) 000-00-00" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white mt-1" />
              </div>

              {bookingStatusMsg && <div className="p-3 rounded-xl bg-gray-950 text-xs text-center font-bold text-emerald-400">{bookingStatusMsg}</div>}

              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-4 rounded-2xl font-black text-sm text-white shadow-2xl transition hover:opacity-95">
                Подтвердить запись на {bookingTime}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ЛАЙТБОКС */}
      {lightboxItem && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl">
            <div className="relative h-80 bg-black">
              <img src={lightboxItem.image_url} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setLightboxItem(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/80 text-white flex items-center justify-center"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <span className="text-xs font-bold text-indigo-400">{lightboxItem.car_model}</span>
              <h3 className="text-lg font-extrabold text-white mt-1">{lightboxItem.title}</h3>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{lightboxItem.description}</p>
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
                <span className="text-lg font-black text-emerald-400">{Number(lightboxItem.price).toLocaleString('ru-RU')} ₽</span>
                <button onClick={() => handleBookFromPortfolio(lightboxItem)} style={{ backgroundColor: tenant.brand_color }} className="px-5 py-3 rounded-2xl text-xs font-bold text-white shadow-xl">Записаться на услугу</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`
};

for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✨ Обновлен файл люкс-дизайна:', filePath);
}

console.log('\n🚀 Премиальный дизайн успешно применен!');