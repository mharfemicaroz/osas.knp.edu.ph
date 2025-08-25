<!-- src/components/activity/ActivityDesignFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: {
        type: Object,
        default: () => ({
            id: null,
            date_filed: '',
            semester: '',
            office_department: '',        // hidden (synced to club name)
            school_year: '',
            name_of_activity: '',
            venue: '',
            date_of_implementation: '',
            proposed_budget: 0,
            participants: '',
            nature_of_activity: 'Curricular',
            rationale: '',
            objectives: '',
            details_of_activity: '',
            budgetary_requirements: '',
            filed_by_user_id: '',         // hidden (from auth)
            club_id: '',
            status: 'draft',
            remarks: '',
        }),
    },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const form = ref({ ...props.initial })
const errors = ref({})

const auth = useAuthStore()
const clubStore = useClubStore()
const currentUserId = computed(() => auth.user?.id || null)

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const NATURES = ['Curricular', 'Co-Curricular', 'Extra-Curricular']
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled']

const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

onMounted(async () => {
    if (!Array.isArray(clubStore.clubs?.data) || !clubStore.clubs.data.length) {
        await clubStore.fetchAll({ page: 1, limit: 200 }, true)
    }
})

const clubNameById = (id) => {
    const cid = Number(id)
    const c = (clubStore.clubs?.data || []).find((x) => Number(x.id) === cid)
    return c?.name || ''
}

watch(
    () => props.initial,
    (v) => {
        form.value = { ...v }
        errors.value = {}

        // defaults
        if (!form.value.school_year) form.value.school_year = schoolYearOptions.value[0]
        if (!form.value.filed_by_user_id && currentUserId.value) {
            form.value.filed_by_user_id = currentUserId.value
        }
        if (form.value.club_id) {
            const name = clubNameById(form.value.club_id)
            if (name) form.value.office_department = name
        }
    },
    { immediate: true }
)

// keep hidden office_department synced with club name
watch(
    () => form.value.club_id,
    (cid) => {
        const name = clubNameById(cid)
        if (name) form.value.office_department = name
    }
)

const statusSafe = computed(() => String(form.value?.status || '').toLowerCase())
const readOnly = computed(() => props.mode === 'edit' && statusSafe.value !== 'draft')

const titleText = computed(() =>
    props.mode !== 'edit'
        ? 'New Activity'
        : readOnly.value
            ? 'View Activity (read-only)'
            : 'Edit Activity'
)

const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))

const statusTone = computed(() => {
    switch (statusSafe.value) {
        case 'draft': return 'bg-gray-100 text-gray-800'
        case 'pending': return 'bg-amber-100 text-amber-800'
        case 'approved': return 'bg-emerald-100 text-emerald-700'
        case 'rejected': return 'bg-rose-100 text-rose-700'
        case 'cancelled': return 'bg-zinc-200 text-zinc-800'
        default: return 'bg-gray-100 text-gray-800'
    }
})

/* REQUIRED fields update (trim-validated) */
const validate = () => {
    if (readOnly.value) return false
    const e = {}

    if (!form.value.date_filed) e.date_filed = 'Required'
    if (!form.value.semester?.trim()) e.semester = 'Required'
    if (!form.value.school_year?.trim()) e.school_year = 'Required'
    if (!form.value.name_of_activity?.trim()) e.name_of_activity = 'Required'
    if (!form.value.date_of_implementation) e.date_of_implementation = 'Required'
    if (!form.value.nature_of_activity) e.nature_of_activity = 'Required'
    if (!form.value.club_id) e.club_id = 'Required'

    // NEW: strictly require these long-text fields (trim)
    if (!form.value.rationale?.trim()) e.rationale = 'Required'
    if (!form.value.objectives?.trim()) e.objectives = 'Required'
    if (!form.value.details_of_activity?.trim()) e.details_of_activity = 'Required'
    if (!form.value.budgetary_requirements?.trim()) e.budgetary_requirements = 'Required'

    errors.value = e
    return Object.keys(e).length === 0
}

