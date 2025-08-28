// src/router/index.js
import { createWebHashHistory, createRouter } from "vue-router";
import { authGuard } from "./routeGuard";

const routes = [
  { path: "/", name: "IndexPage", redirect: { name: "dashboard" } },

  // Auth
  {
    meta: { title: "Login", public: true },
    path: "/login",
    name: "login",
    component: () => import("@/auth/SignInPage.vue"),
  },
  {
    meta: { title: "Register", public: true },
    path: "/register",
    name: "register",
    component: () => import("@/auth/RegisterPage.vue"),
  },
  {
    meta: { title: "Verify", public: true },
    path: "/verify-email",
    name: "verify-email",
    component: () => import("@/auth/VerifyPage.vue"),
  },
  {
    meta: { title: "Verify Prompt", public: true },
    path: "/verify-prompt",
    name: "verify-prompt",
    component: () => import("@/auth/VerifyPrompt.vue"),
  },
  {
    meta: { title: "Verifying…", public: true },
    path: "/verifying-now",
    name: "verifying-now",
    component: () => import("@/auth/VerifyingNow.vue"),
  },

  // Dashboards
  {
    meta: { title: "Dashboard", requiresAuth: true, roles: ["admin"] },
    path: "/dashboard",
    name: "dashboard",
    component: () => import("@/views/IndexPage.vue"),
  },
  {
    meta: {
      title: "Student Dashboard",
      requiresAuth: true,
      roles: ["student"],
    },
    path: "/student-dashboard",
    name: "student-dashboard",
    component: () => import("@/views/StudentDashboardPage.vue"),
  },

  // App Pages
  {
    meta: {
      title: "Clubs & Organizations",
      requiresAuth: true,
      roles: ["admin", "student_officer"],
    },
    path: "/clubs-organization",
    name: "clubs-organization",
    component: () => import("@/views/ClubsOrganizationPage.vue"),
  },
  {
    meta: {
      title: "User Management",
      requiresAuth: true,
      roles: ["admin"],
    },
    path: "/user-mgt",
    name: "user-management",
    component: () => import("@/views/UserManagementPage.vue"),
  },
  {
    meta: { title: "Profile", requiresAuth: true },
    path: "/profile/:id?",
    name: "profile",
    component: () => import("@/views/ProfilePage.vue"),
    props: true,
  },
  {
    meta: { title: "Calendar of Activities", requiresAuth: true },
    path: "/activity-calendar",
    name: "activity-calendar",
    component: () => import("@/views/CalendarActivityPage.vue"),
  },
  {
    meta: { title: "View Club", requiresAuth: true },
    path: "/club/:id",
    name: "club-view",
    component: () => import("@/views/ClubViewPage.vue"),
    props: true,
  },
  {
    meta: {
      title: "Activity Designs",
      requiresAuth: true,
      roles: ["admin", "student_officer"],
    },
    path: "/activity-designs",
    name: "activity-designs",
    component: () => import("@/views/ActivityDesignsPage.vue"),
  },
  {
    meta: {
      title: "Utilization Requests",
      requiresAuth: true,
      roles: ["admin", "student_officer"],
    },
    path: "/utilization-requests",
    name: "utilization-requests",
    component: () => import("@/views/UtilizationRequestsPage.vue"),
  },
  {
    meta: {
      title: "Liquidation Funds",
      requiresAuth: true,
      roles: ["admin", "student_officer"],
    },
    path: "/liquidation-funds",
    name: "liquidation-funds",
    component: () => import("@/views/LiquidationFundsPage.vue"),
  },
  {
    meta: {
      title: "Annual Plans",
      requiresAuth: true,
      roles: ["admin", "student_officer"],
    },
    path: "/annual-plans",
    name: "annual-plans",
    component: () => import("@/views/AnnualPlansPage.vue"),
  },
  {
    meta: {
      title: "Lobby Complains",
      requiresAuth: true,
      roles: ["admin", "student", "student_officer"],
    },
    path: "/lobby-complains",
    name: "lobby-complains",
    component: () => import("@/views/LobbyComplainsRedirect.vue"),
  },

  // 404
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
