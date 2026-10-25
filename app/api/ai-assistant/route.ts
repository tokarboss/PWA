import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { prompt, tenantName, carClass, multiplier = 1, services = [] } = await req.json();
    const q = (prompt || '').toLowerCase();
    const matched = services.filter((s: { title: string; category: string }) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q));
    const list = matched.length > 0 ? matched : services.slice(0, 3);
    const reply = 'В «' + tenantName + '» для авто (' + carClass + ') доступны: ' + list.map((s: { title: string; base_price: number }) => s.title + ' (от ' + Math.round(s.base_price * Number(multiplier)) + ' ₽)').join(', ');
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: 'Ошибка обработки запроса.' }, { status: 500 });
  }
}