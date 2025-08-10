import axiosInstance from "../plugins/axiosConfig";

const API_URL = "auth";

export default {
  async register(name, email, password) {
    if (!password) throw new Error("Password is required");
    const response = await axiosInstance.post(`${API_URL}/register`, {
      name,
      email,
      password,
    });
    return response.data;
  },

  async login(email, password) {
    const response = await axiosInstance.post(`${API_URL}/login`, {
      email,
      password,
    });
    return response.data;
  },

  async verifyToken(token) {
    const response = await axiosInstance.post(`${API_URL}/verify-token`, {
      token,
    });
    return response.data;
  },
};
