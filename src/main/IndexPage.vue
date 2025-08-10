<template>
    <div id="wrapper" class="min-h-screen flex flex-col">
        <!-- Spinner Overlay -->
        <div v-if="loading" class="fixed inset-0 bg-white bg-opacity-80 flex justify-center items-center z-50">
            <div class="border-8 border-gray-200 border-t-accent rounded-full w-24 h-24 animate-spin"></div>
        </div>

        <!-- Combined Sticky Header -->
        <header class="sticky top-0 z-10">
            <!-- Top Header -->
            <div class="flex justify-between items-center bg-primary p-4">
                <div class="flex items-center space-x-4">
                    <!-- Toggle for mobile nav -->
                    <button class="md:hidden focus:outline-none" @click="toggleSidebar">
                        <i class="mdi mdi-menu text-white text-2xl"></i>
                    </button>
                    <div class="logo-box">
                        <a href="javascript:void(0)" class="flex items-center">
                            <img src="/images/logo-banner.png" alt="Logo" class="hidden md:block" width="158"
                                height="45" />
                            <img src="/images/logo-sm.png" alt="Logo" class="block md:hidden" width="45" height="45" />
                        </a>
                    </div>
                </div>
                <nav class="flex items-center space-x-4">
                    <span class="text-yellow-300 font-semibold">{{ fullname }}</span>
                    <a href="#" @click="logout" class="flex items-center text-yellow-300 hover:underline">
                        <i class="mdi mdi-logout mr-1 text-3xl md:text-2xl"></i>
                        <span class="hidden md:inline">Log Out</span>
                    </a>
                </nav>
            </div>
            <!-- Mobile Top Navigation (visible only on small screens) -->
            <nav v-if="showSidebar" class="bg-secondary text-white md:hidden overflow-x-auto">
                <ul class="flex space-x-4 p-2 whitespace-nowrap">
                    <li>
                        <router-link to="/index/dashboard" active-class="bg-tertiary"
                            class="flex items-center p-2 hover:bg-tertiary rounded">
                            <i class="mdi mdi-account mr-2 text-yellow-300"></i>
                            <span class="text-sm">dashboard</span>
                        </router-link>
                    </li>
                </ul>
            </nav>
        </header>

        <div class="flex flex-1">
            <!-- Sidebar for Desktop (visible on medium and larger screens) -->
            <aside class="w-64 bg-secondary text-white p-4 hidden md:block">
                <nav>
                    <h2 class="text-lg font-bold mb-4 text-yellow-300">Navigation</h2>
                    <ul>
                        <li class="mb-2">
                            <router-link to="/index/dashboard" active-class="bg-tertiary"
                                class="flex items-center p-2 hover:bg-tertiary rounded">
                                <i class="mdi mdi-account mr-2 text-yellow-300"></i>
                                <span>Dashboard</span>
                            </router-link>
                        </li>
                        <li class="mb-2">
                            <a href="#" @click="logout" class="flex items-center p-2 hover:bg-tertiary rounded"
                                ref="logoutButton">
                                <i class="mdi mdi-logout mr-2 text-yellow-300"></i>
                                <span>Log Out</span>
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>

            <!-- Main Content -->
            <main class="flex-1 p-6 bg-white">
                <div class="mb-6">
                    <h1 class="text-2xl font-bold text-primary-text">
                        {{ $route.name }}
                    </h1>
                </div>
                <div class="bg-white shadow rounded p-4">
                    <router-view />
                </div>
            </main>
        </div>

        <!-- Footer -->
        <footer class="bg-primary p-4 text-center text-white">
            <p class="text-sm">
                2024 &copy; OSAS Kiosk by
                <a href="#" target="_blank" class="text-yellow-300 hover:underline">
                    Dr. Mharfe M. Micaroz
                </a>
            </p>
        </footer>

        <ToasterComponent ref="toast" />
    </div>
</template>

<script>
import { useAuthStore } from "@/stores/auth";
import ToasterComponent from "../components/ToasterComponent.vue";

export default {
    components: { ToasterComponent },
    data() {
        return {
            title: "",
            fullname: "",
            role: "",
            user: {},
            isChanged: false,
            // For mobile, the top navigation is toggled on by default.
            showSidebar: true,
            showSettingsModal: false,
            loading: false,
        };
    },
    methods: {
        async logout() {
            const authStore = useAuthStore();
            const token = authStore.user.token;
            try {
                this.loading = true;
                await authStore.logout(token).then(() => {
                    this.$router.push(`/`);
                });
            } catch (error) {
                console.error("Error:", error);
            } finally {
                this.loading = false;
            }
        },
        toggleSidebar() {
            this.showSidebar = !this.showSidebar;
        },
    },
    mounted() {
        const authStore = useAuthStore();
        this.title = document.title;
        this.user = authStore.user[0];
        this.fullname = authStore.user.first_name + " " + authStore.user.last_name;
        window.toastRef = this.$refs.toast;
    },
};
</script>

<style scoped>
/* Additional component-specific styles can be added here */
</style>
