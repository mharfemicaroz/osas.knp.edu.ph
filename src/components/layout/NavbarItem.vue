<!-- src/components/layout/NavbarItem.vue -->
<template>
    <!-- Hide entirely if not allowed for this role -->
    <router-link v-if="isAllowed && resolvedTo" :to="resolvedTo" active-class="bg-tertiary"
        class="flex items-center p-2 hover:bg-tertiary rounded">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
        <span class="relative inline-flex items-center">
            {{ item.label }}
            <span v-if="isAdminOnly" class="ml-2 text-[10px] px-1 py-0.5 rounded bg-indigo-600 text-white">ADMIN</span>
            <span v-if="showBadge && badgeCount > 0"
                class="ml-1 inline-flex items-center justify-center text-[10px] leading-none min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white align-super">
                {{ badgeCount }}
            </span>
        </span>
    </router-link>

    <span v-else-if="!isAllowed" class="hidden"></span>

    <span v-else class="flex items-center p-2 text-gray-400 cursor-not-allowed">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2" />
        <span class="relative inline-flex items-center">
            {{ item.label }}
            <span v-if="isAdminOnly" class="ml-2 text-[10px] px-1 py-0.5 rounded bg-indigo-600 text-white">ADMIN</span>
            <span v-if="showBadge && badgeCount > 0"
                class="ml-1 inline-flex items-center justify-center text-[10px] leading-none min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white align-super">
                {{ badgeCount }}
            </span>
        </span>
    </span>
</template>

<script setup>
import { computed, ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useUserStore } from "@/stores/user";
import activityDesignService from "@/services/activity/activityDesignService";
import annualPlanService from "@/services/plan/annualPlanService";
import utilizationRequestService from "@/services/activity/utilizationRequestService";
import liquidationFundService from "@/services/activity/liquidationFundService";
import grievanceService from "@/services/grievance/grievanceService";
import axiosInstance from "@/plugins/axiosConfig";
import sessionLogService from "@/services/session/sessionLogService";
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

// Mark items that are only for admin/manager roles
const isAdminOnly = computed(() => {
    const roles = Array.isArray(props.item?.roles) ? props.item.roles.map(r => String(r).toLowerCase()) : []
    if (!roles.length) return false
    const allowed = new Set(["admin", "manager"])
    // admin-only if every role is admin/manager and nothing else
    return roles.every(r => allowed.has(r))
})

/** Route resolution */
const resolvedTo = computed(() => {
    if (!props.item?.to) return null;
    if (baseRole.value === "student" && props.item.to === "/dashboard") return "/student-dashboard";
    return props.item.to;
});

// ---- Menu badge counters ----
const targetPath = computed(() => String(props.item?.to || ""));
const showBadge = computed(() => {
    const t = targetPath.value;
    const role = baseRole.value;
    const allowedRole = role === 'admin' || role === 'manager';
    const isTarget = t === "/workflows" || t === "/annual-plans" || t === "/activity-designs" || t === "/utilization-requests" || t === "/liquidation-funds" || t === "/grievances" || t === "/session-logs";
    return allowedRole && isTarget;
});
const badgeCount = ref(0);
let lastReqId = 0;

const totalFrom = (res) => {
    if (!res) return 0;
    const direct = res.total ?? res.count;
    if (direct != null) {
        const n = Number(direct);
        if (Number.isFinite(n)) return n;
    }
    // Fallback: some endpoints may only return an array when limit is small
    const arrLen = Array.isArray(res.data) ? res.data.length : 0;
    return arrLen || 0;
};

