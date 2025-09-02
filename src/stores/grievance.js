// src/stores/grievance.js
import { defineStore } from "pinia";
import { ref } from "vue";
import grievanceService from "../services/grievance/grievanceService";

export const useGrievanceStore = defineStore("grievance", () => {
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
      const res = await grievanceService.list(queryParams);
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
        "Failed to fetch grievances";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await grievanceService.getById(id);
      selected.value = res;
      upsertInList(res);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch grievance";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await grievanceService.create(data);
      items.value.data.unshift(res);
      items.value.total += 1;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to create grievance";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await grievanceService.updateById(id, data);
      upsertInList(res);
      if (selected.value?.id === id) selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update grievance";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await grievanceService.delete(id);
      items.value.data = items.value.data.filter((r) => r.id !== id);
      items.value.total = Math.max(0, items.value.total - 1);
      if (selected.value?.id === id) selected.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete grievance";
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAttachment = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await grievanceService.uploadAttachment(id, fileOrData);
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
      const res = await grievanceService.deleteAttachment(id, attachmentId);
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
    isLoading,
    error,
    isLoaded,
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    uploadAttachment,
    deleteAttachment,
    resetStore,
  };
});

