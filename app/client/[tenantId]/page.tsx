'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { db, Tenant, Service, PortfolioItem, ReviewItem } from '@/lib/db';
import PwaPrompt from '@/components/PwaPrompt';
import {
  MapPin, Phone, Clock, Sparkles, Calendar, Car, CheckCircle2, Lock,
  Wrench, Camera, Eye, Send, X, ArrowRight, Settings, Star, MessageSquare,
  ShieldCheck, CornerDownRight
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
        
        // Запрашиваем разрешения на уведомления, если еще не запрошены
        if ('Notification' in window && Notification.permission === 'default') {
          setTimeout(() => Notification.requestPermission(), 5000);
        }
      }
    }
    setLoading(false);
  };

  const fetchBusySlots = async (dateStr: string) => {
    const allBookings = await db.getBookings(tenantId);
    // Слоты заняты, если они "confirmed" или "pending"
    const occupied = allBookings
      .filter((b) => b.booking_date === dateStr && (b.status === 'confirmed' || b.status === 'pending'))
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

    setBookingStatusMsg('Отправка заявки...');
    const finalPrice = calculatePrice(selectedService.base_price);

    // Новые заявки теперь создаются со статусом "pending" (Ожидает подтверждения)
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
      status: 'pending',
    });

    setBookingStatusMsg('⏳ Заявка отправлена! Администратор свяжется с вами для подтверждения.');
    
    // Симуляция отправки Push-уведомления владельцу через BroadcastChannel
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tenant_notifications_' + tenantId);
      channel.postMessage({
        title: 'Новая заявка на запись!',
        body: `${clientName} хочет записаться на ${selectedService.title} (${bookingDate} в ${bookingTime})`
      });
      channel.close();
    }

    fetchBusySlots(bookingDate);
    setTimeout(() => {
      setSelectedService(null);
      setBookingStatusMsg('');
      setClientName('');
      setClientPhone('');
    }, 2500);
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
      <PwaPrompt brandColor={tenant.brand_color} tenantName={tenant.name} />
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
                {TIME_SLOTS.map((s) => {
                  const isBusy = busySlots.includes(s);
                  return (
                    <option key={s} value={s} disabled={isBusy}>
                      {s} {isBusy ? '(занято)' : ''}
                    </option>
                  );
                })}
              </select>
              <input type="text" required placeholder="Ваше имя" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <input type="tel" required placeholder="Телефон" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              {bookingStatusMsg && <div className="text-xs text-center text-emerald-400 font-medium">{bookingStatusMsg}</div>}
              <button type="submit" style={{ backgroundColor: tenant.brand_color }} className="w-full py-3.5 rounded-xl font-bold text-white">Отправить заявку</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
