import { defineStore } from "pinia";
import { ref } from "vue";
import userService from "../services/user/userService";

export const useUserStore = defineStore("user", () => {
  // --- STATE ---
  const users = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selectedUser = ref(null);

  // NEW: cache clubs per user and currently selected user's clubs
  const clubsByUser = ref({}); // { [userId]: Club[] }
  const selectedUserClubs = ref([]); // convenience for UI

  // --- INTERNAL HELPERS ---
  const upsertInList = (user) => {
    if (!user?.id) return;
    const idx = users.value.data.findIndex((u) => u.id === user.id);
    if (idx !== -1) users.value.data[idx] = user;
  };

  // --- ACTIONS ---
  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;

    try {
      isLoading.value = true;
      const response = await userService.list(queryParams);

      Object.assign(users.value, {
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: response.data || [],
      });

      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to fetch users";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.getById(id);
      selectedUser.value = response;
      upsertInList(response);
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to fetch user";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.create(data);
      users.value.data.push(response);
      users.value.total += 1;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to create user";
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.updateById(id, data);
      upsertInList(response);
      if (selectedUser.value?.id === id) selectedUser.value = response;
      return response;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to update user";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await userService.delete(id);
      users.value.data = users.value.data.filter((u) => u.id !== id);
      users.value.total = Math.max(0, (users.value.total || 1) - 1);
      if (selectedUser.value?.id === id) selectedUser.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to delete user";
    } finally {
      isLoading.value = false;
    }
  };

  // NEW: upload avatar
  const uploadAvatar = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const user = await userService.uploadAvatar(id, fileOrData);
      upsertInList(user);
      if (selectedUser.value?.id === id) selectedUser.value = user;
      return user;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload avatar";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // NEW: upload cover
  const uploadCover = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const user = await userService.uploadCover(id, fileOrData);
      upsertInList(user);
      if (selectedUser.value?.id === id) selectedUser.value = user;
      return user;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload cover";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // NEW: change password (no state changes)
  const changePassword = async ({ old_password, new_password }) => {
    error.value = null;
    try {
      isLoading.value = true;
      return await userService.changePassword({ old_password, new_password });
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    users.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selectedUser.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  const fetchUserClubs = async (userId, { force = false } = {}) => {
    error.value = null;
    try {
      const key = String(userId);

      // Serve cache unless forced
      if (!force && Array.isArray(clubsByUser.value[key])) {
        selectedUserClubs.value = clubsByUser.value[key]; // <-- ensure UI gets data
        return clubsByUser.value[key];
      }

      isLoading.value = true;
      const clubs = await userService.getClubs(userId);

      clubsByUser.value[key] = clubs;

      // Always reflect the latest fetched clubs in the UI
      selectedUserClubs.value = clubs;

      return clubs;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to fetch user's clubs";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  return {
    // state
    users,
    selectedUser,
    selectedUserClubs, // NEW
    clubsByUser, // NEW
    isLoading,
    error,
    isLoaded,

    // actions
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    uploadAvatar, // NEW
    uploadCover, // NEW
    changePassword, // NEW
    fetchUserClubs,
    resetStore,
  };
});
