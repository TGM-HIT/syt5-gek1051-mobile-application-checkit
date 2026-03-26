import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

import HomeView     from './views/HomeView.vue'
import ListView     from './views/ListView.vue'
import SettingsView from './views/SettingsView.vue'
import LoginView    from './views/LoginView.vue'
import RegisterView from './views/RegisterView.vue'

import "@fontsource/inter"
import "@fontsource/inter/700.css"
import './assets/main.css'

import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import { isLoggedIn } from './utils/auth'

const vuetify = createVuetify({ components, directives })

const routes: Array<RouteRecordRaw> = [
  { path: '/',          name: 'Home',     component: HomeView },
  { path: '/list/:hash',name: 'ListView', component: ListView },
  { path: '/settings',  name: 'Settings', component: SettingsView },
  { path: '/login',     name: 'Login',    component: LoginView },
  { path: '/register',  name: 'Register', component: RegisterView },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
})

const app = createApp(App)
app.use(vuetify)
app.use(router)
app.mount('#app')
