<!-- src/components/annualPlan/AnnualPlanFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'
import { useAnnualPlanStore } from '@/stores/annualPlan'
import axiosInstance from '@/plugins/axiosConfig' // used to fetch clubs (simple)

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    lockedClubId: { type: [String, Number], default: '' },
    initial: {
        type: Object,
        default: () => ({
            id: null,
            reference_code: '',
            school_year: '',
            club_id: '',
            filed_by_user_id: '',
            approver_user_id: null,
            plans: [],
            remarks: '',
            status: 'draft',
        }),
    },
})
const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const store = useAnnualPlanStore()

const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

const clubs = ref([])
const loadClubs = async () => {
    try {
        const { data } = await axiosInstance.get('/clubs', { params: { page: 1, limit: 500, order: 'ASC', sort: 'name' } })
        clubs.value = Array.isArray(data?.data) ? data.data : []
    } catch { clubs.value = [] }
}
onMounted(async () => { await loadClubs(); if (props.lockedClubId) form.value.club_id = Number(props.lockedClubId) })

const form = ref(structuredClone(props.initial))
const errors = ref({})
watch(() => props.initial, (v) => {
    let plans = v?.plans
    try { plans = Array.isArray(plans) ? plans : JSON.parse(plans || '[]') } catch { plans = [] }
    form.value = {
        ...v,
        filed_by_user_id: v?.filed_by_user_id || auth.user?.id || '',
        plans: Array.isArray(plans) ? plans : [],
    }
    errors.value = {}
}, { immediate: true })

const readOnly = computed(() => props.mode === 'edit' && String(form.value.status || '').toLowerCase() !== 'draft')
const titleText = computed(() =>
    props.mode !== 'edit' ? 'New Annual Plan' : (readOnly.value ? 'View Annual Plan (read-only)' : 'Edit Annual Plan')
)
const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))
const currency = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const num = (v) => (Number.isFinite(+v) ? +v : 0)
const clientTotal = computed(() =>
    Array.isArray(form.value.plans) ? form.value.plans.reduce((a, p) => a + num(p?.funds), 0) : 0
)

/* Rows */
const addPlanRow = () => {
    if (!Array.isArray(form.value.plans)) form.value.plans = []
    form.value.plans.push({
        item: '', description: '', date_of_implementation: '', funds: 0, venue: '', notes: ''
    })
}
const removePlanRow = (idx) => { form.value.plans.splice(idx, 1) }

/* Validation */
const schoolYearRx = /^\d{4}-\d{4}$/
const validate = () => {
    if (readOnly.value) return false
    const e = {}
    if (!form.value.school_year || !schoolYearRx.test(form.value.school_year)) e.school_year = 'Format: YYYY-YYYY'
    if (!form.value.club_id) e.club_id = 'Required'
    if (!Array.isArray(form.value.plans) || !form.value.plans.length) e.plans = 'Add at least one plan item'
        (form.value.plans || []).forEach((p, i) => {
            if (!p.item) e[`plans_${i}_item`] = 'Required'
            if (!p.date_of_implementation) e[`plans_${i}_date`] = 'Required'
            if (p.funds != null && Number(p.funds) < 0) e[`plans_${i}_funds`] = 'Must be ≥ 0'
        })
    errors.value = e
    return Object.keys(e).length === 0
}

