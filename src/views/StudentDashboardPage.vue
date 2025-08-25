<!-- src/views/StudentDashboardPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

/* Charts (reuse existing components for consistent look) */
import BarChart from '@/components/Charts/BarChart.vue'
import DoughnutChart from '@/components/Charts/DoughnutChart.vue'

/* Stores */
import { useClubStore } from '@/stores/club'
import { useClubDocStore } from '@/stores/clubDoc'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'

/* Icons */
import {
    mdiChartBar,
    mdiFileDocumentMultiple,
    mdiAccountGroup,
    mdiCheckboxMarkedCircle,
    mdiChartDonut,
} from '@mdi/js'

/* Init stores */
const clubStore = useClubStore()
const docStore = useClubDocStore()
const userStore = useUserStore()
const authStore = useAuthStore()

/* Local loading */
const bootLoading = ref(true)

/**
 * Student dashboard should be LIGHT:
 * - Fetch clubs (with users) & docs once
 * - Filter by current student membership
 */
onMounted(async () => {
    try {
        await Promise.all([
            clubStore.fetchAll({ page: 1, limit: 1000, filters: { include: 'users' } }, true),
            docStore.fetchAll({ page: 1, limit: 2000 }, true),
            // no need to fetch all users for student
        ])
    } finally {
        bootLoading.value = false
    }
})

const meId = computed(() => authStore.user?.id)

/* ---------- Sources ---------- */
const allClubs = computed(() => Array.isArray(clubStore.clubs?.data) ? clubStore.clubs.data : [])
const docs = computed(() => Array.isArray(docStore.docs?.data) ? docStore.docs.data : [])

/* ---------- Filter: my clubs ---------- */
const myClubs = computed(() => {
    const id = meId.value
    if (!id) return []
    return allClubs.value.filter(c => Array.isArray(c.users) && c.users.some(u => u.id === id))
})

/* ---------- Quick KPIs ---------- */
const totalMyClubs = computed(() => myClubs.value.length)
const activeMyClubs = computed(() => myClubs.value.filter(c => c.is_active !== false).length)
const totalMembersInMyClubs = computed(() =>
    myClubs.value.reduce((acc, c) => acc + (Array.isArray(c.users) ? c.users.length : 0), 0)
)
const totalDocsInMyClubs = computed(() => {
    const myClubIds = new Set(myClubs.value.map(c => c.id))
    return docs.value.filter(d => myClubIds.has(d.club_id)).length
})

/* ---------- Helpers ---------- */
const normalizeStatus = (s) => {
    const v = (s ?? 'active').toString().trim().toLowerCase()
    return ['pending', 'active', 'inactive'].includes(v) ? v : 'active'
}
const colorSet = {
    blue: 'rgba(59,130,246,0.85)',
    blueSoft: 'rgba(59,130,246,0.15)',
    indigo: 'rgba(99,102,241,0.85)',
    indigoSoft: 'rgba(99,102,241,0.15)',
    emerald: 'rgba(16,185,129,0.85)',
    emeraldSoft: 'rgba(16,185,129,0.15)',
    amber: 'rgba(245,158,11,0.85)',
    amberSoft: 'rgba(245,158,11,0.15)',
    rose: 'rgba(244,63,94,0.85)',
    roseSoft: 'rgba(244,63,94,0.15)',
    slate: 'rgba(100,116,139,0.85)',
    slateSoft: 'rgba(100,116,139,0.15)',
}
const cycle = (arr) => (idx) => arr[idx % arr.length]
const palette = [colorSet.blue, colorSet.indigo, colorSet.emerald, colorSet.amber, colorSet.rose, colorSet.slate]
const paletteSoft = [colorSet.blueSoft, colorSet.indigoSoft, colorSet.emeraldSoft, colorSet.amberSoft, colorSet.roseSoft, colorSet.slateSoft]
const pick = cycle(palette)
const pickSoft = cycle(paletteSoft)

/* ---------- Chart: My Clubs by Category ---------- */
const myClubsByCategory = computed(() => {
    const map = {}
    for (const c of myClubs.value) {
        const k = (c.category || 'Uncategorized').trim()
        map[k] = (map[k] || 0) + 1
    }
    const labels = Object.keys(map).sort((a, b) => map[b] - map[a])
    const data = labels.map(l => map[l])
    const bg = labels.map((_, i) => pickSoft(i))
    const border = labels.map((_, i) => pick(i))
    return {
        labels,
        datasets: [{
            label: 'My Clubs',
            data,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1.5,
        }]
    }
})

/* ---------- Chart: My Membership Status Split ---------- */
const myMembershipStatus = computed(() => {
    const counts = { active: 0, pending: 0, inactive: 0 }
    const myId = meId.value
    for (const c of myClubs.value) {
        const me = (c.users || []).find(u => u.id === myId)
        const s = normalizeStatus(me?.UserClub?.status)
        counts[s] = (counts[s] || 0) + 1
    }
    return {
        labels: ['Active', 'Pending', 'Inactive'],
        datasets: [{
            data: [counts.active, counts.pending, counts.inactive],
            backgroundColor: [colorSet.emerald, colorSet.amber, colorSet.rose],
            borderColor: ['white', 'white', 'white'],
            borderWidth: 2,
        }]
    }
})

/* ---------- Chart: Members by My Club ---------- */
const membersByMyClub = computed(() => {
    const pairs = myClubs.value
        .map(c => ({
            name: c.name || c.code || `Club ${c.id}`,
            count: Array.isArray(c.users) ? c.users.length : 0
        }))
        .sort((a, b) => b.count - a.count)

    const labels = pairs.map(p => p.name)
    const data = pairs.map(p => p.count)
    const bg = labels.map((_, i) => pickSoft(i))
    const border = labels.map((_, i) => pick(i))
    return {
        labels,
        datasets: [{
            label: 'Members',
            data,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1.5,
        }]
    }
})

/* Combined loading for charts */
const anyLoading = computed(() =>
    bootLoading.value || clubStore.isLoading || docStore.isLoading
)
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Header -->
            <div class="mb-4">
                <h1 class="text-xl font-semibold text-gray-900">Student Dashboard</h1>
                <p class="text-sm text-gray-500">Your clubs, membership, and documents at a glance.</p>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">My Clubs</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-blue-500">
                            <path :d="mdiChartBar" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">You're a member of these clubs</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Active Memberships</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-emerald-600">
                            <path :d="mdiCheckboxMarkedCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ activeMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Clubs currently active</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Members in My Clubs</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-indigo-600">
                            <path :d="mdiAccountGroup" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalMembersInMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Total membership size</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Documents</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-amber-600">
                            <path :d="mdiFileDocumentMultiple" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalDocsInMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Docs across your clubs</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- My Clubs by Category -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-blue-600">
                                <path :d="mdiChartBar" />
                            </svg>
                            My Clubs by Category
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <BarChart :data="myClubsByCategory" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- My Membership Status -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-emerald-600">
                                <path :d="mdiChartDonut" />
                            </svg>
                            My Membership Status
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="myMembershipStatus" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Members by My Club -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-blue-600">
                                <path :d="mdiChartBar" />
                            </svg>
                            Members by My Club
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <BarChart :data="membersByMyClub" :loading="anyLoading" :horizontal="true" />
                        </div>
                    </div>
                </div>
            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>
