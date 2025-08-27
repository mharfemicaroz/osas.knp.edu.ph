// src/services/plan/annualPlanService.js
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
    school_year,
    club_id,
    filed_by_user_id,
    approver_user_id,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order,
    q,
    status,
    school_year,
    club_id,
    filed_by_user_id,
    approver_user_id,
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

function toJSONText(v, fallbackEmptyArray = true) {
  if (typeof v === "string") return v;
  if (v == null) return fallbackEmptyArray ? "[]" : "null";
  try {
    return JSON.stringify(v);
  } catch {
    return fallbackEmptyArray ? "[]" : "null";
  }
}

function serializePayload(p = {}) {
  const out = { ...p };
  if (out.plans !== undefined) out.plans = toJSONText(out.plans, true);
  return out;
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(
      "/annual-plans",
      serializePayload(data)
    );
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/annual-plans/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(
      `/annual-plans/${id}`,
      serializePayload(data)
    );
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(`/annual-plans/${id}`);
    return res;
  },

  async list(queryParams = {}) {
    const params = { officer: false, ...buildListParams(queryParams) };
    const { data: res } = await axiosInstance.get(`/annual-plans`, { params });
    return res;
  },

  async submit(id) {
    const { data: res } = await axiosInstance.post(
      `/annual-plans/${id}/submit`
    );
    return res;
  },

  async approve(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/annual-plans/${id}/approve`,
      { remarks }
    );
    return res;
  },

  async reject(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/annual-plans/${id}/reject`,
      { remarks }
    );
    return res;
  },

  async cancel(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/annual-plans/${id}/cancel`,
      { remarks }
    );
    return res;
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/annual-plans/${id}/attachments`,
        fd,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );
      return res;
    } else {
      const { data: res } = await axiosInstance.post(
        `/annual-plans/${id}/attachments`,
        {
          file: fileOrData,
        }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/annual-plans/${id}/attachments/${attachmentId}`
    );
    return res;
  },
};
