<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import BarChart from '@/components/Charts/BarChart.vue'
import DoughnutChart from '@/components/Charts/DoughnutChart.vue'
import LineChart from '@/components/Charts/LineChart.vue'
import dashboardService from '@/services/dashboard/dashboardService'

import {
  mdiAccountGroup,
  mdiAlertCircle,
  mdiCalendarClock,
  mdiCash,
  mdiChartBar,
  mdiChartLine,
  mdiCheckCircle,
  mdiClipboardList,
  mdiClockTimeEight,
  mdiFileDocumentMultiple,
  mdiLinkVariant,
  mdiPercentOutline,
  mdiTrendingDown,
  mdiTrendingUp,
} from '@mdi/js'

const router = useRouter()
const analytics = ref(null)
const loading = ref(true)
const loadError = ref('')

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const STATUS_ORDER = ['draft', 'pending', 'approved', 'rejected', 'cancelled']
const palette = [
  'rgba(59,130,246,0.85)',
  'rgba(99,102,241,0.85)',
  'rgba(16,185,129,0.85)',
  'rgba(245,158,11,0.85)',
  'rgba(244,63,94,0.85)',
  'rgba(100,116,139,0.85)',
]
const paletteSoft = [
  'rgba(59,130,246,0.15)',
  'rgba(99,102,241,0.15)',
  'rgba(16,185,129,0.15)',
  'rgba(245,158,11,0.15)',
  'rgba(244,63,94,0.15)',
  'rgba(100,116,139,0.15)',
]

const filters = ref({
  school_year: '',
  semester: '',
  office_department: '',
  nature_of_activity: '',
  status: '',
})

const number = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
const fmtInt = (value) => number(value).toLocaleString()
const money = (value) =>
  number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const pct = (num, den) => (den > 0 ? `${((number(num) / number(den)) * 100).toFixed(1)}%` : '0%')
const toDate = (value) => {
  const d = value ? new Date(value) : null
  return d && !Number.isNaN(d.getTime()) ? d : null
}
const daysBetween = (a, b) => {
  const first = toDate(a)
  const second = toDate(b)
  return first && second ? Math.round((first - second) / 86400000) : null
}
const pick = (index) => palette[index % palette.length]
const pickSoft = (index) => paletteSoft[index % paletteSoft.length]

function pie(entries = [], offset = 0) {
  return {
    labels: entries.map((entry) => entry.label),
    datasets: [{
      data: entries.map((entry) => number(entry.value)),
      backgroundColor: entries.map((_, index) => pick(index + offset)),
      borderColor: entries.map(() => 'white'),
      borderWidth: 2,
    }],
  }
}

function bar(entries = [], label) {
  return {
    labels: entries.map((entry) => entry.label),
    datasets: [{
      label,
      data: entries.map((entry) => number(entry.value)),
      backgroundColor: entries.map((_, index) => pickSoft(index)),
      borderColor: entries.map((_, index) => pick(index)),
      borderWidth: 1.5,
    }],
  }
}

function line(entries = [], label, borderColor, backgroundColor) {
  return {
    labels: entries.map((entry) => entry.label),
    datasets: [{
      label,
      data: entries.map((entry) => number(entry.value)),
      borderColor,
      backgroundColor,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 4,
      tension: 0.3,
      fill: true,
    }],
  }
}

async function fetchAnalytics() {
  loadError.value = ''
  loading.value = true
  try {
    analytics.value = await dashboardService.analytics()
  } catch (error) {
    loadError.value =
      error?.response?.data?.message ||
      error?.message ||
      'Failed to load dashboard analytics'
  } finally {
    loading.value = false
  }
}

onMounted(fetchAnalytics)

const summary = computed(() => analytics.value?.summary || {})
const charts = computed(() => analytics.value?.charts || {})
const activities = computed(() => analytics.value?.activityRecords || [])
const clubNamesById = computed(() => charts.value.clubNamesById || {})

const schoolYearOptions = computed(() => [...new Set(activities.value.map((row) => row.school_year).filter(Boolean))].sort((a, b) => b.localeCompare(a)))
const officeOptions = computed(() => [...new Set(activities.value.map((row) => row.office_department).filter(Boolean))].sort((a, b) => a.localeCompare(b)))

