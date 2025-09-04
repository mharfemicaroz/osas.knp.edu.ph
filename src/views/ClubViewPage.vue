<!-- src/views/ClubViewPage.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import { useClubStore } from '@/stores/club'
import { useAuthStore } from '@/stores/auth'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useAnnualPlanStore } from '@/stores/annualPlan'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import Badge from '@/components/commons/Badge.vue'
import EventDetailsModal from '@/components/commons/EventDetailsModal.vue'
import {
    mdiAccountGroup,
    mdiCalendar,
    mdiEmail,
    mdiLinkVariant,
    mdiPhone,
    mdiAccount,
    mdiRefresh,
} from '@mdi/js'

const route = useRoute()
const clubStore = useClubStore()
const auth = useAuthStore()
const adStore = useActivityDesignStore()
const urStore = useUtilizationRequestStore()
const apStore = useAnnualPlanStore()
const timeZone = 'Asia/Manila'

const API_ROOT = import.meta.env.VITE_API_ROOT_URL || ''

// ---- Fetch club by id from route ----
const clubId = computed(() => route.params.id)
const loading = ref(false)
onMounted(async () => {
    if (clubId.value) {
        loading.value = true
        try {
            await clubStore.fetchById(clubId.value)
            // Prefetch club-scoped approved items for calendar
            await Promise.allSettled([
                adStore.fetchAll({ status: 'approved', club_id: clubId.value, limit: 500, order: 'ASC', sort: 'date_of_implementation' }, true),
                urStore.fetchAll({ status: 'approved', club_id: clubId.value, limit: 500, order: 'ASC', sort: 'start_at' }, true),
                apStore.fetchAll({ status: 'approved', club_id: clubId.value, limit: 500, order: 'ASC', sort: 'approved_at' }, true),
            ])
        } finally {
            loading.value = false
        }
    }
})

// ---- Club data (fallback-safe) ----
const club = computed(() => clubStore.selectedClub || {})

const mediaSrc = (v) => {
    if (!v) return ''
    return v.startsWith?.('data:') || v.startsWith?.('http') ? v : `${API_ROOT}${v}`
}
const bannerUrl = computed(() => mediaSrc(club.value.banner || ''))
const logoUrl = computed(() => mediaSrc(club.value.logo || ''))

const clubName = computed(() => club.value.name || '—')
const clubCode = computed(() => club.value.code || '')
const clubCategory = computed(() => club.value.category || '')
const clubDesc = computed(() => club.value.description || '')
const establishedAt = computed(() =>
    club.value.established_at ? new Date(club.value.established_at) : null
)
const website = computed(() => club.value.website || '')
const email = computed(() => club.value.email || '')
const phone = computed(() => club.value.phone || '')
const isActive = computed(() => club.value.is_active !== false)

// ---- Members (users on the club with through UserClub) ----
const membersRaw = computed(() => (Array.isArray(club.value.users) ? club.value.users : []))

const ROLE_ORDER = [
    'president',
    'vice-president',
    'secretary',
    'treasurer',
    'pio',
    'business manager',
    'bod',
    'officer',
]
const normalizeRole = (r) => (r ?? 'member').toString().trim().toLowerCase() || 'member'
const roleRank = (r) => {
    const n = normalizeRole(r)
    if (n === 'member') return 999
    const i = ROLE_ORDER.indexOf(n)
    return i === -1 ? ROLE_ORDER.indexOf('officer') : i
}
const initials = (name) =>
    (name || '')
        .split(' ')
        .filter(Boolean)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
const niceDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return isNaN(d) ? '—' : d.toLocaleDateString()
}

// filters/search/sort
const memberSearch = ref('')
const roleView = ref('all') // all | officers | members
const statusView = ref('all') // all | pending | active | inactive

