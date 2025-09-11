<!-- src/components/activity/ActivityDesignFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'
import { useAnnualPlanStore } from '@/stores/annualPlan'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    lockedClubId: { type: [String, Number], default: '' },
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
            file_by_user_name: '',        // optional override
            noted_by: '',                 // Adviser (optional)
            filed_by_user_id: '',         // hidden (from auth)
            club_id: '',
            status: 'draft',
            remarks: '',
            // Optional link to annual plan
            annual_plan_id: '',
            annual_plan_item: null,       // snapshot of chosen item (object or stringified JSON)
        }),
    },
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const clubStore = useClubStore()
const apStore = useAnnualPlanStore()
const currentUserId = computed(() => auth.user?.id || null)
const isAdmin = computed(() => String(auth.user?.role || '').toLowerCase() === 'admin')

const form = ref({ ...props.initial })
const errors = ref({})

// keep the user's original values before any auto-fill from Annual Plan
const baselineBeforeLink = ref(null)

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const NATURES = ['Curricular', 'Co-Curricular', 'Extra-Curricular']
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled']

const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

/* ---------- helpers ---------- */
const currency = (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return '0.00'
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const toArray = (v, fb = []) => {
    if (Array.isArray(v)) return v
    try { return JSON.parse(v || '[]') || fb } catch { return fb }
}
const toObject = (v, fb = null) => {
    if (v && typeof v === 'object') return v
    try { return JSON.parse(v || 'null') ?? fb } catch { return fb }
}
const clubNameById = (id) => {
    const cid = Number(id)
    const c = (clubStore.clubs?.data || []).find((x) => Number(x.id) === cid)
    return c?.name || ''
}

/* ---------- annual plan computed lists ---------- */
// show all approved plans; club will auto-lock to the plan's club after selection
const approvedAnnualPlans = computed(() => {
    const list = Array.isArray(apStore.items?.data)
        ? apStore.items.data.filter(p => String(p.status || '').toLowerCase() === 'approved')
        : []
    if (props.lockedClubId) {
        const cid = Number(props.lockedClubId)
        return list.filter(p => Number(p.club_id) === cid)
    }
    return list
})

const selectedAnnualPlan = computed(() => {
    const id = Number(form.value.annual_plan_id || 0)
    if (!id) return null
    return approvedAnnualPlans.value.find(p => Number(p.id) === id) || null
})

const planItems = computed(() => {
    const ap = selectedAnnualPlan.value
    if (!ap) return []
    const arr = toArray(ap.plans, [])
    return arr.map((it, idx) => ({
        key: String(it?.id ?? it?.plan_id ?? idx),
        title: it?.title ?? it?.name ?? it?.activity ?? it?.label ?? `Item #${idx + 1}`,
        funds: Number(it?.funds ?? it?.budget ?? 0) || 0,
        raw: it,
    }))
})

/* holds which item is chosen (by key); mirrors form.annual_plan_item snapshot */
const selectedPlanItemKey = ref('')

/* ---------- lifecycle ---------- */
onMounted(async () => {
    if (!Array.isArray(clubStore.clubs?.data) || !clubStore.clubs.data.length) {
        await clubStore.fetchAll({ page: 1, limit: 200 }, true)
    }
    await apStore.fetchAll({ page: 1, limit: 500, status: 'approved' }, true)
    if (props.lockedClubId) {
        form.value.club_id = Number(props.lockedClubId)
    }
})

/* ---------- sync props → form ---------- */
watch(
    () => props.initial,
    (v) => {
        const api = toObject(v.annual_plan_item, null)
        form.value = { ...v, annual_plan_item: api }
        errors.value = {}
        baselineBeforeLink.value = null

        if (!form.value.school_year) form.value.school_year = schoolYearOptions.value[0]
        if (!form.value.filed_by_user_id && currentUserId.value) {
            form.value.filed_by_user_id = currentUserId.value
        }
        if (form.value.club_id) {
            const name = clubNameById(form.value.club_id)
            if (name) form.value.office_department = name
        }

        queueMicrotask(() => {
            const ap = selectedAnnualPlan.value
            if (!ap || !form.value.annual_plan_item) {
                selectedPlanItemKey.value = ''
                return
            }
            const arr = planItems.value
            const idx = arr.findIndex(x => JSON.stringify(x.raw) === JSON.stringify(form.value.annual_plan_item))
            selectedPlanItemKey.value = idx >= 0 ? arr[idx].key : ''
        })
    },
    { immediate: true }
)

/* keep hidden office_department synced with club name (only when not locked by AP) */
watch(
    () => form.value.club_id,
    (cid) => {
        if (isApLinked.value) return // AP controls the club
        const name = clubNameById(cid)
        if (name) form.value.office_department = name
    }
)

/* when plan changes: clear selected item, lock club to AP's club, capture baseline if first-time link */
watch(
    () => form.value.annual_plan_id,
    (newId, oldId) => {
        form.value.annual_plan_item = null
        selectedPlanItemKey.value = ''

        const ap = selectedAnnualPlan.value
        if (!ap) return

        // Take a baseline snapshot the first time we link to an AP
        if (!baselineBeforeLink.value) {
            baselineBeforeLink.value = {
                school_year: form.value.school_year,
                proposed_budget: form.value.proposed_budget,
                club_id: form.value.club_id,
                office_department: form.value.office_department,
            }
        }

        // Lock club to AP's club and sync office_department
        form.value.club_id = ap.club_id
        form.value.office_department = ap?.club?.name || clubNameById(ap.club_id) || form.value.office_department
    }
)

/* when user picks a plan item, store snapshot and auto-fill fields */
watch(
    () => selectedPlanItemKey.value,
    (key) => {
        const ap = selectedAnnualPlan.value
        if (!ap || !key) {
            form.value.annual_plan_item = null
            return
        }
        const item = planItems.value.find(x => x.key === key)
        if (!item) {
            form.value.annual_plan_item = null
            return
        }
        form.value.annual_plan_item = item.raw

        // auto-fill school year & proposed budget
        if (ap.school_year) form.value.school_year = ap.school_year
        if (Number.isFinite(item.funds)) form.value.proposed_budget = item.funds

        form.value.venue = planItems.value[0].raw.venue
        form.value.date_of_implementation = planItems.value[0].raw.date_of_implementation
        // ensure school year is set (in case AP has no SY)
        form.value.school_year = ap.school_year || form.value.school_year


        // ensure club stays locked to AP
        form.value.club_id = ap.club_id
        form.value.office_department = ap?.club?.name || clubNameById(ap.club_id) || form.value.office_department
    }
)

const isApLinked = computed(() => !!form.value.annual_plan_id)

const resetAnnualLink = () => {
    if (readOnly.value) return

    form.value.annual_plan_id = ''
    form.value.annual_plan_item = null
    selectedPlanItemKey.value = ''

    form.value.venue = null
    form.value.date_of_implementation = null

    // restore user's baseline values if we have them
    if (baselineBeforeLink.value) {
        const b = baselineBeforeLink.value
        form.value.school_year = b.school_year
        form.value.proposed_budget = b.proposed_budget
        form.value.club_id = b.club_id
        form.value.office_department = b.office_department
    }
    baselineBeforeLink.value = null
}

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
    // Only admins can set file_by_user_name
    if (!isAdmin.value) delete payload.file_by_user_name

    // force club info to match AP if linked
    if (isApLinked.value && selectedAnnualPlan.value) {
        payload.club_id = selectedAnnualPlan.value.club_id
        payload.office_department =
            selectedAnnualPlan.value?.club?.name ||
            clubNameById(selectedAnnualPlan.value.club_id) ||
            payload.office_department ||
            ''
    } else {
        payload.office_department = clubNameById(payload.club_id) || payload.office_department || ''
    }

    // normalize annual plan fields
    if (payload.annual_plan_id === '') payload.annual_plan_id = null
    // annual_plan_item can remain an object; backend will stringify if needed

    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-3 md:p-4 rounded-xl shadow-lg w-[780px] max-h-[85vh] overflow-y-auto">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <h2 class="text-base font-semibold">{{ titleText }}</h2>
                    <span class="text-[10px] px-1.5 py-0.5 rounded" :class="statusTone">{{ form.status }}</span>
                </div>
                <button class="px-2.5 py-1 text-[11px] bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <div v-if="readOnly"
                class="mb-2 text-[11px] px-2.5 py-1.5 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                This activity has been submitted and is now <strong>{{ form.status }}</strong>. Editing is disabled.
            </div>

            <div class="p-2 mb-2 rounded-xl border bg-white/70">
                <div class="flex items-center justify-between mb-1">
                    <div class="text-sm font-medium">Link to Annual Plan (optional)</div>
                    <button v-if="!readOnly && (isApLinked || form.annual_plan_item)"
                        class="text-[11px] px-2 py-1 rounded border bg-gray-50 hover:bg-gray-100"
                        @click="resetAnnualLink">Reset Annual Plan link</button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <div>
                        <label class="block mb-0.5">Annual Plan</label>
                        <select v-model="form.annual_plan_id" class="w-full border rounded px-2 py-1.5"
                            :disabled="readOnly">
                            <option value="">— Not linked —</option>
                            <option v-for="ap in approvedAnnualPlans" :key="ap.id" :value="ap.id">
                                {{ ap.reference_code }} — SY {{ ap.school_year }} — {{ ap?.club?.name || 'Club#' +
                                ap.club_id }}
                            </option>
                        </select>
                    </div>

                    <div>
                        <label class="block mb-0.5">Plan Item</label>
                        <select v-model="selectedPlanItemKey" class="w-full border rounded px-2 py-1.5"
                            :disabled="readOnly || !form.annual_plan_id || !planItems.length">
                            <option value="">— Select item —</option>
                            <option v-for="it in planItems" :key="it.key" :value="it.key">
                                {{ it.title }} — ₱{{ currency(it.funds) }}
                            </option>
                        </select>
                    </div>

                    <div class="self-end text-[11px] text-gray-600">
                        Choosing an Annual Plan locks the <strong>Club</strong>. Selecting an item also auto-fills
                        <strong>School Year</strong> and <strong>Proposed Budget</strong>.
                    </div>
                </div>

                <div v-if="form.annual_plan_item" class="mt-2 text-[11px] rounded-lg border bg-gray-50 px-2.5 py-1.5">
                    <div class="flex flex-wrap gap-3">
                        <div>
                            <span class="text-gray-500">Item:</span>
                            <strong>{{ (form.annual_plan_item.title || form.annual_plan_item.name ||
                                form.annual_plan_item.activity || '—') }}</strong>
                        </div>
                        <div>
                            <span class="text-gray-500">Funds:</span>
                            <strong>₱{{ currency(form.annual_plan_item.funds || form.annual_plan_item.budget || 0)
                                }}</strong>
                        </div>
                        <div v-if="selectedAnnualPlan">
                            <span class="text-gray-500">SY:</span>
                            <strong>{{ selectedAnnualPlan.school_year }}</strong>
                        </div>
                        <div v-if="selectedAnnualPlan?.club">
                            <span class="text-gray-500">Club:</span>
                            <strong>{{ selectedAnnualPlan.club.name }} ({{ selectedAnnualPlan.club.code || '—'
                                }})</strong>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Date Filed <span class="text-red-500">*</span></label>
                    <input v-model="form.date_filed" type="date" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" />
                    <p v-if="errors.date_filed" class="text-red-600 text-[11px] mt-0.5">{{ errors.date_filed }}</p>
                </div>

                <div>
                    <label class="block mb-0.5">School Year <span class="text-red-500">*</span></label>
                    <select v-model="form.school_year" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly || isApLinked">
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>
                    <p v-if="errors.school_year" class="text-red-600 text-[11px] mt-0.5">{{ errors.school_year }}</p>
                </div>

                <div>
                    <label class="block mb-0.5">Semester <span class="text-red-500">*</span></label>
                    <select v-model="form.semester" class="w-full border rounded px-2 py-1.5" :disabled="readOnly">
                        <option disabled value="">Select semester…</option>
                        <option v-for="s in SEMESTERS" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <p v-if="errors.semester" class="text-red-600 text-[11px] mt-0.5">{{ errors.semester }}</p>
                </div>

                <div class="md:col-span-3">
                    <label class="block mb-0.5">Name of Activity <span class="text-red-500">*</span></label>
                    <input v-model="form.name_of_activity" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" />
                    <p v-if="errors.name_of_activity" class="text-red-600 text-[11px] mt-0.5">{{ errors.name_of_activity
                        }}</p>
                </div>
            </div>

            <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">
                        Club <span class="text-red-500">*</span>
                        <span v-if="isApLinked"
                            class="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 align-middle">locked
                            by Annual Plan</span>
                    </label>
                    <select v-model="form.club_id" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly || isApLinked || !!lockedClubId">
                        <option value="">Select club…</option>
                        <option v-for="c in (clubStore.clubs.data || [])" :key="c.id" :value="c.id">{{ c.name }}
                        </option>
                    </select>
                    <p v-if="errors.club_id" class="text-red-600 text-[11px] mt-0.5">{{ errors.club_id }}</p>
                </div>

                <div>
                    <label class="block mb-0.5">Venue</label>
                    <input v-model="form.venue" class="w-full border rounded px-2 py-1.5" :disabled="readOnly" />
                </div>

                <div>
                    <label class="block mb-0.5">Date of Implementation <span class="text-red-500">*</span></label>
                    <input v-model="form.date_of_implementation" type="date" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.date_of_implementation"
                        :class="errors.date_of_implementation ? 'border-red-500' : ''" />
                    <p v-if="errors.date_of_implementation" class="text-red-600 text-[11px] mt-0.5">{{
                        errors.date_of_implementation }}</p>
                </div>
            </div>

            <div class="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Proposed Budget</label>
                    <input v-model="form.proposed_budget" type="number" step="0.01" min="0"
                        class="w-full border rounded px-2 py-1.5" :disabled="readOnly" />
                </div>

                <div>
                    <label class="block mb-0.5">Nature of Activity <span class="text-red-500">*</span></label>
                    <select v-model="form.nature_of_activity" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.nature_of_activity"
                        :class="errors.nature_of_activity ? 'border-red-500' : ''">
                        <option v-for="n in NATURES" :key="n" :value="n">{{ n }}</option>
                    </select>
                    <p v-if="errors.nature_of_activity" class="text-red-600 text-[11px] mt-0.5">{{
                        errors.nature_of_activity }}</p>
                </div>

                <div>
                    <label class="block mb-0.5">Participants</label>
                    <input v-model="form.participants" class="w-full border rounded px-2 py-1.5" :disabled="readOnly" />
                </div>
            </div>

            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Rationale <span class="text-red-500">*</span></label>
                    <textarea v-model="form.rationale" rows="3" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.rationale"
                        :class="errors.rationale ? 'border-red-500' : ''" />
                    <p v-if="errors.rationale" class="text-red-600 text-[11px] mt-0.5">{{ errors.rationale }}</p>
                </div>
                <div>
                    <label class="block mb-0.5">Objectives <span class="text-red-500">*</span></label>
                    <textarea v-model="form.objectives" rows="3" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.objectives"
                        :class="errors.objectives ? 'border-red-500' : ''" />
                    <p v-if="errors.objectives" class="text-red-600 text-[11px] mt-0.5">{{ errors.objectives }}</p>
                </div>
            </div>

            <div class="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Details of the Activity <span class="text-red-500">*</span></label>
                    <textarea v-model="form.details_of_activity" rows="4" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.details_of_activity"
                        :class="errors.details_of_activity ? 'border-red-500' : ''" />
                    <p v-if="errors.details_of_activity" class="text-red-600 text-[11px] mt-0.5">{{
                        errors.details_of_activity }}</p>
                </div>
                <div>
                    <label class="block mb-0.5">Budgetary Requirements <span class="text-red-500">*</span></label>
                    <textarea v-model="form.budgetary_requirements" rows="4" class="w-full border rounded px-2 py-1.5"
                        :disabled="readOnly" :aria-invalid="!!errors.budgetary_requirements"
                        :class="errors.budgetary_requirements ? 'border-red-500' : ''" />
                    <p v-if="errors.budgetary_requirements" class="text-red-600 text-[11px] mt-0.5">{{
                        errors.budgetary_requirements }}</p>
                </div>
            </div>

            <div v-if="isAdmin" class="mt-2 text-sm">
                <label class="block mb-0.5">Filer Name Override (optional)</label>
                <input v-model="form.file_by_user_name" class="w-full border rounded px-2 py-1.5" :disabled="readOnly"
                    placeholder="If provided, this name appears as the filer" />
            </div>

            <div class="mt-2 text-sm">
                <label class="block mb-0.5">Adviser (optional)</label>
                <input v-model="form.noted_by" class="w-full border rounded px-2 py-1.5" :disabled="readOnly"
                    placeholder="Adviser name (noted by)" />
            </div>

            <div class="mt-2 text-sm">
                <label class="block mb-0.5">Remarks</label>
                <textarea v-model="form.remarks" rows="2" class="w-full border rounded px-2 py-1.5"
                    :disabled="readOnly" />
            </div>

            <input type="hidden" v-model="form.filed_by_user_id" />
            <input type="hidden" v-model="form.office_department" />
            <input type="hidden" v-model="form.status" />

            <div class="flex justify-end gap-1.5 mt-4">
                <button class="px-3 py-1.5 bg-gray-200 rounded text-xs" @click="visible = false">Close</button>
                <button v-if="!readOnly" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs" v-pending-click="onSubmit">
                    {{ submitText }}
                </button>
            </div>
        </div>
    </div>
</template>
