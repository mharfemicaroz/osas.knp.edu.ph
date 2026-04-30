import { defineStore } from "pinia";
import { ref } from "vue";
import disciplineCaseService from "@/services/discipline/disciplineCaseService";

export const useDisciplineCaseStore = defineStore("disciplineCase", () => {
  const items = ref({ total: 0, totalPages: 1, currentPage: 1, pageSize: 10, data: [] });
  const dashboard = ref({ totals: {}, category_breakdown: [], active_cases: [] });
  const selected = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const acting = ref(new Set());

  const isActing = (key) => acting.value.has(key);
  const withAction = async (key, fn) => {
    if (key) acting.value.add(key);
    try { return await fn(); } finally { if (key) acting.value.delete(key); }
  };

  const upsertInList = (row) => {
    if (!row?.id) return;
    const idx = items.value.data.findIndex((item) => item.id === row.id);
    if (idx === -1) items.value.data.unshift(row);
    else items.value.data[idx] = row;
  };

  async function fetchDashboard(force = true) {
    if (!force && dashboard.value?.active_cases?.length) return;
    error.value = null;
    try {
      isLoading.value = true;
      dashboard.value = await disciplineCaseService.dashboard();
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch discipline dashboard";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchAll(queryParams = {}, force = false) {
    if (!force && isLoaded.value) return;
    error.value = null;
    try {
      isLoading.value = true;
      const res = await disciplineCaseService.list(queryParams);
      items.value = {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: res.currentPage || 1,
        pageSize: res.pageSize || 10,
        data: res.data || [],
      };
      isLoaded.value = true;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch discipline cases";
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchById(id) {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await disciplineCaseService.getById(id);
      selected.value = res;
      upsertInList(res);
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch discipline case";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function create(payload) {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await disciplineCaseService.create(payload);
      selected.value = res;
      upsertInList(res);
      items.value.total += 1;
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to create discipline case";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateById(id, payload) {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(`case:${id}`, () => disciplineCaseService.updateById(id, payload));
      selected.value = res;
      upsertInList(res);
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to update discipline case";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteById(id) {
    error.value = null;
    try {
      isLoading.value = true;
      await withAction(`delete:${id}`, () => disciplineCaseService.deleteById(id));
      items.value.data = items.value.data.filter((item) => item.id !== id);
      items.value.total = Math.max((items.value.total || 1) - 1, 0);
      if (selected.value?.id === id) selected.value = null;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to delete discipline case";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadAttachment(id, payload) {
    const res = await withAction(`attachment-upload:${id}`, () => disciplineCaseService.uploadAttachment(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function deleteAttachment(id, attachmentId) {
    const res = await withAction(`attachment-delete:${id}:${attachmentId}`, () =>
      disciplineCaseService.deleteAttachment(id, attachmentId)
    );
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function createInvestigationNote(id, payload) {
    const res = await withAction(`note:${id}`, () => disciplineCaseService.createInvestigationNote(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function createFinding(id, payload) {
    const res = await withAction(`finding:${id}`, () => disciplineCaseService.createFinding(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function createSanction(id, payload) {
    const res = await withAction(`sanction:${id}`, () => disciplineCaseService.createSanction(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function createAppeal(id, payload) {
    const res = await withAction(`appeal:${id}`, () => disciplineCaseService.createAppeal(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  async function createRecord(id, payload) {
    const res = await withAction(`record:${id}`, () => disciplineCaseService.createRecord(id, payload));
    selected.value = res;
    upsertInList(res);
    return res;
  }

  return {
    items,
    dashboard,
    selected,
    isLoading,
    error,
    isLoaded,
    isActing,
    fetchDashboard,
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    uploadAttachment,
    deleteAttachment,
    createInvestigationNote,
    createFinding,
    createSanction,
    createAppeal,
    createRecord,
  };
});
