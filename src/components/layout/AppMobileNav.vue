<template>
    <nav v-if="show" class="bg-secondary text-white md:hidden overflow-x-auto">
        <!-- General section -->
        <div class="px-2 pt-2">
            <div class="text-[11px] uppercase tracking-wide text-gray-300 px-1 mb-1">General</div>
            <ul class="flex space-x-4 p-2 pt-1 whitespace-nowrap">
                <li v-for="(item, index) in generalMenu" :key="index">
                    <router-link :to="item.to" active-class="bg-tertiary"
                        class="flex items-center p-2 hover:bg-tertiary rounded">
                        <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
                        <span class="text-sm">{{ item.label }}</span>
                    </router-link>
                </li>
            </ul>
        </div>

        <!-- Admin section -->
        <div v-if="adminMenu.length" class="px-2 pb-2 border-t border-white/10">
            <div class="text-[11px] uppercase tracking-wide text-indigo-300 px-1 mt-1 mb-1">Admin</div>
            <ul class="flex space-x-4 p-2 pt-1 whitespace-nowrap">
                <li v-for="(item, index) in adminMenu" :key="index">
                    <router-link :to="item.to" active-class="bg-tertiary"
                        class="flex items-center p-2 hover:bg-tertiary rounded">
                        <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
                        <span class="text-sm">{{ item.label }}</span>
                    </router-link>
                </li>
            </ul>
        </div>
    </nav>
    
</template>

<script setup>
import { buildMenu } from "@/menu/menuAside";
import BaseIcon from "@/components/commons/BaseIcon.vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import { computed } from "vue";

defineOptions({ name: "AppMobileNav" });

defineProps({
    show: { type: Boolean, default: false },
});

const auth = useAuthStore();
const userStore = useUserStore();
const baseRole = computed(() => String(auth.user?.role || "").toLowerCase() || "admin");

// Elevate role for student officers
const myUserId = computed(() => auth.user?.id)
const myClubs = computed(() => {
    const key = String(myUserId.value ?? '')
    return userStore.clubsByUser?.[key] || []
})
const officerTitles = new Set(["president", "vice-president", "vice president", "secretary"]) 
const isOfficer = computed(() => Array.isArray(myClubs.value) && myClubs.value.some(c => officerTitles.has(String(c?.membership?.role || '').toLowerCase())))
const effectiveRole = computed(() => (baseRole.value === 'student' && isOfficer.value) ? 'student_officer' : baseRole.value)

const allMenu = computed(() => buildMenu(effectiveRole.value));

const isAdminOnly = (item) => {
    const roles = Array.isArray(item?.roles) ? item.roles.map(r => String(r).toLowerCase()) : [];
    if (!roles.length) return false;
    const allowed = new Set(["admin", "manager"]);
    return roles.every(r => allowed.has(r));
};

const adminMenu = computed(() => allMenu.value.filter(isAdminOnly));
const generalMenu = computed(() => allMenu.value.filter(i => !isAdminOnly(i)));
</script>
