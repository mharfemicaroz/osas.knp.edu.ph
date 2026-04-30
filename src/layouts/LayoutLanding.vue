<template>
  <div class="min-h-screen flex flex-col bg-slate-50">
    <div v-if="loading" class="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <div class="h-24 w-24 animate-spin rounded-full border-8 border-gray-200 border-t-accent"></div>
    </div>

    <header class="sticky top-0 z-20">
      <AppHeader
        :fullname="fullName"
        :avatar="avatarSrc"
        :show-menu-toggle="false"
        @request-logout="handleLogout"
      />
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <AppFooter />
    <ToasterComponent ref="toast" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

import AppHeader from "@/components/layout/AppHeader.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import ToasterComponent from "@/components/ToasterComponent.vue";

const authStore = useAuthStore();
const userStore = useUserStore();

const loading = ref(false);
const toast = ref(null);

const fullName = computed(() => {
  const fn = authStore.user?.first_name ?? "";
  const ln = authStore.user?.last_name ?? "";
  return [fn, ln].filter(Boolean).join(" ");
});

function normalizeAvatar(user) {
  const avatar = user?.avatar;
  if (!avatar) return "";
  if (typeof avatar === "string") return avatar;
  if (typeof avatar === "object" && avatar) return avatar.image || avatar.url || "";
  return "";
}

const avatarSrc = computed(() => {
  const authAvatar = normalizeAvatar(authStore.user);
  if (authAvatar) return authAvatar;
  const selectedUser = userStore.selectedUser;
  if (selectedUser && selectedUser.id === authStore.user?.id) return normalizeAvatar(selectedUser);
  return "";
});

async function handleLogout() {
  try {
    loading.value = true;
    await authStore.logout();
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  window.toastRef = toast.value;
  const uid = authStore.user?.id;
  if (uid && !normalizeAvatar(authStore.user)) {
    userStore.fetchById(uid).catch(() => null);
  }
});

watch(
  () => userStore.selectedUser,
  (user) => {
    const uid = authStore.user?.id;
    if (!user || !uid || user.id !== uid) return;

    const nextUser = { ...authStore.user };
    const avatar = normalizeAvatar(user);
    if (avatar) nextUser.avatar = avatar;

    const cover =
      typeof user?.cover === "string" ? user.cover : user?.cover?.image || user?.cover?.url || "";
    if (cover) nextUser.cover = cover;

    authStore.user = nextUser;
  }
);
</script>
