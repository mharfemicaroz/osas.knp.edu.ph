// src/services/club/clubDocService.js
import axiosInstance from "../../plugins/axiosConfig";

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/clubs/docs`, data);
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/clubs/docs/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(`/clubs/docs/${id}`, data);
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/clubs/docs/${id}`);
    return res;
  },

  async list(queryParams) {
    const { data: res } = await axiosInstance.get(`/clubs/docs`, {
      params: queryParams,
    });
    return res;
  },

  async listByClub(clubId, queryParams = {}) {
    const params = { ...queryParams, club_id: clubId };
    const { data: res } = await axiosInstance.get(`/clubs/docs`, { params });
    return res;
  },
};
