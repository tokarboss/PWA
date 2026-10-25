'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, Sparkles, Car, Maximize2, X, ArrowUpRight } from 'lucide-react';

export function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

/* --- SHADCN + ASTRYX CARD --- */
export function Card({
  className,
  children,
  glow = false,
}: {
  className?: string;
  children: React.ReactNode;
  glow?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative rounded-2xl bg-zinc-950/80 border border-white/[0.08] backdrop-blur-xl',
        'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_30px_-10px_rgba(0,0,0,0.6)]',
        glow && 'hover:border-white/[0.16] transition-all duration-300',
        className
      )}
    >
      {children}
    </div>
  );
}

/* --- SHADCN BADGE --- */
export function Badge({
  children,
  variant = 'default',
  className,
  style,
}: {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'destructive' | 'warning' | 'outline' | 'brand';
  className?: string;
  style?: React.CSSProperties;
}) {
  const styles = {
    default: 'bg-zinc-900 text-zinc-300 border-white/10',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
    destructive: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/25',
    outline: 'bg-transparent text-zinc-400 border-white/15',
    brand: 'text-white border-white/20',
  };

  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border tracking-tight',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

/* --- SHADCN INPUT --- */
export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-10 px-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100',
        'placeholder:text-zinc-500 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition',
        props.className
      )}
    />
  );
}

/* --- SHADCN TEXTAREA --- */
export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        'w-full p-3.5 rounded-xl bg-zinc-900/80 border border-white/10 text-sm text-zinc-100',
        'placeholder:text-zinc-500 focus:outline-none focus:border-white/25 focus:ring-2 focus:ring-white/10 transition',
        props.className
      )}
    />
  );
}

/* --- КЛИЕНТСКОЕ СЖАТИЕ ФОТО В WEBP (БЕЗ НАСТРОЙКИ S3 BUCKET) --- */
export function compressImageFile(file: File, maxWidth = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.82);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Не удалось прочитать изображение'));
      img.src = String(event.target?.result || '');
    };
    reader.onerror = () => reject(new Error('Ошибка чтения файла'));
    reader.readAsDataURL(file);
  });
}

/* --- КАРТОЧКА ПОРТФОЛИО С ИНТЕРАКТИВНЫМ СЛАЙДЕРОМ "ДО / ПОСЛЕ" --- */
export interface PortfolioCardData {
  id: string;
  title: string;
  category: string;
  car_model: string;
  description?: string;
  image_url: string;
  before_image_url?: string;
  price_tag?: number;
}

export function PortfolioShowcaseCard({
  item,
  brandColor,
  onSelectAction,
  onDelete,
}: {
  item: PortfolioCardData;
  brandColor: string;
  onSelectAction?: (category: string) => void;
  onDelete?: (id: string) => void;
}) {
  const [sliderPos, setSliderPos] = useState(50);
  const [lightbox, setLightbox] = useState(false);
  const hasBefore = Boolean(item.before_image_url && item.before_image_url.trim().length > 5);

  return (
    <>
      <Card glow className="overflow-hidden flex flex-col group">
        {/* Медиа-блок с поддержкой До/После */}
        <div className="relative h-56 w-full bg-zinc-900 overflow-hidden select-none">
          <img
            src={item.image_url}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />

          {hasBefore && (
            <>
              <img
                src={item.before_image_url}
                alt="До работ"
                style={{ clipPath: 'inset(0 ' + (100 - sliderPos) + '% 0 0)' }}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                style={{ left: sliderPos + '%' }}
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_12px_rgba(0,0,0,0.9)] z-10 pointer-events-none"
              >
                <div
                  style={{ backgroundColor: brandColor }}
                  className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-xl text-white"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="absolute bottom-3 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-black/70 text-zinc-200 backdrop-blur-md border border-white/10">
                До
              </span>
              <span
                style={{ backgroundColor: brandColor }}
                className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase text-white shadow-lg"
              >
                После
              </span>
              <input
                type="range"
                min={4}
                max={96}
                value={sliderPos}
                onChange={(e) => setSliderPos(Number(e.target.value))}
                aria-label="Сравнение До и После"
                className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
              />
            </>
          )}

          {/* Верхние бейджи */}
          <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10 pointer-events-none">
            <Badge className="bg-black/65 backdrop-blur-md text-white border-white/15">
              <Sparkles className="w-3 h-3 text-amber-400" />
              {item.category}
            </Badge>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="pointer-events-auto w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white border border-white/15 backdrop-blur-md flex items-center justify-center transition"
              title="Увеличить"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Контент кейса */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 mb-1">
              <span className="inline-flex items-center gap-1 font-medium text-zinc-300">
                <Car className="w-3.5 h-3.5 text-zinc-400" />
                {item.car_model}
              </span>
              {item.price_tag && item.price_tag > 0 ? (
                <span className="font-bold text-emerald-400">
                  {item.price_tag.toLocaleString('ru-RU')} ₽
                </span>
              ) : null}
            </div>
            <h3 className="font-bold text-sm text-zinc-100 leading-snug">{item.title}</h3>
            {item.description && (
              <p className="text-xs text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-2">
            {onSelectAction && (
              <button
                type="button"
                onClick={() => onSelectAction(item.category)}
                style={{ backgroundColor: brandColor }}
                className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 hover:opacity-90 transition shadow-lg"
              >
                <span>Хочу так же</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
              >
                Удалить из портфолио
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Полноэкранный Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-zinc-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl"
          >
            <button
              onClick={() => setLightbox(false)}
              className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/70 text-white border border-white/20 flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
            <img src={item.image_url} alt={item.title} className="w-full max-h-[70vh] object-contain bg-black" />
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <Badge>{item.category}</Badge>
                <span className="text-xs text-zinc-400">{item.car_model}</span>
              </div>
              <h3 className="text-lg font-bold text-white">{item.title}</h3>
              {item.description && <p className="text-sm text-zinc-400 mt-1">{item.description}</p>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