const filteredActivities = computed(() =>
  activities.value.filter((row) => {
    const f = filters.value
    if (f.school_year && row.school_year !== f.school_year) return false
    if (f.semester && row.semester !== f.semester) return false
    if (f.office_department && row.office_department !== f.office_department) return false
    if (f.nature_of_activity && row.nature_of_activity !== f.nature_of_activity) return false
    if (f.status && row.status !== f.status) return false
    return true
  })
)

const totalActivities = computed(() => filteredActivities.value.length)
const approvedActivities = computed(() => filteredActivities.value.filter((row) => row.status === 'approved').length)
const pendingActivities = computed(() => filteredActivities.value.filter((row) => row.status === 'pending').length)
const rejectedActivities = computed(() => filteredActivities.value.filter((row) => row.status === 'rejected').length)
const cancelledActivities = computed(() => filteredActivities.value.filter((row) => row.status === 'cancelled').length)
const linkedActivities = computed(() => filteredActivities.value.filter((row) => row.annual_plan_id != null).length)
const approvalRate = computed(() => pct(approvedActivities.value, approvedActivities.value + pendingActivities.value + rejectedActivities.value + cancelledActivities.value))

const prevApprovedDelta = computed(() => {
  const f = filters.value
  const previousSemester = (sy, sem) => {
    const idx = SEMESTERS.indexOf(sem)
    if (idx <= 0) {
      const startYear = Number(String(sy).split('-')[0] || 0)
      return { school_year: `${startYear - 1}-${startYear}`, semester: 'Summer' }
    }
    return { school_year: sy, semester: SEMESTERS[idx - 1] }
  }

  let currentMatcher = () => true
  let previousMatcher = () => true

  if (f.school_year && f.semester) {
    const previous = previousSemester(f.school_year, f.semester)
    currentMatcher = (row) => row.school_year === f.school_year && row.semester === f.semester
    previousMatcher = (row) => row.school_year === previous.school_year && row.semester === previous.semester
  } else if (f.school_year) {
    const startYear = Number(String(f.school_year).split('-')[0] || 0)
    const previousSchoolYear = `${startYear - 1}-${startYear}`
    currentMatcher = (row) => row.school_year === f.school_year
    previousMatcher = (row) => row.school_year === previousSchoolYear
  }

  const current = activities.value.filter((row) => currentMatcher(row) && row.status === 'approved').length
  const previous = activities.value.filter((row) => previousMatcher(row) && row.status === 'approved').length
  const deltaAbs = current - previous
  const deltaPct = previous > 0 ? (deltaAbs / previous) * 100 : (current > 0 ? 100 : 0)
  return { deltaAbs, deltaPct }
})

const now = new Date()
const startOfWeek = (() => {
  const date = new Date()
  const day = date.getDay() || 7
  if (day !== 1) date.setHours(-24 * (day - 1))
  date.setHours(0, 0, 0, 0)
  return date
})()
const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6, 23, 59, 59, 999)
const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
const inRange = (value, start, end) => {
  const date = toDate(value)
  return date && date >= start && date <= end
}

const activitiesThisWeek = computed(() => filteredActivities.value.filter((row) => inRange(row.date_of_implementation, startOfWeek, endOfWeek)).length)
const activitiesThisMonth = computed(() => filteredActivities.value.filter((row) => inRange(row.date_of_implementation, startOfMonth, endOfMonth)).length)
const upcoming30 = computed(() => filteredActivities.value.filter((row) => {
  const date = toDate(row.date_of_implementation)
  if (!date) return false
  const diff = (date - now) / 86400000
  return diff >= 0 && diff <= 30
}).length)

const totalProposedBudget = computed(() => filteredActivities.value.reduce((sum, row) => sum + number(row.proposed_budget), 0))
const avgProposedBudget = computed(() => (filteredActivities.value.length ? totalProposedBudget.value / filteredActivities.value.length : 0))
const avgApprovalDays = computed(() => {
  const rows = filteredActivities.value.filter((row) => row.status === 'approved' && row.approved_at && row.date_filed)
  if (!rows.length) return 0
  return rows.reduce((sum, row) => sum + (daysBetween(row.approved_at, row.date_filed) ?? 0), 0) / rows.length
})
const distinctClubsActive = computed(() => new Set(filteredActivities.value.map((row) => row.club_id)).size)
const totalClubs = computed(() => number(summary.value.totalClubs))
const activeClubs = computed(() => number(summary.value.activeClubs))
const totalUsers = computed(() => number(summary.value.totalUsers))
const totalDocs = computed(() => number(summary.value.totalDocs))

