import { defineStore } from "pinia";
import { ref } from "vue";
import axios from "@/plugins/axiosConfig";
import router from "@/router";

export const useAuthStore = defineStore("auth", () => {
  const user = ref(JSON.parse(localStorage.getItem("userData")) || null);
  const token = ref(localStorage.getItem("authToken") || null);
  const refreshToken = ref(localStorage.getItem("refreshToken") || null);
  const requires2FA = ref(false);
  const tempToken = ref(null);
  const isLoading = ref(false);
  const requiresVerification = ref(false);

  const login = async (email, password) => {
    try {
      isLoading.value = true;
      requiresVerification.value = false;

      const { data } = await axios.post("/auth/login", { email, password });

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
      console.error("2FA Verification Error:", error.response?.data);
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

  const verifyEmail = async (token) => {
    try {
      isLoading.value = true;
      await axios.get("/auth/verify-email", { params: { token } });
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
    login,
    logout,
    verify2FA,
    enable2FA,
    disable2FA,
    verifyToken,
    refreshAccessToken,
    verifyEmail,
    resendVerification,
    isAuthenticated: () => !!token.value,
  };
});
