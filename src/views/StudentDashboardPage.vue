<!-- src/views/StudentDashboardPage.vue -->
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
import { useAuthStore } from '@/stores/auth'
import { useActivityDesignStore } from '@/stores/activityDesign'

/* Icons */
import {
    mdiChartBar,
    mdiFileDocumentMultiple,
    mdiAccountGroup,
    mdiCheckboxMarkedCircle,
    mdiChartDonut,
    mdiCalendarClock,
    mdiCalendarMonth,
} from '@mdi/js'

/* Init stores */
const clubStore = useClubStore()
const docStore = useClubDocStore()
const authStore = useAuthStore()
const adStore = useActivityDesignStore()

/* Local loading */
const bootLoading = ref(true)

/**
 * Student dashboard — lightweight:
 * - Clubs (with users), club docs, and activities (to show your clubs’ events)
 */
onMounted(async () => {
    try {
        await Promise.all([
            clubStore.fetchAll({ page: 1, limit: 1000, filters: { include: 'users' } }, true),
            docStore.fetchAll({ page: 1, limit: 2000 }, true),
            adStore.fetchAll({ page: 1, limit: 2000 }, true), // activities needed for charts
        ])
    } finally {
        bootLoading.value = false
    }
})

const meId = computed(() => authStore.user?.id)

/* ---------- Sources ---------- */
const allClubs = computed(() => Array.isArray(clubStore.clubs?.data) ? clubStore.clubs.data : [])
const docs = computed(() => Array.isArray(docStore.docs?.data) ? docStore.docs.data : [])
const activitiesAll = computed(() => Array.isArray(adStore.items?.data) ? adStore.items.data : [])

/* ---------- My clubs & IDs ---------- */
const myClubs = computed(() => {
    const id = meId.value
    if (!id) return []
    return allClubs.value.filter(c => Array.isArray(c.users) && c.users.some(u => u.id === id))
})
const myClubIds = computed(() => new Set(myClubs.value.map(c => c.id)))

/* ---------- Quick KPIs ---------- */
const totalMyClubs = computed(() => myClubs.value.length)
const activeMyClubs = computed(() => myClubs.value.filter(c => c.is_active !== false).length)
const totalMembersInMyClubs = computed(() =>
    myClubs.value.reduce((acc, c) => acc + (Array.isArray(c.users) ? c.users.length : 0), 0)
)
const totalDocsInMyClubs = computed(() => {
    const ids = myClubIds.value
    return docs.value.filter(d => ids.has(d.club_id)).length
})

/* ---------- Filters (simple & student-friendly) ---------- */
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

const filters = ref({
    school_year: '',
    semester: '',
    club_id: '', // pick a specific club (optional)
})

/* ---------- Helpers ---------- */
const normalizeStatus = (s) => {
    const v = (s ?? 'active').toString().trim().toLowerCase()
    return ['pending', 'active', 'inactive'].includes(v) ? v : 'active'
}
const colorSet = {
    blue: 'rgba(59,130,246,0.85)', blueSoft: 'rgba(59,130,246,0.15)',
    indigo: 'rgba(99,102,241,0.85)', indigoSoft: 'rgba(99,102,241,0.15)',
    emerald: 'rgba(16,185,129,0.85)', emeraldSoft: 'rgba(16,185,129,0.15)',
    amber: 'rgba(245,158,11,0.85)', amberSoft: 'rgba(245,158,11,0.15)',
    rose: 'rgba(244,63,94,0.85)', roseSoft: 'rgba(244,63,94,0.15)',
    slate: 'rgba(100,116,139,0.85)', slateSoft: 'rgba(100,116,139,0.15)',
}
const palette = [colorSet.blue, colorSet.indigo, colorSet.emerald, colorSet.amber, colorSet.rose, colorSet.slate]
const paletteSoft = [colorSet.blueSoft, colorSet.indigoSoft, colorSet.emeraldSoft, colorSet.amberSoft, colorSet.roseSoft, colorSet.slateSoft]
const pick = (i) => palette[i % palette.length]
const pickSoft = (i) => paletteSoft[i % paletteSoft.length]