/* Submit */
const onSubmit = () => {
    if (readOnly.value) return
    if (!validate()) return
    const payload = { ...form.value }
    if (!payload.filed_by_user_id && auth.user?.id) payload.filed_by_user_id = auth.user.id
    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 md:p-5 rounded-2xl shadow-xl w-[1400px] max-h-screen overflow-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-3">
                    <h2 class="text-lg font-semibold">{{ titleText }}</h2>
                    <span class="text-[11px] px-2 py-1 rounded bg-gray-100">{{ form.status }}</span>
                </div>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <div v-if="readOnly"
                class="mb-3 text-xs px-3 py-2 rounded-lg border bg-amber-50 border-amber-200 text-amber-800">
                This plan is <strong>{{ form.status }}</strong>. Editing is disabled.
            </div>

            <!-- Top fields -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div>
                    <label class="block mb-1">School Year <span class="text-red-500">*</span></label>

                    <select v-model="form.school_year" class="w-full border rounded px-2.5 py-2" :disabled="readOnly">
                        <option value="">Select school year…</option>
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>

                    <p v-if="errors.school_year" class="text-[11px] text-red-600 mt-1">{{ errors.school_year }}</p>

                </div>
                <div>
                    <label class="block mb-1">Club <span class="text-red-500">*</span></label>
                    <select v-model="form.club_id" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly || !clubs.length || !!lockedClubId" :class="errors.club_id ? 'border-red-500' : ''">
                        <option value="">Select club…</option>
                        <option v-for="c in clubs" :key="c.id" :value="c.id">
                            {{ c.name }} ({{ c.code }})
                        </option>
                    </select>
                    <p v-if="errors.club_id" class="text-[11px] text-red-600 mt-1">{{ errors.club_id }}</p>
                </div>
                <div>
                    <label class="block mb-1">Remarks</label>
                    <input v-model="form.remarks" class="w-full border rounded px-2.5 py-2" :disabled="readOnly"
                        placeholder="Optional remarks" />
                </div>
            </div>

            <!-- Plan items -->
            <div class="mt-4">
                <div class="flex items-center justify-between">
                    <label class="block mb-1 font-medium">Plan Items <span class="text-red-500">*</span></label>
                    <button class="px-3 py-1 bg-gray-200 rounded text-xs" :disabled="readOnly" @click="addPlanRow">Add
                        Item</button>
                </div>
                <p v-if="errors.plans" class="text-[12px] text-red-600 mb-1">{{ errors.plans }}</p>

                <div class="mt-1 border rounded overflow-hidden">
                    <table class="w-full text-xs">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="text-left p-2">Item</th>
                                <th class="text-left p-2">Description</th>
                                <th class="text-left p-2">Date of Implementation</th>
                                <th class="text-left p-2">Funds</th>
                                <th class="text-left p-2">Venue</th>
                                <th class="text-left p-2">Notes</th>
                                <th class="p-2 w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(p, idx) in form.plans" :key="idx" class="border-t">
                                <td class="p-2">
                                    <input v-model="p.item" class="w-40 border rounded px-2 py-1" :disabled="readOnly"
                                        placeholder="Item name"
                                        :class="errors[`plans_${idx}_item`] ? 'border-red-500' : ''" />
                                </td>
                                <td class="p-2"><input v-model="p.description" class="w-60 border rounded px-2 py-1"
                                        :disabled="readOnly" placeholder="Short description" /></td>
                                <td class="p-2">
                                    <input type="date" v-model="p.date_of_implementation"
                                        class="border rounded px-2 py-1" :disabled="readOnly" placeholder="YYYY-MM-DD"
                                        :class="errors[`plans_${idx}_date`] ? 'border-red-500' : ''" />
                                </td>
                                <td class="p-2">
                                    <input type="number" step="0.01" min="0" v-model.number="p.funds"
                                        class="w-28 border rounded px-2 py-1" :disabled="readOnly" placeholder="0.00"
                                        :class="errors[`plans_${idx}_funds`] ? 'border-red-500' : ''" />
                                </td>
                                <td class="p-2"><input v-model="p.venue" class="w-40 border rounded px-2 py-1"
                                        :disabled="readOnly" placeholder="Venue / location" /></td>
                                <td class="p-2"><input v-model="p.notes" class="w-52 border rounded px-2 py-1"
                                        :disabled="readOnly" placeholder="Notes (optional)" /></td>
                                <td class="p-2 text-right">
                                    <button class="px-2 py-1 bg-red-50 text-red-700 rounded" :disabled="readOnly"
                                        @click="removePlanRow(idx)">Remove</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="mt-2 text-right text-sm">
                    <span class="mr-4">Client total (preview):</span>
                    <strong>{{ currency(clientTotal) }}</strong>
                    <p class="text-[11px] text-gray-500 mt-1">Server recalculates total_budget on save.</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 mt-5">
                <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="visible = false">Close</button>
                <button v-if="!readOnly" class="px-4 py-2 bg-blue-600 text-white rounded text-xs" v-pending-click="onSubmit">
                    {{ submitText }}
                </button>
            </div>
        </div>
    </div>
</template>
