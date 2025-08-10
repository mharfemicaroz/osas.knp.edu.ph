import { useAuthStore } from "@/stores/auth";

export const authGuard = async (to, from, next) => {
  const authStore = useAuthStore();

  //  Restore 2FA state from localStorage
  authStore.requires2FA = localStorage.getItem("requires2FA") === "true";

  //  If user has not completed 2FA, redirect to OTP page
  if (authStore.requires2FA && to.name !== "otp") {
    console.log(" Redirecting user to OTP page"); // Debugging
    return next({ name: "otp" });
  }

  //  If user is not logged in and no 2FA pending, redirect to login
  if (!authStore.token && !authStore.requires2FA) {
    if (to.name !== "login") {
      authStore.logout();
      return next({ name: "login" });
    }
    return next();
  }

  //  Prevent logged-in users from accessing login or OTP page again
  if (
    (to.name === "login" || to.name === "otp") &&
    authStore.isAuthenticated()
  ) {
    return next({ name: "dashboard" });
  }

  next();
};
