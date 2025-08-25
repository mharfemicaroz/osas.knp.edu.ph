<!-- src/components/layout/NavbarItem.vue -->
<template>
    <!-- Hide entirely if not allowed for this role -->
    <router-link v-if="isAllowed && resolvedTo" :to="resolvedTo" active-class="bg-tertiary"
        class="flex items-center p-2 hover:bg-tertiary rounded">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
        <span>{{ item.label }}</span>
    </router-link>

    <span v-else-if="!isAllowed" class="hidden"></span>

    <span v-else class="flex items-center p-2 text-gray-400 cursor-not-allowed">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2" />
        <span>{{ item.label }}</span>
    </span>
</template>

<script setup>
import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import BaseIcon from "@/components/commons/BaseIcon.vue";

defineOptions({ name: "NavbarItem" });

const props = defineProps({
    item: { type: Object, required: true },
});

const authStore = useAuthStore();
const userStore = useUserStore();

const baseRole = computed(() => (authStore.user?.role || "").toLowerCase() || "admin");
const myUserId = computed(() => authStore.user?.id);
const myClubs = computed(() => {
    const key = String(myUserId.value ?? "");
    return userStore.clubsByUser?.[key] || [];
});

const officerTitles = ["president", "vice-president", "vice president", "secretary"];
const isOfficer = computed(() =>
    Array.isArray(myClubs.value) &&
    myClubs.value.some(c => officerTitles.includes(String(c?.membership?.role || "").toLowerCase()))
);

/** Elevate role for officers */
const effectiveRole = computed(() => {
    if (baseRole.value === "student" && isOfficer.value) return "student_officer";
    return baseRole.value;
});

/**
 * Allowed if:
 * - item.roles not provided (default allow)
 * - OR effectiveRole is included in item.roles
 * (defense) hide Clubs/Organization for plain students (non-officers)
 */
const isAllowed = computed(() => {
    if (props.item?.roles && Array.isArray(props.item.roles)) {
        const allowed = props.item.roles.map(r => String(r).toLowerCase());
        if (!allowed.includes(effectiveRole.value)) return false;
    }
    if (baseRole.value === "student" && !isOfficer.value && props.item?.to === "/clubs-organization") {
        return false;
    }
    return true;
});

/** Route resolution */
const resolvedTo = computed(() => {
    if (!props.item?.to) return null;
    if (baseRole.value === "student" && props.item.to === "/dashboard") return "/student-dashboard";
    return props.item.to;
});
</script>