const isOfficer = (u) => {
    const r = normalizeRole(u?.UserClub?.role)
    return r !== 'member'
}
const normalizeStatus = (s) => {
    const v = (s ?? 'active').toString().trim().toLowerCase()
    return ['pending', 'active', 'inactive'].includes(v) ? v : 'active'
}
const matchesQuery = (u, q) => {
    if (!q) return true
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const username = (u.username || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(q) || username.includes(q) || email.includes(q)
}

const membersFiltered = computed(() => {
    const q = memberSearch.value.trim().toLowerCase()
    let base = membersRaw.value.slice()
    if (roleView.value === 'officers') base = base.filter(isOfficer)
    else if (roleView.value === 'members') base = base.filter((u) => !isOfficer(u))
    if (statusView.value !== 'all')
        base = base.filter((u) => normalizeStatus(u?.UserClub?.status) === statusView.value)
    if (q) base = base.filter((u) => matchesQuery(u, q))
    return base.sort((a, b) => {
        const ra = roleRank(a?.UserClub?.role)
        const rb = roleRank(b?.UserClub?.role)
        if (ra !== rb) return ra - rb
        const al = (a.last_name || '').toLowerCase()
        const bl = (b.last_name || '').toLowerCase()
        if (al !== bl) return al.localeCompare(bl)
        const af = (a.first_name || '').toLowerCase()
        const bf = (b.first_name || '').toLowerCase()
        if (af !== bf) return af.localeCompare(bf)
        return (a.username || '').toLowerCase().localeCompare((b.username || '').toLowerCase())
    })
})

const officersCount = computed(() => (membersRaw.value || []).filter(isOfficer).length)
const membersCountOnly = computed(() => (membersRaw.value || []).filter((u) => !isOfficer(u)).length)

// pagination (client-side)
const page = ref(1)
const pageSize = ref(12)
watch([memberSearch, roleView, statusView], () => {
    page.value = 1
})
const totalPages = computed(() =>
    Math.max(1, Math.ceil((membersFiltered.value.length || 0) / pageSize.value))
)
const membersPage = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return membersFiltered.value.slice(start, start + pageSize.value)
})

/* NEW: open profile in new tab */
const openProfile = (userId) => {
    if (!userId) return
    window.open(`/#/profile/${userId}`, '_self')
}

// ---------------- Club Calendar (Annual Plans, Activity Designs, Utilizations) ----------------
const showAD = ref(true)
const showUR = ref(true)
const showAP = ref(true)

function parseJSONSafe(s, fb = []) { try { return JSON.parse(s || '[]') } catch { return fb } }
function colorByType(type) {
    // Force crisp, dark palettes for strong contrast
    if (type === 'AD') return { backgroundColor: '#1e40af', borderColor: '#1e3a8a', textColor: '#ffffff' } // blue-800/900
    if (type === 'UR') return { backgroundColor: '#047857', borderColor: '#065f46', textColor: '#ffffff' } // emerald-700/800
    return { backgroundColor: '#b45309', borderColor: '#92400e', textColor: '#ffffff' }                   // amber-700/800
}

