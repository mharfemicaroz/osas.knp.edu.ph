// src/stores/liquidationFund.js
import { defineStore } from "pinia";
import { ref } from "vue";
import liquidationFundService from "../services/activity/liquidationFundService";

export const useLiquidationFundStore = defineStore("liquidationFund", () => {
  const items = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selected = ref(null);
  const actioning = ref(new Set());
  const isActing = (id) => actioning.value.has(id);
  const withAction = async (id, fn) => {
    if (id != null) actioning.value.add(id);
    try { return await fn(); } finally { if (id != null) actioning.value.delete(id); }
  };

  const upsertInList = (obj) => {
    if (!obj?.id) return;
    const i = items.value.data.findIndex((r) => r.id === obj.id);
    if (i !== -1) items.value.data[i] = obj;
  };

  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.list(queryParams);
      Object.assign(items.value, {
        total: res.total || res.count || 0,
        totalPages:
          res.totalPages ||
          Math.max(1, Math.ceil((res.total || 0) / (queryParams.limit || 10))),
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: res.data || res.rows || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch liquidation funds";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.getById(id);
      selected.value = res;
      upsertInList(res);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch liquidation fund";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.create(data);
      items.value.data.unshift(res);
      items.value.total += 1;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to create liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => liquidationFundService.updateById(id, data));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await withAction(id, () => liquidationFundService.delete(id));
      items.value.data = items.value.data.filter((r) => r.id !== id);
      items.value.total = Math.max(0, items.value.total - 1);
      if (selected.value?.id === id) selected.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete liquidation fund";
    } finally {
      isLoading.value = false;
    }
  };

  const submit = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => liquidationFundService.submit(id));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to submit liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const approve = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => liquidationFundService.approve(id, { remarks }));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to approve liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const reject = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => liquidationFundService.reject(id, { remarks }));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to reject liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const cancel = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => liquidationFundService.cancel(id, { remarks }));
      const normalized = { ...(res || {}), status: 'draft' };
      upsertInList(normalized);
      if (selected.value?.id === id) selected.value = normalized;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to cancel liquidation fund";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAttachment = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.uploadAttachment(id, fileOrData);
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to upload attachment";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteAttachment = async (id, attachmentId) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.deleteAttachment(
        id,
        attachmentId
      );
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete attachment";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const sendEmail = async (id, payload) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await liquidationFundService.sendEmail(id, payload);
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to send email";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    items.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selected.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  return {
    items,
    selected,
    isActing,
    isLoading,
    error,
    isLoaded,
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    submit,
    approve,
    reject,
    cancel,
    uploadAttachment,
    deleteAttachment,
    sendEmail,
    resetStore,
  };
});
