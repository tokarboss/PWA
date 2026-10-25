'use client';

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

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tenant_notifications_' + tenantId);
      channel.postMessage({
        title: '🔔 Новая запись от клиента!',
        body: clientName + ' записался на "' + selectedService.title + '" на ' + bookingDate + ' в ' + bookingTime,
      });
      channel.close();
    }

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
          <Sparkles className="w-5 h-5 animate-spin" /> Загрузка витрины...
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
          <p className="text-gray-400 text-sm mb-6">Обслуживание временно приостановлено.</p>
          <a href={'tel:' + tenant.phone} className="block w-full bg-white text-gray-950 py-3.5 rounded-2xl font-bold text-sm shadow-xl">Позвонить: {tenant.phone}</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 bg-astryx-grid text-gray-100 pb-24 relative overflow-x-hidden">
      <div className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] blur-[150px] opacity-30 rounded-full" style={{ backgroundColor: tenant.brand_color }} />

      <div className="max-w-xl mx-auto relative z-10 px-4 pt-6">
        <header className="rounded-3xl bg-gray-900/80 backdrop-blur-2xl border border-white/10 p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 shadow-lg" style={{ backgroundColor: tenant.brand_color }} />
          
          <div className="flex justify-between items-start gap-4">
            <div className="flex items-center gap-4">
              {tenant.logo_url ? (
                <img src={tenant.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover border-2 border-white/10 shadow-xl" />
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
                  <button onClick={() => setActiveTab('reviews')} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-300">
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

            <Link href={'/client/' + tenant.id + '/admin'} className="p-2.5 rounded-2xl bg-gray-800/80 hover:bg-gray-800 border border-white/10 text-gray-300 text-xs font-semibold flex items-center gap-1.5 shadow-lg">
              <Settings className="w-4 h-4 text-indigo-400" /> Кабинет
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-1.5 p-1.5 mt-6 rounded-2xl bg-gray-950/90 border border-white/[0.08]">
            <button onClick={() => setActiveTab('services')} style={activeTab === 'services' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'services' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400'}>Услуги</button>
            <button onClick={() => setActiveTab('portfolio')} style={activeTab === 'portfolio' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'portfolio' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400'}>Работы</button>
            <button onClick={() => setActiveTab('reviews')} style={activeTab === 'reviews' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'reviews' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400'}>Отзывы</button>
            <button onClick={() => setActiveTab('ai')} style={activeTab === 'ai' ? { backgroundColor: tenant.brand_color } : {}} className={activeTab === 'ai' ? 'py-2.5 rounded-xl text-xs font-extrabold text-white shadow' : 'py-2.5 rounded-xl text-xs font-semibold text-gray-400'}>AI</button>
          </div>
        </header>

        {activeTab === 'services' && (
          <div className="mt-6 space-y-5">
            <div className="bg-gray-900/70 border border-white/10 p-5 rounded-3xl shadow-xl">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-300 flex items-center gap-2 mb-3">
                <Car className="w-4 h-4 text-indigo-400" /> Выберите класс автомобиля
              </span>
              <div className="grid grid-cols-3 gap-2.5">
                {(Object.keys(carMultipliers) as Array<keyof typeof carMultipliers>).map((key) => (
                  <button
                    key={key}
                    onClick={() => setCarClass(key)}
                    style={carClass === key ? { borderColor: tenant.brand_color, background: 'rgba(255,255,255,0.05)' } : {}}
                    className={carClass === key ? 'p-3.5 rounded-2xl text-left border-2 bg-gray-900 text-white shadow-2xl' : 'p-3.5 rounded-2xl text-left border border-white/10 bg-gray-950/60 text-gray-400'}
                  >
                    <div className="font-extrabold text-xs text-white">{carMultipliers[key].name}</div>
                    <div className="text-[11px] font-bold mt-1 text-indigo-400">{carMultipliers[key].badge}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3.5">
              {filteredServices.map((service) => {
                const finalPrice = calculatePrice(service.base_price);
                return (
                  <div key={service.id} className="bg-gray-900/80 border border-white/10 p-5 rounded-3xl flex justify-between items-center gap-4 shadow-xl">
                    <div>
                      <span className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-white/[0.06] text-indigo-300 uppercase tracking-widest border border-white/10">{service.category}</span>
                      <h3 className="font-extrabold text-base text-white mt-2.5">{service.title}</h3>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" /> ~{service.duration_min} минут</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-2xl font-black text-emerald-400">{finalPrice.toLocaleString('ru-RU')} ₽</div>
                      <button onClick={() => setSelectedService(service)} style={{ backgroundColor: tenant.brand_color }} className="mt-2.5 px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white shadow-lg">
                        Записаться <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'portfolio' && (
          <div className="mt-6 space-y-4">
            {portfolio.map((item) => (
              <div key={item.id} className="rounded-3xl bg-gray-900/85 border border-white/10 overflow-hidden shadow-2xl p-5">
                <img src={item.image_url} alt="" className="w-full h-56 object-cover rounded-2xl mb-3" />
                <h3 className="font-bold text-base text-white">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{item.description}</p>
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
            <div className="rounded-3xl bg-gray-900/80 border border-white/10 p-6 text-center shadow-xl">
              <span className="text-6xl font-black text-amber-400">★ {averageRating}</span>
              <p className="text-xs text-gray-400 mt-2 font-medium">Рейтинг на основе {reviews.length} отзывов</p>
            </div>

            <form onSubmit={handleReviewSubmit} className="rounded-3xl bg-gray-900/80 border border-white/10 p-6 space-y-4 shadow-xl">
              <h3 className="font-extrabold text-base text-white">Оставить отзыв</h3>
              <div className="p-4 rounded-2xl bg-gray-950 border border-white/10 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-300">Оценка:</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button type="button" key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setRevRating(star)} className="p-1">
                      <Star className={(hoverRating || revRating) >= star ? 'w-6 h-6 fill-amber-400 text-amber-400' : 'w-6 h-6 text-gray-700'} />
                    </button>
                  ))}
                </div>
              </div>
              <input type="text" required placeholder="Ваше имя" value={revName} onChange={(e) => setRevName(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              <input type="text" required placeholder="Авто (например BMW X5)" value={revCar} onChange={(e) => setRevCar(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              <textarea rows={3} required placeholder="Ваш отзыв..." value={revComment} onChange={(e) => setRevComment(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              {revSuccess && <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-bold text-center">✓ Отзыв опубликован!</div>}
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-4 rounded-2xl text-xs font-extrabold text-white">Опубликовать отзыв</button>
            </form>

            <div className="space-y-3">
              {reviews.map((rev) => (
                <div key={rev.id} className="rounded-3xl bg-gray-900/80 border border-white/10 p-5 space-y-2 shadow-xl">
                  <div className="flex justify-between">
                    <span className="font-bold text-sm text-white">{rev.client_name} ({rev.car_model})</span>
                    <span className="text-amber-400 text-xs font-bold">★ {rev.rating}.0</span>
                  </div>
                  <p className="text-xs text-gray-200">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="mt-6 rounded-3xl bg-gray-900/80 border border-white/10 p-6 space-y-4 shadow-xl">
            <h2 className="font-extrabold text-base text-white">AI-Диспетчер</h2>
            <form onSubmit={handleAiAsk} className="flex gap-2">
              <input type="text" placeholder="Что вас интересует?" value={aiQuery} onChange={(e) => setAiQuery(e.target.value)} className="flex-1 p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="px-5 py-3.5 rounded-2xl text-xs font-extrabold text-white">Спросить</button>
            </form>
            {aiResponse && <div className="p-4 rounded-2xl bg-gray-950 border border-white/10 text-xs text-gray-200 leading-relaxed">{aiResponse}</div>}
          </div>
        )}
      </div>

      {selectedService && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-white/15 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-black text-lg text-white">Запись: {selectedService.title}</h3>
              <button onClick={() => setSelectedService(null)} className="text-gray-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="space-y-3.5">
              <input type="date" required value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              <select value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white">
                {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <input type="text" required placeholder="Ваше имя" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              <input type="tel" required placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full p-3.5 rounded-2xl bg-gray-950 border border-white/10 text-xs text-white" />
              {bookingStatusMsg && <div className="p-3 rounded-xl bg-gray-950 text-xs text-center font-bold text-emerald-400">{bookingStatusMsg}</div>}
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-4 rounded-2xl font-black text-sm text-white shadow-2xl">Подтвердить запись</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}