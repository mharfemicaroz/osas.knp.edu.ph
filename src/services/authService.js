// services/authService.js
import axiosInstance from "../plugins/axiosConfig";

const API_URL = "/auth";

export default {
  async register(data) {
    const response = await axiosInstance.post(`${API_URL}/register`, data);
    return response.data;
  },

  async checkEmail(email) {
    const response = await axiosInstance.get(`${API_URL}/check-email`, {
      params: { email },
    });
    return response.data; // expected shape: { exists: boolean }
  },

  async login(email, password) {
    const response = await axiosInstance.post(`${API_URL}/login`, {
      email,
      password,
    });
    return response.data;
  },

  async verify2FA(tempToken, otp) {
    const response = await axiosInstance.post(`${API_URL}/verify-2fa`, {
      tempToken,
      otp,
    });
    return response.data;
  },

  async enable2FA(userId) {
    const response = await axiosInstance.post(`${API_URL}/enable-2fa`, {
      userId,
    });
    return response.data;
  },

  async disable2FA(userId) {
    const response = await axiosInstance.post(`${API_URL}/disable-2fa`, {
      userId,
    });
    return response.data;
  },

  async refresh(refreshToken) {
    const response = await axiosInstance.post(`${API_URL}/refresh`, {
      refreshToken,
    });
    return response.data;
  },

  async logout() {
    const response = await axiosInstance.post(`${API_URL}/logout`);
    return response.data;
  },

  async forgotPassword(email) {
    const response = await axiosInstance.post(`${API_URL}/forgot-password`, {
      email,
    });
    return response.data;
  },

  async resetPassword(resetToken, newPassword) {
    const response = await axiosInstance.post(`${API_URL}/reset-password`, {
      resetToken,
      newPassword,
    });
    return response.data;
  },

  async verifyEmail(token) {
    const response = await axiosInstance.get(`${API_URL}/verify-email`, {
      params: { token },
    });
    return response.data;
  },

  async resendVerification(email) {
    const response = await axiosInstance.post(
      `${API_URL}/resend-verification`,
      { email }
    );
    return response.data;
  },

  getGoogleStartUrl(redirectUri) {
    return `${
      axiosInstance.defaults.baseURL || ""
    }${API_URL}/google/start?redirect_uri=${encodeURIComponent(redirectUri)}`;
  },

  parseSsoHash(hashString = window.location.hash) {
    // Work with the full href to handle "#/login#accessToken=..." correctly
    const href = typeof window !== "undefined" ? window.location.href : "";
    let fragment = "";

    if (href.includes("#")) {
      // Take everything after the LAST '#'
      fragment = href.substring(href.lastIndexOf("#") + 1);
    } else {
      // Fallback to the provided hash string
      const raw = hashString.startsWith("#") ? hashString.slice(1) : hashString;
      // If it still contains an inner '#', take the tail
      fragment = raw.includes("#") ? raw.split("#").pop() : raw;
    }

    // If nothing meaningful, bail early
    if (
      !fragment ||
      (!fragment.includes("accessToken=") && !fragment.includes("sso="))
    ) {
      return {
        sso: null,
        error: null,
        accessToken: null,
        refreshToken: null,
        userdata: null,
      };
    }

    const p = new URLSearchParams(fragment);
    return {
      sso: p.get("sso"),
      error: p.get("error"),
      accessToken: p.get("accessToken"),
      refreshToken: p.get("refreshToken"),
      userdata: {
        id: p.get("id") ? Number(p.get("id")) : null,
        email: p.get("email"),
        role: p.get("role"),
        first_name: p.get("first_name"),
        last_name: p.get("last_name"),
        twoFAEnabled:
          p.get("twoFAEnabled") === "0" ? false : p.get("twoFAEnabled") === "1",
      },
    };
  },
};
