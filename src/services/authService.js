// services/authService.js
import axiosInstance from "../plugins/axiosConfig";

const API_URL = "auth";

export default {
  async register(data) {
    const response = await axiosInstance.post(`${API_URL}/register`, data);
    return response.data;
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
};