const onSubmit = () => {
    if (readOnly.value) return
    if (!validate()) return

    const payload = { ...form.value }
    if (payload.proposed_budget === '') payload.proposed_budget = 0
    payload.filed_by_user_id = currentUserId.value
    payload.office_department = clubNameById(payload.club_id) || payload.office_department || ''

    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 md:p-5 rounded-2xl shadow-xl w-[1100px] max-h-screen overflow-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-semibold">{{ titleText }}</h2>
                    <span class="text-[11px] px-2 py-1 rounded" :class="statusTone">{{ form.status }}</span>
                </div>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <!-- Read-only banner -->
            <div v-if="readOnly"
                class="mb-3 text-xs px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                This activity has been submitted and is now <strong>{{ form.status }}</strong>. Editing is disabled.
            </div>

            <!-- Section: Core details -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Date Filed <span class="text-red-500">*</span></label>
                    <input v-model="form.date_filed" type="date" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" />
                    <p v-if="errors.date_filed" class="text-red-600 text-[11px] mt-1">{{ errors.date_filed }}</p>
                </div>

                <div>
                    <label class="block mb-1">Semester <span class="text-red-500">*</span></label>
                    <select v-model="form.semester" class="w-full border rounded px-2.5 py-2" :disabled="readOnly">
                        <option disabled value="">Select semester…</option>
                        <option v-for="s in SEMESTERS" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <p v-if="errors.semester" class="text-red-600 text-[11px] mt-1">{{ errors.semester }}</p>
                </div>

                <div>
                    <label class="block mb-1">School Year <span class="text-red-500">*</span></label>
                    <select v-model="form.school_year" class="w-full border rounded px-2.5 py-2" :disabled="readOnly">
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>
                    <p v-if="errors.school_year" class="text-red-600 text-[11px] mt-1">{{ errors.school_year }}</p>
                </div>

                <div class="md:col-span-3">
                    <label class="block mb-1">Name of Activity <span class="text-red-500">*</span></label>
                    <input v-model="form.name_of_activity" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" />
                    <p v-if="errors.name_of_activity" class="text-red-600 text-[11px] mt-1">{{ errors.name_of_activity
                        }}</p>
                </div>
            </div>

            <!-- Section: Logistics -->
            <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Club <span class="text-red-500">*</span></label>
                    <select v-model="form.club_id" class="w-full border rounded px-2.5 py-2" :disabled="readOnly">
                        <option value="">Select club…</option>
                        <option v-for="c in (clubStore.clubs.data || [])" :key="c.id" :value="c.id">{{ c.name }}
                        </option>
                    </select>
                    <p v-if="errors.club_id" class="text-red-600 text-[11px] mt-1">{{ errors.club_id }}</p>
                </div>

                <div>
                    <label class="block mb-1">Venue</label>
                    <input v-model="form.venue" class="w-full border rounded px-2.5 py-2" :disabled="readOnly" />
                </div>

                <div>
                    <label class="block mb-1">Date of Implementation <span class="text-red-500">*</span></label>
                    <input v-model="form.date_of_implementation" type="date" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.date_of_implementation"
                        :class="errors.date_of_implementation ? 'border-red-500' : ''" />
                    <p v-if="errors.date_of_implementation" class="text-red-600 text-[11px] mt-1">
                        {{ errors.date_of_implementation }}
                    </p>
                </div>
            </div>

            <!-- Section: Budget & Nature -->
            <div class="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Proposed Budget</label>
                    <input v-model="form.proposed_budget" type="number" step="0.01" min="0"
                        class="w-full border rounded px-2.5 py-2" :disabled="readOnly" />
                </div>

                <div>
                    <label class="block mb-1">Nature of Activity <span class="text-red-500">*</span></label>
                    <select v-model="form.nature_of_activity" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.nature_of_activity"
                        :class="errors.nature_of_activity ? 'border-red-500' : ''">
                        <option v-for="n in NATURES" :key="n" :value="n">{{ n }}</option>
                    </select>
                    <p v-if="errors.nature_of_activity" class="text-red-600 text-[11px] mt-1">
                        {{ errors.nature_of_activity }}
                    </p>
                </div>

                <div>
                    <label class="block mb-1">Participants</label>
                    <input v-model="form.participants" class="w-full border rounded px-2.5 py-2" :disabled="readOnly" />
                </div>
            </div>

            <!-- Section: Long texts (REQUIRED) -->
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Rationale <span class="text-red-500">*</span></label>
                    <textarea v-model="form.rationale" rows="3" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.rationale"
                        :class="errors.rationale ? 'border-red-500' : ''" />
                    <p v-if="errors.rationale" class="text-red-600 text-[11px] mt-1">{{ errors.rationale }}</p>
                </div>
                <div>
                    <label class="block mb-1">Objectives <span class="text-red-500">*</span></label>
                    <textarea v-model="form.objectives" rows="3" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.objectives"
                        :class="errors.objectives ? 'border-red-500' : ''" />
                    <p v-if="errors.objectives" class="text-red-600 text-[11px] mt-1">{{ errors.objectives }}</p>
                </div>
            </div>

            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Details of the Activity <span class="text-red-500">*</span></label>
                    <textarea v-model="form.details_of_activity" rows="4" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.details_of_activity"
                        :class="errors.details_of_activity ? 'border-red-500' : ''" />
                    <p v-if="errors.details_of_activity" class="text-red-600 text-[11px] mt-1">
                        {{ errors.details_of_activity }}
                    </p>
                </div>
                <div>
                    <label class="block mb-1">Budgetary Requirements <span class="text-red-500">*</span></label>
                    <textarea v-model="form.budgetary_requirements" rows="4" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" :aria-invalid="!!errors.budgetary_requirements"
                        :class="errors.budgetary_requirements ? 'border-red-500' : ''" />
                    <p v-if="errors.budgetary_requirements" class="text-red-600 text-[11px] mt-1">
                        {{ errors.budgetary_requirements }}
                    </p>
                </div>
            </div>

            <!-- Section: Workflow note / remarks -->
            <div class="mt-3 text-sm">
                <label class="block mb-1">Remarks</label>
                <textarea v-model="form.remarks" rows="2" class="w-full border rounded px-2.5 py-2"
                    :disabled="readOnly" />
            </div>

            <!-- Hidden fields to ensure values are posted -->
            <input type="hidden" v-model="form.filed_by_user_id" />
            <input type="hidden" v-model="form.office_department" />
            <input type="hidden" v-model="form.status" />

            <!-- Footer -->
            <div class="flex justify-end gap-2 mt-5">
                <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="visible = false">Close</button>
                <button v-if="!readOnly" class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="onSubmit">
                    {{ submitText }}
                </button>
            </div>
        </div>
    </div>
</template>
