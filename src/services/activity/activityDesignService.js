// src/services/activity/activityDesignService.js
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
    semester,
    school_year,
    club_id,
    filed_by_user_id,
    nature_of_activity,
    date_filed_from,
    date_filed_to,
    impl_from,
    impl_to,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order,
    q,
    status,
    semester,
    school_year,
    club_id,
    filed_by_user_id,
    nature_of_activity,
    date_filed_from,
    date_filed_to,
    impl_from,
    impl_to,
    ...rest,
    filters: { ...filters },
  };

  Object.keys(params).forEach(
    (k) => params[k] === undefined && delete params[k]
  );
  return params;
}

function isBlobLike(v) {
  return (
    typeof Blob !== "undefined" && (v instanceof Blob || v instanceof File)
  );
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/activity-designs`, data);
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/activity-designs/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(
      `/activity-designs/${id}`,
      data
    );
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/activity-designs/${id}`);
    return res;
  },

  async list(queryParams = {}) {
    // default officer=false unless caller sets it
    const params = { officer: false, ...buildListParams(queryParams) };
    const { data: res } = await axiosInstance.get("/activity-designs", {
      params,
    });
    return res;
  },

  async submit(id) {
    const { data: res } = await axiosInstance.post(
      `/activity-designs/${id}/submit`
    );
    return res;
  },

  async approve(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/activity-designs/${id}/approve`,
      { remarks }
    );
    return res;
  },

  async reject(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/activity-designs/${id}/reject`,
      { remarks }
    );
    return res;
  },

  async cancel(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/activity-designs/${id}/cancel`,
      { remarks }
    );
    return res;
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/activity-designs/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res;
    } else {
      const { data: res } = await axiosInstance.post(
        `/activity-designs/${id}/attachments`,
        { file: fileOrData }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/activity-designs/${id}/attachments/${attachmentId}`
    );
    return res;
  },
};
