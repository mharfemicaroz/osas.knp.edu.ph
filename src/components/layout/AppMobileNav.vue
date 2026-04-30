<template>
    <nav v-if="show" class="bg-secondary text-white md:hidden overflow-x-auto">
        <div v-for="section in sections" :key="section.name" class="px-2" :class="section.name === sections[0]?.name ? 'pt-2' : 'pb-2 border-t border-white/10'">
            <div class="text-[11px] uppercase tracking-wide px-1 mb-1" :class="section.name === 'General' ? 'text-gray-300' : 'text-indigo-300'">{{ section.name }}</div>
            <ul class="flex space-x-4 p-2 pt-1 whitespace-nowrap">
                <li v-for="(item, index) in section.items" :key="index">
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
import { useServiceModuleStore } from "@/stores/serviceModule";

defineOptions({ name: "AppMobileNav" });

defineProps({
    show: { type: Boolean, default: false },
});

const auth = useAuthStore();
const userStore = useUserStore();
const serviceModuleStore = useServiceModuleStore();
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

const allMenu = computed(() => buildMenu(effectiveRole.value, serviceModuleStore.selectedKey));
const sections = computed(() => {
    const groups = new Map();
    for (const item of allMenu.value) {
        const key = item.section || "General";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(item);
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
});
</script>
