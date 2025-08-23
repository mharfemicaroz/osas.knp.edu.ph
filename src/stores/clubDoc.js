// src/stores/clubDoc.js
import { defineStore } from "pinia";
import { ref } from "vue";
import clubDocService from "../services/club/clubDocService";

export const useClubDocStore = defineStore("clubDoc", () => {
  const docs = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selectedDoc = ref(null);

  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const res = await clubDocService.list(queryParams);
      Object.assign(docs.value, {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: res.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value = err?.response?.data?.message || "Failed to fetch club docs";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchByClub = async (clubId, queryParams = {}) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubDocService.listByClub(clubId, queryParams);
      Object.assign(docs.value, {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: res.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message || "Failed to fetch club docs by club";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubDocService.getById(id);
      selectedDoc.value = res;
    } catch (err) {
      error.value = err?.response?.data?.message || "Failed to fetch club doc";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubDocService.create(data);
      const idx = docs.value.data.findIndex((d) => d.id === res?.id);
      if (idx !== -1) {
        docs.value.data.splice(idx, 1, res);
      } else {
        docs.value.data = [res, ...docs.value.data];
        docs.value.total += 1;
      }
      selectedDoc.value = res;
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || "Failed to create club doc";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubDocService.updateById(id, data);
      const idx = docs.value.data.findIndex((d) => d.id === id);
      if (idx !== -1) docs.value.data.splice(idx, 1, res);
      if (selectedDoc.value?.id === id) selectedDoc.value = res;
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || "Failed to update club doc";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await clubDocService.delete(id);
      docs.value.data = docs.value.data.filter((d) => d.id !== id);
      docs.value.total = Math.max(0, docs.value.total - 1);
      if (selectedDoc.value?.id === id) selectedDoc.value = null;
    } catch (err) {
      error.value = err?.response?.data?.message || "Failed to delete club doc";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    docs.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selectedDoc.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  return {
    docs,
    selectedDoc,
    isLoading,
    error,
    isLoaded,
    fetchAll,
    fetchByClub,
    fetchById,
    create,
    updateById,
    deleteById,
    resetStore,
  };
});
