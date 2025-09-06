// src/stores/notification.js
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import notificationService from "@/services/notification/notificationService";

export const useNotificationStore = defineStore("notification", () => {
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

  const unreadTotal = ref(0);
  const unreadCount = computed(() => unreadTotal.value);

  const fetchAll = async (params = {}, force = false) => {
    error.value = null;
    if (!force && isLoaded.value) return;
    try {
      isLoading.value = true;
      const res = await notificationService.list(params);
      Object.assign(items.value, {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: params.page || 1,
        pageSize: params.limit || 10,
        data: res.data || [],
      });
      isLoaded.value = true;
      // If we filtered by unread here, reflect total
      if (params && params.is_read === false)
        unreadTotal.value = Number(res.total || 0);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch notifications";
    } finally {
      isLoading.value = false;
    }
  };

  let _refreshing = false;
  let _lastRefreshAt = 0;
  const refreshUnread = async () => {
    const now = Date.now();
    if (_refreshing) return unreadTotal.value;
    // throttle to avoid hammering auth refresh flows
    if (now - _lastRefreshAt < 5000) return unreadTotal.value;
    _refreshing = true;
    try {
      // Primary: ask server for counts via stats endpoint
      const stats = await notificationService.stats({});
      let unread = Number(stats?.unread || 0);
      if (!Number.isFinite(unread) || unread < 0) {
        // Fallback: compute via totals
        const [readRes, allRes] = await Promise.all([
          notificationService.list({
            is_read: true,
            page: 1,
            limit: 1,
            order: "DESC",
            sort: "created_at",
          }),
          notificationService.list({
            page: 1,
            limit: 1,
            order: "DESC",
            sort: "created_at",
          }),
        ]);
        const readTotal = Number(readRes.total || 0);
        const allTotal = Number(allRes.total || 0);
        unread = Math.max(0, allTotal - readTotal);
      }
      unreadTotal.value = unread;
      _lastRefreshAt = Date.now();
      return unreadTotal.value;
    } catch {
      // Fallback attempt
      try {
        const [readRes, allRes] = await Promise.all([
          notificationService.list({
            is_read: true,
            page: 1,
            limit: 1,
            order: "DESC",
            sort: "created_at",
          }),
          notificationService.list({
            page: 1,
            limit: 1,
            order: "DESC",
            sort: "created_at",
          }),
        ]);
        const readTotal = Number(readRes.total || 0);
        const allTotal = Number(allRes.total || 0);
        unreadTotal.value = Math.max(0, allTotal - readTotal);
        _lastRefreshAt = Date.now();
      } catch {
        /* keep previous value */
      }
      return unreadTotal.value;
    } finally {
      _refreshing = false;
    }
  };

  const markRead = async (id) => {
    await notificationService.markRead(id);
    const i = items.value.data.findIndex((n) => n.id === id);
    if (i !== -1 && !items.value.data[i].is_read) {
      items.value.data[i].is_read = true;
      unreadTotal.value = Math.max(0, (unreadTotal.value || 0) - 1);
    } else {
      // fallback
      await refreshUnread();
    }
  };

  const markUnread = async (id) => {
    await notificationService.markUnread(id);
    const i = items.value.data.findIndex((n) => n.id === id);
    if (i !== -1 && items.value.data[i].is_read) {
      items.value.data[i].is_read = false;
      unreadTotal.value = (unreadTotal.value || 0) + 1;
    } else {
      await refreshUnread();
    }
  };

  const deleteById = async (id) => {
    await notificationService.delete(id);
    items.value.data = items.value.data.filter((n) => n.id !== id);
    items.value.total = Math.max(0, (items.value.total || 0) - 1);
  };

  const markAllRead = async () => {
    const toMark = (items.value.data || [])
      .filter((n) => !n.is_read)
      .map((n) => n.id);
    for (const id of toMark) {
      try {
        await markRead(id);
      } catch {}
    }
  };

  return {
    items,
    isLoading,
    isLoaded,
    error,
    unreadCount,
    unreadTotal,
    fetchAll,
    refreshUnread,
    markRead,
    markUnread,
    markAllRead,
    deleteById,
  };
});
