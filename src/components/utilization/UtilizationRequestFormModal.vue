<!-- src/components/utilization/UtilizationRequestFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useActivityDesignStore } from '@/stores/activityDesign'
import Swal from 'sweetalert2'

/* ---------- PREDEFINED OPTIONS (authoritative lists) ---------- */
const FACILITY_OPTIONS = [
    'EB 101', 'EB 102', 'EB 103', 'NB 104', 'NB 105', 'NB Lobby', 'NB 106', 'NB 107', 'NB 201', 'NB 3SR',
    'OB 108', 'OB 109', 'OB 110', 'OB 111', 'OB 112', 'OB 113', 'OB 114', 'OB 115', 'OB 116', 'OB 117',
    'Gym', 'AVR', 'Student Lobby', 'Activity Center', 'Library', 'Ground',
]

const EQUIPMENT_OPTIONS = [
    'Sound system', 'Projector / LCD projector', 'White screen / projection screen',
    'Microphone (wired & wireless)', 'Extension cords & power strips', 'Laptop / desktop computer',
    'Television / monitor', 'Document camera / visualizer', 'Laser pointer / presenter remote',
    'National Flag', 'Department / College / Institutional Flag', 'Podium / lectern',
    'Cloth décor / backdrops', 'Banners / tarpaulin stands', 'Whiteboard markers',
    'Whiteboard erasers', 'Bulletin boards / pin boards', 'Chairs', 'Tables',
    'Stage platforms / risers', 'Portable tents / canopies', 'Easel stands',
    'Drums', 'Xylophone', 'Guitar', 'Keyboard', 'Tambourine',
    'Basketball', 'Volleyball', 'Soccer ball / Football', 'Badminton racket',
    'Badminton shuttlecock', 'Badminton net', 'Volleyball net', 'Whistle', 'Stopwatch',
    'Beakers', 'Test tubes', 'Microscopes', 'Measuring instruments',
]

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: {
        type: Object,
        default: () => ({
            id: null,
            reference_code: '',
            date_filed: '',
            activity_design_id: '',
            // filed_by_user_id is now implicit via auth
            facilities: [],
            equipment_items: [],
            utilization_details: '',
            start_date: '',       // will auto-copy from selected AD (date_of_implementation)
            start_time: '08:00',
            end_date: '',
            end_time: '10:00',
            status: 'draft',
            availability_status: 'pending-check',
            remarks: '',
        }),
    },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const urStore = useUtilizationRequestStore()
const adStore = useActivityDesignStore()

/* Approved Activity Designs for selection */
const approvedAds = computed(() =>
    Array.isArray(adStore.items?.data)
        ? adStore.items.data.filter((x) => String(x.status).toLowerCase() === 'approved')
        : []
)

onMounted(async () => {
    // fetch approved activity designs for the select
    await adStore.fetchAll({ page: 1, limit: 200, status: 'approved', officer: true }, true)
})

const form = ref({ ...props.initial })
const errors = ref({})

const selectedAD = computed(() => {
    const id = Number(form.value.activity_design_id || 0)
    return approvedAds.value.find((a) => Number(a.id) === id) || null
})

/* Keep form in sync with incoming props + sanitize arrays */
watch(
    () => props.initial,
    (v) => {
        form.value = {
            ...v,
            facilities: Array.isArray(v.facilities)
                ? v.facilities
                : (() => { try { return JSON.parse(v.facilities || '[]') } catch { return [] } })(),
            equipment_items: Array.isArray(v.equipment_items)
                ? v.equipment_items
                : (() => { try { return JSON.parse(v.equipment_items || '[]') } catch { return [] } })(),
        }
        // enforce predefined lists
        form.value.facilities = (form.value.facilities || []).filter((f) => FACILITY_OPTIONS.includes(f))
        form.value.equipment_items = (form.value.equipment_items || []).filter((e) => !e?.name || EQUIPMENT_OPTIONS.includes(e.name))

        errors.value = {}
    },
    { immediate: true }
)

/* When Activity Design changes, lock start_date to its date_of_implementation */
watch(
    () => form.value.activity_design_id,
    () => {
        const ad = selectedAD.value
        if (ad?.date_of_implementation) {
            form.value.start_date = String(ad.date_of_implementation).slice(0, 10)
        } else {
            // if no AD (or missing DOI), clear
            form.value.start_date = ''
        }
    },
    { immediate: true }
)

const statusSafe = computed(() => String(form.value?.status || '').toLowerCase())
const readOnly = computed(() => props.mode === 'edit' && statusSafe.value !== 'draft')

