// fix-admin-page.mjs — Полное исправление файла административной панели
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'app/client/[tenantId]/admin/page.tsx');

const updatedCode = `'use client';

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
  Bell,
  Send,
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
          new Notification(data.title, { body: data.body });
        }
      }
    };
    return () => channel.close();
  }, [authenticated, tenantId]);

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
      setEditLogoUrl(t.logo_url || '');

      setAuthenticated(true);
      localStorage.setItem('tenant_auth_' + tenantId, 'true');
      requestNotificationPermission();
      loadAdminData();
    } else {
      alert('Неверный пароль! Используйте Tema1212');
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
      pin_code: 'Tema1212',
    });
    const updated = await db.getTenantById(tenantId);
    if (updated) setTenant(updated);
    setSaveMessage('Профиль успешно обновлен!');
    setTimeout(() => setSaveMessage(''), 2500);
  };

  const handleSendPush = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushTitle.trim() || !pushBody.trim()) return;

    setPushStatus('Отправка push-уведомлений клиентам...');
    setTimeout(() => {
      setPushStatus('✅ Push-уведомление успешно разослано клиентам!');
      setPushTitle('');
      setPushBody('');
      setTimeout(() => setPushStatus(''), 3000);
    }, 1000);
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

  const handleDeleteService = async (id: string) => {
    if (!confirm('Удалить услугу?')) return;
    await db.deleteService(id);
    loadAdminData();
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

  const qrFullDestinationUrl = originUrl + '/client/' + tenantId + '?tab=' + qrTarget;
  const qrImageSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&ecc=H&data=' + encodeURIComponent(qrFullDestinationUrl);

  return (
    <div className="min-h-screen bg-zinc-950 bg-astryx-grid text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto">
        {adminNotifications.length > 0 && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-between gap-4 animate-bounce">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-indigo-400 animate-spin" />
              <div>
                <span className="font-bold text-sm text-white">Внимание! Новая запись в боксе:</span>
                <p className="text-xs text-indigo-200">{adminNotifications[0]}</p>
              </div>
            </div>
            <button onClick={() => setAdminNotifications(prev => prev.slice(1))} className="px-3 py-1 bg-zinc-800 rounded-xl text-xs text-zinc-300">ОК</button>
          </div>
        )}

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6 bg-zinc-900/70 backdrop-blur-xl border border-white/10 p-5 rounded-2xl">
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
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <div className="bg-zinc-900/60 border border-white/[0.08] p-4 rounded-2xl">
            <span className="text-xs text-zinc-400">Записи</span>
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
            <span className="text-xs text-zinc-400">Портфолио</span>
            <div className="text-2xl font-extrabold text-indigo-400 mt-1">{portfolio.length} раб.</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
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
            QR-стенд
          </button>
          <button onClick={() => setActiveSection('push')} className={activeSection === 'push' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            📢 Push-рассылка
          </button>
          <button onClick={() => setActiveSection('settings')} className={activeSection === 'settings' ? 'px-4 py-2.5 rounded-xl text-xs font-bold bg-white text-zinc-950 shadow' : 'px-4 py-2.5 rounded-xl text-xs font-semibold bg-zinc-900 text-zinc-400 border border-white/10'}>
            ⚙️ Настройки
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
                <p className="text-xs text-zinc-400">Отправьте важное сообщение на телефоны всех клиентов</p>
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

        {activeSection === 'settings' && (
          <div className="bg-zinc-900/75 backdrop-blur-xl border border-white/10 p-6 rounded-3xl max-w-2xl">
            <h2 className="font-bold text-lg text-white mb-2">Настройки профиля сервиса</h2>
            <form onSubmit={handleUpdateProfile} className="space-y-4 pt-4">
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
                  <label className="text-xs font-medium text-zinc-400">Пароль входа</label>
                  <input type="text" disabled value="Tema1212" className="w-full p-3 rounded-xl bg-zinc-950/50 border border-white/5 text-xs text-zinc-500 mt-1 cursor-not-allowed" />
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
                <label className="text-xs font-medium text-zinc-400">Фирменный цвет</label>
                <div className="flex items-center gap-3 mt-1 p-2 rounded-xl bg-zinc-950 border border-white/10">
                  <input type="color" value={editBrandColor} onChange={(e) => setEditBrandColor(e.target.value)} className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border-0" />
                  <span className="text-xs font-mono text-zinc-300">{editBrandColor}</span>
                </div>
              </div>
              <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3.5 rounded-xl text-xs font-bold transition shadow-lg">
                Сохранить настройки
              </button>
            </form>
          </div>
        )}

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

        {activeSection === 'qr' && (
          <div className="bg-zinc-900/70 border border-white/10 p-6 rounded-3xl max-w-xl mx-auto text-center space-y-4">
            <h2 className="font-bold text-lg text-white">QR-код витрины</h2>
            <div className="bg-white p-4 rounded-3xl w-64 h-64 mx-auto flex items-center justify-center">
              <img src={qrImageSrc} alt="" className="w-full h-full object-contain" />
            </div>
            <p className="text-xs text-zinc-400">Распечатайте этот код для установки в боксе.</p>
          </div>
        )}
      </div>
    </div>
  );
}
`;

fs.writeFileSync(filePath, updatedCode, 'utf8');
console.log('✅ Файл админки полностью перезаписан и исправлен!');