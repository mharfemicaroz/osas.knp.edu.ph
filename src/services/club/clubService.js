// src/services/club/clubService.js
import axiosInstance from "../../plugins/axiosConfig";

/**
 * Small helper to normalize list() params:
 * - allow top-level include: 'users' → ?include=users
 * - allow top-level member_id → ?member_id=123
 * - also accept nested filters as-is
 */
function buildListParams(queryParams = {}) {
  const { include, member_id, filters = {}, ...rest } = queryParams;

  const params = {
    ...rest,
    // pass through nested filters (if any)
    filters: { ...filters },
  };

  // normalize include=users
  if (include) params.include = include;
  else if (filters.include) params.include = filters.include;

  // normalize member_id
  if (member_id != null) params.member_id = member_id;
  else if (filters.member_id != null) params.member_id = filters.member_id;

  return params;
}

function isBlobLike(v) {
  return (
    typeof Blob !== "undefined" && (v instanceof Blob || v instanceof File)
  );
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/clubs`, data);
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/clubs/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(`/clubs/${id}`, data);
    // Some endpoints wrap as { message, data }; normalize to the actual club object
    return res?.data ?? res;
  },

  async canEditMedia(id) {
    const { data } = await axiosInstance.get(`/clubs/${id}/can-edit-media`)
    return { can_edit: !!data?.can_edit, member_role: data?.member_role || null }
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/clubs/${id}`);
    return res;
  },

  /**
   * Supports:
   *   list({ page, limit, include: 'users', member_id: 7 })
   *   list({ page, limit, filters: { include: 'users', member_id: 7 }})
   */
  async list(queryParams = {}) {
    // default officer=false unless caller sets it
    const params = { officer: false, ...queryParams };
    const { data: res } = await axiosInstance.get(`/clubs`, { params });
    return res;
  },

  async addUsers(id, userIds) {
    const { data: res } = await axiosInstance.post(`/clubs/${id}/users`, {
      userIds,
    });
    return res; // backend returns the full club
  },

  async removeUser(id, userId) {
    const { data: res } = await axiosInstance.delete(
      `/clubs/${id}/users/${userId}`
    );
    return res;
  },

  /**
   * Backend returns: { message: 'Updated', data: <membership> }
   * We return only the membership (UserClub) row for easier patching in the store.
   */
  async updateMember(clubId, userId, payload) {
    const { data: res } = await axiosInstance.patch(
      `/clubs/${clubId}/users/${userId}`,
      payload
    );
    return res?.data; // membership row { user_id, club_id, role?, status?, joined_at, ... }
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/clubs/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res;
    } else {
      const { data: res } = await axiosInstance.post(
        `/clubs/${id}/attachments`,
        { file: fileOrData }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/clubs/${id}/attachments/${attachmentId}`
    );
    return res;
  },
};
