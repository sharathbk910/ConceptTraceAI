import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  console.error('[generate-spa-fallbacks] dist/index.html not found! Run vite build first.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexPath, 'utf-8');

// List of all primary and nested SPA client routes
const spaRoutes = [
  'login',
  'register',
  'verify-email',
  'forgot-password',
  'reset-password',
  'auth/callback',
  'setup-profile',
  'home',
  'profile',
  'syllabus',
  'library',
  'mistakes',
  'ask',
  'questions',
  'history',
  'weak-topics',
  'practice',
  'progress',
  'progress/graphs',
  'progress/subjects',
  'progress/weak-topics',
  'progress/activity',
  'settings'
];

// Always generate 404.html
fs.writeFileSync(path.join(distDir, '404.html'), indexContent);

// Generate both <route>.html and <route>/index.html for maximum compatibility
for (const route of spaRoutes) {
  // 1. As <route>.html (e.g., dist/login.html)
  const routeHtmlPath = path.join(distDir, `${route}.html`);
  fs.mkdirSync(path.dirname(routeHtmlPath), { recursive: true });
  fs.writeFileSync(routeHtmlPath, indexContent);

  // 2. As <route>/index.html (e.g., dist/login/index.html)
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.writeFileSync(path.join(routeDir, 'index.html'), indexContent);
}

console.log(`[generate-spa-fallbacks] Successfully generated static entrypoints for ${spaRoutes.length} SPA routes + 404.html`);
