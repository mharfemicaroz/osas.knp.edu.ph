// src/stores/club.js
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
  const permissionByClub = ref({}); // { [clubId]: { can_edit, member_role } }

  /* ---------------- helpers ---------------- */
  const upsertInList = (clubObj) => {
    if (!clubObj?.id) return;
    const i = clubs.value.data.findIndex((c) => c.id === clubObj.id);
    if (i !== -1) clubs.value.data[i] = clubObj;
  };

  const patchMembershipLocally = (clubId, membership) => {
    // membership is the UserClub row returned by updateMember
    if (!membership) return;

    // patch selectedClub
    if (
      selectedClub.value?.id === clubId &&
      Array.isArray(selectedClub.value.users)
    ) {
      const uIdx = selectedClub.value.users.findIndex(
        (u) => u.id === membership.user_id
      );
      if (uIdx !== -1) {
        const user = selectedClub.value.users[uIdx];
        selectedClub.value.users[uIdx] = {
          ...user,
          UserClub: {
            ...(user.UserClub || {}),
            ...membership, // includes role/status/joined_at as changed
          },
        };
      }
    }

    // patch list item if present
    const cIdx = clubs.value.data.findIndex((c) => c.id === clubId);
    if (cIdx !== -1 && Array.isArray(clubs.value.data[cIdx].users)) {
      const usersArr = clubs.value.data[cIdx].users;
      const uIdx = usersArr.findIndex((u) => u.id === membership.user_id);
      if (uIdx !== -1) {
        const user = usersArr[uIdx];
        usersArr[uIdx] = {
          ...user,
          UserClub: {
            ...(user.UserClub || {}),
            ...membership,
          },
        };
      }
    }
  };

  /* ---------------- actions ---------------- */
  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const res = await clubService.list(queryParams);
      Object.assign(clubs.value, {
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
        "Failed to fetch clubs";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubService.getById(id);
      selectedClub.value = res;
      upsertInList(res);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch club";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubService.create(data);
      clubs.value.data.push(res);
      clubs.value.total += 1;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to create club";
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubService.updateById(id, data);
      upsertInList(res);
      if (selectedClub.value?.id === id) selectedClub.value = res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update club";
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
      clubs.value.total = Math.max(0, clubs.value.total - 1);
      if (selectedClub.value?.id === id) selectedClub.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete club";
    } finally {
      isLoading.value = false;
    }
  };

  const addUsersToClub = async (id, userIds) => {
    error.value = null;
    try {
      isLoading.value = true;
      // backend returns the full updated club (with users + through attrs)
      const res = await clubService.addUsers(id, userIds);
      upsertInList(res);
      if (selectedClub.value?.id === id) selectedClub.value = res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to add users to club";
    } finally {
      isLoading.value = false;
    }
  };

  const removeUserFromClub = async (id, userId) => {
    error.value = null;
    try {
      isLoading.value = true;
      await clubService.removeUser(id, userId);

      // patch selectedClub
      if (
        selectedClub.value?.id === id &&
        Array.isArray(selectedClub.value.users)
      ) {
        selectedClub.value.users = selectedClub.value.users.filter(
          (u) => u.id !== userId
        );
      }

      // patch list item
      const idx = clubs.value.data.findIndex((c) => c.id === id);
      if (idx !== -1 && Array.isArray(clubs.value.data[idx].users)) {
        clubs.value.data[idx].users = clubs.value.data[idx].users.filter(
          (u) => u.id !== userId
        );
      }
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to remove user from club";
    } finally {
      isLoading.value = false;
    }
  };

  async function updateMemberStatus(clubId, userId, status) {
    try {
      isLoading.value = true;
      const membership = await clubService.updateMember(clubId, userId, {
        status,
      });
      // membership is the through row; patch locally
      patchMembershipLocally(clubId, membership);
      return membership;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update member status";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateMemberRole(clubId, userId, role) {
    try {
      isLoading.value = true;
      const membership = await clubService.updateMember(clubId, userId, {
        role,
      });
      patchMembershipLocally(clubId, membership);
      return membership;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update member role";
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  const uploadAttachment = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await clubService.uploadAttachment(id, fileOrData);
      upsertInList(res);
      if (selectedClub.value?.id === id) selectedClub.value = res;
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
      const res = await clubService.deleteAttachment(id, attachmentId);
      upsertInList(res);
      if (selectedClub.value?.id === id) selectedClub.value = res;
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

  // Permission: can current user edit media for club (server-driven)
  const checkCanEditMedia = async (clubId, { force = false } = {}) => {
    if (!clubId) return { can_edit: false, member_role: null };
    const key = String(clubId)
    if (!force && permissionByClub.value[key]) return permissionByClub.value[key]
    try {
      const res = await clubService.canEditMedia(clubId)
      const val = { can_edit: !!res?.can_edit, member_role: res?.member_role || null }
      permissionByClub.value[key] = val
      return val
    } catch (err) {
      // don't throw; cache negative result
      permissionByClub.value[key] = { can_edit: false, member_role: null }
      return permissionByClub.value[key]
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
    permissionByClub,
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

    uploadAttachment,
    deleteAttachment,

    checkCanEditMedia,

    resetStore,
  };
});
