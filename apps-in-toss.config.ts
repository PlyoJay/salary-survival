import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // 앱인토스 콘솔에서 확정한 appName과 반드시 같아야 합니다.
  appName: 'salary-survival',
  brand: {
    primaryColor: '#3182F6',
  },
  webView: {},
  permissions: [],
  webBundleDir: 'dist',
});
