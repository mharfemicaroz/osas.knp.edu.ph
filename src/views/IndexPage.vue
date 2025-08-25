<!-- src/views/DashboardView.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

/* Charts */
import BarChart from '@/components/Charts/BarChart.vue'
import DoughnutChart from '@/components/Charts/DoughnutChart.vue'
import LineChart from '@/components/Charts/LineChart.vue'

/* Stores */
import { useClubStore } from '@/stores/club'
import { useClubDocStore } from '@/stores/clubDoc'
import { useUserStore } from '@/stores/user'

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

/* Local loading while bootstrapping */
const bootLoading = ref(true)

/* ---------- Fetch all data upfront ---------- */
onMounted(async () => {
    try {
        // 1) Bulk fetch primary lists
        await Promise.all([
            clubStore.fetchAll({ page: 1, limit: 1000, filters: { include: 'users' } }, true),
            docStore.fetchAll({ page: 1, limit: 2000 }, true),
            userStore.fetchAll({ page: 1, limit: 2000 }, true),
        ])

        // 2) Warm up membership cache per-user using userStore.fetchUserClubs
        //    (limit to first 500 users to avoid hammering)
        const list = Array.isArray(userStore.users?.data) ? userStore.users.data : []
        const target = list.slice(0, 500)
        await Promise.all(
            target.map(u =>
                userStore.fetchUserClubs(u.id).catch(() => [])
            )
        )
    } finally {
        bootLoading.value = false
    }
})

/* ---------- Sources ---------- */
const clubs = computed(() => Array.isArray(clubStore.clubs?.data) ? clubStore.clubs.data : [])
const docs = computed(() => Array.isArray(docStore.docs?.data) ? docStore.docs.data : [])
const users = computed(() => Array.isArray(userStore.users?.data) ? userStore.users.data : [])

/* ---------- Quick KPIs ---------- */
const totalClubs = computed(() => clubStore.clubs?.total || clubs.value.length || 0)
const activeClubs = computed(() => clubs.value.filter(c => c.is_active !== false).length)
const totalUsers = computed(() => userStore.users?.total || users.value.length || 0)
const totalDocs = computed(() => docStore.docs?.total || docs.value.length || 0)

/* ---------- Helpers ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const niceDateOnly = (dStr) => {
    const d = dStr ? new Date(dStr) : null
    return d && !isNaN(d) ? d : null
}

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

/* ---------- Chart: Clubs by Category (Bar) ---------- */
const clubsByCategory = computed(() => {
    const map = {}
    for (const c of clubs.value) {
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
            label: 'Clubs',
            data,
            backgroundColor: bg,
            borderColor: border,
            borderWidth: 1.5,
        }]
    }
})

/* ---------- Chart: Club Activity Split (Doughnut) ---------- */
const clubActivityData = computed(() => {
    const active = activeClubs.value
    const inactive = Math.max(0, totalClubs.value - active)
    return {
        labels: ['Active', 'Inactive'],
        datasets: [{
            data: [active, inactive],
            backgroundColor: [colorSet.emerald, colorSet.slate],
            borderColor: ['white', 'white'],
            borderWidth: 2,
        }]
    }
})

/* ---------- Chart: Documents by Type (Doughnut) ---------- */
const docsByType = computed(() => {
    const map = { cbl: 0, resolution: 0, minute: 0 }
    for (const d of docs.value) {
        const t = (d.type || '').toLowerCase()
        if (map.hasOwnProperty(t)) map[t]++
    }
    const labels = ['cbl', 'resolution', 'minute']
    return {
        labels,
        datasets: [{
            data: labels.map(l => map[l] || 0),
            backgroundColor: [colorSet.indigo, colorSet.amber, colorSet.blue],
            borderColor: ['white', 'white', 'white'],
            borderWidth: 2,
        }]
    }
})