const refreshBadgeCount = async () => {
    try {
        const reqId = ++lastReqId;
        const to = targetPath.value;
        if (to === "/workflows") {
            const [ap, ad, ur, lf, grvS, grvR] = await Promise.allSettled([
                annualPlanService.list({ status: "pending", page: 1, limit: 1 }),
                activityDesignService.list({ status: "pending", page: 1, limit: 1 }),
                utilizationRequestService.list({ status: "pending", page: 1, limit: 1 }),
                liquidationFundService.list({ status: "pending", page: 1, limit: 1 }),
                grievanceService.list({ status: "submitted", page: 1, limit: 1 }),
                grievanceService.list({ status: "in_review", page: 1, limit: 1 }),
            ]);
            if (reqId !== lastReqId) return; // stale responses ignored
            const apTotal = ap.status === 'fulfilled' ? totalFrom(ap.value) : 0;
            const adTotal = ad.status === 'fulfilled' ? totalFrom(ad.value) : 0;
            const urTotal = ur.status === 'fulfilled' ? totalFrom(ur.value) : 0;
            const lfTotal = lf.status === 'fulfilled' ? totalFrom(lf.value) : 0;
            let grvSTotal = grvS.status === 'fulfilled' ? totalFrom(grvS.value) : 0;
            let grvInReviewTotal = grvR.status === 'fulfilled' ? totalFrom(grvR.value) : 0;

            // Fallback: directly query counts if service shape is unexpected
            if ((grvSTotal + grvInReviewTotal) === 0) {
                try {
                    const [a, b] = await Promise.all([
                        axiosInstance.get('/grievances', { params: { status: 'submitted', page: 1, limit: 1 } }),
                        axiosInstance.get('/grievances', { params: { status: 'in_review', page: 1, limit: 1 } }),
                    ]);
                    grvSTotal = totalFrom(a.data);
                    grvInReviewTotal = totalFrom(b.data);
                } catch {}
            }

            // Count grievances under review as part of workflows
            badgeCount.value = apTotal + adTotal + urTotal + lfTotal + grvSTotal + grvInReviewTotal;
        } else if (to === "/annual-plans") {
            await fetchAnnualPending();
        } else if (to === "/activity-designs") {
            const res = await activityDesignService.list({ status: "pending", page: 1, limit: 1 });
            if (reqId !== lastReqId) return;
            badgeCount.value = totalFrom(res);
        } else if (to === "/utilization-requests") {
            const res = await utilizationRequestService.list({ status: "pending", page: 1, limit: 1 });
            if (reqId !== lastReqId) return;
            badgeCount.value = totalFrom(res);
        } else if (to === "/liquidation-funds") {
            const res = await liquidationFundService.list({ status: "pending", page: 1, limit: 1 });
            if (reqId !== lastReqId) return;
            badgeCount.value = totalFrom(res);
        } else if (to === "/grievances") {
            // sum of submitted + in_review
            const [subm, inrev] = await Promise.allSettled([
                grievanceService.list({ status: "submitted", page: 1, limit: 1 }),
                grievanceService.list({ status: "in_review", page: 1, limit: 1 }),
            ]);
            if (reqId !== lastReqId) return; // stale
            const sTotal = subm.status === 'fulfilled' ? totalFrom(subm.value) : 0;
            const iTotal = inrev.status === 'fulfilled' ? totalFrom(inrev.value) : 0;
            badgeCount.value = sTotal + iTotal;
        } else if (to === "/session-logs") {
            const res = await sessionLogService.list({ page: 1, limit: 1 });
            if (reqId !== lastReqId) return;
            badgeCount.value = totalFrom(res);
        } else {
            badgeCount.value = 0;
        }
    } catch {
        badgeCount.value = 0;
    }
};

// helper to fetch annual plans pending count without mutating stores
async function fetchAnnualPending() {
    try {
        const axios = (await import("@/plugins/axiosConfig")).default;
        const { data } = await axios.get('/annual-plans', { params: { status: 'pending', page: 1, limit: 1 } });
        badgeCount.value = data?.total || 0;
    } catch { badgeCount.value = 0; }
}

onMounted(() => {
    if (showBadge.value) refreshBadgeCount();
});
</script>
