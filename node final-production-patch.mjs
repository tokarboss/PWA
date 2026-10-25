// final-production-patch.mjs — Завершающий патч (Безопасность, Offline PWA, Rate Limit AI)
import fs from 'fs';
import path from 'path';

const files = {
  // 1. Изоляция ключей Supabase и локальный fallback
  '.env.local': `NEXT_PUBLIC_SUPABASE_URL=https://dczjhmrgcgptzegyhvfq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG
`,

  'lib/supabase.ts': `import { createClient } from '@supabase/supabase-js';

// Пытаемся получить ключи из .env (при деплое) или используем жестко заданные как резерв
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dczjhmrgcgptzegyhvfq.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_egx1iO8xHemqd7nX3OQBZQ_z7cysxiG';

export const supabase = createClient(supabaseUrl, supabaseKey);
`,

  // 2. Полноценный Service Worker для кэширования и работы Offline (Stale-While-Revalidate)
  'public/sw.js': `const CACHE_NAME = 'astryx-auto-cache-v1';
const OFFLINE_URL = '/offline.html';

const urlsToCache = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
];

// Установка SW и кэширование статики
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  event.waitUntil(clients.claim());
});

// Стратегия Network First с фоллбэком на Cache (для PWA)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Игнорируем запросы к API и Supabase
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(async () => {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        
        // Если это запрос навигации (страница), отдаем fallback
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
      })
  );
});

// Push-уведомления
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Astryx Auto', body: 'Новое уведомление' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
      vibrate: [200, 100, 200]
    })
  );
});
`,

  // 3. Fallback страница при отсутствии интернета
  'public/offline.html': `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Нет подключения к сети</title>
  <style>
    body {
      background-color: #09090b;
      color: #fafafa;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
      text-align: center;
      padding: 20px;
    }
    .icon { font-size: 48px; margin-bottom: 16px; opacity: 0.8; }
    h1 { margin: 0 0 8px 0; font-size: 24px; color: #f43f5e; }
    p { color: #a1a1aa; font-size: 14px; max-width: 300px; line-height: 1.5; }
    button {
      margin-top: 24px;
      padding: 12px 24px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: bold;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>Связь потеряна</h1>
  <p>Похоже, вы находитесь вне зоны действия сети (или в закрытом боксе). Приложение восстановит работу при появлении интернета.</p>
  <button onclick="window.location.reload()">Попробовать снова</button>
</body>
</html>
`,

  // 4. Защита AI от спама (Базовый Rate Limit)
  'app/api/ai-assistant/route.ts': `import { NextResponse } from 'next/server';

// Простой in-memory кэш для защиты от спама (подходит для edge/serverless с оговорками)
const rateLimitMap = new Map<string, { count: number, resetAt: number }>();

export async function POST(req: Request) {
  try {
    // 1. Базовый Rate Limiting (по IP)
    const ip = req.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 минута
    
    if (rateLimitMap.has(ip)) {
      const entry = rateLimitMap.get(ip)!;
      if (now > entry.resetAt) {
        rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      } else {
        entry.count++;
        if (entry.count > 5) { // Максимум 5 запросов к AI в минуту с одного IP
          return NextResponse.json(
            { reply: 'Вы задаете вопросы слишком часто. Пожалуйста, подождите минуту.' }, 
            { status: 429 }
          );
        }
      }
    } else {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    }

    // 2. Обработка запроса
    const { prompt, tenantName, carClass, multiplier = 1, services = [] } = await req.json();
    const q = (prompt || '').toLowerCase().trim();
    
    if (!q) {
       return NextResponse.json({ reply: 'Я здесь, чтобы помочь. Задайте вопрос об услугах автосервиса.' });
    }

    // Поиск совпадений в прайсе
    const matched = services.filter((s: { title: string; category: string }) => 
      s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q)
    );
    
    const list = matched.length > 0 ? matched : services.slice(0, 3);
    const servicesText = list.map((s: { title: string; base_price: number }) => 
      \`\${s.title} (от \${Math.round(s.base_price * Number(multiplier)).toLocaleString('ru-RU')} ₽)\`
    ).join(', ');

    const reply = \`В автосервисе «\${tenantName}» для кузова класса «\${carClass}» мы можем предложить: \${servicesText}. Хотите записаться?\`;
    
    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI Error:', err);
    return NextResponse.json({ reply: 'Извините, диспетчер сейчас перегружен. Пожалуйста, посмотрите прайс-лист ниже.' }, { status: 500 });
  }
}`
};

// Функция создания файлов
for (const [filePath, content] of Object.entries(files)) {
  const fullPath = path.join(process.cwd(), filePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log('✅ Установлен патч:', filePath);
}

console.log('\\n🚀 Финальные патчи (Безопасность + Offline + AI Limit) успешно применены!');