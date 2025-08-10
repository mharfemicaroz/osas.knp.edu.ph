// src/router/index.js
import { createWebHashHistory, createRouter } from "vue-router";
import { authGuard } from "./routeGuard";

const routes = [
  // ==========================
  // Auth Routes
  // ==========================
  {
    path: "/",
    name: "IndexPage",
    redirect: { name: "dashboard" },
  },
  {
    meta: { title: "Login" },
    path: "/login",
    name: "login",
    component: () => import("@/auth/SignInPage.vue"),
  },
  {
    meta: { title: "Register" },
    path: "/register",
    name: "register",
    component: () => import("@/auth/RegisterPage.vue"),
  },
  {
    meta: { title: "Verify" },
    path: "/verify-email",
    name: "verify-email",
    component: () => import("@/auth/VerifyPage.vue"),
  },
  {
    meta: { title: "Verify Prompt" },
    path: "/verify-prompt",
    name: "verify-prompt",
    component: () => import("@/auth/VerifyPrompt.vue"),
  },
  {
    meta: { title: "Verifying…" },
    path: "/verifying-now",
    name: "verifying-now",
    component: () => import("@/auth/VerifyingNow.vue"),
  },

  // ==========================
  // Dashboard
  // ==========================
  {
    meta: { title: "Dashboard" },
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/main/IndexPage.vue"),
  },

  // ==========================
  // 404 / Not Found
  // ==========================
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/main/ErrorPage.vue"),
  },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    return savedPosition || { top: 0 };
  },
});

router.beforeEach(authGuard);

export default router;
