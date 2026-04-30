<template>
    <aside class="w-64 bg-secondary text-white p-4 hidden md:block md:sticky md:top-16 md:self-start md:max-h-[calc(100vh-4rem)] md:overflow-y-auto">
        <nav>
            <h2 class="text-lg font-bold mb-4 text-yellow-300">{{ navTitle }}</h2>

            <div v-for="section in sections" :key="section.name" :class="section.name === sections[0]?.name ? '' : 'mt-4 pt-3 border-t border-white/10'">
                <h3 class="text-xs uppercase tracking-wide mb-2" :class="section.name === 'General' ? 'text-gray-300' : 'text-indigo-300'">
                    {{ section.name }}
                </h3>
                <NavbarMenuList :menu="section.items" />
            </div>

            <a href="#" @click.prevent.stop="$emit('request-logout')"
                class="flex items-center p-2 hover:bg-tertiary rounded mt-6">
                <BaseIcon :path="mdiLogout" :size="20" cls="mr-2 text-yellow-300" />
                <span>Log out</span>
            </a>
        </nav>
    </aside>
</template>

<script setup>
import { buildMenu } from "@/menu/menuAside";
import NavbarMenuList from "./NavbarMenuList.vue";
import BaseIcon from "@/components/commons/BaseIcon.vue";
import { mdiLogout } from "@mdi/js";
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useServiceModuleStore } from "@/stores/serviceModule";

defineOptions({ name: "AppSidebar" });

defineEmits(["request-logout"]);

const auth = useAuthStore()
const userStore = useUserStore()
const serviceModuleStore = useServiceModuleStore()
const baseRole = computed(() => String(auth.user?.role || '').toLowerCase() || 'admin')

// Elevate role for student officers
const myUserId = computed(() => auth.user?.id)
const myClubs = computed(() => {
    const key = String(myUserId.value ?? '')
    return userStore.clubsByUser?.[key] || []
})
const officerTitles = new Set(["president", "vice-president", "vice president", "secretary"]) 
const isOfficer = computed(() => Array.isArray(myClubs.value) && myClubs.value.some(c => officerTitles.has(String(c?.membership?.role || '').toLowerCase())))
const effectiveRole = computed(() => (baseRole.value === 'student' && isOfficer.value) ? 'student_officer' : baseRole.value)

// Build menu for effective role
const moduleKey = computed(() => serviceModuleStore.selectedKey)
const allMenu = computed(() => buildMenu(effectiveRole.value, moduleKey.value))
const navTitle = computed(() => serviceModuleStore.selectedShortTitle || "Navigation")
const sections = computed(() => {
    const groups = new Map()
    for (const item of allMenu.value) {
        const key = item.section || 'General'
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key).push(item)
    }
    return Array.from(groups.entries()).map(([name, items]) => ({ name, items }))
})

// Ensure clubs are loaded so officer elevation works on first paint
onMounted(() => {
    try {
        const uid = myUserId.value
        const key = String(uid ?? '')
        if (baseRole.value === 'student' && uid && !Array.isArray(userStore.clubsByUser?.[key])) {
            userStore.fetchUserClubs(uid).catch(() => null)
        }
    } catch {}
})
</script>
