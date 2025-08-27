<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

/* Charts */
import BarChart from '@/components/Charts/BarChart.vue'
import DoughnutChart from '@/components/Charts/DoughnutChart.vue'
import LineChart from '@/components/Charts/LineChart.vue'

/* Stores (existing) */
import { useClubStore } from '@/stores/club'
import { useClubDocStore } from '@/stores/clubDoc'
import { useUserStore } from '@/stores/user'

/* NEW Stores */
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useAnnualPlanStore } from '@/stores/annualPlan'
import { useLiquidationFundStore } from '@/stores/liquidationFund'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'

/* Icons */
import {
    mdiChartBar,
    mdiFileDocumentMultiple,
    mdiAccountGroup,
    mdiCheckboxMarkedCircle,
    mdiChartDonut,
    mdiCheckCircle,
    mdiClockTimeEight,
    mdiAlertCircle,
    mdiCloseCircle,
    mdiCalendarClock,
    mdiCalendarMonth,
    mdiTrendingUp,
    mdiTrendingDown,
    mdiCashMultiple,
    mdiCash,
    mdiLinkVariant,
    mdiPercentOutline,
    mdiChartLine,
    mdiClipboardList,
} from '@mdi/js'

/* Router for drilldowns */
const router = useRouter()

/* Init stores */
const clubStore = useClubStore()
const docStore = useClubDocStore()
const userStore = useUserStore()

const adStore = useActivityDesignStore()
const apStore = useAnnualPlanStore()
const lfStore = useLiquidationFundStore()
const urStore = useUtilizationRequestStore()

/* Local loading while bootstrapping */
const bootLoading = ref(true)

/* ---------- Fetch all data upfront ---------- */
onMounted(async () => {
    try {
        await Promise.all([
            clubStore.fetchAll({ page: 1, limit: 100, filters: { include: 'users' } }, true),
            docStore.fetchAll({ page: 1, limit: 100 }, true),
            userStore.fetchAll({ page: 1, limit: 100 }, true),

            // Activity designs & friends
            adStore.fetchAll({ page: 1, limit: 100 }, true),
            apStore.fetchAll({ page: 1, limit: 100, status: 'approved' }, true),
            lfStore.fetchAll({ page: 1, limit: 100 }, true),
            urStore.fetchAll({ page: 1, limit: 100 }, true),
        ])
    } finally {
        bootLoading.value = false
    }
})

/* ---------- Sources ---------- */
const clubs = computed(() => Array.isArray(clubStore.clubs?.data) ? clubStore.clubs.data : [])
const docs = computed(() => Array.isArray(docStore.docs?.data) ? docStore.docs.data : [])
const users = computed(() => Array.isArray(userStore.users?.data) ? userStore.users.data : [])

const activities = computed(() => Array.isArray(adStore.items?.data) ? adStore.items.data : [])
const annualPlans = computed(() => Array.isArray(apStore.items?.data) ? apStore.items.data : [])
const liquidations = computed(() => Array.isArray(lfStore.items?.data) ? lfStore.items.data : [])
const utilizations = computed(() => Array.isArray(urStore.items?.data) ? urStore.items.data : [])

/* ---------- Helpers ---------- */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const fmtInt = (n) => (Number.isFinite(+n) ? (+n).toLocaleString() : '0')
const currency = (n) => {
    const v = Number(n)
    if (!Number.isFinite(v)) return '0.00'
    return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const pct = (num, den) => {
    const n = Number(num), d = Number(den)
    if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return '0%'
    return `${((n / d) * 100).toFixed(1)}%`
}
const toDate = (s) => {
    if (!s) return null
    const d = new Date(s)
    return isNaN(d) ? null : d
}
const diffDays = (a, b) => {
    const A = toDate(a), B = toDate(b)
    if (!A || !B) return null
    return Math.round((A - B) / 86400000) // ms/day
}

/* Colors */
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

/* ---------- Filters (applied to ALL activity-driven KPIs/charts) ---------- */
const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 8 }, (_, i) => `${y - i}-${y - i + 1}`)
})

