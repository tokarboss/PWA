// remove-password-hints.mjs — Очистка упоминаний паролей в интерфейсе
import fs from 'fs';
import path from 'path';

const superAdminPath = path.join(process.cwd(), 'app/superadmin/page.tsx');
if (fs.existsSync(superAdminPath)) {
  let content = fs.readFileSync(superAdminPath, 'utf8');
  content = content.replace(/alert\(['"]Неверный пароль! Используйте Tema1212['"]\)/g, "alert('Неверный пароль!')");
  fs.writeFileSync(superAdminPath, content, 'utf8');
  console.log('✅ Упоминания пароля убраны из app/superadmin/page.tsx');
}

const adminPath = path.join(process.cwd(), 'app/client/[tenantId]/admin/page.tsx');
if (fs.existsSync(adminPath)) {
  let content = fs.readFileSync(adminPath, 'utf8');
  content = content.replace(/alert\(['"]Неверный пароль! Используйте Tema1212['"]\)/g, "alert('Неверный пароль!')");
  content = content.replace(/placeholder="Пароль \(Tema1212\)"/g, 'placeholder="Пароль"');
  fs.writeFileSync(adminPath, content, 'utf8');
  console.log('✅ Упоминания пароля убраны из app/client/[tenantId]/admin/page.tsx');
}