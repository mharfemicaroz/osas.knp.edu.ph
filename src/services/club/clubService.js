import axiosInstance from "../../plugins/axiosConfig";

export default {
  async create(data) {
    const response = await axiosInstance.post(`/clubs`, data);
    return response.data;
  },

  async getById(id) {
    const response = await axiosInstance.get(`/clubs/${id}`);
    return response.data;
  },

  async updateById(id, data) {
    const response = await axiosInstance.put(`/clubs/${id}`, data);
    return response.data;
  },

  async delete(id) {
    const response = await axiosInstance.delete(`/clubs/${id}`);
    return response.data;
  },

  async list(queryParams) {
    const response = await axiosInstance.get(`/clubs`, { params: queryParams });
    return response.data;
  },

  async addUsers(id, userIds) {
    const response = await axiosInstance.post(`/clubs/${id}/users`, {
      userIds,
    });
    return response.data;
  },

  async removeUser(id, userId) {
    const response = await axiosInstance.delete(`/clubs/${id}/users/${userId}`);
    return response.data;
  },

  async updateMember(clubId, userId, payload) {
    const { data: res } = await axiosInstance.patch(
      `/clubs/${clubId}/users/${userId}`,
      payload
    );
    return res;
  },
};
