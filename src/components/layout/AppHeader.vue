<!-- src/components/layout/AppHeader.vue -->
<template>
    <div class="flex justify-between items-center px-4 sm:px-6 py-3 bg-primary text-white">
        <div class="flex items-center gap-3">
            <button class="md:hidden focus:outline-none" @click="$emit('toggle')">
                <i class="mdi mdi-menu text-white text-2xl"></i>
            </button>
            <div class="logo-box flex items-center">
                <a href="javascript:void(0)" class="flex items-center">
                    <img src="/images/logo-banner.png" alt="Logo" class="hidden md:block" width="158" height="45" />
                    <img src="/images/logo-sm.png" alt="Logo" class="block md:hidden" width="36" height="36" />
                </a>
            </div>
        </div>

        <nav class="flex items-center gap-3">
            <div class="hidden sm:flex items-center gap-3 pr-3 mr-3 border-r border-white/30">
                <div class="h-8 w-8 rounded-full overflow-hidden bg-white grid place-items-center">
                    <img v-if="avatarSrc" :src="avatarSrc" alt="Avatar" class="h-full w-full object-cover" />
                    <div v-else class="h-full w-full grid place-items-center text-primary-text text-xs font-semibold">
                        {{ initials(fullname) }}
                    </div>
                </div>
                <span class="font-medium truncate max-w-[12rem]">{{ fullname }}</span>
            </div>
            <a href="#" @click.prevent.stop="$emit('request-logout')"
                class="flex items-center text-yellow-300 hover:underline">
                <i class="mdi mdi-logout mr-1 text-2xl"></i>
                <span class="hidden md:inline text-sm">Log out</span>
            </a>
        </nav>
    </div>
</template>

<script setup>
import { computed } from 'vue'
defineOptions({ name: "AppHeader" });

const props = defineProps({
    fullname: { type: String, default: "" },
    avatar: { type: String, default: "" },
});

defineEmits(["toggle", "request-logout"]);

const avatarSrc = computed(() => props.avatar || "");
function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
</script>
