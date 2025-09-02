// src/services/activity/liquidationFundService.js
import axiosInstance from "../../plugins/axiosConfig";

function onlyDefined(obj) {
  const out = { ...obj };
  Object.keys(out).forEach((k) => out[k] === undefined && delete out[k]);
  return out;
}

function isBlobLike(v) {
  return (
    typeof Blob !== "undefined" && (v instanceof Blob || v instanceof File)
  );
}

function toJSONText(v, fallback) {
  if (typeof v === "string") return v;
  if (v == null) return fallback;
  try {
    return JSON.stringify(v);
  } catch {
    return fallback;
  }
}

function serializePayload(p = {}) {
  const out = { ...p };
  // Long-text JSON fields
  if (out.sources_of_fund !== undefined) {
    // expect object: { contribution, payment_from_fines, ... }
    out.sources_of_fund = toJSONText(out.sources_of_fund, "{}");
  }
  if (out.uses_of_fund !== undefined) {
    // expect array: [{ date, qty, unit, particulars, sheet_no, amount, in_charge }]
    out.uses_of_fund = toJSONText(out.uses_of_fund, "[]");
  }
  if (out.attachments !== undefined) {
    // typically attachments are managed via dedicated endpoints, but keep symmetry
    out.attachments = toJSONText(out.attachments, "[]");
  }
  // server sets date_filed in model hook; ignore if accidentally present
  delete out.date_filed;
  return out;
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(
      "/liquidation-funds",
      serializePayload(data)
    );
    return res;
  },

  async getById(id) {
    const { data: res } = await axiosInstance.get(`/liquidation-funds/${id}`);
    return res;
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(
      `/liquidation-funds/${id}`,
      serializePayload(data)
    );
    return res;
  },

  async delete(id) {
    const { data: res } = await axiosInstance.delete(
      `/liquidation-funds/${id}`
    );
    return res;
  },

  async list(queryParams = {}) {
    // Backend accepts these directly (no nested filters object)
    const {
      page,
      limit,
      sort,
      order,
      q,
      status,
      activity_design_id,
      filed_by_user_id,
      date_filed_from,
      date_filed_to,
      ...rest
    } = queryParams;

    const params = onlyDefined({
      page,
      limit,
      sort,
      order,
      q,
      status,
      activity_design_id,
      filed_by_user_id,
      date_filed_from,
      date_filed_to,
      ...rest,
    });

    const { data: res } = await axiosInstance.get(`/liquidation-funds`, {
      params,
    });
    return res;
  },

  async submit(id) {
    const { data: res } = await axiosInstance.post(
      `/liquidation-funds/${id}/submit`
    );
    return res;
  },

  async approve(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/liquidation-funds/${id}/approve`,
      { remarks }
    );
    return res;
  },

  async reject(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/liquidation-funds/${id}/reject`,
      { remarks }
    );
    return res;
  },

  async cancel(id, { remarks } = {}) {
    const { data: res } = await axiosInstance.post(
      `/liquidation-funds/${id}/cancel`,
      { remarks }
    );
    return res;
  },

  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data: res } = await axiosInstance.post(
        `/liquidation-funds/${id}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      return res;
    } else {
      // base64 dataURL or { name, data, type }
      const { data: res } = await axiosInstance.post(
        `/liquidation-funds/${id}/attachments`,
        isBlobLike(fileOrData) ? {} : { file: fileOrData }
      );
      return res;
    }
  },

  async deleteAttachment(id, attachmentId) {
    const { data: res } = await axiosInstance.delete(
      `/liquidation-funds/${id}/attachments/${attachmentId}`
    );
    return res;
  },

  async sendEmail(id, { from_email, from_name, to, subject, html, text, attachments }) {
    const payload = { from_email, from_name, to, subject, html, text, attachments };
    const { data: res } = await axiosInstance.post(
      `/liquidation-funds/${id}/email`,
      payload
    );
    return res;
  },
};