const filters = ref({
    school_year: '',
    semester: '',
    office_department: '',
    nature_of_activity: '',
    status: '',
})

const filteredActivities = computed(() => {
    const f = filters.value
    return activities.value.filter(a => {
        if (f.school_year && a.school_year !== f.school_year) return false
        if (f.semester && a.semester !== f.semester) return false
        if (f.office_department && a.office_department !== f.office_department) return false
        if (f.nature_of_activity && a.nature_of_activity !== f.nature_of_activity) return false
        if (f.status && a.status !== f.status) return false
        return true
    })
})

/* ---------- KPI calculations ---------- */
const totalClubs = computed(() => clubStore.clubs?.total || clubs.value.length || 0)
const activeClubsCount = computed(() => clubs.value.filter(c => c.is_active !== false).length)
const totalUsers = computed(() => userStore.users?.total || users.value.length || 0)
const totalDocs = computed(() => docStore.docs?.total || docs.value.length || 0)

/* Activity KPIs */
const totalActivities = computed(() => filteredActivities.value.length)
const approvedActivities = computed(() => filteredActivities.value.filter(a => a.status === 'approved').length)
const pendingActivities = computed(() => filteredActivities.value.filter(a => a.status === 'pending').length)
const rejectedActivities = computed(() => filteredActivities.value.filter(a => a.status === 'rejected').length)
const cancelledActivities = computed(() => filteredActivities.value.filter(a => a.status === 'cancelled').length)

/* Approval rate (on actionable statuses) */
const actionableTotal = computed(() => approvedActivities.value + rejectedActivities.value + cancelledActivities.value + pendingActivities.value)
const approvalRate = computed(() => pct(approvedActivities.value, actionableTotal.value))

/* Δ vs previous semester / SY (simple heuristic: if semester chosen, compare to previous; else compare to prev SY) */
const prevWindowDelta = computed(() => {
    const f = filters.value
    const dataset = activities.value

    // helpers to semester order & prev
    const semOrder = ['1st Semester', '2nd Semester', 'Summer']
    const prevSem = (sy, sem) => {
        let idx = semOrder.indexOf(sem)
        if (idx <= 0) return { sy: `${+sy.split('-')[0] - 1}-${+sy.split('-')[0]}`, sem: 'Summer' }
        return { sy, sem: semOrder[idx - 1] }
    }

    let currFilter = (a) => true
    let prevFilter = (a) => true

    if (f.semester && f.school_year) {
        const prev = prevSem(f.school_year, f.semester)
        currFilter = (a) => a.school_year === f.school_year && a.semester === f.semester
        prevFilter = (a) => a.school_year === prev.sy && a.semester === prev.sem
    } else if (f.school_year) {
        const y0 = +f.school_year.split('-')[0]
        const prevSY = `${y0 - 1}-${y0}`
        currFilter = (a) => a.school_year === f.school_year
        prevFilter = (a) => a.school_year === prevSY
    } else {
        // no constrained time filter → compare this year vs last year
        const y = new Date().getFullYear()
        const currSY = `${y}-${y + 1}`
        const prevSY = `${y - 1}-${y}`
        currFilter = (a) => a.school_year === currSY
        prevFilter = (a) => a.school_year === prevSY
    }

    const curr = dataset.filter(a => currFilter(a) && a.status === 'approved').length
    const prev = dataset.filter(a => prevFilter(a) && a.status === 'approved').length
    const deltaAbs = curr - prev
    const deltaPct = prev > 0 ? ((deltaAbs / prev) * 100) : (curr > 0 ? 100 : 0)
    return { curr, prev, deltaAbs, deltaPct }
})

/* Time-window KPIs */
const now = new Date()
const startOfWeek = (() => {
    const d = new Date(); const day = d.getDay() || 7; if (day !== 1) d.setHours(-24 * (day - 1))
    d.setHours(0, 0, 0, 0); return d
})()
const endOfWeek = (() => { const d = new Date(startOfWeek); d.setDate(d.getDate() + 6); d.setHours(23, 59, 59, 999); return d })()

