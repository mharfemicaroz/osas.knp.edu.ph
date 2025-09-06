// src/services/notification/notificationService.js
import axiosInstance from "../../plugins/axiosConfig";

function buildListParams(query = {}) {
  const {
    page,
    limit,
    sort = "created_at",
    order = "DESC",
    q,
    user_id,
    club_id,
    subject_type,
    is_read,
    created_from,
    created_to,
    ...rest
  } = query;
  const params = {
    page,
    limit,
    sort,
    order: typeof order === "string" ? order.toUpperCase() : order,
    q,
    user_id,
    club_id,
    subject_type,
    is_read,
    created_from,
    created_to,
    ...rest,
  };
  Object.keys(params).forEach(
    (k) => params[k] === undefined && delete params[k]
  );
  return params;
}

export default {
  async list(query = {}) {
    const params = buildListParams(query);
    const { data } = await axiosInstance.get("/notifications", { params });
    return data;
  },
  async stats(query = {}) {
    const params = buildListParams(query)
    const { data } = await axiosInstance.get("/notifications/_stats", { params })
    return data
  },
  async getById(id) {
    const { data } = await axiosInstance.get(`/notifications/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await axiosInstance.post("/notifications", payload);
    return data;
  },
  async markRead(id) {
    const { data } = await axiosInstance.post(`/notifications/${id}/read`);
    return data;
  },
  async markUnread(id) {
    const { data } = await axiosInstance.post(`/notifications/${id}/unread`);
    return data;
  },
  async delete(id) {
    const { data } = await axiosInstance.delete(`/notifications/${id}`);
    return data;
  },
};