const topClubsByActivities = computed(() => {
  const counts = new Map()
  for (const row of filteredActivities.value) {
    const label = row.club?.name || clubNamesById.value[String(row.club_id)] || `Club #${row.club_id}`
    counts.set(label, number(counts.get(label)) + 1)
  }
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)
})

const officeByActivities = computed(() => {
  const counts = {}
  for (const row of filteredActivities.value) {
    const label = row.office_department || 'N/A'
    counts[label] = number(counts[label]) + 1
  }
  return Object.entries(counts)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 12)
})

const activitiesByStatusChart = computed(() => pie(STATUS_ORDER.map((label) => ({
  label,
  value: filteredActivities.value.filter((row) => row.status === label).length,
}))))
const activitiesByNatureChart = computed(() => pie(['Curricular', 'Co-Curricular', 'Extra-Curricular'].map((label) => ({
  label,
  value: filteredActivities.value.filter((row) => row.nature_of_activity === label).length,
})), 1))
const activitiesBySemesterChart = computed(() => pie(SEMESTERS.map((label) => ({
  label,
  value: filteredActivities.value.filter((row) => row.semester === label).length,
})), 2))

const metricCards = computed(() => [
  { title: 'Total Activities Filed', value: fmtInt(totalActivities.value), meta: 'Filtered by controls above', icon: mdiClipboardList, tone: 'text-blue-500', click: {} },
  { title: 'Approved Activities', value: fmtInt(approvedActivities.value), meta: `${prevApprovedDelta.value.deltaAbs >= 0 ? '+' : ''}${prevApprovedDelta.value.deltaAbs} (${Number(prevApprovedDelta.value.deltaPct).toFixed(1)}%) vs prev`, icon: prevApprovedDelta.value.deltaAbs >= 0 ? mdiTrendingUp : mdiTrendingDown, tone: prevApprovedDelta.value.deltaAbs >= 0 ? 'text-emerald-600' : 'text-rose-600', click: { status: 'approved' } },
  { title: 'Approval Rate', value: approvalRate.value, meta: 'On approved/pending/rejected/cancelled', icon: mdiPercentOutline, tone: 'text-indigo-600', click: {} },
  { title: 'Pending Activities', value: fmtInt(pendingActivities.value), meta: 'Awaiting decision', icon: mdiClockTimeEight, tone: 'text-amber-600', click: { status: 'pending' } },
  { title: 'Rejected Activities', value: fmtInt(rejectedActivities.value), meta: 'Needs rework or closure', icon: mdiAlertCircle, tone: 'text-rose-600', click: { status: 'rejected' } },
  { title: 'Cancelled Activities', value: fmtInt(cancelledActivities.value), meta: 'Moved back or cancelled', icon: mdiAlertCircle, tone: 'text-slate-600', click: { status: 'cancelled' } },
  { title: 'Activities This Week', value: fmtInt(activitiesThisWeek.value), meta: `This Month: ${fmtInt(activitiesThisMonth.value)}`, icon: mdiCalendarClock, tone: 'text-blue-600' },
  { title: 'Upcoming 30 Days', value: fmtInt(upcoming30.value), meta: 'By implementation date', icon: mdiCalendarClock, tone: 'text-indigo-600' },
  { title: 'Proposed Budget', value: `PHP ${money(totalProposedBudget.value)}`, meta: `Average: PHP ${money(avgProposedBudget.value)}`, icon: mdiCash, tone: 'text-emerald-600' },
  { title: 'Activities w/ Plan Link', value: fmtInt(linkedActivities.value), meta: `Share: ${pct(linkedActivities.value, totalActivities.value)}`, icon: mdiLinkVariant, tone: 'text-blue-600' },
  { title: 'Approved Annual Plans', value: fmtInt(summary.value.approvedPlansCount), meta: 'Server-side count', icon: mdiCheckCircle, tone: 'text-emerald-600' },
  { title: 'Liquidations Filed', value: fmtInt(summary.value.totalLiquidations), meta: `Completion: ${pct(summary.value.completedLiquidations, summary.value.totalLiquidations)}`, icon: mdiFileDocumentMultiple, tone: 'text-amber-600' },
  { title: 'Cash on Hand', value: `PHP ${money(summary.value.totalCashOnHand)}`, meta: `Sources: PHP ${money(summary.value.totalSources)} | Uses: PHP ${money(summary.value.totalUses)}`, icon: mdiCash, tone: 'text-emerald-600' },
  { title: 'Budget Variance', value: `${number(summary.value.varianceVsProposed) >= 0 ? '+' : '-'}PHP ${money(Math.abs(number(summary.value.varianceVsProposed)))}`, meta: number(summary.value.varianceVsProposed) >= 0 ? 'Overspend vs proposed' : 'Underspend vs proposed', icon: mdiChartLine, tone: number(summary.value.varianceVsProposed) >= 0 ? 'text-rose-600' : 'text-emerald-600' },
  { title: 'Facility Requests', value: fmtInt(summary.value.totalUtilizationRequests), meta: `Approval Rate: ${pct(summary.value.approvedUtilizationRequests, summary.value.totalUtilizationRequests)}`, icon: mdiChartBar, tone: 'text-blue-600' },
  { title: 'Conflicts Detected', value: fmtInt(summary.value.conflictsDetected), meta: `Average duration: ${number(summary.value.avgEventDurationHrs).toFixed(2)} hrs`, icon: mdiAlertCircle, tone: 'text-rose-600' },
  { title: 'Users Without Clubs', value: fmtInt(summary.value.usersWithoutClub), meta: `Out of ${fmtInt(totalUsers.value)} users`, icon: mdiAccountGroup, tone: 'text-slate-600' },
  { title: 'Clubs Without Members', value: fmtInt(summary.value.clubsWithoutMembers), meta: `Active clubs: ${fmtInt(activeClubs.value)} / ${fmtInt(totalClubs.value)}`, icon: mdiAccountGroup, tone: 'text-amber-600' },
  { title: 'Avg Activities / Club', value: (totalClubs.value ? totalActivities.value / totalClubs.value : 0).toFixed(2), meta: `Documents indexed: ${fmtInt(totalDocs.value)}`, icon: mdiChartLine, tone: 'text-indigo-600' },
  { title: 'Grievances Filed', value: fmtInt(summary.value.totalGrievances), meta: `Open: ${fmtInt(summary.value.openGrievances)}`, icon: mdiAlertCircle, tone: 'text-rose-600' },
  { title: 'Avg Approval Time', value: `${avgApprovalDays.value.toFixed(1)} days`, meta: 'Approved activities only', icon: mdiClockTimeEight, tone: 'text-slate-600' },
  { title: 'Distinct Clubs Active', value: fmtInt(distinctClubsActive.value), meta: 'With at least 1 filtered activity', icon: mdiAccountGroup, tone: 'text-emerald-600' },
])

