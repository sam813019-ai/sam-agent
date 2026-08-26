import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Elden IOL 報告單代填',
  version: '0.1.0',
  description: 'IOLMaster 報告單辨識，自動填入 ASCRS Barrett Toric Calculator',
  permissions: ['storage', 'sidePanel', 'activeTab', 'scripting'],
  host_permissions: ['https://www.ascrs.org/*'],
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  side_panel: { default_path: 'src/sidepanel/index.html' },
  action: { default_title: '開啟 IOL 代填面板' },
  content_scripts: [
    {
      matches: ['https://www.ascrs.org/tools/barrett-toric-calculator*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});
