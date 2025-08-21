<!-- src/layouts/LayoutAuthenticated.vue -->
<template>
    <div id="wrapper" class="min-h-screen flex flex-col">
        <div v-if="loading" class="fixed inset-0 bg-white/80 flex justify-center items-center z-50">
            <div class="border-8 border-gray-200 border-t-accent rounded-full w-24 h-24 animate-spin"></div>
        </div>

        <header class="sticky top-0 z-10">
            <AppHeader :fullname="fullName" @toggle="toggleSidebar" @request-logout="handleLogout" />
            <AppMobileNav :show="showSidebar" />
        </header>

        <div class="flex flex-1">
            <AppSidebar @request-logout="handleLogout" />
            <main class="flex-1 p-6 bg-white">
                <div class="mb-6">
                    <h1 class="text-2xl font-bold text-primary-text">{{ route.name }}</h1>
                </div>
                <div class="bg-white shadow rounded p-4">
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
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";

import AppHeader from "@/components/layout/AppHeader.vue";
import AppMobileNav from "@/components/layout/AppMobileNav.vue";
import AppSidebar from "@/components/layout/AppSidebar.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import ToasterComponent from "@/components/ToasterComponent.vue";

const authStore = useAuthStore();
const route = useRoute();

const loading = ref(false);
const showSidebar = ref(true);
const toast = ref(null);

const fullName = computed(() => {
    const fn = authStore.user?.first_name ?? "";
    const ln = authStore.user?.last_name ?? "";
    return [fn, ln].filter(Boolean).join(" ");
});

const doLogout = async () => {
    try {
        loading.value = true;
        await authStore.logout();
        // optional: handle router navigation here if not done in store
        // router.replace("/");
    } catch (e) {
        console.error("Logout failed:", e);
    } finally {
        loading.value = false;
    }
};

const handleLogout = () => {
    return doLogout();
};

const toggleSidebar = () => {
    showSidebar.value = !showSidebar.value;
};

onMounted(() => {
    window.toastRef = toast.value;
});
</script>