const chartCards = computed(() => [
  { title: 'Users by Role', component: DoughnutChart, props: { data: pie(charts.value.usersByRole || []), loading }, className: 'h-72' },
  { title: 'Top Clubs by # of Members', component: BarChart, props: { data: bar(charts.value.topClubsByMembers || [], '# Members'), loading, horizontal: true }, className: 'h-72 xl:col-span-2' },
  { title: 'Activities by Status', component: DoughnutChart, props: { data: activitiesByStatusChart.value, loading }, className: 'h-72' },
  { title: 'Activities by Nature', component: DoughnutChart, props: { data: activitiesByNatureChart.value, loading }, className: 'h-72' },
  { title: 'Activities by Semester', component: DoughnutChart, props: { data: activitiesBySemesterChart.value, loading }, className: 'h-72' },
  { title: 'Top Clubs by # of Activities', component: BarChart, props: { data: bar(topClubsByActivities.value, '# Activities'), loading, horizontal: true }, className: 'h-72 xl:col-span-2' },
  { title: 'Grievances by Status', component: DoughnutChart, props: { data: pie(charts.value.grievancesByStatus || []), loading }, className: 'h-72' },
  { title: 'Office / Department by # Activities', component: BarChart, props: { data: bar(officeByActivities.value, '# Activities'), loading, horizontal: true }, className: 'h-80' },
  { title: 'Liquidation by Status', component: DoughnutChart, props: { data: pie(charts.value.liquidationsByStatus || []), loading }, className: 'h-72' },
  { title: 'Liquidation by Source', component: DoughnutChart, props: { data: pie(charts.value.liquidationSourcesMix || []), loading }, className: 'h-72' },
  { title: 'Utilization by Availability', component: DoughnutChart, props: { data: pie(charts.value.utilizationsByAvailability || []), loading }, className: 'h-72' },
])