const events = computed(() => {
    const list = []
    if (showAD.value) {
        for (const r of adStore.items.data || []) {
            const status = String(r?.status || '').toLowerCase()
            const cid = Number(r?.club_id || r?.club?.id)
            if (status !== 'approved') continue
            if (Number(clubId.value) && cid !== Number(clubId.value)) continue
            const start = r?.date_of_implementation || r?.approved_at || r?.created_at
            if (!start) continue
            const { backgroundColor, borderColor, textColor } = colorByType('AD')
            list.push({
                id: `AD-${r.id}`, title: `Activity: ${r.name_of_activity || r.reference_code}`,
                start, allDay: true, extendedProps: { type: 'Activity Design', ref: r.reference_code, club: r?.club, record: r }, backgroundColor, borderColor, textColor
            })
        }
    }
    if (showUR.value) {
        for (const r of urStore.items.data || []) {
            const status = String(r?.status || '').toLowerCase()
            if (status !== 'approved') continue
            const cid = Number(r?.activity_design?.club_id || r?.club_id)
            if (Number(clubId.value) && cid !== Number(clubId.value)) continue
            const start = r?.start_at || r?.approved_at || r?.created_at
            const end = r?.end_at || r?.start_at || r?.approved_at
            if (!start) continue
            const fac = Array.isArray(r?.facilities) ? r.facilities : parseJSONSafe(r?.facilities)
            const facTxt = fac?.length ? ` • ${fac.join(', ')}` : ''
            const act = r?.activity_design?.name_of_activity ? ` • ${r.activity_design.name_of_activity}` : ''
            const { backgroundColor, borderColor, textColor } = colorByType('UR')
            list.push({
                id: `UR-${r.id}`, title: `Utilization${act}${facTxt}`, start, end, allDay: !r?.start_at || !r?.end_at,
                extendedProps: { type: 'Utilization', ref: r.reference_code, facilities: fac, record: r }, backgroundColor, borderColor, textColor
            })
        }
    }
    if (showAP.value) {
        for (const r of apStore.items.data || []) {
            const status = String(r?.status || '').toLowerCase()
            const cid = Number(r?.club_id || r?.club?.id)
            if (status !== 'approved') continue
            if (Number(clubId.value) && cid !== Number(clubId.value)) continue
            const start = r?.approved_at || r?.submitted_at || r?.created_at
            if (!start) continue
            const sy = r?.school_year ? ` • SY ${r.school_year}` : ''
            const { backgroundColor, borderColor, textColor } = colorByType('AP')
            list.push({
                id: `AP-${r.id}`, title: `Annual Plan Approved${sy}`, start, allDay: true,
                extendedProps: { type: 'Annual Plan', ref: r.reference_code, record: r }, backgroundColor, borderColor, textColor
            })
        }
    }
    return list
})

function eventDidMount(info) {
    const isList = !!info.el.closest('.fc-list')

    // Determine contrast based on event background color
    const bg = (info.event.backgroundColor || '').trim().toLowerCase()
    const hex = bg.startsWith('#') ? bg.slice(1) : null
    let useLightText = true
    if (hex && (hex.length === 6 || hex.length === 3)) {
        const hx = hex.length === 3 ? hex.split('').map((c) => c + c).join('') : hex
        const r = parseInt(hx.slice(0, 2), 16)
        const g = parseInt(hx.slice(2, 4), 16)
        const b = parseInt(hx.slice(4, 6), 16)
        // Perceived luminance
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
        useLightText = lum < 0.6
    }

    if (!isList) {
        info.el.classList.add('rounded-md', 'shadow-sm')
        info.el.classList.remove('text-white', 'text-gray-900')
        info.el.classList.add(useLightText ? 'text-white' : 'text-gray-900')
    } else {
        info.el.classList.remove('text-white')
        info.el.classList.add('text-gray-900')
    }

    // Badge for type
    const badge = document.createElement('span')
    badge.textContent = info.event.extendedProps?.type || ''
    if (isList) {
        badge.className = 'mr-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-200 text-slate-700'
        const titleCell = info.el.querySelector('.fc-list-event-title')
        const link = titleCell?.querySelector('a') || titleCell
        link?.prepend(badge)
    } else {
        badge.className = `px-1.5 py-0.5 text-[10px] font-semibold rounded mr-1 align-middle ${useLightText ? 'bg-white/20 text-white' : 'bg-black/10 text-gray-900'}`
        info.el.prepend(badge)
    }
}

const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    height: 'auto', stickyHeaderDates: true, dayMaxEvents: 3, navLinks: true,
    // Force block rendering so background/text colors apply (not dot style)
    eventDisplay: 'block',
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: true },
    timeZone, events: events.value, eventDidMount, eventClick: onEventClick,
}))

