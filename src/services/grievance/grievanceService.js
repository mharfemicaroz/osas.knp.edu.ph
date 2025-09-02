// src/services/grievance/grievanceService.js
import axiosInstance from "../../plugins/axiosConfig";

function buildListParams(queryParams = {}) {
  const {
    filters = {},
    page,
    limit,
    sort,
    order,
    q,
    status,
    club_id,
    filed_by_user_id,
    assigned_to_user_id,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order,
    q,
    status,
    club_id,
    filed_by_user_id,
    assigned_to_user_id,
    ...rest,
    filters: { ...filters },
  };
  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
  return params;
}

function isBlobLike(v) {
  return typeof Blob !== "undefined" && (v instanceof Blob || v instanceof File);
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/grievances`, data);
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/grievances/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.patch(`/grievances/${id}`, data);
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/grievances/${id}`);
    return res;
  },

  async list(queryParams = {}) {
    const params = buildListParams(queryParams);
    const { data: res } = await axiosInstance.get(`/grievances`, { params });
    return res;
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/grievances/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res;
    } else {
      const { data: res } = await axiosInstance.post(
        `/grievances/${id}/attachments`,
        { file: fileOrData }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/grievances/${id}/attachments/${attachmentId}`
    );
    return res;
  },
};

