<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

/* FullCalendar styles */
// import '@fullcalendar/core/index.css'
// import '@fullcalendar/daygrid/index.css'
// import '@fullcalendar/timegrid/index.css'

const props = defineProps({
    modelValue: { type: Boolean, default: false }
})
const emit = defineEmits(['update:modelValue', 'open'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const store = useUtilizationRequestStore()

const events = ref([])

const toArray = (v, fallback = []) => {
    if (Array.isArray(v)) return v
    try { return JSON.parse(v || '[]') || fallback } catch { return fallback }
}

/* Build FullCalendar events from store rows */
const buildEvents = (rows = []) => {
    events.value = rows
        .map((r) => {
            const facilities = toArray(r.facilities)
            const labelParts = []
            if (r.activity_design?.name_of_activity) labelParts.push(r.activity_design.name_of_activity)
            if (facilities.length) labelParts.push(facilities.join(', '))
            const title = labelParts.join(' — ') || (r.reference_code || 'Utilization')

            // Prefer local date/time to avoid timezone shifts
            const start =
                (r.start_date && r.start_time && `${r.start_date}T${r.start_time}:00`) ||
                r.start_at || null
            const end =
                (r.end_date && r.end_time && `${r.end_date}T${r.end_time}:00`) ||
                r.end_at || null

            if (!start || !end) return null

            return {
                id: String(r.id),
                title,
                start,
                end,
                backgroundColor: '#10b981', // emerald
                borderColor: '#0ea5e9',     // sky
                textColor: '#0b1b13',
                extendedProps: {
                    reference_code: r.reference_code,
                    facilities,
                    availability_status: r.availability_status,
                    status: r.status,
                },
            }
        })
        .filter(Boolean)
}

/* Fetch only approved requests and build events */
const fetchApproved = async () => {
    await store.fetchAll(
        { page: 1, limit: 500, status: 'approved', order: 'ASC', sort: 'start_at' },
        true
    )
    buildEvents(store.items.data || [])
}

/* Open record from click */
const onEventClick = (info) => {
    const id = info?.event?.id
    if (id) emit('open', Number(id))
}

/* IMPORTANT: keep events INSIDE options (reactive) */
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
    events: events.value, // <-- this is the key change
}))

/* When modal opens, fetch */
watch(() => props.modelValue, (v) => { if (v) fetchApproved() })

/* If the store updates while open, rebuild */
watch(
    () => store.items.data,
    (rows) => { if (visible.value) buildEvents(rows || []) },
    { deep: true }
)

onMounted(() => { if (visible.value) fetchApproved() })
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm">
        <div class="bg-white rounded-2xl shadow-2xl w-full sm:w-[1200px] max-w-[100vw] sm:max-w-[95vw] h-[100vh] sm:h-auto sm:max-h-[90vh] overflow-hidden">
            <!-- Header -->
            <div class="px-4 py-3 border-b flex items-center justify-between">
                <h2 class="text-base font-semibold">Utilization Calendar (Approved)</h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <!-- Calendar -->
            <div class="p-2 overflow-auto">
                <!-- Pass ONLY :options; events are inside options as a reactive computed -->
                <FullCalendar :options="calendarOptions" />
            </div>

            <div class="px-4 py-2 text-[11px] text-gray-500 border-t">
                Click an event to open it.
            </div>
        </div>
    </div>
</template>
