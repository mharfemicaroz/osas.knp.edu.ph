<script setup>
import { onMounted, computed, ref } from 'vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useAnnualPlanStore } from '@/stores/annualPlan'

const timeZone = 'Asia/Manila'
const adStore = useActivityDesignStore()
const urStore = useUtilizationRequestStore()
const apStore = useAnnualPlanStore()

const showAD = ref(true)
const showUR = ref(true)
const showAP = ref(true)

const loading = computed(() => adStore.isLoading || urStore.isLoading || apStore.isLoading)
const errorMsg = computed(() => adStore.error || urStore.error || apStore.error)

const fetchParams = { status: 'approved', limit: 1000, officer: 'true', order: 'ASC', sort: 'date_of_implementation' }

onMounted(async () => {
    await Promise.allSettled([
        adStore.fetchAll(fetchParams, true),
        urStore.fetchAll({ status: 'approved', limit: 1000, officer: 'true', order: 'ASC', sort: 'start_at' }, true),
        apStore.fetchAll({ status: 'approved', limit: 1000, officer: 'true', order: 'ASC', sort: 'approved_at' }, true),
    ])
})

function parseJSONSafe(s, fb = []) {
    try { return JSON.parse(s || '[]') } catch { return fb }
}

function colorByType(type) {
    if (type === 'AD') return { backgroundColor: '#2563eb', borderColor: '#1d4ed8' }     // blue
    if (type === 'UR') return { backgroundColor: '#059669', borderColor: '#047857' }     // emerald
    return { backgroundColor: '#d97706', borderColor: '#b45309' }                         // amber
}

const events = computed(() => {
    const list = []

    if (showAD.value) {
        for (const r of adStore.items.data) {
            const start = r?.date_of_implementation || r?.approved_at || r?.created_at
            if (!start) continue
            const club = r?.club?.name ? ` • ${r.club.name}` : ''
            const { backgroundColor, borderColor } = colorByType('AD')
            list.push({
                id: `AD-${r.id}`,
                title: `Activity: ${r.name_of_activity || r.reference_code}${club}`,
                start,
                allDay: true,
                extendedProps: { type: 'Activity Design', ref: r.reference_code, club: r?.club },
                backgroundColor, borderColor
            })
        }
    }

    if (showUR.value) {
        for (const r of urStore.items.data) {
            const start = r?.start_at || r?.approved_at || r?.created_at
            const end = r?.end_at || r?.start_at || r?.approved_at
            if (!start) continue
            const fac = Array.isArray(r?.facilities) ? r.facilities : parseJSONSafe(r?.facilities)
            const facTxt = fac?.length ? ` • ${fac.join(', ')}` : ''
            const act = r?.activity_design?.name_of_activity ? ` • ${r.activity_design.name_of_activity}` : ''
            const { backgroundColor, borderColor } = colorByType('UR')
            list.push({
                id: `UR-${r.id}`,
                title: `Utilization${act}${facTxt}`,
                start,
                end,
                allDay: !r?.start_at || !r?.end_at,
                extendedProps: { type: 'Utilization', ref: r.reference_code, facilities: fac },
                backgroundColor, borderColor
            })
        }
    }

    if (showAP.value) {
        for (const r of apStore.items.data) {
            const start = r?.approved_at || r?.submitted_at || r?.created_at
            if (!start) continue
            const club = r?.club?.name ? ` • ${r.club.name}` : ''
            const sy = r?.school_year ? ` • SY ${r.school_year}` : ''
            const { backgroundColor, borderColor } = colorByType('AP')
            list.push({
                id: `AP-${r.id}`,
                title: `Annual Plan Approved${club}${sy}`,
                start,
                allDay: true,
                extendedProps: { type: 'Annual Plan', ref: r.reference_code },
                backgroundColor, borderColor
            })
        }
    }

    return list
})

function eventDidMount(info) {
    const isList = !!info.el.closest('.fc-list')

    // base styling for grid views
    if (!isList) {
        info.el.classList.add('rounded-md', 'shadow-sm', 'text-white')
    } else {
        info.el.classList.remove('text-white')
        info.el.classList.add('text-gray-900')
    }

    // badge
    const badge = document.createElement('span')
    badge.textContent = info.event.extendedProps?.type || ''

    if (isList) {
        // darker badge for light list rows
        badge.className = 'mr-2 inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded bg-slate-200 text-slate-700'
        const titleCell = info.el.querySelector('.fc-list-event-title')
        const link = titleCell?.querySelector('a') || titleCell
        link?.prepend(badge)
    } else {
        // translucent badge for colored grid events
        badge.className = 'px-1.5 py-0.5 text-[10px] font-semibold rounded mr-1 align-middle bg-white/20 text-white'
        info.el.prepend(badge)
    }
}

const isSmall = ref(false)
const updateSize = () => { isSmall.value = window.innerWidth < 640 }
onMounted(() => { updateSize(); window.addEventListener('resize', updateSize) })

const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: isSmall.value
        ? { left: 'prev,next', center: 'title', right: 'dayGridMonth' }
        : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' },
    height: 'auto',
    handleWindowResize: true,
    stickyHeaderDates: true,
    dayMaxEvents: 3,
    navLinks: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: true },
    timeZone,
    events: events.value,
    eventDidMount
}))
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <div class="w-full space-y-4">
                <div class="flex items-center justify-between flex-wrap gap-3">
                    <h1 class="text-xl font-semibold">Campus Activities Calendar</h1>
                    <div class="flex items-center gap-2">
                        <label
                            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <input type="checkbox" v-model="showAD" class="accent-blue-600">
                            <span class="text-sm">Activity Designs</span>
                        </label>
                        <label
                            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <input type="checkbox" v-model="showUR" class="accent-emerald-600">
                            <span class="text-sm">Utilizations</span>
                        </label>
                        <label
                            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <input type="checkbox" v-model="showAP" class="accent-amber-600">
                            <span class="text-sm">Annual Plans</span>
                        </label>
                    </div>
                </div>

                <div v-if="loading" class="w-full p-6 text-center rounded-xl border border-gray-200 bg-white shadow-sm">
                    Loading approved events…
                </div>
                <div v-else-if="errorMsg" class="w-full p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">
                    {{ errorMsg }}
                </div>
                <div v-else class="w-full rounded-xl overflow-hidden border border-gray-200 bg-white shadow">
                    <FullCalendar :options="calendarOptions" />
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div class="p-4 rounded-xl border bg-white shadow-sm border-blue-200">
                        <div class="text-xs uppercase tracking-wide text-blue-600 mb-1">Legend</div>
                        <div class="flex items-center gap-2 text-sm"><span
                                class="w-3 h-3 rounded-sm bg-blue-600"></span> Activity Design (approved)</div>
                    </div>
                    <div class="p-4 rounded-xl border bg-white shadow-sm border-emerald-200">
                        <div class="text-xs uppercase tracking-wide text-emerald-600 mb-1">Legend</div>
                        <div class="flex items-center gap-2 text-sm"><span
                                class="w-3 h-3 rounded-sm bg-emerald-600"></span> Utilization Request (approved)</div>
                    </div>
                    <div class="p-4 rounded-xl border bg-white shadow-sm border-amber-200">
                        <div class="text-xs uppercase tracking-wide text-amber-600 mb-1">Legend</div>
                        <div class="flex items-center gap-2 text-sm"><span
                                class="w-3 h-3 rounded-sm bg-amber-600"></span> Annual Plan (approved)</div>
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
