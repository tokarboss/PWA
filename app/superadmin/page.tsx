'use client';

import { useState, useEffect } from 'react';
import { db, Tenant } from '@/lib/db';
import Link from 'next/link';
import { Shield, Plus, ExternalLink, Settings, Trash2, Lock, RefreshCw, Phone, MapPin, KeyRound, Home } from 'lucide-react';

export default function SuperAdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [brandColor, setBrandColor] = useState('#e11d48');
  const [logoUrl, setLogoUrl] = useState('');
  const [pinCode, setPinCode] = useState('Tema1212');
  const [isPaid, setIsPaid] = useState(true);

  // Единый мастер-пароль суперадминки
  const MASTER_PASSWORD = 'Tema1212';

  useEffect(() => {
    const isAuth = localStorage.getItem('saas_superadmin_auth');
    if (isAuth === 'true') {
      setAuthenticated(true);
      fetchTenants();
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === MASTER_PASSWORD) {
      setAuthenticated(true);
      localStorage.setItem('saas_superadmin_auth', 'true');
      fetchTenants();
    } else {
      alert('Неверный пароль!');
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    localStorage.removeItem('saas_superadmin_auth');
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
      pin_code: pinCode || 'Tema1212',
      is_paid: isPaid,
    });

    setId('');
    setName('');
    setPhone('');
    setAddress('');
    setLogoUrl('');
    setPinCode('Tema1212');
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
      pin_code: editingTenant.pin_code || 'Tema1212',
    });
    setEditingTenant(null);
    fetchTenants();
    alert('Данные тенанта и пароль успешно обновлены!');
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
            <p className="text-xs text-zinc-400 mt-1.5">Введите мастер-пароль</p>
          </div>
          <input
            type="password"
            placeholder="Пароль"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full p-3.5 rounded-xl bg-zinc-950 border border-white/10 text-white text-center text-sm mb-4 focus:outline-none focus:border-indigo-500 transition"
          />
          <button
            type="submit"
            className="w-full bg-white text-zinc-950 hover:bg-zinc-200 py-3 rounded-xl font-semibold text-sm transition shadow-lg"
          >
            Войти в систему
          </button>
          <Link href="/" className="block text-center text-xs text-zinc-500 hover:text-zinc-300 mt-4">
            ← На главную
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
                  ● Онлайн
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">Управление автосервисами и подписками</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button onClick={fetchTenants} className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 transition" title="Обновить">
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link href="/" className="text-xs font-medium bg-zinc-900 border border-white/10 hover:bg-zinc-800 px-3.5 py-2.5 rounded-xl flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5" /> Главная
            </Link>
            <button onClick={handleLogout} className="text-xs font-medium bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 px-3.5 py-2.5 rounded-xl transition">
              Выйти
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Всего сервисов</span>
            <div className="text-3xl font-extrabold text-white mt-1">{tenants.length}</div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Активные подписки</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{paidCount}</div>
          </div>
          <div className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl">
            <span className="text-xs text-zinc-400">Заблокировано</span>
            <div className="text-3xl font-extrabold text-rose-400 mt-1">{tenants.length - paidCount}</div>
          </div>
        </div>

        {editingTenant && (
          <div className="mb-8 bg-zinc-900/95 backdrop-blur-xl border border-indigo-500/40 p-6 rounded-3xl shadow-2xl">
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
                <label className="text-xs text-zinc-400">Пароль входа в админку сервиса</label>
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
                  Сохранить изменения
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  <input type="text" required placeholder="apex" value={id} onChange={(e) => setId(e.target.value)} className="w-full py-2.5 pl-1 bg-transparent text-sm text-white focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Название бизнеса</label>
                <input type="text" required placeholder="Apex Detailing" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Телефон</label>
                <input type="text" required placeholder="+7 (999) 000-00-00" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Адрес</label>
                <input type="text" required placeholder="ул. Ленина, 45" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Пароль админки сервиса</label>
                <input type="text" required placeholder="Tema1212" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white font-mono focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Логотип (URL)</label>
                <input type="url" placeholder="https://..." value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="w-full p-2.5 rounded-xl bg-zinc-950 border border-white/10 mt-1 text-sm text-white focus:outline-none" />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400">Цвет бренда</label>
                <div className="flex items-center gap-2 mt-1 p-1.5 rounded-xl bg-zinc-950 border border-white/10">
                  <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-8 h-8 rounded-lg bg-transparent cursor-pointer border-0" />
                  <span className="text-xs font-mono text-zinc-300">{brandColor}</span>
                </div>
              </div>
              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none">
                <input type="checkbox" checked={isPaid} onChange={(e) => setIsPaid(e.target.checked)} className="w-4 h-4 accent-indigo-500 rounded" />
                <span className="text-xs text-zinc-300">Подписка активна (Оплачено)</span>
              </label>
              <button type="submit" className="w-full bg-white text-zinc-950 hover:bg-zinc-200 font-semibold py-3 rounded-xl text-sm transition shadow-lg">
                Создать автосервис
              </button>
            </form>
          </div>

          <div className="lg:col-span-8 space-y-3.5">
            {loading ? (
              <div className="p-12 text-center text-zinc-500 text-sm">Загрузка арендаторов...</div>
            ) : (
              tenants.map((t) => (
                <div key={t.id} className="bg-zinc-900/60 backdrop-blur-xl border border-white/[0.08] p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition">
                  <div className="flex items-start gap-4">
                    {t.logo_url ? (
                      <img src={t.logo_url} alt="" className="w-11 h-11 rounded-2xl object-cover border border-white/10 flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/20 text-white font-bold" style={{ backgroundColor: t.brand_color }}>
                        {t.id.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="font-bold text-base text-white">{t.name}</h3>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-mono">/client/{t.id}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 mt-1.5">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-zinc-500" /> {t.address}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-zinc-500" /> {t.phone}</span>
                        <span className="flex items-center gap-1 text-indigo-400 font-mono"><KeyRound className="w-3.5 h-3.5" /> Пароль: {t.pin_code}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                    <button onClick={() => togglePayment(t.id, t.is_paid)} className={t.is_paid ? 'px-3 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'px-3 py-2 text-xs font-semibold rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20'}>
                      {t.is_paid ? 'Оплачено' : 'Блок'}
                    </button>
                    <button onClick={() => setEditingTenant(t)} className="px-3 py-2 text-xs font-medium bg-zinc-800 text-zinc-200 rounded-xl border border-white/10 flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-indigo-400" /> Правка
                    </button>
                    <Link href={'/client/' + t.id} className="px-3 py-2 text-xs font-medium bg-zinc-800 text-zinc-200 rounded-xl border border-white/10 flex items-center gap-1.5">
                      PWA <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                    </Link>
                    <Link href={'/client/' + t.id + '/admin'} className="px-3 py-2 text-xs font-medium bg-indigo-500/10 text-indigo-300 rounded-xl border border-indigo-500/20">
                      Админка
                    </Link>
                    <button onClick={() => deleteTenant(t.id)} className="p-2 text-zinc-500 hover:text-rose-400 rounded-xl">
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
}
