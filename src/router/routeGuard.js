// src/router/routeGuard.js
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

const officerTitles = new Set(["president", "vice-president", "secretary"]);

async function computeEffectiveRole(authStore, to) {
  const base = (authStore.user?.role || "").toLowerCase();
  if (base !== "student") return base;

  // Only compute officer status if needed for this route (kept as-is)
  const needsOfficer =
    (Array.isArray(to.meta?.roles) &&
      to.meta.roles.includes("student_officer")) ||
    to.name === "clubs-organization";

  if (!needsOfficer) return base;

  const userStore = useUserStore();
  const userId = authStore.user?.id;
  if (!userId) return base;

  const key = String(userId);
  let clubs = userStore.clubsByUser?.[key];
  if (!Array.isArray(clubs)) {
    try {
      await userStore.fetchUserClubs(userId);
      clubs = userStore.clubsByUser?.[key];
    } catch {}
  }

  if (
    Array.isArray(clubs) &&
    clubs.some((c) =>
      officerTitles.has(String(c?.membership?.role || "").toLowerCase())
    )
  ) {
    return "student_officer";
  }
  return base;
}

export const authGuard = async (to, from, next) => {
  const authStore = useAuthStore();

  const isPublic = to.meta?.public === true;
  const requiresAuth = to.meta?.requiresAuth === true;

  if (!authStore.token) {
    if (isPublic) return next();
    const publicPages = new Set([
      "login",
      "register",
      "verify-email",
      "verify-prompt",
      "verifying-now",
    ]);
    if (publicPages.has(to.name)) return next();
    return next({ name: "login" });
  }

  // Ensure we know base role
  try {
    if (!authStore.user?.role) {
      await authStore.checkRole().catch(() => null);
    }
  } catch {}

  // 👉 NEW: Prefetch student memberships once so sidebar can decide officer menus on first paint
  try {
    const baseRole = (authStore.user?.role || "").toLowerCase();
    if (baseRole === "student") {
      const userStore = useUserStore();
      const uid = authStore.user?.id;
      const key = String(uid ?? "");
      if (uid && !Array.isArray(userStore.clubsByUser[key])) {
        await userStore.fetchUserClubs(uid).catch(() => null);
      }
    }
  } catch {}

  const effectiveRole = await computeEffectiveRole(authStore, to);
  const baseRole = (authStore.user?.role || "").toLowerCase();

  if (
    isPublic ||
    [
      "login",
      "register",
      "verify-email",
      "verify-prompt",
      "verifying-now",
    ].includes(to.name)
  ) {
    return next({
      name: baseRole === "student" ? "student-dashboard" : "dashboard",
    });
  }

  if (requiresAuth) {
    const allowedRoles = to.meta?.roles;
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      if (!allowedRoles.includes(effectiveRole)) {
        return next({
          name: baseRole === "student" ? "student-dashboard" : "dashboard",
        });
      }
    }
  }

  if (to.name === "dashboard" && baseRole === "student") {
    return next({ name: "student-dashboard" });
  }

  return next();
};
