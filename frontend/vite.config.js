import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tsconfigPaths()
    ],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
            '@app': resolve(__dirname, './src/app'),
            '@features': resolve(__dirname, './src/features'),
            '@assets': resolve(__dirname, './src/assets')
        }
    }
});
