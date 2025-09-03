<!-- src/components/annualPlan/AnnualPlansCalendarModal.vue -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useAnnualPlanStore } from '@/stores/annualPlan'

// import '@fullcalendar/core/index.css'
// import '@fullcalendar/daygrid/index.css'
// import '@fullcalendar/timegrid/index.css'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue', 'open'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const store = useAnnualPlanStore()
const events = ref([])

const toPlans = (v) => {
    if (Array.isArray(v)) return v
    try { return JSON.parse(v || '[]') } catch { return [] }
}

/* Build events from each plan item */
const buildEvents = (rows = []) => {
    const out = []
    rows.forEach((row) => {
        const items = toPlans(row.plans)
        const titlePrefix = row.club?.name ? `[${row.club.name}] ` : ''
        items.forEach((p, idx) => {
            const date = p?.date_of_implementation
            if (!date) return
            const title = `${titlePrefix}${p.item || 'Planned Activity'}`
            out.push({
                id: `${row.id}-${idx}`,
                title,
                start: `${date}T00:00:00`,
                end: `${date}T23:59:59`,
                backgroundColor: '#b45309', // amber-700 (dark)
                borderColor: '#92400e',     // amber-800
                textColor: '#ffffff',       // strong contrast
                extendedProps: {
                    annual_plan_id: row.id,
                    reference_code: row.reference_code,
                    school_year: row.school_year,
                    funds: p?.funds ?? 0,
                    status: row.status,
                },
            })
        })
    })
    events.value = out
}

const fetchApproved = async () => {
    await store.fetchAll({ page: 1, limit: 500, status: 'approved', sort: 'created_at', order: 'ASC' }, true)
    buildEvents(store.items.data || [])
}

const onEventClick = (info) => {
    const apId = info?.event?.extendedProps?.annual_plan_id
    if (apId) emit('open', Number(apId))
}

const isSmall = ref(false)
const updateSize = () => { isSmall.value = window.innerWidth < 640 }
onMounted(() => { updateSize(); window.addEventListener('resize', updateSize) })

const calendarOptions = computed(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
    initialView: 'dayGridMonth',
    headerToolbar: isSmall.value
        ? { left: 'prev,next', center: 'title', right: 'dayGridMonth' }
        : { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay' },
    height: 'auto',
    handleWindowResize: true,
    expandRows: true,
    navLinks: true,
    eventDisplay: 'block',
    eventClick: onEventClick,
    events: events.value,
}))

watch(() => props.modelValue, (v) => { if (v) fetchApproved() })
watch(() => store.items.data, (rows) => { if (visible.value) buildEvents(rows || []) }, { deep: true })
onMounted(() => { if (visible.value) fetchApproved() })
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full sm:w-[1200px] max-w-[100vw] sm:max-w-[95vw] h-[100vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
            <div class="px-4 py-3 border-b flex items-center justify-between">
                <h2 class="text-base font-semibold">Annual Plans Calendar (Approved)</h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>
            <div class="p-2 overflow-auto">
                <FullCalendar :options="calendarOptions" />
            </div>
            <div class="px-4 py-2 text-[11px] text-gray-500 border-t">
                Click a plan item to open its Annual Plan.
            </div>
        </div>
    </div>
</template>
