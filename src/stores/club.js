import { defineStore } from "pinia";
import { ref } from "vue";
import clubService from "../services/club/clubService";

export const useClubStore = defineStore("club", () => {
  const clubs = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selectedClub = ref(null);

  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const response = await clubService.list(queryParams);
      Object.assign(clubs.value, {
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: response.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value = err?.response?.message || "Failed to fetch clubs";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await clubService.getById(id);
      selectedClub.value = response;
    } catch (err) {
      error.value = err?.response?.message || "Failed to fetch club";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await clubService.create(data);
      clubs.value.data.push(response);
      clubs.value.total += 1;
    } catch (err) {
      error.value = err?.response?.message || "Failed to create club";
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await clubService.updateById(id, data);
      const index = clubs.value.data.findIndex((c) => c.id === id);
      if (index !== -1) clubs.value.data[index] = response;
      if (selectedClub.value?.id === id) selectedClub.value = response;
    } catch (err) {
      error.value = err?.response?.message || "Failed to update club";
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await clubService.delete(id);
      clubs.value.data = clubs.value.data.filter((c) => c.id !== id);
      clubs.value.total -= 1;
      if (selectedClub.value?.id === id) selectedClub.value = null;
    } catch (err) {
      error.value = err?.response?.message || "Failed to delete club";
    } finally {
      isLoading.value = false;
    }
  };

  const addUsersToClub = async (id, userIds) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await clubService.addUsers(id, userIds);
      const index = clubs.value.data.findIndex((c) => c.id === id);
      if (index !== -1) clubs.value.data[index] = response;
      if (selectedClub.value?.id === id) selectedClub.value = response;
    } catch (err) {
      error.value = err?.response?.message || "Failed to add users to club";
    } finally {
      isLoading.value = false;
    }
  };

  const removeUserFromClub = async (id, userId) => {
    error.value = null;
    try {
      isLoading.value = true;
      await clubService.removeUser(id, userId);
      if (
        selectedClub.value?.id === id &&
        Array.isArray(selectedClub.value.users)
      ) {
        selectedClub.value.users = selectedClub.value.users.filter(
          (u) => u.id !== userId
        );
      }
      const index = clubs.value.data.findIndex((c) => c.id === id);
      if (index !== -1 && Array.isArray(clubs.value.data[index].users)) {
        clubs.value.data[index].users = clubs.value.data[index].users.filter(
          (u) => u.id !== userId
        );
      }
    } catch (err) {
      error.value = err?.response?.message || "Failed to remove user from club";
    } finally {
      isLoading.value = false;
    }
  };

  async function updateMemberStatus(clubId, userId, status) {
    try {
      isLoading.value = true;
      const updatedClub = await clubService.updateMember(clubId, userId, {
        status,
      });
      selectedClub.value = updatedClub;
    } catch (err) {
      error.value =
        err?.response?.data?.message || "Failed to update member status";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateMemberRole(clubId, userId, role) {
    try {
      isLoading.value = true;
      const updatedClub = await clubService.updateMember(clubId, userId, {
        role,
      });
      selectedClub.value = updatedClub;
    } catch (err) {
      error.value =
        err?.response?.data?.message || "Failed to update member role";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  const resetStore = () => {
    clubs.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selectedClub.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  return {
    clubs,
    selectedClub,
    isLoading,
    error,
    isLoaded,
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    addUsersToClub,
    removeUserFromClub,
    updateMemberRole,
    updateMemberStatus,
    resetStore,
  };
});