/* ---------- Chart: Documents per Month (last 12 months) (Line) ---------- */
const docsPerMonthData = computed(() => {
    const now = new Date()
    const buckets = []
    for (let i = 11; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1)
        buckets.push({ y: dt.getFullYear(), m: dt.getMonth(), key: `${dt.getFullYear()}-${dt.getMonth()}`, count: 0 })
    }
    const index = new Map(buckets.map(b => [b.key, b]))

    for (const d of docs.value) {
        const when = niceDateOnly(d.doc_date || d.created_at || d.updated_at)
        if (!when) continue
        const key = `${when.getFullYear()}-${when.getMonth()}`
        if (index.has(key)) index.get(key).count++
    }

    const labels = buckets.map(b => `${MONTHS[b.m]} ${String(b.y).slice(-2)}`)
    const data = buckets.map(b => b.count)

    return {
        labels,
        datasets: [{
            label: 'Docs / month',
            data,
            borderColor: colorSet.blue,
            backgroundColor: colorSet.blueSoft,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: true,
        }]
    }
})

/* ---------- NEW: Membership Status (Doughnut) from userStore.fetchUserClubs cache ---------- */
/* Membership Status (Doughnut) — counts UserClub.status across all clubs */
/* Dedup by <clubId>-<userId> to avoid accidental double entries from API merges */
const membershipStatusData = computed(() => {
    // Counts membership records (UserClub rows), not unique users.
    const counts = { pending: 0, active: 0, inactive: 0 }
    console.log('Calculating membership status from clubs:', clubs.value)
    for (const c of clubs.value) {
        if (!Array.isArray(c.users)) continue
        for (const u of c.users) {
            const s = normalizeStatus(u?.UserClub?.status)
            counts[s] = (counts[s] || 0) + 1
        }
    }

    return {
        labels: ['active', 'pending', 'inactive'],
        datasets: [{
            data: [counts.active, counts.pending, counts.inactive],
            backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(245,158,11,0.85)', 'rgba(244,63,94,0.85)'],
            borderColor: ['white', 'white', 'white'],
            borderWidth: 2,
        }]
    }
})


/* ---------- NEW: Members by Club (Bar) ---------- */
const membersByClub = computed(() => {
    const pairs = clubs.value.map(c => ({
        name: c.name || c.code || `Club ${c.id}`,
        count: Array.isArray(c.users) ? c.users.length : 0
    }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

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

/* Combined loading flag for charts */
const anyLoading = computed(() =>
    bootLoading.value || clubStore.isLoading || docStore.isLoading || userStore.isLoading
)
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Header -->
            <div class="mb-4">
                <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
                <p class="text-sm text-gray-500">At-a-glance metrics & trends across clubs, documents, and users.</p>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Total Clubs</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-blue-500">
                            <path :d="mdiChartBar" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">All clubs in the system</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Active Clubs</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-emerald-600">
                            <path :d="mdiCheckboxMarkedCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ activeClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Currently active</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Users</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-indigo-600">
                            <path :d="mdiAccountGroup" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalUsers }}</div>
                    <div class="mt-1 text-xs text-gray-500">Registered accounts</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Documents</div>
                        <svg style="width:20px;height:20px" viewBox="0 0 24 24" class="text-amber-600">
                            <path :d="mdiFileDocumentMultiple" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalDocs }}</div>
                    <div class="mt-1 text-xs text-gray-500">CBLs, resolutions & minutes</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Clubs by Category -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-blue-600">
                                <path :d="mdiChartBar" />
                            </svg>
                            Clubs by Category
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <BarChart :data="clubsByCategory" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Club Activity Split -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-emerald-600">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Club Activity
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="clubActivityData" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Documents by Type -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-amber-600">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Documents by Type
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="docsByType" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Membership Status (from userStore.fetchUserClubs cache) -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-indigo-600">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Membership Status
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="membershipStatusData" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Members by Club -->
                <div class="rounded-2xl border bg-white shadow-sm lg:col-span-2">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24" class="text-blue-600">
                                <path :d="mdiChartBar" />
                            </svg>
                            Members by Club (Top 10)
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <BarChart :data="membersByClub" :loading="anyLoading" :horizontal="true" />
                        </div>
                    </div>
                </div>

                <!-- (Optional) Documents per Month (kept for reference; uncomment if needed)
        <div class="rounded-2xl border bg-white shadow-sm lg:col-span-3">
          <div class="px-4 py-3 border-b">
            <h3 class="text-sm font-semibold text-gray-800">Documents per Month (Last 12 Months)</h3>
          </div>
          <div class="p-4">
            <div class="h-[420px]">
              <LineChart :data="docsPerMonthData" :loading="anyLoading" />
            </div>
          </div>
        </div>
        -->
            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>
