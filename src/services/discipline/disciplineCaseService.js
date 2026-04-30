import axiosInstance from "../../plugins/axiosConfig";

function buildListParams(queryParams = {}) {
  const { page, limit, sort, order, q, category, current_step, status, priority, assigned_to_user_id, created_by_user_id } = queryParams;
  const params = { page, limit, sort, order, q, category, current_step, status, priority, assigned_to_user_id, created_by_user_id };
  Object.keys(params).forEach((key) => params[key] === undefined && delete params[key]);
  return params;
}

function isBlobLike(v) {
  return typeof Blob !== "undefined" && (v instanceof Blob || v instanceof File);
}

export default {
  async dashboard() {
    const { data } = await axiosInstance.get("/discipline-cases/dashboard");
    return data;
  },
  async list(queryParams = {}) {
    const { data } = await axiosInstance.get("/discipline-cases", { params: buildListParams(queryParams) });
    return data;
  },
  async create(payload) {
    const { data } = await axiosInstance.post("/discipline-cases", payload);
    return data;
  },
  async getById(id) {
    const { data } = await axiosInstance.get(`/discipline-cases/${id}`);
    return data;
  },
  async updateById(id, payload) {
    const { data } = await axiosInstance.patch(`/discipline-cases/${id}`, payload);
    return data;
  },
  async deleteById(id) {
    const { data } = await axiosInstance.delete(`/discipline-cases/${id}`);
    return data;
  },
  async uploadAttachment(id, fileOrData) {
    if (isBlobLike(fileOrData)) {
      const fd = new FormData();
      fd.append("file", fileOrData);
      const { data } = await axiosInstance.post(`/discipline-cases/${id}/attachments`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data;
    }
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/attachments`, { file: fileOrData });
    return data;
  },
  async deleteAttachment(id, attachmentId) {
    const { data } = await axiosInstance.delete(`/discipline-cases/${id}/attachments/${attachmentId}`);
    return data;
  },
  async createInvestigationNote(id, payload) {
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/investigation-notes`, payload);
    return data;
  },
  async createFinding(id, payload) {
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/findings`, payload);
    return data;
  },
  async createSanction(id, payload) {
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/sanctions`, payload);
    return data;
  },
  async createAppeal(id, payload) {
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/appeals`, payload);
    return data;
  },
  async createRecord(id, payload) {
    const { data } = await axiosInstance.post(`/discipline-cases/${id}/records`, payload);
    return data;
  },
};
