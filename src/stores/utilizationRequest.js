// src/stores/utilizationRequest.js
import { defineStore } from "pinia";
import { ref } from "vue";
import utilizationRequestService from "../services/activity/utilizationRequestService";

export const useUtilizationRequestStore = defineStore(
  "utilizationRequest",
  () => {
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
    const availabilityProbe = ref(null);

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
        const res = await utilizationRequestService.list(queryParams);
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
          "Failed to fetch utilization requests";
      } finally {
        isLoading.value = false;
      }
    };

    const fetchById = async (id) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.getById(id);
        selected.value = res;
        upsertInList(res);
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to fetch utilization request";
      } finally {
        isLoading.value = false;
      }
    };

    const create = async (data) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.create(data);
        items.value.data.push(res);
        items.value.total += 1;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to create utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const updateById = async (id, data) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.updateById(id, data);
        upsertInList(res);
        if (selected.value?.id === id) selected.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to update utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const deleteById = async (id) => {
      error.value = null;
      try {
        isLoading.value = true;
        await utilizationRequestService.delete(id);
        items.value.data = items.value.data.filter((r) => r.id !== id);
        items.value.total = Math.max(0, items.value.total - 1);
        if (selected.value?.id === id) selected.value = null;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to delete utilization request";
      } finally {
        isLoading.value = false;
      }
    };

    const submit = async (id) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.submit(id);
        upsertInList(res);
        if (selected.value?.id === id) selected.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to submit utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const approve = async (id, remarks) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.approve(id, { remarks });
        upsertInList(res);
        if (selected.value?.id === id) selected.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to approve utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const reject = async (id, remarks) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.reject(id, { remarks });
        upsertInList(res);
        if (selected.value?.id === id) selected.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to reject utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const cancel = async (id, remarks) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.cancel(id, { remarks });
        upsertInList(res);
        if (selected.value?.id === id) selected.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to cancel utilization request";
        throw err;
      } finally {
        isLoading.value = false;
      }
    };

    const uploadAttachment = async (id, fileOrData) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.uploadAttachment(
          id,
          fileOrData
        );
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
        const res = await utilizationRequestService.deleteAttachment(
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

    const checkAvailability = async (payload) => {
      error.value = null;
      try {
        isLoading.value = true;
        const res = await utilizationRequestService.availability(payload);
        availabilityProbe.value = res;
        return res;
      } catch (err) {
        error.value =
          err?.response?.data?.message ||
          err?.response?.message ||
          err?.message ||
          "Failed to check availability";
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
      availabilityProbe.value = null;
      isLoaded.value = false;
      isLoading.value = false;
      error.value = null;
    };

    return {
      items,
      selected,
      availabilityProbe,
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
      checkAvailability,
      resetStore,
    };
  }
);
