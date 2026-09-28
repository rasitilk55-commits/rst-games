// Uygulama girişi (Vite + Capacitor). Yazı tipleri pakete gömülür, uygulama çevrimdışı da doğru görünür.
import '@capacitor/core';
import '@fontsource/baloo-2/600.css';
import '@fontsource/baloo-2/800.css';
import '@fontsource/nunito/500.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@rst/kit/kit.css';
import { createApp } from '@rst/kit';
import { config } from './config.js';

createApp(config);
