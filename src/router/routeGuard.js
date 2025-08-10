// src/router/routeGuard.js
import { useAuthStore } from "@/stores/auth";

export const authGuard = (to, from, next) => {
  const authStore = useAuthStore();
  const publicPages = [
    "login",
    "register",
    "verify-email",
    "verify-prompt",
    "verifying-now",
  ];

  if (!authStore.token) {
    if (!publicPages.includes(to.name)) {
      return next({ name: "login" });
    }
    return next();
  }

  if (publicPages.includes(to.name) && authStore.isAuthenticated()) {
    return next({ name: "dashboard" });
  }

  next();
};
