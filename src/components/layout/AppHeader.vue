<!-- src/components/layout/AppHeader.vue -->
<template>
    <div class="flex justify-between items-center bg-primary p-4">
        <div class="flex items-center space-x-4">
            <button class="md:hidden focus:outline-none" @click="$emit('toggle')">
                <i class="mdi mdi-menu text-white text-2xl"></i>
            </button>
            <div class="logo-box">
                <a href="javascript:void(0)" class="flex items-center">
                    <img src="/images/logo-banner.png" alt="Logo" class="hidden md:block" width="158" height="45" />
                    <img src="/images/logo-sm.png" alt="Logo" class="block md:hidden" width="45" height="45" />
                </a>
            </div>
        </div>

        <nav class="flex items-center space-x-4">
            <span class="text-yellow-300 font-semibold">{{ fullname }}</span>
            <a href="#" @click.prevent.stop="$emit('request-logout')"
                class="flex items-center text-yellow-300 hover:underline">
                <i class="mdi mdi-logout mr-1 text-3xl md:text-2xl"></i>
                <span class="hidden md:inline">Log Out</span>
            </a>
        </nav>
    </div>
</template>

<script setup>
defineOptions({ name: "AppHeader" });

defineProps({
    fullname: { type: String, default: "" },
});

defineEmits(["toggle", "request-logout"]);
</script>
