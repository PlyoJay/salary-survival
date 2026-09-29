import aitDevtools from '@apps-in-toss/devtools/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  // SDK 자동 감지가 상위 폴더까지 탐색하지 않도록 3.x를 명시합니다.
  plugins: [aitDevtools.vite({ sdkVersion: '3' }), react()],
  // TDS AIT가 내부에서 불러오는 SDK도 개발 중에는 mock을 사용해야 합니다.
  // build 명령에서는 이 alias를 제거해 실제 Apps in Toss SDK를 번들링합니다.
  resolve:
    command === 'serve'
      ? {
          alias: {
            '@apps-in-toss/web-framework': '@apps-in-toss/devtools/mock/3x',
          },
        }
      : undefined,
}));
