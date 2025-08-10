import axiosInstance from "../../plugins/axiosConfig";

export default {
  async create(data) {
    const response = await axiosInstance.post(`/users`, data);
    return response.data;
  },

  async getById(id) {
    const response = await axiosInstance.get(`/users/${id}`);
    return response.data;
  },

  async updateById(id, data) {
    const response = await axiosInstance.put(`/users/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axiosInstance.delete(`/users/${id}`);
    return response.data;
  },

  async list(queryParams) {
    const response = await axiosInstance.get(`/users`, { params: queryParams });
    return response.data;
  },
};