const toDate = (s) => {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d) ? null : d
}
const now = new Date()
const startOfWeek = (() => {
    const d = new Date(); const day = d.getDay() || 7; if (day !== 1) d.setHours(-24 * (day - 1))
    d.setHours(0, 0, 0, 0); return d
})()
const endOfWeek = (() => { const d = new Date(startOfWeek); d.setDate(d.getDate() + 6); d.setHours(23, 59, 59, 999); return d })()
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
const inRange = (dt, s, e) => { const d = toDate(dt); return d && d >= s && d <= e }

/* ---------- My activities (by my clubs + filters) ---------- */
const myActivities = computed(() => {
    const ids = myClubIds.value
    const f = filters.value
    return activitiesAll.value.filter(a => {
        if (!ids.has(a.club_id)) return false
        if (f.school_year && a.school_year !== f.school_year) return false
        if (f.semester && a.semester !== f.semester) return false
        if (f.club_id && +a.club_id !== +f.club_id) return false
        return true
    })
})

/* ---------- Student KPIs based on my clubs’ activities ---------- */
const activitiesThisWeek = computed(() => myActivities.value.filter(a =>
    inRange(a.date_of_implementation, startOfWeek, endOfWeek)
).length)

const activitiesThisMonth = computed(() => myActivities.value.filter(a =>
    inRange(a.date_of_implementation, startOfMonth, endOfMonth)
).length)

const upcoming30 = computed(() => myActivities.value.filter(a => {
    const d = toDate(a.date_of_implementation)
    if (!d) return false
    const diff = (d - now) / 86400000
    return diff >= 0 && diff <= 30
}).length)

/* ---------- Charts ---------- */
/* My membership status */
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

/* My clubs by category */
const myClubsByCategory = computed(() => {
    const map = {}
    for (const c of myClubs.value) {
        const k = (c.category || 'Uncategorized').trim()
        map[k] = (map[k] || 0) + 1
    }
    const labels = Object.keys(map).sort((a, b) => map[b] - map[a])
    return {
        labels,
        datasets: [{
            label: 'My Clubs',
            data: labels.map(l => map[l]),
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5,
        }]
    }
})

/* Members by my club (horizontal) */
const membersByMyClub = computed(() => {
    const pairs = myClubs.value
        .map(c => ({ name: c.name || c.code || `Club ${c.id}`, count: Array.isArray(c.users) ? c.users.length : 0 }))
        .sort((a, b) => b.count - a.count)
    const labels = pairs.map(p => p.name)
    return {
        labels,
        datasets: [{
            label: 'Members',
            data: pairs.map(p => p.count),
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5,
        }]
    }
})

/* Activities by status (my clubs) */
const pieActivitiesByStatus = computed(() => {
    const map = { draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    for (const a of myActivities.value) map[a.status] = (map[a.status] || 0) + 1
    const labels = Object.keys(map)
    return {
        labels,
        datasets: [{
            data: labels.map(l => map[l]),
            backgroundColor: labels.map((_, i) => pick(i)),
            borderColor: labels.map(() => 'white'),
            borderWidth: 2,
        }]
    }
})

/* Activities by nature (my clubs) */
const pieActivitiesByNature = computed(() => {
    const map = { 'Curricular': 0, 'Co-Curricular': 0, 'Extra-Curricular': 0 }
    for (const a of myActivities.value) map[a.nature_of_activity] = (map[a.nature_of_activity] || 0) + 1
    const labels = Object.keys(map)
    return {
        labels,
        datasets: [{
            data: labels.map(l => map[l]),
            backgroundColor: labels.map((_, i) => pick(i + 1)),
            borderColor: labels.map(() => 'white'),
            borderWidth: 2,
        }]
    }
})

/* Activities by my club (counts) */
const barActivitiesByMyClub = computed(() => {
    const map = new Map()
    for (const a of myActivities.value) {
        const name = a.club?.name || `Club #${a.club_id}`
        map.set(name, (map.get(name) || 0) + 1)
    }
    const pairs = [...map.entries()]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)

    const labels = pairs.map(p => p.name)
    return {
        labels,
        datasets: [{
            label: '# Activities',
            data: pairs.map(p => p.count),
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5,
        }]
    }
})

