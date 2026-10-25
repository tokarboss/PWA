// fix-superadmin-password.mjs — Установка мастер-пароля Tema1212 для Супер-Админки
import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'app/superadmin/page.tsx');

if (fs.existsSync(filePath)) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Меняем проверку или константу пароля на 'Tema1212'
  content = content.replace(/const MASTER_PASSWORD = ['"].*?['"];/, "const MASTER_PASSWORD = 'Tema1212';");
  content = content.replace(/passwordInput === ['"].*?['"]/, "passwordInput === MASTER_PASSWORD");

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Мастер-пароль супер-админки успешно изменен на Tema1212 в app/superadmin/page.tsx');
} else {
  console.log('❌ Файл app/superadmin/page.tsx не найден.');
}