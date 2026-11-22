/**
 * 設定画面 (オプションページ) のエントリ.
 */
import { createApp } from 'vue'
// アイコンの CSS は main.css で @import するとフォントの URL が壊れるため、ここで読み込む
import '@mdi/font/css/materialdesignicons.css'
import '../styles/main.css'
import App from './App.vue'

createApp(App).mount('#app')
