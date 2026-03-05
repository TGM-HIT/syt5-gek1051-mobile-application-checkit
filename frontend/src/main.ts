import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

// Import Components (Views)
import HomeView from './views/HomeView.vue'
import ListView from './views/ListView.vue'
import SettingsView from './views/SettingsView.vue'

import "@fontsource/inter"; // Defaults to weight 400
import "@fontsource/inter/700.css"; // Optional: if you want bold
import './assets/main.css'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
})

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'Home',
    component: HomeView
  },
  {
    path: '/list/:hash',
    name: 'ListView',
    component: ListView
  },
  {
    path: '/settings',
    name: 'SettingsView',
    component: SettingsView
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')
