// fix-qr-error.mjs — Исправление ошибки отсутствия qrImageSrc
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'app/client/[tenantId]/admin/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Проверяем, есть ли уже переменная, если нет — добавляем её перед return
if (!content.includes('qrImageSrc')) {
  const targetLine = '  const avgRating =';
  const replacement = `  const qrFullDestinationUrl = originUrl + '/client/' + tenantId + '?tab=' + qrTarget;
  const qrImageSrc = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=16&ecc=H&data=' + encodeURIComponent(qrFullDestinationUrl);

  const avgRating =`;

  if (content.includes(targetLine)) {
    content = content.replace(targetLine, replacement);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('✅ Переменная qrImageSrc успешно возвращена в app/client/[tenantId]/admin/page.tsx');
  } else {
    console.log('⚠️ Не удалось автоматически найти точку вставки, проверьте файл вручную.');
  }
} else {
  console.log('ℹ️ qrImageSrc уже присутствует в файле.');
}