const trendCharts = computed(() => [
  { title: 'Liquidations filed', data: line(charts.value.liquidationsByMonth || [], 'Liquidations filed', palette[2], paletteSoft[2]) },
  { title: 'Utilization requests', data: line(charts.value.utilizationsByMonth || [], 'Utilization requests', palette[0], paletteSoft[0]) },
  { title: 'Grievances filed', data: line(charts.value.grievancesByMonth || [], 'Grievances filed', palette[4], paletteSoft[4]) },
])

function openActivityList(extraQuery = {}) {
  router.push({ name: 'activity-designs', query: { ...filters.value, ...extraQuery } })
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="mb-4">
        <h1 class="text-xl font-semibold text-gray-900">Dashboard</h1>
        <p class="text-sm text-gray-500">Lean analytics payloads for faster loading and rendering.</p>
      </div>

      <div v-if="loadError" class="mb-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ loadError }}
      </div>

      <div class="mb-5 rounded-2xl border bg-white p-3">
        <div class="grid grid-cols-1 gap-2 text-sm md:grid-cols-5">
          <select v-model="filters.school_year" class="rounded border px-2 py-2">
            <option value="">All School Years</option>
            <option v-for="schoolYear in schoolYearOptions" :key="schoolYear" :value="schoolYear">{{ schoolYear }}</option>
          </select>
          <select v-model="filters.semester" class="rounded border px-2 py-2">
            <option value="">All Semesters</option>
            <option v-for="semester in SEMESTERS" :key="semester" :value="semester">{{ semester }}</option>
          </select>
          <select v-model="filters.office_department" class="rounded border px-2 py-2">
            <option value="">All Offices / Departments</option>
            <option v-for="office in officeOptions" :key="office" :value="office">{{ office }}</option>
          </select>
          <select v-model="filters.nature_of_activity" class="rounded border px-2 py-2">
            <option value="">All Natures</option>
            <option>Curricular</option>
            <option>Co-Curricular</option>
            <option>Extra-Curricular</option>
          </select>
          <select v-model="filters.status" class="rounded border px-2 py-2">
            <option value="">All Statuses</option>
            <option v-for="status in STATUS_ORDER" :key="status">{{ status }}</option>
          </select>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div
          v-for="card in metricCards"
          :key="card.title"
          class="rounded-2xl border bg-white p-4 shadow-sm"
          :class="card.click ? 'cursor-pointer hover:shadow' : ''"
          @click="card.click ? openActivityList(card.click) : null"
        >
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-500">{{ card.title }}</div>
            <svg class="h-5 w-5" :class="card.tone" viewBox="0 0 24 24"><path :d="card.icon" /></svg>
          </div>
          <div class="mt-2 text-2xl font-semibold" :class="card.tone.includes('text-') ? card.tone.replace('h-5 w-5 ', '') : 'text-gray-900'">
            {{ card.value }}
          </div>
          <div class="mt-1 text-xs text-gray-500">{{ card.meta }}</div>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div
          v-for="card in chartCards"
          :key="card.title"
          class="rounded-2xl border bg-white shadow-sm"
          :class="card.className.includes('xl:col-span-2') ? 'xl:col-span-2' : ''"
        >
          <div class="border-b px-4 py-3 text-sm font-semibold text-gray-800">{{ card.title }}</div>
          <div class="p-4">
            <div :class="card.className.replace(' xl:col-span-2', '')">
              <component :is="card.component" v-bind="card.props" />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border bg-white shadow-sm xl:col-span-3">
          <div class="border-b px-4 py-3 text-sm font-semibold text-gray-800">Filing Trends (12 months)</div>
          <div class="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
            <div v-for="item in trendCharts" :key="item.title" class="h-64">
              <LineChart :data="item.data" :loading="loading" />
            </div>
          </div>
        </div>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
</template>