/* Activity trend (filed per month, last 12 months) */
const lineMyActivitiesOverTime = computed(() => {
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const now = new Date()
    const buckets = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, y: d.getFullYear(), m: d.getMonth(), v: 0 })
    }
    const idx = new Map(buckets.map(b => [b.key, b]))
    for (const a of myActivities.value) {
        const d = toDate(a.date_filed || a.created_at)
        if (!d) continue
        const k = `${d.getFullYear()}-${d.getMonth()}`
        if (idx.has(k)) idx.get(k).v++
    }
    const labels = buckets.map(b => `${MONTHS[b.m]} ${String(b.y).slice(-2)}`)
    return {
        labels,
        datasets: [{
            label: 'My clubs’ activities filed',
            data: buckets.map(b => b.v),
            borderColor: colorSet.indigo,
            backgroundColor: colorSet.indigoSoft,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 4,
            tension: 0.3,
            fill: true,
        }]
    }
})

/* Combined loading for charts */
const anyLoading = computed(() =>
    bootLoading.value || clubStore.isLoading || docStore.isLoading || adStore.isLoading
)
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Header -->
            <div class="mb-4">
                <h1 class="text-xl font-semibold text-gray-900">Student Dashboard</h1>
                <p class="text-sm text-gray-500">Your clubs and their activities—at a glance.</p>
            </div>

            <!-- Filters -->
            <div class="p-3 mb-5 rounded-2xl border bg-white">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <select v-model="filters.school_year" class="border rounded px-2 py-2">
                        <option value="">All School Years</option>
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>

                    <select v-model="filters.semester" class="border rounded px-2 py-2">
                        <option value="">All Semesters</option>
                        <option v-for="s in SEMESTERS" :key="s" :value="s">{{ s }}</option>
                    </select>

                    <select v-model="filters.club_id" class="border rounded px-2 py-2">
                        <option value="">All My Clubs</option>
                        <option v-for="c in myClubs" :key="c.id" :value="c.id">{{ c.name || ('Club ' + c.id) }}</option>
                    </select>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">My Clubs</div>
                        <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24">
                            <path :d="mdiChartBar" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">You’re a member of these clubs</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Active Memberships</div>
                        <svg class="w-5 h-5 text-emerald-600" viewBox="0 0 24 24">
                            <path :d="mdiCheckboxMarkedCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ activeMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Clubs currently active</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Members in My Clubs</div>
                        <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24">
                            <path :d="mdiAccountGroup" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalMembersInMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Total membership size</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Club Documents</div>
                        <svg class="w-5 h-5 text-amber-600" viewBox="0 0 24 24">
                            <path :d="mdiFileDocumentMultiple" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ totalDocsInMyClubs }}</div>
                    <div class="mt-1 text-xs text-gray-500">Across your clubs</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Activities This Week</div>
                        <svg class="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                            <path :d="mdiCalendarClock" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ activitiesThisWeek }}</div>
                    <div class="mt-1 text-xs text-gray-500">This Month: {{ activitiesThisMonth }}</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Upcoming (30 Days)</div>
                        <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24">
                            <path :d="mdiCalendarMonth" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ upcoming30 }}</div>
                    <div class="mt-1 text-xs text-gray-500">Implementation dates ahead</div>
                </div>
            </div>

            <!-- Charts Grid -->
            <div class="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <!-- Membership -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24">
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

                <!-- My Clubs by Category -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
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

                <!-- Members by My Club -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
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

                <!-- Activities by Status (my clubs) -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Activities by Status (My Clubs)
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieActivitiesByStatus" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Activities by Nature (my clubs) -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Activities by Nature (My Clubs)
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieActivitiesByNature" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- Activities by My Club -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
                                <path :d="mdiChartBar" />
                            </svg>
                            Activities by My Club
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <BarChart :data="barActivitiesByMyClub" :loading="anyLoading" :horizontal="true" />
                        </div>
                    </div>
                </div>

                <!-- Trend -->
                <div class="rounded-2xl border bg-white shadow-sm xl:col-span-3">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24">
                                <path :d="mdiChartBar" />
                            </svg>
                            My Clubs’ Activity Trend (Monthly)
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="">
                            <LineChart :data="lineMyActivitiesOverTime" :loading="anyLoading" />
                        </div>
                    </div>
                </div>
            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>
