import { browser } from 'webextension-polyfill-ts'
import Vue, { CreateElement, VNode } from 'vue'
import App from './App.vue'

// import css
import './style.sass'

// bind polyfull
Vue.prototype.$browser = browser

/* eslint-disable no-new */
new Vue({
  el: '#app',
  render: (h: CreateElement): VNode => h(App),
})
