<template>
    <aside class="w-64 bg-secondary text-white p-4 hidden md:block">
        <nav>
            <h2 class="text-lg font-bold mb-4 text-yellow-300">Navigation</h2>

            <!-- General section -->
            <div>
                <h3 class="text-xs uppercase tracking-wide text-gray-300 mb-2">General</h3>
                <NavbarMenuList :menu="generalMenu" />
            </div>

            <!-- Admin section (only shown if there are items) -->
            <div v-if="adminMenu.length" class="mt-4 pt-3 border-t border-white/10">
                <h3 class="text-xs uppercase tracking-wide text-indigo-300 mb-2">Admin</h3>
                <NavbarMenuList :menu="adminMenu" />
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
import menuAside, { buildMenu } from "@/menu/menuAside";
import NavbarMenuList from "./NavbarMenuList.vue";
import BaseIcon from "@/components/commons/BaseIcon.vue";
import { mdiLogout } from "@mdi/js";
import { computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'

defineOptions({ name: "AppSidebar" });

defineEmits(["request-logout"]);

const auth = useAuthStore()
const userStore = useUserStore()
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
const allMenu = computed(() => buildMenu(effectiveRole.value))

// Identify admin-only items (roles limited to admin/manager)
const isAdminOnly = (item) => {
    const roles = Array.isArray(item?.roles) ? item.roles.map(r => String(r).toLowerCase()) : []
    if (!roles.length) return false
    const allowed = new Set(["admin", "manager"])
    return roles.every(r => allowed.has(r))
}

const adminMenu = computed(() => allMenu.value.filter(isAdminOnly))
const generalMenu = computed(() => allMenu.value.filter(i => !isAdminOnly(i)))

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