const titleText = computed(() =>
    props.mode !== 'edit' ? 'New Utilization Request' : (readOnly.value ? 'View Utilization (read-only)' : 'Edit Utilization')
)
const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))

/* ---------- Activity Design select label ---------- */
const adLabel = (ad) => {
    const name = ad?.name_of_activity || 'Untitled'
    const sy = ad?.school_year ? ` • SY ${ad.school_year}` : ''
    const sem = ad?.semester ? ` • ${ad.semester}` : ''
    const ref = ad?.reference_code ? ` [${ad.reference_code}]` : ''
    return `${name}${sy}${sem}${ref}`
}

/* ---------- Facilities (strict select from FACILITY_OPTIONS) ---------- */
const facilitySelect = ref('')
const remainingFacilities = computed(() =>
    FACILITY_OPTIONS.filter((opt) => !(form.value.facilities || []).includes(opt))
)
const addFacility = () => {
    const v = facilitySelect.value
    if (!v || !FACILITY_OPTIONS.includes(v)) return
    if (!Array.isArray(form.value.facilities)) form.value.facilities = []
    if (!form.value.facilities.includes(v)) form.value.facilities.push(v)
    facilitySelect.value = ''
}
const removeFacility = (i) => {
    form.value.facilities.splice(i, 1)
}

/* ---------- Equipment (strict select names; unique) ---------- */
const addEquip = () => {
    if (!Array.isArray(form.value.equipment_items)) form.value.equipment_items = []
    const already = new Set((form.value.equipment_items || []).map((x) => x?.name).filter(Boolean))
    const nextName = EQUIPMENT_OPTIONS.find((n) => !already.has(n)) || EQUIPMENT_OPTIONS[0]
    if (!already.has(nextName)) form.value.equipment_items.push({ name: nextName, qty: 1, unit: '' })
}
const removeEquip = (idx) => {
    form.value.equipment_items.splice(idx, 1)
}
const remainingEquipOptionsFor = (idx) => {
    const chosen = new Set(
        (form.value.equipment_items || []).map((x, i) => (i === idx ? null : x?.name)).filter(Boolean)
    )
    return EQUIPMENT_OPTIONS.filter((n) => !chosen.has(n))
}

/* ---------- Validation ---------- */
const validate = () => {
    if (readOnly.value) return false
    const e = {}

    if (!form.value.activity_design_id) e.activity_design_id = 'Required'

    // start_date is locked to AD's DOI; ensure it exists
    if (!form.value.start_date) e.start_date = 'Start date is required (from Activity Design)'
    if (!form.value.start_time) e.start_time = 'Required'
    if (!form.value.end_date) e.end_date = 'Required'
    if (!form.value.end_time) e.end_time = 'Required'

    // facilities
    if (!Array.isArray(form.value.facilities) || !form.value.facilities.length) {
        e.facilities = 'Select at least one'
    } else if (!form.value.facilities.every((f) => FACILITY_OPTIONS.includes(f))) {
        e.facilities = 'Invalid facility selected'
    }

    // equipment checks
    const nameSet = new Set()
    if (Array.isArray(form.value.equipment_items)) {
        form.value.equipment_items.forEach((x, i) => {
            if (x?.name && !EQUIPMENT_OPTIONS.includes(x.name)) {
                e[`equipment_${i}`] = 'Invalid equipment'
            }
            if (x?.name && nameSet.has(x.name)) {
                e[`equipment_${i}`] = 'Duplicate item; adjust quantity instead'
            }
            if (x?.name) nameSet.add(x.name)
            if (x?.name && (isNaN(Number(x.qty)) || Number(x.qty) <= 0)) {
                e[`equipment_${i}`] = 'Qty must be > 0'
            }
        })
    }

    // time ordering basic check (UI level)
    if (form.value.start_date && form.value.end_date && form.value.start_time && form.value.end_time) {
        const start = new Date(`${form.value.start_date}T${form.value.start_time}:00`)
        const end = new Date(`${form.value.end_date}T${form.value.end_time}:00`)
        if (end < start) e.end_time = 'End must be after or equal to start'
    }

    errors.value = e
    return Object.keys(e).length === 0
}

