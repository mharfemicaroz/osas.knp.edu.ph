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

  // Track loading and error states
  const isLoading = ref(false);
  const error = ref(null);

  // Control to indicate we've fetched data once already
  const isLoaded = ref(false);

  // Keep selected user for detail view
  const selectedUser = ref(null);

  // --- ACTIONS ---

  /**
   * Fetch a list of users with pagination support
   */
  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    // Clear any old error
    error.value = null;

    // Skip API if data already loaded and not forcing refresh
    if (!forceRefresh && isLoaded.value) {
      return;
    }

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
      error.value = err?.response?.message || "Failed to fetch users";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Fetch a single user by ID
   */
  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.getById(id);
      selectedUser.value = response;
    } catch (err) {
      error.value = err?.response?.message || "Failed to fetch user";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Create a new user
   */
  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.create(data);
      users.value.data.push(response);
      users.value.total += 1;
    } catch (err) {
      error.value = err?.response?.message || "Failed to create user";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Update an existing user
   */
  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.updateById(id, data);
      const index = users.value.data.findIndex((u) => u.id === id);
      if (index !== -1) {
        users.value.data[index] = response;
      }
      // Update selectedUser if it's the same user being updated
      if (selectedUser.value?.id === id) {
        selectedUser.value = response;
      }
    } catch (err) {
      error.value = err?.response?.message || "Failed to update user";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Delete a user by ID
   */
  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await userService.delete(id);
      users.value.data = users.value.data.filter((u) => u.id !== id);
      users.value.total -= 1;
      // Clear selectedUser if it's the same user being deleted
      if (selectedUser.value?.id === id) {
        selectedUser.value = null;
      }
    } catch (err) {
      error.value = err?.response?.message || "Failed to delete user";
    } finally {
      isLoading.value = false;
    }
  };

  /**
   * Reset store if you ever need to (e.g. on logout)
   */
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

  // --- RETURN ---
  return {
    // State
    users,
    selectedUser,
    isLoading,
    error,
    isLoaded,

    // Actions
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    resetStore,
  };
});
