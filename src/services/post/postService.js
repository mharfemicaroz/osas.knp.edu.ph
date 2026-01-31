// src/services/post/postService.js
import axiosInstance from "../../plugins/axiosConfig";

function buildListParams(queryParams = {}) {
  const {
    filters = {},
    page,
    limit,
    sort,
    order,
    q,
    user_id,
    post_type,
    created_from,
    created_to,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order,
    q,
    user_id,
    post_type,
    created_from,
    created_to,
    ...rest,
    filters: { ...filters },
  };
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
  return params;
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/posts`, data);
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/posts/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.patch(`/posts/${id}`, data);
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/posts/${id}`);
    return res;
  },

  async list(queryParams = {}) {
    const params = buildListParams(queryParams);
    const { data: res } = await axiosInstance.get(`/posts`, { params });
    return res;
  },

  async react(id, type) {
    const { data: res } = await axiosInstance.post(`/posts/${id}/reactions`, {
      type,
    });
    return res;
  },

  async comment(id, text, parentId = null) {
    const payload = text && typeof text === "object" ? { ...text } : { text };
    if (parentId) payload.parent_id = parentId;
    if (payload.parent_id == null) delete payload.parent_id;
    const { data: res } = await axiosInstance.post(
      `/posts/${id}/comments`,
      payload
    );
    return res;
  },

  async deleteComment(id, commentId) {
    const { data: res } = await axiosInstance.delete(
      `/posts/${id}/comments/${commentId}`
    );
    return res;
  },

  async share(id, payload = {}) {
    const { data: res } = await axiosInstance.post(`/posts/${id}/shares`, payload);
    return res;
  },
};