const showEventModal = ref(false)
const selectedEvent = ref(null)
function onEventClick(info) {
    try {
        const ev = info?.event
        selectedEvent.value = {
            id: ev?.id,
            title: ev?.title,
            start: ev?.start,
            end: ev?.end,
            allDay: ev?.allDay,
            backgroundColor: ev?.backgroundColor,
            borderColor: ev?.borderColor,
            textColor: ev?.textColor,
            extendedProps: { ...(ev?.extendedProps || {}) },
        }
        showEventModal.value = true
    } catch (e) { /* noop */ }
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Cover + Logo header -->
            <div class="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
                <!-- Banner -->
                <div class="relative h-48 sm:h-80 md:h-[360px] w-full bg-gray-100 rounded-t-2xl overflow-hidden">
                    <img v-if="bannerUrl" :src="bannerUrl" alt="Banner" class="h-full w-full object-cover" />
                    <div v-else
                        class="flex h-full w-full items-center justify-center bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-500">
                        <span class="text-sm">No banner</span>
                    </div>
                </div>

                <!-- Logo + Basic info -->
                <div class="relative px-4 sm:px-6 pb-5">
                    <div class="-mt-10 sm:-mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <!-- Logo -->
                        <div
                            class="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl border-4 border-white bg-gray-100 overflow-hidden shadow">
                            <img v-if="logoUrl" :src="logoUrl" alt="Logo" class="h-full w-full object-cover" />
                            <div v-else
                                class="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 font-semibold">
                                {{ initials(clubName) }}
                            </div>
                        </div>

                        <!-- Texts -->
                        <div class="mt-2 sm:mt-11">
                            <div class="text-xl font-semibold text-gray-900">{{ clubName }}</div>
                            <div class="text-sm text-gray-500">@{{ clubCode }}</div>
                            <div v-if="clubCategory"
                                class="mt-1 inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                                {{ clubCategory }}
                            </div>
                            <div class="mt-2 text-xs text-gray-500 inline-flex items-center gap-3 flex-wrap">
                                <span v-if="establishedAt" class="inline-flex items-center gap-1">
                                    <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                        <path :d="mdiCalendar" />
                                    </svg>
                                    Established {{ establishedAt.toLocaleDateString() }}
                                </span>
                                <span v-if="website" class="inline-flex items-center gap-1">
                                    <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                        <path :d="mdiLinkVariant" />
                                    </svg>
                                    <a :href="website" target="_self" rel="noopener"
                                        class="underline decoration-dotted">{{
                                            website
                                        }}</a>
                                </span>
                                <span v-if="email" class="inline-flex items-center gap-1">
                                    <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                        <path :d="mdiEmail" />
                                    </svg>
                                    <a :href="`mailto:${email}`" class="underline decoration-dotted">{{ email }}</a>
                                </span>
                                <span v-if="phone" class="inline-flex items-center gap-1">
                                    <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                        <path :d="mdiPhone" />
                                    </svg>
                                    <a :href="`tel:${phone}`" class="underline decoration-dotted">{{ phone }}</a>
                                </span>
                                <span class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1"
                                    :class="isActive
                                        ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                        : 'bg-gray-50 text-gray-700 ring-gray-200'
                                        ">
                                    {{ isActive ? 'Active' : 'Inactive' }}
                                </span>
                            </div>
                        </div>
                    </div>

                    <!-- Description -->
                    <div v-if="clubDesc" class="mt-4 max-w-3xl text-sm text-gray-700 whitespace-pre-line">
                        {{ clubDesc }}
                    </div>
                </div>
            </div>

            <!-- Main grid -->
            <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left: Members list -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiAccountGroup" />
                                </svg>
                                Members
                            </h3>
                            <div class="text-xs text-gray-500">
                                {{ loading ? 'Loading…' : `${membersFiltered.length} member(s)` }}
                                <span class="mx-1">•</span>
                                Officers: {{ officersCount }} | Members: {{ membersCountOnly }}
                            </div>
                        </div>

                        <div class="p-4 sm:p-6">
                            <!-- Filters -->
                            <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <input v-model="memberSearch" type="text"
                                    placeholder="Search by name, username, or email…"
                                    class="w-full sm:flex-1 rounded-lg border px-3 py-2 text-sm" autocomplete="off" />
                                <select v-model="roleView" class="rounded-lg border px-2 py-2 text-sm">
                                    <option value="all">All roles</option>
                                    <option value="officers">Officers</option>
                                    <option value="members">Members</option>
                                </select>
                                <select v-model="statusView" class="rounded-lg border px-2 py-2 text-sm">
                                    <option value="all">All statuses</option>
                                    <option value="pending">pending</option>
                                    <option value="active">active</option>
                                    <option value="inactive">inactive</option>
                                </select>
                            </div>

                            <!-- Skeletons -->
                            <div v-if="loading" class="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                <div v-for="i in 6" :key="i" class="animate-pulse rounded-xl border p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="h-10 w-10 rounded-full bg-gray-200"></div>
                                        <div class="flex-1">
                                            <div class="h-3 w-2/3 bg-gray-200 rounded mb-2"></div>
                                            <div class="h-3 w-1/3 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                    <div class="mt-3 h-5 w-24 bg-gray-100 rounded"></div>
                                </div>
                            </div>

                            <!-- Empty -->
                            <div v-else-if="!membersFiltered.length" class="mt-4 text-sm text-gray-500">
                                No members found.
                            </div>

                            <!-- Members grid (CLICKABLE to open profile in new tab) -->
                            <div v-else class="mt-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                <div v-for="u in membersPage" :key="u.id"
                                    class="group rounded-xl border p-4 bg-white hover:shadow-sm transition cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
                                    role="button" tabindex="0"
                                    :title="`Open profile of ${u.first_name || ''} ${u.last_name || ''}`"
                                    @click="openProfile(u.id)" @keyup.enter="openProfile(u.id)">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-600">
                                            <img v-if="u.avatar" :src="u.avatar" alt=""
                                                class="h-full w-full object-cover" />
                                            <span v-else>{{ initials(`${u.first_name || ''} ${u.last_name || ''}` ||
                                                u.username) }}</span>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-medium text-gray-900">
                                                {{ u.first_name }} {{ u.last_name }}
                                            </div>
                                            <div class="truncate text-xs text-gray-500">@{{ u.username }}</div>
                                            <div class="truncate text-xs text-gray-500">{{ u.email }}</div>
                                        </div>
                                    </div>

                                    <div class="mt-3 flex items-center justify-between">
                                        <span
                                            class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                                            {{ normalizeRole(u.UserClub?.role) }}
                                        </span>
                                        <span
                                            class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1"
                                            :class="normalizeStatus(u.UserClub?.status) === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                                                : normalizeStatus(u.UserClub?.status) === 'pending'
                                                    ? 'bg-amber-50 text-amber-700 ring-amber-200'
                                                    : 'bg-gray-50 text-gray-700 ring-gray-200'
                                                ">
                                            {{ normalizeStatus(u.UserClub?.status) }}
                                        </span>
                                    </div>

                                    <div class="mt-2 text-[11px] text-gray-500 inline-flex items-center gap-1">
                                        <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                            <path :d="mdiCalendar" />
                                        </svg>
                                        since {{ niceDate(u.UserClub?.joined_at) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Pager -->
                            <div v-if="membersFiltered.length"
                                class="mt-4 flex items-center justify-between text-xs text-gray-600">
                                <button class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50" :disabled="page <= 1"
                                    @click="page = page - 1">
                                    Previous
                                </button>
                                <div>Page {{ page }} of {{ totalPages }}</div>
                                <button class="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
                                    :disabled="page >= totalPages" @click="page = page + 1">
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>

                    
                </div>

                <!-- Right: Club facts -->
                <div class="space-y-6">
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiAccount" />
                                </svg>
                                Club Info
                            </h3>
                        </div>
                        <div class="p-4 sm:p-6 text-sm text-gray-700 space-y-2">
                            <div class="flex items-center justify-between">
                                <span>Code</span>
                                <span class="text-gray-500">@{{ clubCode || '—' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Category</span>
                                <span class="text-gray-500">{{ clubCategory || '—' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Status</span>
                                <span class="text-gray-500">{{ isActive ? 'Active' : 'Inactive' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Established</span>
                                <span class="text-gray-500">{{ establishedAt ? establishedAt.toLocaleDateString() : '—'
                                }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Website</span>
                                <span class="text-gray-500 truncate max-w-[55%]">
                                    <a v-if="website" :href="website" target="_self" rel="noopener"
                                        class="underline decoration-dotted">{{
                                            website
                                        }}</a>
                                    <span v-else>—</span>
                                </span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Email</span>
                                <span class="text-gray-500 truncate max-w-[55%]">
                                    <a v-if="email" :href="`mailto:${email}`" class="underline decoration-dotted">{{
                                        email }}</a>
                                    <span v-else>—</span>
                                </span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Phone</span>
                                <span class="text-gray-500">{{ phone || '—' }}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Full-width Club Calendar -->
                <div class="lg:col-span-3">
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiCalendar" />
                                </svg>
                                Club Calendar
                            </h3>
                            <div class="flex items-center gap-2 text-xs">
                                <label class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    <input type="checkbox" v-model="showAD" class="accent-blue-600">
                                    <span>Activities</span>
                                </label>
                                <label class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <input type="checkbox" v-model="showUR" class="accent-emerald-600">
                                    <span>Utilizations</span>
                                </label>
                                <label class="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                                    <input type="checkbox" v-model="showAP" class="accent-amber-600">
                                    <span>Annual Plans</span>
                                </label>
                                <button class="px-2 py-1 bg-white border rounded inline-flex items-center gap-1" @click="Promise.allSettled([
                                    adStore.fetchAll({ status: 'approved', club_id: clubId, limit: 500, order: 'ASC', sort: 'date_of_implementation' }, true),
                                    urStore.fetchAll({ status: 'approved', club_id: clubId, limit: 500, order: 'ASC', sort: 'start_at' }, true),
                                    apStore.fetchAll({ status: 'approved', club_id: clubId, limit: 500, order: 'ASC', sort: 'approved_at' }, true),
                                ])">
                                    <svg class="w-4 h-4" viewBox="0 0 24 24">
                                        <path :d="mdiRefresh" />
                                    </svg>
                                    Refresh
                                </button>
                            </div>
                        </div>

                        <div class="p-4 sm:p-6">
                            <div class="w-full rounded-xl overflow-hidden border border-gray-200 bg-white">
                                <FullCalendar :options="calendarOptions" />
                            </div>
                            <EventDetailsModal v-model="showEventModal" :event="selectedEvent" />
                            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 text-sm">
                                <div class="p-3 rounded-xl border bg-white shadow-sm border-blue-200">
                                    <div class="text-xs uppercase tracking-wide text-blue-600 mb-1">Legend</div>
                                    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-blue-600"></span> Activity Design</div>
                                </div>
                                <div class="p-3 rounded-xl border bg-white shadow-sm border-emerald-200">
                                    <div class="text-xs uppercase tracking-wide text-emerald-600 mb-1">Legend</div>
                                    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-emerald-600"></span> Utilization</div>
                                </div>
                                <div class="p-3 rounded-xl border bg-white shadow-sm border-amber-200">
                                    <div class="text-xs uppercase tracking-wide text-amber-600 mb-1">Legend</div>
                                    <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-sm bg-amber-600"></span> Annual Plan</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>

<style scoped>
.fc .fc-daygrid-event {
    padding: 2px 6px;
    font-size: 12px;
    line-height: 1.2;
}

.fc .fc-toolbar-title {
    font-weight: 700;
}

/* NEW: make list view text black for readability */
.fc .fc-list-event .fc-list-event-time,
.fc .fc-list-event .fc-list-event-title,
.fc .fc-list-event .fc-list-event-title a {
    color: #111827 !important;
    /* tailwind gray-900 */
}
</style>
