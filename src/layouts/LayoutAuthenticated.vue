<!-- src/layouts/LayoutAuthenticated.vue -->
<template>
    <div id="wrapper" class="min-h-screen flex flex-col m-0 p-0 bg-gradient-to-b from-gray-50 to-white">
        <div v-if="loading" class="fixed inset-0 bg-white/80 flex justify-center items-center z-50">
            <div class="border-8 border-gray-200 border-t-accent rounded-full w-24 h-24 animate-spin"></div>
        </div>

        <header class="sticky top-0 z-20">
            <AppHeader :fullname="fullName" :avatar="avatarSrc" @toggle="toggleSidebar"
                @request-logout="handleLogout" />
            <AppMobileNav :show="showSidebar" />
        </header>

        <div class="flex flex-1">
            <AppSidebar @request-logout="handleLogout" />
            <main class="flex-1 m-0 p-0">
                <!-- full bleed, no max width, no padding -->
                <div class="w-full h-full m-0 p-0">
                    <slot />
                </div>
            </main>
        </div>

        <AppFooter />
        <ToasterComponent ref="toast" />
    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";

import AppHeader from "@/components/layout/AppHeader.vue";
import AppMobileNav from "@/components/layout/AppMobileNav.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import ToasterComponent from "@/components/ToasterComponent.vue";

const authStore = useAuthStore();
const userStore = useUserStore();

const loading = ref(false);
const showSidebar = ref(true);
const toast = ref(null);

const fullName = computed(() => {
    const fn = authStore.user?.first_name ?? "";
    const ln = authStore.user?.last_name ?? "";
    return [fn, ln].filter(Boolean).join(" ");
});

function normalizeAvatar(user) {
    const a = user?.avatar;
    if (!a) return "";
    if (typeof a === "string") return a;
    if (typeof a === "object" && a) return a.image || a.url || "";
    return "";
}

const avatarSrc = computed(() => {
    return normalizeAvatar(authStore.user) || normalizeAvatar(userStore.selectedUser) || "";
});

const doLogout = async () => {
    try {
        loading.value = true;
        await authStore.logout();
    } catch (e) {
        console.error("Logout failed:", e);
    } finally {
        loading.value = false;
    }
};

const handleLogout = () => doLogout();
const toggleSidebar = () => { showSidebar.value = !showSidebar.value; };

onMounted(() => {
    window.toastRef = toast.value;
    const uid = authStore.user?.id;
    if (uid && !normalizeAvatar(authStore.user)) {
        userStore.fetchById(uid).catch(() => null);
    }
});
</script>
