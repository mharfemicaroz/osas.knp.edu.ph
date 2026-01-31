// src/stores/post.js
import { defineStore } from "pinia";
import { ref } from "vue";
import postService from "../services/post/postService";

const normalizeMetadata = (meta) => {
  let base = {};
  if (typeof meta === "string") {
    try {
      base = JSON.parse(meta);
    } catch {
      base = {};
    }
  } else if (meta && typeof meta === "object" && !Array.isArray(meta)) {
    base = meta;
  }
  const reactionUsers = Array.isArray(base.reaction_users)
    ? base.reaction_users
    : [];
  const reactions = {
    like: 0,
    love: 0,
    happy: 0,
    sad: 0,
    wow: 0,
    angry: 0,
    ...(base.reactions || {}),
  };
  if (reactionUsers.length) {
    Object.keys(reactions).forEach((k) => (reactions[k] = 0));
    reactionUsers.forEach((u) => {
      if (u?.type && reactions[u.type] != null) reactions[u.type] += 1;
    });
  }
  const comments = Array.isArray(base.comments) ? base.comments : [];
  const shares = Number.isFinite(base.shares) ? Number(base.shares) : 0;
  const media = Array.isArray(base.media) ? base.media : [];
  return { ...base, reactions, reaction_users: reactionUsers, comments, shares, media };
};

const normalizePost = (post) => {
  if (!post) return post;
  return { ...post, metadata: normalizeMetadata(post.metadata) };
};

export const usePostStore = defineStore("post", () => {
  const items = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
    hasMore: null,
    cursor: null,
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selected = ref(null);
  const actioning = ref(new Set());
  const isActing = (id) => actioning.value.has(id);
  const withAction = async (id, fn) => {
    if (id != null) actioning.value.add(id);
    try {
      return await fn();
    } finally {
      if (id != null) actioning.value.delete(id);
    }
  };

  const upsertInList = (obj) => {
    if (!obj?.id) return;
    const i = items.value.data.findIndex((r) => r.id === obj.id);
    if (i !== -1) items.value.data[i] = obj;
  };

  const insertInList = (obj, { prepend = true } = {}) => {
    if (!obj?.id) return;
    const i = items.value.data.findIndex((r) => r.id === obj.id);
    if (i !== -1) {
      items.value.data[i] = obj;
      return;
    }
    if (prepend) {
      items.value.data.unshift(obj);
    } else {
      items.value.data.push(obj);
    }
  };

  const fetchAll = async (queryParams = {}, forceRefresh = false, append = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value && !append) return;
    try {
      isLoading.value = true;
      const res = await postService.list(queryParams);
      const nextRows = (res.data || res.rows || []).map(normalizePost);
      const hasCursorMeta =
        typeof res?.hasMore === "boolean" ||
        res?.nextCursor != null;
      const page = queryParams.page || 1;
      const limit = queryParams.limit || 10;
      const total = res.total || res.count || 0;
      const totalPages =
        res.totalPages || Math.max(1, Math.ceil(total / limit));

      if (append) {
        const existing = new Map(items.value.data.map((p) => [p.id, p]));
        nextRows.forEach((p) => existing.set(p.id, p));
        items.value.data = Array.from(existing.values());
      } else {
        items.value.data = nextRows;
      }

      if (hasCursorMeta) {
        items.value.hasMore = !!res.hasMore;
        items.value.cursor = res.nextCursor || null;
        Object.assign(items.value, {
          total: total || items.value.data.length,
          totalPages: 1,
          currentPage: page,
          pageSize: limit,
        });
      } else {
        Object.assign(items.value, {
          total,
          totalPages,
          currentPage: page,
          pageSize: limit,
        });
        items.value.hasMore = items.value.currentPage < items.value.totalPages;
        items.value.cursor = null;
      }
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch posts";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await postService.getById(id);
      const normalized = normalizePost(res);
      selected.value = normalized;
      upsertInList(normalized);
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch post";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await postService.create(data);
      const normalized = normalizePost(res);
      items.value.data.unshift(normalized);
      items.value.total += 1;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to create post";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await withAction(id, () => postService.updateById(id, data));
      const normalized = normalizePost(res);
      upsertInList(normalized);
      if (selected.value?.id === id) selected.value = normalized;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to update post";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await withAction(id, () => postService.delete(id));
      items.value.data = items.value.data.filter((r) => r.id !== id);
      items.value.total = Math.max(0, items.value.total - 1);
      if (selected.value?.id === id) selected.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete post";
    } finally {
      isLoading.value = false;
    }
  };

  const react = async (id, type) => {
    error.value = null;
    try {
      const res = await withAction(id, () => postService.react(id, type));
      const normalized = normalizePost(res);
      upsertInList(normalized);
      if (selected.value?.id === id) selected.value = normalized;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to react to post";
      throw err;
    }
  };

  const comment = async (id, text, options = {}) => {
    error.value = null;
    try {
      const parentId = options?.parentId || null;
      const payload = parentId ? { text, parent_id: parentId } : { text };
      if (options?.mentionName) payload.mention_name = options.mentionName;
      if (options?.mentionUserId) payload.mention_user_id = options.mentionUserId;
      const res = await withAction(id, () =>
        postService.comment(id, payload)
      );
      const normalized = normalizePost(res);
      upsertInList(normalized);
      if (selected.value?.id === id) selected.value = normalized;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to comment";
      throw err;
    }
  };

  const deleteComment = async (id, commentId) => {
    error.value = null;
    try {
      const res = await withAction(id, () =>
        postService.deleteComment(id, commentId)
      );
      const normalized = normalizePost(res);
      upsertInList(normalized);
      if (selected.value?.id === id) selected.value = normalized;
      return normalized;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to delete comment";
      throw err;
    }
  };

  const share = async (id, text = "", options = {}) => {
    error.value = null;
    try {
      const res = await withAction(id, () => postService.share(id, { text }));
      const hasShared = !!res?.shared;
      const shared = hasShared ? normalizePost(res.shared) : null;
      const original = res?.original
        ? normalizePost(res.original)
        : (!hasShared ? normalizePost(res) : null);

      if (shared && options?.insert !== false) {
        insertInList(shared, { prepend: true });
        items.value.total += 1;
      }
      if (original) {
        upsertInList(original);
        if (selected.value?.id === original.id) selected.value = original;
      }
      return shared || original;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to share post";
      throw err;
    }
  };

  const resetStore = () => {
    items.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
      hasMore: null,
      cursor: null,
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
    react,
    comment,
    deleteComment,
    share,
    resetStore,
  };
});
