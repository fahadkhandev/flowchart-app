import { createRouter, createWebHistory } from 'vue-router'

const CanvasView = () => import('../views/CanvasView.vue')

const routes = [
  { path: '/', name: 'canvas', component: CanvasView },
  { path: '/node/:id', name: 'node-detail', component: CanvasView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
