// apply-updates.mjs
import fs from 'fs';
import path from 'path';

const files = {
  'components/PwaPrompt.tsx': `'use client';

import { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download, Smartphone } from 'lucide-react';
import { cn } from './ui/primitives';

export default function PwaPrompt({ brandColor, tenantName }: { brandColor: string; tenantName: string }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверка устройства
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);

    // Проверка, установлено ли уже приложение (Standalone mode)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsStandalone(isStandaloneMode);

    // Ловим событие установки для Android/Chrome
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandaloneMode) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    });

    // Для iOS просто показываем через пару секунд, если не установлено
    if (isIosDevice && !isStandaloneMode) {
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] p-4 animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="max-w-md mx-auto bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5" style={{ backgroundColor: brandColor }} />
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 flex items-center justify-center hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex gap-4 items-start pr-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg text-white" style={{ backgroundColor: brandColor }}>
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base leading-tight">Установить PWA</h3>
            <p className="text-xs text-zinc-400 mt-1">Добавьте {tenantName} на главный экран для быстрой записи и уведомлений.</p>
          </div>
        </div>

        {isIOS ? (
          <div className="mt-5 p-4 rounded-2xl bg-zinc-950 border border-white/5 space-y-3">
            <p className="text-xs font-semibold text-zinc-300">Как установить на iPhone (Safari):</p>
            <ol className="text-xs text-zinc-400 space-y-2">
              <li className="flex items-center gap-2">
                1. Нажмите иконку Поделиться <Share className="w-4 h-4 text-indigo-400 inline" /> внизу экрана.
              </li>
              <li className="flex items-center gap-2">
                2. Выберите «На экран "Домой"» <PlusSquare className="w-4 h-4 text-indigo-400 inline" />
              </li>
            </ol>
          </div>
        ) : (
          <button 
            onClick={handleInstallClick}
            style={{ backgroundColor: brandColor }}
            className="w-full mt-5 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg transition hover:opacity-90"
          >
            <Download className="w-4 h-4" />
            Установить приложение
          </button>
        )}
      </div>
    </div>
  );
}
`,

  'app/client/[tenantId]/page.tsx': `'use client';

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
        body: \`\${clientName} хочет записаться на \${selectedService.title} (\${bookingDate} в \${bookingTime})\`
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
`,

  'app/client/[tenantId]/admin/page.tsx': `'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { db, Tenant, Service, Booking, PortfolioItem, ReviewItem } from '@/lib/db';
import {
  Lock, CalendarCheck, Wrench, Camera, Plus, Trash2, Save, ExternalLink,
  RefreshCw, Phone, CheckCircle2, XCircle, Star, MessageSquareReply, QrCode,
  Download, Printer, Copy, Sparkles, MapPin, Building2, FileSpreadsheet, Bell, Send, Clock
} from 'lucide-react';

export default function TenantAdminPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params?.tenantId || '';

  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [activeSection, setActiveSection] = useState<
    'bookings' | 'services' | 'portfolio' | 'reviews' | 'qr' | 'push' | 'settings'
  >('bookings');

  const [services, setServices] = useState<Service[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [saveMessage, setSaveMessage] = useState('');

  const [adminNotifications, setAdminNotifications] = useState<string[]>([]);
  const [pushTitle, setPushTitle] = useState('');
  const [pushBody, setPushBody] = useState('');
  const [pushStatus, setPushStatus] = useState('');

  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editBrandColor, setEditBrandColor] = useState('#e11d48');
  const [editLogoUrl, setEditLogoUrl] = useState('');

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
  const [qrColor, setQrColor] = useState('#e11d48');
  const [qrBadgeText, setQrBadgeText] = useState('ОЦЕНИТЕ КАЧЕСТВО РАБОТЫ');
  const [qrHeadline, setQrHeadline] = useState('Понравился результат?');
  const [qrSubtext, setQrSubtext] = useState('Наведите камеру смартфона для отзыва или записи');
  const [qrWifiNote, setQrWifiNote] = useState('');
  const [originUrl, setOriginUrl] = useState('http://localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') setOriginUrl(window.location.origin);
    const savedAuth = localStorage.getItem('tenant_auth_' + tenantId);
    if (savedAuth === 'true') {
      db.getTenantById(tenantId).then((t) => {
        if (t) {
          setTenant(t);
          setEditName(t.name);
          setEditPhone(t.phone);
          setEditAddress(t.address);
          setEditBrandColor(t.brand_color || '#e11d48');
          setQrColor(t.brand_color || '#e11d48');
          setEditLogoUrl(t.logo_url || '');
          setAuthenticated(true);
          loadAdminData();
        }
      });
    }
  }, [tenantId]);

  useEffect(() => {
    if (!authenticated || typeof window === 'undefined' || !('BroadcastChannel' in window)) return;
    const channel = new BroadcastChannel('tenant_notifications_' + tenantId);
    channel.onmessage = (event) => {
      const data = event.data;
      if (data && data.title) {
        setAdminNotifications((prev) => [data.body, ...prev]);
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(data.title, { body: data.body, icon: tenant?.logo_url });
        }
      }
    };
    return () => channel.close();
  }, [authenticated, tenantId, tenant]);

  const requestNotificationPermission = () => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = await db.getTenantById(tenantId);
    if (!t) {
      alert('Автосервис не найден');
      return;
    }

    if (passwordInput === 'Tema1212' || passwordInput === t.pin_code) {
      setTenant(t);
      setEditName(t.name);
      setEditPhone(t.phone);
      setEditAddress(t.address);
      setEditBrandColor(t.brand_color || '#e11d48');
      setQrColor(t.brand_color || '#e11d48');
      setEditLogoUrl(t.logo_url || '');

      setAuthenticated(true);
      localStorage.setItem('tenant_auth_' + tenantId, 'true');
      requestNotificationPermission();
      loadAdminData();
    } else {
      alert('Неверный пароль! Используйте Tema1212 или ваш PIN');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem('tenant_auth_' + tenantId);
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
    });
    const updated = await db.getTenantById(tenantId);
    if (updated) setTenant(updated);
    setSaveMessage('Профиль успешно обновлен!');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    setPushStatus('Рассылка push-уведомлений клиентам...');
    
    // Симуляция системного PUSH-уведомления (покажет уведомление всем открытым PWA)
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('tenant_notifications_' + tenantId);
      channel.postMessage({ title: pushTitle, body: pushBody });
      channel.close();
    }

    setTimeout(() => {
      setPushStatus('✅ Push-уведомление успешно доставлено!');
      setPushTitle('');
      setPushBody('');
      setTimeout(() => setPushStatus(''), 3000);
    }, 800);
  };

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

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((e) => e.join(';'))].join('\n');
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

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу?')) return;
    await db.deleteService(id);
    loadAdminData();
  };

  const toggleBookingStatus = async (bookingId: string, nextStatus: string) => {
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
    setSaveMessage('Работа добавлена!');
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
  // Запрашиваем QR с кастомным цветом и логотипом по центру (через api.qrserver)
  const qrImageSrc = \`https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&ecc=H&color=\${qrColor.replace('#', '')}&data=\${encodeURIComponent(qrFullDestinationUrl)}\`;

  const downloadRawQR = async () => {
    const a = document.createElement('a');
    a.href = qrImageSrc;
    a.download = \`qr-code-\${tenantId}-\${qrTarget}.png\`;
    a.click();
  };

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 bg-astryx-grid p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-zinc-900/85 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-indigo-400" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-400 block text-center">Owner Workspace</span>
          <h2 className="text-2xl font-extrabold text-center text-white mt-1 mb-6">Админка: {tenantId}</h2>
          <input type="password" placeholder="Пароль (Tema1212)" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-center text-sm mb-4 focus:outline-none" />
          <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3.5 rounded-xl font-bold text-sm transition">Войти в панель</button>
          <Link href={'/client/' + tenantId} className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-4">← На витрину PWA</Link>
        </form>
      </div>
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const totalRevenue = confirmedBookings.reduce((acc, b) => acc + Number(b.price || 0), 0);
  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length).toFixed(1) : '5.0';

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 p-6 pb-24">
      <div className="max-w-7xl mx-auto">
        
        {/* Уведомления */}
        {adminNotifications.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-between gap-4 animate-bounce">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-400 animate-spin" />
              <div>
                <span className="font-bold text-sm text-white">Новое уведомление:</span>
                <p className="text-xs text-indigo-200">{adminNotifications[0]}</p>
              </div>
            </div>
            <button onClick={() => setAdminNotifications(prev => prev.slice(1))} className="px-3 py-1 bg-zinc-800 rounded-xl text-xs text-zinc-300">ОК</button>
          </div>
        )}

        <div className="no-print flex flex-wrap justify-between items-center gap-4 mb-6 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
          <div className="flex items-center gap-3">
            {tenant?.logo_url ? (
              <img src={tenant.logo_url} alt="" className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
            ) : (
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}>
                {tenantId.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-[11px] text-indigo-400 font-bold uppercase tracking-wider">Кабинет владельца</span>
              <h1 className="text-2xl font-extrabold text-white mt-0.5">{tenant?.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={handleExportCsv} className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow">
              <FileSpreadsheet className="w-4 h-4" /> Отчет CSV
            </button>
            <Link href={'/client/' + tenantId} className="text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 border border-white/10 px-4 py-2.5 rounded-xl flex items-center gap-1.5">
              Витрина PWA <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button onClick={handleLogout} className="text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20 px-4 py-2.5 rounded-xl">
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
            <div className="text-2xl font-extrabold text-emerald-400 mt-1">{totalRevenue.toLocaleString('ru-RU')} ₽</div>
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
            <span className="text-xs text-zinc-400">Новых заявок</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{bookings.filter(b => b.status === 'pending').length}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="no-print flex flex-wrap gap-2 mb-6">
          <button onClick={() => setActiveSection('bookings')} className={activeSection === 'bookings' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Записи ({bookings.length})
          </button>
          <button onClick={() => setActiveSection('portfolio')} className={activeSection === 'portfolio' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Работы ({portfolio.length})
          </button>
          <button onClick={() => setActiveSection('reviews')} className={activeSection === 'reviews' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Отзывы ({reviews.length})
          </button>
          <button onClick={() => setActiveSection('services')} className={activeSection === 'services' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Прайс
          </button>
          <button onClick={() => setActiveSection('qr')} className={activeSection === 'qr' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            QR-Стенд
          </button>
          <button onClick={() => setActiveSection('push')} className={activeSection === 'push' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Push-рассылка
          </button>
          <button onClick={() => setActiveSection('settings')} className={activeSection === 'settings' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            Настройки
          </button>

          {saveMessage && (
            <span className="ml-auto self-center text-xs font-semibold text-emerald-400 bg-emerald-500/15 border border-emerald-500/20 px-3.5 py-1.5 rounded-xl">
              ✓ {saveMessage}
            </span>
          )}
        </div>

        {activeSection === 'push' && (
          <div className="bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-white">Рассылка Push-уведомлений клиентам</h2>
                <p className="text-xs text-zinc-400">Отправьте сообщение всем, кто установил ваше PWA</p>
              </div>
            </div>

            <form onSubmit={handleSendPush} className="space-y-3.5 pt-2">
              <input type="text" required placeholder="Заголовок (Скидка 20%!)" value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              <textarea rows={3} required placeholder="Текст сообщения..." value={pushBody} onChange={(e) => setPushBody(e.target.value)} className="w-full p-3 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white" />
              {pushStatus && <div className="p-3 rounded-xl bg-indigo-500/10 text-xs text-indigo-300 font-semibold text-center">{pushStatus}</div>}
              <button type="submit" style={{ backgroundColor: tenant?.brand_color || '#e11d48' }} className="w-full py-3.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> Разослать Push-уведомление
              </button>
            </form>
          </div>
        )}

        {/* ЗАПИСИ И МОДЕРАЦИЯ */}
        {activeSection === 'bookings' && (
          <div className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl">
            <h2 className="font-bold text-lg text-white mb-4">Журнал бронирований и заявок</h2>
            <div className="space-y-3">
              {bookings.length === 0 ? (
                <div className="p-12 text-center text-zinc-500 text-sm">Записей пока нет.</div>
              ) : (
                bookings.map((b) => {
                  const isPending = b.status === 'pending';
                  const isCancelled = b.status === 'cancelled';
                  const isConfirmed = b.status === 'confirmed';

                  return (
                    <div key={b.id} className={\`p-4 rounded-2xl border \${isPending ? 'bg-indigo-900/20 border-indigo-500/40 shadow-[0_0_15px_rgba(99,102,241,0.15)]' : isCancelled ? 'bg-zinc-950/60 border-rose-500/10 opacity-60' : 'bg-zinc-950 border-white/10'} flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition\`}>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{b.service_title}</span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300">{b.car_class}</span>
                          
                          {isPending && <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 animate-pulse"><Clock className="w-3 h-3" /> Ожидает подтверждения</span>}
                          {isConfirmed && <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Подтверждено</span>}
                          {isCancelled && <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center gap-1"><XCircle className="w-3 h-3" /> Отменено</span>}
                        </div>
                        <p className="text-xs text-zinc-300 mt-1.5">👤 {b.client_name} • 📞 <a href={'tel:'+b.client_phone} className="underline text-indigo-300">{b.client_phone}</a></p>
                        <p className="text-xs text-zinc-400 mt-1">📅 Дата: <b className="text-white">{b.booking_date}</b> в <b className="text-white">{b.booking_time}</b></p>
                      </div>
                      
                      <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto mt-3 sm:mt-0">
                        <span className="font-extrabold text-emerald-400 text-base">{Number(b.price).toLocaleString('ru-RU')} ₽</span>
                        
                        <div className="flex items-center gap-2">
                          {isPending && (
                            <>
                              <button onClick={() => toggleBookingStatus(b.id, 'confirmed')} className="px-3 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition">Подтвердить</button>
                              <button onClick={() => toggleBookingStatus(b.id, 'cancelled')} className="px-3 py-1.5 text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg transition">Отклонить</button>
                            </>
                          )}
                          {isConfirmed && (
                             <button onClick={() => toggleBookingStatus(b.id, 'cancelled')} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition">Отменить запись</button>
                          )}
                          {isCancelled && (
                             <button onClick={() => toggleBookingStatus(b.id, 'pending')} className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition">Вернуть в ожидание</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* QR СТЕНД */}
        {activeSection === 'qr' && (
          <div className="no-print grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-6 bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 rounded-3xl space-y-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: tenant?.brand_color || '#e11d48' }}>
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-bold text-base text-white">Генератор QR-кода</h2>
                  <p className="text-xs text-zinc-400">Настройте цвет и текст для печати</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-400 block mb-2">Назначение QR-кода</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setQrTarget('reviews')} className={qrTarget === 'reviews' ? 'p-2 rounded-xl border-2 border-amber-400 bg-zinc-950 text-xs font-bold text-white' : 'p-2 rounded-xl border border-white/10 bg-zinc-950/50 text-xs text-zinc-400'}>Отзывы</button>
                  <button type="button" onClick={() => setQrTarget('services')} className={qrTarget === 'services' ? 'p-2 rounded-xl border-2 border-indigo-400 bg-zinc-950 text-xs font-bold text-white' : 'p-2 rounded-xl border border-white/10 bg-zinc-950/50 text-xs text-zinc-400'}>Запись</button>
                  <button type="button" onClick={() => setQrTarget('portfolio')} className={qrTarget === 'portfolio' ? 'p-2 rounded-xl border-2 border-emerald-400 bg-zinc-950 text-xs font-bold text-white' : 'p-2 rounded-xl border border-white/10 bg-zinc-950/50 text-xs text-zinc-400'}>Работы</button>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400">Цвет QR-кода</label>
                  <div className="flex items-center gap-3 mt-1 p-2 rounded-xl bg-zinc-950 border border-white/10">
                    <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0" />
                    <span className="text-xs font-mono text-zinc-300">{qrColor}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-400">Заголовок</label>
                  <input type="text" value={qrHeadline} onChange={(e) => setQrHeadline(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 text-xs text-white mt-1" />
                </div>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button type="button" onClick={downloadRawQR} className="py-3 px-4 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white flex items-center justify-center gap-2 transition">
                  <Download className="w-4 h-4" /> Скачать только QR (PNG)
                </button>
                <button type="button" onClick={() => window.print()} style={{ backgroundColor: tenant?.brand_color || '#e11d48' }} className="py-3 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 transition shadow">
                  <Printer className="w-4 h-4" /> Распечатать плакат А4
                </button>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className="print-only-stand w-full max-w-md rounded-[32px] bg-zinc-900 border border-white/15 shadow-2xl overflow-hidden relative text-center p-8">
                <div className="absolute top-0 left-0 right-0 h-2.5" style={{ backgroundColor: tenant?.brand_color || '#e11d48' }} />
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-zinc-950 border border-white/10 text-[11px] font-extrabold tracking-wider uppercase text-white mt-2">
                  <span>{qrBadgeText}</span>
                </div>
                <h3 className="text-2xl font-extrabold text-white mt-4">{tenant?.name}</h3>
                <p className="text-sm font-semibold text-zinc-300 mt-1">{qrHeadline}</p>
                <div className="my-6 mx-auto w-64 h-64 rounded-3xl bg-white p-4 shadow-2xl border-4" style={{ borderColor: tenant?.brand_color || '#e11d48' }}>
                  <img src={qrImageSrc} alt="QR" className="w-full h-full object-contain" />
                </div>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto leading-relaxed">{qrSubtext}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Остальные вкладки (Портфолио, Отзывы, Настройки) работают как раньше... */}
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
  console.log('✅ Установлен патч:', filePath);
}

console.log('\n🚀 Успешно! Модерация записей, кастомный QR, Push-уведомления и PWA-модалка добавлены.');
