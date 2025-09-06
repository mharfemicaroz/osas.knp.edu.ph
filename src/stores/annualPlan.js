// src/stores/annualPlan.js
import { defineStore } from "pinia";
import { ref } from "vue";
import annualPlanService from "../services/plan/annualPlanService";

export const useAnnualPlanStore = defineStore("annualPlan", () => {
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
      const res = await annualPlanService.list(queryParams);
      Object.assign(items.value, {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: res.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch annual plans";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await annualPlanService.getById(id);
      selected.value = res;
      upsertInList(res);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch annual plan";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await annualPlanService.create(data);
      items.value.data.push(res);
      items.value.total += 1;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to create annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => annualPlanService.updateById(id, data));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await withAction(id, () => annualPlanService.delete(id));
      items.value.data = items.value.data.filter((r) => r.id !== id);
      items.value.total = Math.max(0, items.value.total - 1);
      if (selected.value?.id === id) selected.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete annual plan";
    } finally {
      isLoading.value = false;
    }
  };

  const submit = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => annualPlanService.submit(id));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to submit annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const approve = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => annualPlanService.approve(id, { remarks }));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to approve annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const reject = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => annualPlanService.reject(id, { remarks }));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to reject annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const cancel = async (id, remarks) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => annualPlanService.cancel(id, { remarks }));
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to cancel annual plan";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAttachment = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await annualPlanService.uploadAttachment(id, fileOrData);
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
      const res = await annualPlanService.deleteAttachment(id, attachmentId);
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
    resetStore,
  };
});
