import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Elden IOL 報告單代填',
  version: '0.1.0',
  description: 'IOLMaster 報告單辨識，自動填入 ASCRS Barrett Toric Calculator',
  permissions: ['storage', 'sidePanel', 'activeTab', 'scripting'],
  host_permissions: [
    'https://www.ascrs.org/*',
    'https://calc.apacrs.org/*',
    'https://elden-iol.vercel.app/*',
  ],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  action: { default_title: '開啟 IOL 代填面板' },
  content_scripts: [
    {
      // 計算器本體在 calc.apacrs.org，不在 ascrs.org。
      // 從 ascrs.org 進去時它是跨域 iframe，因此必須 all_frames 才注入得到。
      matches: ['https://calc.apacrs.org/*'],
      all_frames: true,
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});
