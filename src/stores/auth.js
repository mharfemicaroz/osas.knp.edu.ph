// stores/auth.js
import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "@/plugins/axiosConfig";
import router from "@/router";
import apiAuth from "@/services/authService";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(JSON.parse(localStorage.getItem("userData")) || null);
  const token = ref(localStorage.getItem("authToken") || null);
  const refreshToken = ref(localStorage.getItem("refreshToken") || null);
  const requires2FA = ref(false);
  const tempToken = ref(null);
  const isLoading = ref(false);
  const requiresVerification = ref(false);

  const register = async (payload) => {
    try {
      isLoading.value = true;

      // 1) Try to check if email exists (if backend endpoint is available)
      try {
        const check = await apiAuth.checkEmail(payload.email);
        if (check?.exists) {
          throw new Error(
            "Email already exists. Please sign in or use a different email."
          );
        }
      } catch (e) {
        // If /check-email endpoint isn't available, ignore and proceed to register.
        // We rely on /register to return a proper error if duplicate.
        if (!(e?.response?.status === 404)) {
          // Do nothing for 404; for other network errors, still proceed
        }
      }

      // 2) Proceed with registration
      const data = await apiAuth.register(payload);
      return data;
    } catch (e) {
      throw new Error(
        e.response?.data?.message || e.message || "Registration failed"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const login = async (email, password, captchaToken) => {
    try {
      isLoading.value = true;
      requiresVerification.value = false;

      // pass the token through to the service
      const data = await apiAuth.login(email, password, { captchaToken });

      if (data.requiresVerification) {
        requiresVerification.value = true;
        return { requiresVerification: true };
      }

      if (data.requires2FA) {
        requires2FA.value = true;
        tempToken.value = data.tempToken;
        localStorage.setItem("requires2FA", "true");
        localStorage.setItem("tempToken", tempToken.value);
        router.push("/otp");
        return { requires2FA: true };
      }

      token.value = data.accessToken;
      refreshToken.value = data.refreshToken;
      localStorage.setItem("authToken", token.value);
      localStorage.setItem("refreshToken", refreshToken.value);

      user.value = {
        id: data.userdata.id,
        email: data.userdata.email,
        role: data.userdata.role,
        twoFAEnabled: data.userdata.twoFAEnabled,
        first_name: data.userdata.first_name,
        last_name: data.userdata.last_name,
      };
      localStorage.setItem("userData", JSON.stringify(user.value));

      router.push("/dashboard");
      return { ok: true };
    } catch (e) {
      throw new Error(e.response?.data?.message || "Login failed");
    } finally {
      isLoading.value = false;
    }
  };

  const verify2FA = async (otp) => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/verify-2fa", {
        otp,
        tempToken: localStorage.getItem("tempToken"),
      });

      token.value = response.data.accessToken;
      refreshToken.value = response.data.refreshToken;
      localStorage.setItem("authToken", token.value);
      localStorage.setItem("refreshToken", refreshToken.value);

      user.value = {
        id: response.data.userdata.id,
        email: response.data.userdata.email,
        role: response.data.userdata.role,
        twoFAEnabled: response.data.userdata.twoFAEnabled,
        first_name: response.data.userdata.first_name,
        last_name: response.data.userdata.last_name,
      };
      localStorage.setItem("userData", JSON.stringify(user.value));

      requires2FA.value = false;
      tempToken.value = null;
      localStorage.removeItem("requires2FA");
      localStorage.removeItem("tempToken");

      router.push("/dashboard");
    } catch (error) {
      throw new Error("Invalid OTP");
    } finally {
      isLoading.value = false;
    }
  };

  const enable2FA = async (id) => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/enable-2fa", { userId: id });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to enable 2FA");
    } finally {
      isLoading.value = false;
    }
  };

  const disable2FA = async (id) => {
    try {
      isLoading.value = true;
      await axios.post("/auth/disable-2fa", { userId: id });
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to disable 2FA");
    } finally {
      isLoading.value = false;
    }
  };

  const resendVerification = async (email) => {
    try {
      isLoading.value = true;
      await axios.post("/auth/resend-verification", { email });
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Failed to resend verification"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const logout = () => {
    token.value = null;
    refreshToken.value = null;
    user.value = null;
    requires2FA.value = false;
    tempToken.value = null;
    requiresVerification.value = false;

    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userData");
    localStorage.removeItem("requires2FA");
    localStorage.removeItem("tempToken");

    localStorage.setItem("logout", Date.now());

    router.push({ name: "login" });
  };

  const verifyEmail = async (tokenParam) => {
    try {
      isLoading.value = true;
      await axios.get("/auth/verify-email", { params: { token: tokenParam } });
    } catch (error) {
      throw new Error(
        error.response?.data?.message || "Email verification failed"
      );
    } finally {
      isLoading.value = false;
    }
  };

  const verifyToken = async () => {
    try {
      isLoading.value = true;
      await axios.get("/auth/verify");
    } catch {
      throw new Error("Invalid token");
    } finally {
      isLoading.value = false;
    }
  };

  const refreshAccessToken = async () => {
    try {
      isLoading.value = true;
      const response = await axios.post("/auth/refresh", {
        refreshToken: refreshToken.value,
      });
      token.value = response.data.accessToken;
      localStorage.setItem("authToken", token.value);
    } catch {
      throw new Error("Refresh token expired");
    } finally {
      isLoading.value = false;
    }
  };

  const startGoogleLogin = (hashRoute = "#/login") => {
    const state =
      window.location.origin +
      window.location.pathname +
      window.location.search +
      hashRoute;
    const url = apiAuth.getGoogleStartUrl(state);
    window.location.href = url;
  };

  const consumeSsoFromHash = () => {
    const parsed = apiAuth.parseSsoHash(window.location.hash);
    if (parsed.error) throw new Error(parsed.error);
    if (parsed.sso !== "google" || !parsed.accessToken) return false;

    token.value = parsed.accessToken;
    refreshToken.value = parsed.refreshToken || null;
    if (token.value) localStorage.setItem("authToken", token.value);
    if (refreshToken.value)
      localStorage.setItem("refreshToken", refreshToken.value);

    user.value = parsed.userdata || null;
    if (user.value)
      localStorage.setItem("userData", JSON.stringify(user.value));

    if (window.location.hash) {
      if (history.replaceState) {
        history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search
        );
      } else {
        window.location.hash = "";
      }
    }

    router.push("/dashboard");
    return true;
  };

  window.addEventListener("storage", (event) => {
    if (event.key === "logout") logout();
  });

  return {
    user,
    token,
    refreshToken,
    requires2FA,
    tempToken,
    isLoading,
    requiresVerification,
    register,
    login,
    logout,
    verify2FA,
    enable2FA,
    disable2FA,
    verifyToken,
    refreshAccessToken,
    verifyEmail,
    resendVerification,
    startGoogleLogin,
    consumeSsoFromHash,
    getCaptchaToken: apiAuth.getCaptchaToken,
    isAuthenticated: () => !!token.value,
  };
});
