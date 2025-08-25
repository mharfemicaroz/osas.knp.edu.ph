// src/services/activity/utilizationRequestService.js
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
    availability_status,
    activity_design_id,
    filed_by_user_id,
    start_from,
    start_to,
    end_from,
    end_to,
    facilities_any,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order,
    q,
    status,
    availability_status,
    activity_design_id,
    filed_by_user_id,
    start_from,
    start_to,
    end_from,
    end_to,
    facilities_any,
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
  if (out.facilities !== undefined)
    out.facilities = toJSONText(out.facilities, true);
  if (out.equipment_items !== undefined)
    out.equipment_items = toJSONText(out.equipment_items, true);
  // leave dates/times as-is; backend hooks build start_at/end_at
  return out;
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(
      "/utilization-requests",
      serializePayload(data)
    );
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(
      `/utilization-requests/${id}`
    );
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(
      `/utilization-requests/${id}`,
      serializePayload(data)
    );
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(
      `/utilization-requests/${id}`
    );
    return res;
  },

  async list(queryParams = {}) {
    const params = buildListParams(queryParams);
    const { data: res } = await axiosInstance.get(`/utilization-requests`, {
      params,
    });
    return res;
  },

  async submit(id) {
    const { data: res } = await axiosInstance.post(
      `/utilization-requests/${id}/submit`
    );
    return res;
  },

  async approve(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/utilization-requests/${id}/approve`,
      { remarks }
    );
    return res;
  },

  async reject(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/utilization-requests/${id}/reject`,
      { remarks }
    );
    return res;
  },

  async cancel(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/utilization-requests/${id}/cancel`,
      { remarks }
    );
    return res;
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/utilization-requests/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res;
    } else {
      const { data: res } = await axiosInstance.post(
        `/utilization-requests/${id}/attachments`,
        { file: fileOrData }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/utilization-requests/${id}/attachments/${attachmentId}`
    );
    return res;
  },

  async availability({
    start_date,
    start_time,
    end_date,
    end_time,
    facilities = [],
  }) {
    const params = { start_date, start_time, end_date, end_time, facilities };
    const { data: res } = await axiosInstance.get(
      `/utilization-requests/_utils/availability`,
      {
        params,
      }
    );
    return res;
  },
};
