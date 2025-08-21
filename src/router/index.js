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
    component: () => import("@/views/IndexPage.vue"),
  },
  {
    meta: { title: "Clubs & Organizations" },
    path: "/clubs-organization",
    name: "clubs-organization",
    component: () => import("@/views/ClubsOrganizationPage.vue"),
  },
  {
    meta: { title: "Calendar of Activities" },
    path: "/activity-calendar",
    name: "activity-calendar",
    component: () => import("@/views/CalendarActivityPage.vue"),
  },

  // ==========================
  // 404 / Not Found
  // ==========================
  {
    path: "/:pathMatch(.*)*",
    name: "NotFound",
    component: () => import("@/views/ErrorPage.vue"),
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