const inRange = (dt, s, e) => {
    const d = toDate(dt)
    return d && d >= s && d <= e
}
const activitiesThisWeek = computed(() => filteredActivities.value.filter(a =>
    inRange(a.date_of_implementation, startOfWeek, endOfWeek)
).length)

const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
const activitiesThisMonth = computed(() => filteredActivities.value.filter(a =>
    inRange(a.date_of_implementation, startOfMonth, endOfMonth)
).length)

const upcoming30 = computed(() => filteredActivities.value.filter(a => {
    const d = toDate(a.date_of_implementation)
    if (!d) return false
    const diff = (d - now) / 86400000
    return diff >= 0 && diff <= 30
}).length)

/* Budget KPIs */
const totalProposedBudget = computed(() =>
    filteredActivities.value.reduce((s, a) => s + (+a.proposed_budget || 0), 0)
)
const avgProposedBudget = computed(() =>
    filteredActivities.value.length
        ? totalProposedBudget.value / filteredActivities.value.length
        : 0
)

/* Annual Plan linkage KPIs */
const linkedActivities = computed(() => filteredActivities.value.filter(a => a.annual_plan_id != null))
const linkedCount = computed(() => linkedActivities.value.length)
const linkedPct = computed(() => pct(linkedCount.value, totalActivities.value))

/* Liquidation KPIs */
const totalLiquidations = computed(() => liquidations.value.length)
const completedLiquidations = computed(() => liquidations.value.filter(l => l.status === 'completed').length)
const liquidationCompletionRate = computed(() => pct(completedLiquidations.value, totalLiquidations.value))
const totalSources = computed(() => liquidations.value.reduce((s, l) => s + (+l.total_sources_amount || 0), 0))
const totalUses = computed(() => liquidations.value.reduce((s, l) => s + (+l.total_uses_amount || 0), 0))
const totalCashOnHand = computed(() => liquidations.value.reduce((s, l) => s + (+l.total_cash_on_hand || 0), 0))

/* Variance vs proposed (only when LF ↔ AD match) */
const activityById = computed(() => {
    const m = new Map()
    for (const a of activities.value) m.set(a.id, a)
    return m
})
const varianceVsProposed = computed(() => {
    let sum = 0
    for (const l of liquidations.value) {
        const ad = activityById.value.get(l.activity_design_id)
        if (!ad) continue
        const proposed = +ad.proposed_budget || 0
        const uses = +l.total_uses_amount || 0
        sum += (uses - proposed) // + overspend, - underspend
    }
    return sum
})

/* SLA: avg days between approved_at and date_filed for approved */
const avgApprovalDays = computed(() => {
    const list = filteredActivities.value.filter(a => a.status === 'approved' && a.approved_at && a.date_filed)
    if (!list.length) return 0
    const sum = list.reduce((s, a) => s + (diffDays(a.approved_at, a.date_filed) ?? 0), 0)
    return sum / list.length
})

/* Utilization KPIs */
const totalUR = computed(() => utilizations.value.length)
const approvedUR = computed(() => utilizations.value.filter(u => u.status === 'approved').length)
const utilizationApprovalRate = computed(() => pct(approvedUR.value, totalUR.value))
const conflictsDetected = computed(() => utilizations.value.filter(u => u.availability_status === 'conflict').length)
const avgEventDurationHrs = computed(() => {
    const list = utilizations.value.filter(u => Number.isFinite(+u.duration_minutes))
    if (!list.length) return 0
    const minutes = list.reduce((s, u) => s + (+u.duration_minutes || 0), 0) / list.length
    return minutes / 60
})

/* Distinct clubs active (≥1 activity in current filter/SY if specified) */
const distinctClubsActive = computed(() => {
    const set = new Set(filteredActivities.value.map(a => a.club_id))
    return set.size
})

/* ---------- Drill-down helpers ---------- */
const toActivityList = (extraQuery = {}) => {
    router.push({ name: 'activity-designs', query: { ...filters.value, ...extraQuery } })
}

