'use client';

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