/* ---------- Availability check ---------- */
const checkAvailability = async () => {
    if (!form.value.start_date || !form.value.end_date || !form.value.facilities?.length) {
        await Swal.fire('Missing fields', 'Start/End dates and facilities are required.', 'info')
        return
    }
    try {
        const res = await urStore.checkAvailability({
            start_date: form.value.start_date,
            start_time: form.value.start_time || '00:00',
            end_date: form.value.end_date,
            end_time: form.value.end_time || '00:00',
            facilities: form.value.facilities,
        })

        const msg = res.available_for_all
            ? `All selected facilities are available.`
            : `Conflicts on: ${(res.conflict_facilities || []).join(', ') || '—'}`

        await Swal.fire({
            icon: res.available_for_all ? 'success' : 'warning',
            title: 'Availability Result',
            html: `<div class="text-left text-sm">
        <div><strong>Facilities:</strong> ${(res.facilities || []).join(', ')}</div>
        <div class="mt-2"><strong>Status:</strong> ${msg}</div>
      </div>`,
        })
    } catch (e) {
        await Swal.fire('Error', urStore.error || 'Failed to check availability.', 'error')
        console.error(e)
    }
}

/* ---------- Submit ---------- */
const onSubmit = () => {
    if (readOnly.value) return
    if (!validate()) return

    const payload = { ...form.value }

    // Inject filed_by_user_id from auth store; never expose field in UI
    if (auth.user?.id) payload.filed_by_user_id = auth.user.id

    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-3 md:p-4 rounded-xl shadow-lg w-[720px] max-h-[85vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <h2 class="text-base font-semibold">{{ titleText }}</h2>
                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-gray-100">{{ form.status }}</span>
                </div>
                <button class="px-2.5 py-1 text-[11px] bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <div v-if="readOnly"
                class="mb-2 text-[11px] px-2.5 py-1.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                This request is <strong>{{ form.status }}</strong>. Editing is disabled.
            </div>

            <!-- Compact core layout -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <!-- Activity Design (approved only) -->
                <div class="md:col-span-2">
                    <label class="block mb-0.5">Activity Design <span class="text-red-500">*</span></label>
                    <select v-model="form.activity_design_id" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly || adStore.isLoading"
                        :class="errors.activity_design_id ? 'border-red-500' : ''">
                        <option value="">Select approved activity design…</option>
                        <option v-for="ad in approvedAds" :key="ad.id" :value="ad.id">
                            {{ adLabel(ad) }}
                        </option>
                    </select>
                    <p v-if="errors.activity_design_id" class="text-red-600 text-[11px] mt-0.5">
                        {{ errors.activity_design_id }}
                    </p>
                    <p v-if="adStore.isLoading" class="text-[11px] text-gray-500 mt-0.5">Loading approved activities…
                    </p>
                    <p v-else-if="!approvedAds.length" class="text-[11px] text-amber-700 mt-0.5">
                        No approved activity designs found. Approve an Activity Design first.
                    </p>
                </div>

                <!-- Start/End group -->
                <div>
                    <label class="block mb-0.5">Start Date <span class="text-red-500">*</span></label>
                    <input v-model="form.start_date" type="date" class="w-full border rounded px-2 py-1.5 bg-gray-50"
                        :readonly="true" :disabled="true" :class="errors.start_date ? 'border-red-500' : ''" />
                    <p v-if="errors.start_date" class="text-red-600 text-[11px] mt-0.5">{{ errors.start_date }}</p>
                </div>
                <div>
                    <label class="block mb-0.5">Start Time <span class="text-red-500">*</span></label>
                    <input v-model="form.start_time" type="time" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :class="errors.start_time ? 'border-red-500' : ''" />
                    <p v-if="errors.start_time" class="text-red-600 text-[11px] mt-0.5">{{ errors.start_time }}</p>
                </div>

                <div>
                    <label class="block mb-0.5">End Date <span class="text-red-500">*</span></label>
                    <input v-model="form.end_date" type="date" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :class="errors.end_date ? 'border-red-500' : ''" />
                    <p v-if="errors.end_date" class="text-red-600 text-[11px] mt-0.5">{{ errors.end_date }}</p>
                </div>
                <div>
                    <label class="block mb-0.5">End Time <span class="text-red-500">*</span></label>
                    <input v-model="form.end_time" type="time" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :class="errors.end_time ? 'border-red-500' : ''" />
                    <p v-if="errors.end_time" class="text-red-600 text-[11px] mt-0.5">{{ errors.end_time }}</p>
                </div>
            </div>

            <!-- Facilities -->
            <div class="mt-2 text-sm">
                <label class="block mb-0.5">Facilities <span class="text-red-500">*</span></label>
                <div class="flex gap-1.5">
                    <select v-model="facilitySelect" class="border rounded px-2 py-1.5 min-w-[200px]"
                        :disabled="readOnly">
                        <option value="">Select facility…</option>
                        <option v-for="f in remainingFacilities" :key="f" :value="f">{{ f }}</option>
                    </select>
                    <button class="px-2.5 py-1.5 bg-gray-200 rounded text-[11px]"
                        :disabled="readOnly || !facilitySelect" @click="addFacility">
                        Add
                    </button>
                </div>
                <p v-if="errors.facilities" class="text-red-600 text-[11px] mt-0.5">{{ errors.facilities }}</p>

                <div class="mt-1.5 flex flex-wrap gap-1.5">
                    <span v-for="(f, i) in form.facilities" :key="f"
                        class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px]">
                        {{ f }}
                        <button v-if="!readOnly" class="text-slate-500 hover:text-red-600"
                            @click="removeFacility(i)">×</button>
                    </span>
                    <span v-if="!form.facilities?.length" class="text-gray-400 text-xs">No facilities selected</span>
                </div>
            </div>

            <!-- Equipment -->
            <div class="mt-3 text-sm">
                <div class="flex items-center justify-between">
                    <label class="block mb-0.5">Equipment / Materials (optional)</label>
                    <button class="px-2.5 py-1 bg-gray-200 rounded text-[11px]"
                        :disabled="readOnly || remainingEquipOptionsFor(-1).length === 0" @click="addEquip">
                        Add Row
                    </button>
                </div>

                <div class="mt-1 border rounded overflow-hidden">
                    <table class="w-full text-[12px]">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="text-left p-1.5">Item</th>
                                <th class="text-left p-1.5">Qty</th>
                                <th class="text-left p-1.5">Unit</th>
                                <th class="p-1.5 w-14"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(it, idx) in form.equipment_items" :key="idx" class="border-t">
                                <td class="p-1.5">
                                    <select v-model="it.name" class="w-full border rounded px-2 py-1.5"
                                        :disabled="readOnly"
                                        @change="() => { if (it.qty == null || it.qty <= 0) it.qty = 1 }">
                                        <option
                                            v-for="opt in remainingEquipOptionsFor(idx).concat(it.name && !remainingEquipOptionsFor(idx).includes(it.name) ? [it.name] : [])"
                                            :key="opt" :value="opt">
                                            {{ opt }}
                                        </option>
                                    </select>
                                    <div v-if="errors[`equipment_${idx}`]" class="text-red-600 mt-0.5 text-[11px]">
                                        {{ errors[`equipment_${idx}`] }}
                                    </div>
                                </td>
                                <td class="p-1.5">
                                    <input v-model.number="it.qty" type="number" min="1"
                                        class="w-20 border rounded px-2 py-1.5" :disabled="readOnly" />
                                </td>
                                <td class="p-1.5">
                                    <input v-model="it.unit" class="w-24 border rounded px-2 py-1.5"
                                        :disabled="readOnly" placeholder="e.g., pcs" />
                                </td>
                                <td class="p-1.5 text-right">
                                    <button class="px-2 py-1 bg-red-50 text-red-700 rounded text-[11px]"
                                        :disabled="readOnly" @click="removeEquip(idx)">
                                        Remove
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p class="text-[11px] text-gray-500 mt-0.5">Each equipment name must be unique; adjust quantity for
                    multiples.</p>
            </div>

            <!-- Details / Remarks -->
            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Utilization Details (duration, purpose, notes)</label>
                    <textarea v-model="form.utilization_details" rows="3" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" />
                </div>
                <div>
                    <label class="block mb-0.5">Remarks</label>
                    <textarea v-model="form.remarks" rows="3" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" />
                </div>
            </div>

            <!-- Availability -->
            <div class="mt-2 p-2 rounded-lg border bg-white">
                <div class="flex items-center justify-between">
                    <div class="text-[13px] font-medium">Check Availability</div>
                    <button class="px-2.5 py-1 bg-indigo-600 text-white rounded text-[11px]" :disabled="readOnly"
                        @click="checkAvailability">
                        Run Check
                    </button>
                </div>
                <div class="mt-0.5 text-[11px] text-gray-500">Uses current form values (start/end &amp; facilities) to
                    detect overlaps.</div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-1.5 mt-4">
                <button class="px-3 py-1.5 bg-gray-200 rounded text-xs" @click="visible = false">Close</button>
                <button v-if="!readOnly" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs" @click="onSubmit">
                    {{ submitText }}
                </button>
            </div>
        </div>
    </div>
</template>