/* ---------- Pie charts ---------- */
const pieActivitiesByStatus = computed(() => {
    const map = { draft: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 }
    for (const a of filteredActivities.value) map[a.status] = (map[a.status] || 0) + 1
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

const pieActivitiesByNature = computed(() => {
    const map = { 'Curricular': 0, 'Co-Curricular': 0, 'Extra-Curricular': 0 }
    for (const a of filteredActivities.value) map[a.nature_of_activity] = (map[a.nature_of_activity] || 0) + 1
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

const pieActivitiesBySemester = computed(() => {
    const map = { '1st Semester': 0, '2nd Semester': 0, 'Summer': 0 }
    for (const a of filteredActivities.value) map[a.semester] = (map[a.semester] || 0) + 1
    const labels = Object.keys(map)
    return {
        labels,
        datasets: [{
            data: labels.map(l => map[l]),
            backgroundColor: labels.map((_, i) => pick(i + 2)),
            borderColor: labels.map(() => 'white'),
            borderWidth: 2,
        }]
    }
})

const pieApprovedVsNot = computed(() => {
    const approved = filteredActivities.value.filter(a => a.status === 'approved').length
    const notApproved = filteredActivities.value.length - approved
    return {
        labels: ['Approved', 'Not Approved'],
        datasets: [{
            data: [approved, notApproved],
            backgroundColor: [colorSet.emerald, colorSet.rose],
            borderColor: ['white', 'white'],
            borderWidth: 2,
        }]
    }
})

/* Liquidation: status mix */
const pieLFStatus = computed(() => {
    const statuses = ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed']
    const map = Object.fromEntries(statuses.map(s => [s, 0]))
    for (const l of liquidations.value) map[l.status] = (map[l.status] || 0) + 1
    return {
        labels: statuses,
        datasets: [{
            data: statuses.map(s => map[s] || 0),
            backgroundColor: statuses.map((_, i) => pick(i)),
            borderColor: statuses.map(() => 'white'),
            borderWidth: 2,
        }]
    }
})

/* Utilization availability mix */
const pieURAvailability = computed(() => {
    const labels = ['pending-check', 'available', 'conflict', 'reserved', 'maintenance', 'unknown']
    const map = Object.fromEntries(labels.map(s => [s, 0]))
    for (const u of utilizations.value) map[u.availability_status] = (map[u.availability_status] || 0) + 1
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

/* Liquidation sources mix (aggregate from JSON) */
const pieLFSourcesMix = computed(() => {
    const keys = ['contribution', 'payment_from_fines', 'solicitations', 'donations', 'other_sources', 'current_available_funds']
    const sums = Object.fromEntries(keys.map(k => [k, 0]))
    const safeParse = (t, fb) => { try { return JSON.parse(t || '') ?? fb } catch { return fb } }

    for (const l of liquidations.value) {
        const src = safeParse(l.sources_of_fund, {})
        for (const k of keys) sums[k] += +src[k] || 0
    }
    return {
        labels: keys,
        datasets: [{
            data: keys.map(k => sums[k]),
            backgroundColor: keys.map((_, i) => pick(i)),
            borderColor: keys.map(() => 'white'),
            borderWidth: 2,
        }]
    }
})

/* ---------- Bar charts ---------- */
const barTopClubsByActivities = computed(() => {
    const map = new Map()
    for (const a of filteredActivities.value) {
        const name = a.club?.name || `Club #${a.club_id}`
        map.set(name, (map.get(name) || 0) + 1)
    }
    const pairs = [...map.entries()].map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count).slice(0, 10)

    const labels = pairs.map(p => p.name)
    const data = pairs.map(p => p.count)
    return {
        labels,
        datasets: [{
            label: '# Activities', data,
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5
        }]
    }
})

const barTopClubsByBudget = computed(() => {
    const map = new Map()
    for (const a of filteredActivities.value) {
        const name = a.club?.name || `Club #${a.club_id}`
        map.set(name, (map.get(name) || 0) + (+a.proposed_budget || 0))
    }
    const pairs = [...map.entries()].map(([name, sum]) => ({ name, sum }))
        .sort((a, b) => b.sum - a.sum).slice(0, 10)

    const labels = pairs.map(p => p.name)
    const data = pairs.map(p => p.sum)
    return {
        labels,
        datasets: [{
            label: 'Proposed Budget', data,
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5
        }]
    }
})

const barOfficeByActivities = computed(() => {
    const map = {}
    for (const a of filteredActivities.value) {
        const k = a.office_department || '—'
        map[k] = (map[k] || 0) + 1
    }
    const labels = Object.keys(map).sort((a, b) => map[b] - map[a]).slice(0, 12)
    return {
        labels,
        datasets: [{
            label: '# Activities',
            data: labels.map(l => map[l]),
            backgroundColor: labels.map((_, i) => pickSoft(i)),
            borderColor: labels.map((_, i) => pick(i)),
            borderWidth: 1.5
        }]
    }
})

const barStatusByClubStacked = computed(() => {
    const clubsSet = new Set(filteredActivities.value.map(a => a.club?.name || `Club #${a.club_id}`))
    const labels = [...clubsSet].slice(0, 12) // top 12 for readability
    const statuses = ['draft', 'pending', 'approved', 'rejected', 'cancelled']
    const matrix = Object.fromEntries(statuses.map(s => [s, Array(labels.length).fill(0)]))

    for (const a of filteredActivities.value) {
        const name = a.club?.name || `Club #${a.club_id}`
        const idx = labels.indexOf(name)
        if (idx < 0) continue
        matrix[a.status][idx] += 1
    }

    const datasets = statuses.map((s, si) => ({
        label: s,
        data: matrix[s],
        backgroundColor: pickSoft(si),
        borderColor: pick(si),
        borderWidth: 1.2
    }))

    return { labels, datasets, stacked: true }
})

/* ---------- Line charts ---------- */
const lineActivitiesFiledOverTime = computed(() => {
    // monthly buckets for last 12 months
    const now = new Date()
    const buckets = []
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, y: d.getFullYear(), m: d.getMonth(), v: 0 })
    }
    const idx = new Map(buckets.map(b => [b.key, b]))
    for (const a of filteredActivities.value) {
        const d = toDate(a.date_filed || a.created_at)
        if (!d) continue
        const k = `${d.getFullYear()}-${d.getMonth()}`
        if (idx.has(k)) idx.get(k).v++
    }
    const labels = buckets.map(b => `${MONTHS[b.m]} ${String(b.y).slice(-2)}`)
    const data = buckets.map(b => b.v)
    return {
        labels,
        datasets: [{
            label: 'Activities filed',
            data,
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

/* ---------- Combined loading ---------- */
const anyLoading = computed(() =>
    bootLoading.value ||
    clubStore.isLoading || docStore.isLoading || userStore.isLoading ||
    adStore.isLoading || apStore.isLoading || lfStore.isLoading || urStore.isLoading
)
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Header -->
            <div class="mb-4">
                <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
                <p class="text-sm text-gray-500">Key metrics & trends across activities, funds, utilization, and clubs.
                </p>
            </div>

            <!-- Filters -->
            <div class="p-3 mb-5 rounded-2xl border bg-white">
                <div class="grid grid-cols-1 md:grid-cols-5 gap-2 text-sm">
                    <select v-model="filters.school_year" class="border rounded px-2 py-2">
                        <option value="">All School Years</option>
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>

                    <select v-model="filters.semester" class="border rounded px-2 py-2">
                        <option value="">All Semesters</option>
                        <option v-for="s in SEMESTERS" :key="s" :value="s">{{ s }}</option>
                    </select>

                    <input v-model="filters.office_department" placeholder="Office / Department"
                        class="border rounded px-2 py-2" />
                    <select v-model="filters.nature_of_activity" class="border rounded px-2 py-2">
                        <option value="">All Natures</option>
                        <option>Curricular</option>
                        <option>Co-Curricular</option>
                        <option>Extra-Curricular</option>
                    </select>
                    <select v-model="filters.status" class="border rounded px-2 py-2">
                        <option value="">All Statuses</option>
                        <option>draft</option>
                        <option>pending</option>
                        <option>approved</option>
                        <option>rejected</option>
                        <option>cancelled</option>
                    </select>
                </div>
            </div>

            <!-- KPI Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <!-- Total Activities -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList()">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Total Activities Filed</div>
                        <svg class="w-5 h-5 text-blue-500" viewBox="0 0 24 24">
                            <path :d="mdiClipboardList" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(totalActivities) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Filtered by controls above</div>
                </div>

                <!-- Approved Activities + delta -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList({ status: 'approved' })">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Approved Activities</div>
                        <svg class="w-5 h-5 text-emerald-600" viewBox="0 0 24 24">
                            <path :d="mdiCheckCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(approvedActivities) }}</div>
                    <div class="mt-1 text-xs flex items-center gap-1"
                        :class="prevWindowDelta.deltaAbs >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"
                            :class="prevWindowDelta.deltaAbs >= 0 ? 'text-emerald-600' : 'text-rose-600'">
                            <path :d="prevWindowDelta.deltaAbs >= 0 ? mdiTrendingUp : mdiTrendingDown" />
                        </svg>
                        <span>{{ prevWindowDelta.deltaAbs >= 0 ? '+' : '' }}{{ prevWindowDelta.deltaAbs }}</span>
                        <span>({{ prevWindowDelta.deltaPct.toFixed ? prevWindowDelta.deltaPct.toFixed(1) :
                            prevWindowDelta.deltaPct }}%) vs prev</span>
                    </div>
                </div>

                <!-- Approval Rate -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList()">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Approval Rate</div>
                        <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24">
                            <path :d="mdiPercentOutline" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ approvalRate }}</div>
                    <div class="mt-1 text-xs text-gray-500">On approved/pending/rejected/cancelled</div>
                </div>

                <!-- Pending -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList({ status: 'pending' })">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Pending Activities</div>
                        <svg class="w-5 h-5 text-amber-600" viewBox="0 0 24 24">
                            <path :d="mdiClockTimeEight" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(pendingActivities) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Awaiting decision</div>
                </div>

                <!-- Rejected -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList({ status: 'rejected' })">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Rejected</div>
                        <svg class="w-5 h-5 text-rose-600" viewBox="0 0 24 24">
                            <path :d="mdiAlertCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(rejectedActivities) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Decisions: reject</div>
                </div>

                <!-- Cancelled -->
                <div class="rounded-2xl border bg-white shadow-sm p-4 cursor-pointer hover:shadow"
                    @click="toActivityList({ status: 'cancelled' })">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Cancelled</div>
                        <svg class="w-5 h-5 text-slate-600" viewBox="0 0 24 24">
                            <path :d="mdiCloseCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(cancelledActivities) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Withdrawn activities</div>
                </div>

                <!-- This Week / This Month -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Activities This Week</div>
                        <svg class="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                            <path :d="mdiCalendarClock" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(activitiesThisWeek) }}</div>
                    <div class="mt-1 text-xs text-gray-500">This Month: {{ fmtInt(activitiesThisMonth) }}</div>
                </div>

                <!-- Upcoming 30 days -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Upcoming (30 Days)</div>
                        <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24">
                            <path :d="mdiCalendarMonth" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(upcoming30) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Implementation dates ahead</div>
                </div>

                <!-- Budget KPI -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Total Proposed Budget</div>
                        <svg class="w-5 h-5 text-emerald-600" viewBox="0 0 24 24">
                            <path :d="mdiCashMultiple" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">₱{{ currency(totalProposedBudget) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Average: ₱{{ currency(avgProposedBudget) }}</div>
                </div>

                <!-- Linkage -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Activities w/ Plan Link</div>
                        <svg class="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                            <path :d="mdiLinkVariant" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(linkedCount) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Share: {{ linkedPct }}</div>
                </div>

                <!-- Liquidation KPIs -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Liquidations Filed</div>
                        <svg class="w-5 h-5 text-amber-600" viewBox="0 0 24 24">
                            <path :d="mdiFileDocumentMultiple" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(totalLiquidations) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Completion: {{ liquidationCompletionRate }}</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Cash on Hand</div>
                        <svg class="w-5 h-5 text-emerald-600" viewBox="0 0 24 24">
                            <path :d="mdiCash" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">₱{{ currency(totalCashOnHand) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Sources: ₱{{ currency(totalSources) }} • Uses: ₱{{
                        currency(totalUses) }}</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Budget Variance</div>
                        <svg class="w-5 h-5 text-indigo-600" viewBox="0 0 24 24">
                            <path :d="mdiChartLine" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold"
                        :class="varianceVsProposed >= 0 ? 'text-rose-600' : 'text-emerald-600'">
                        {{ varianceVsProposed >= 0 ? '+' : '-' }}₱{{ currency(Math.abs(varianceVsProposed)) }}
                    </div>
                    <div class="mt-1 text-xs text-gray-500">{{ varianceVsProposed >= 0 ? 'Overspend' : 'Underspend' }}
                        vs proposed</div>
                </div>

                <!-- Utilization KPIs -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Facility Requests</div>
                        <svg class="w-5 h-5 text-blue-600" viewBox="0 0 24 24">
                            <path :d="mdiChartBar" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(totalUR) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Approval Rate: {{ utilizationApprovalRate }}</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Conflicts Detected</div>
                        <svg class="w-5 h-5 text-rose-600" viewBox="0 0 24 24">
                            <path :d="mdiAlertCircle" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(conflictsDetected) }}</div>
                    <div class="mt-1 text-xs text-gray-500">Schedule overlaps</div>
                </div>

                <!-- SLA + Distinct clubs -->
                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Avg Approval Time</div>
                        <svg class="w-5 h-5 text-slate-600" viewBox="0 0 24 24">
                            <path :d="mdiClockTimeEight" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ (avgApprovalDays || 0).toFixed(1) }} days
                    </div>
                    <div class="mt-1 text-xs text-gray-500">Approved activities only</div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm p-4">
                    <div class="flex items-center justify-between">
                        <div class="text-sm text-gray-500">Distinct Clubs Active</div>
                        <svg class="w-5 h-5 text-emerald-600" viewBox="0 0 24 24">
                            <path :d="mdiAccountGroup" />
                        </svg>
                    </div>
                    <div class="mt-2 text-2xl font-semibold text-gray-900">{{ fmtInt(distinctClubsActive) }}</div>
                    <div class="mt-1 text-xs text-gray-500">With ≥ 1 filtered activity</div>
                </div>
            </div>

            <!-- Sections -->
            <div class="mt-6 grid grid-cols-1 xl:grid-cols-3 gap-6">
                <!-- ACTIVITIES: pies -->
                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Activities by Status
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieActivitiesByStatus" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Activities by Nature
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieActivitiesByNature" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Activities by Semester
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieActivitiesBySemester" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <!-- ACTIVITIES: bars -->
                <div class="rounded-2xl border bg-white shadow-sm xl:col-span-2">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-blue-600" viewBox="0 0 24 24">
                                <path :d="mdiChartBar" />
                            </svg>
                            Top Clubs by # of Activities
                        </h3>
                    </div>
                    <div class="p-4">
                        <div>
                            <BarChart :data="barTopClubsByActivities" :loading="anyLoading" :horizontal="true" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24">
                                <path :d="mdiChartBar" />
                            </svg>
                            Office / Department by # Activities
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-80">
                            <BarChart :data="barOfficeByActivities" :loading="anyLoading" :horizontal="true" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-amber-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Liquidation by Status
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieLFStatus" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-emerald-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Liquidation by Source
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieLFSourcesMix" :loading="anyLoading" />
                        </div>
                    </div>
                </div>

                <div class="rounded-2xl border bg-white shadow-sm">
                    <div class="px-4 py-3 border-b flex items-center justify-between">
                        <h3 class="text-sm font-semibold text-gray-800 flex items-center gap-2">
                            <svg class="w-4 h-4 text-indigo-600" viewBox="0 0 24 24">
                                <path :d="mdiChartDonut" />
                            </svg>
                            Utilization by Availability
                        </h3>
                    </div>
                    <div class="p-4">
                        <div class="h-72">
                            <DoughnutChart :data="pieURAvailability" :loading="anyLoading" />
                        </div>
                    </div>
                </div>



            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>
