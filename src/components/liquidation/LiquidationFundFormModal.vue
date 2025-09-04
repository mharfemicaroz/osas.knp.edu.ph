<!-- src/components/liquidation/LiquidationFundFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'
import { useAuthStore } from '@/stores/auth'
import { useLiquidationFundStore } from '@/stores/liquidationFund'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useClubScope } from '@/utils/clubScope'

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
            file_by_user_name: '',
            sources_of_fund: {
                contribution: 0,
                payment_from_fines: 0,
                solicitations: 0,
                donations: 0,
                other_sources: 0,
                current_available_funds: 0,
                other_sources_note: '',
            },
            uses_of_fund: [],
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
const lfStore = useLiquidationFundStore()
const adStore = useActivityDesignStore()
const isAdmin = computed(() => String(auth.user?.role || '').toLowerCase() === 'admin')

const { isClub, activeClubId } = useClubScope()
const approvedAds = computed(() => {
    const list = Array.isArray(adStore.items?.data)
        ? adStore.items.data.filter((x) => String(x.status).toLowerCase() === 'approved')
        : []
    if (isClub.value && activeClubId.value) {
        const cid = Number(activeClubId.value)
        return list.filter(x => Number(x.club_id || x.club?.id) === cid)
    }
    return list
})

onMounted(async () => {
    const base = { page: 1, limit: 200, status: 'approved' }
    const params = isClub.value && activeClubId.value ? { ...base, club_id: activeClubId.value } : base
    await adStore.fetchAll(params, true)
})

const form = ref(structuredClone(props.initial))
const errors = ref({})

watch(
    () => props.initial,
    (v) => {
        // normalize JSON -> object/array
        let src = v.sources_of_fund
        let uses = v.uses_of_fund
        try { if (typeof src === 'string') src = JSON.parse(src || '{}') } catch { }
        try { if (typeof uses === 'string') uses = JSON.parse(uses || '[]') } catch { }
        form.value = {
            ...v,
            sources_of_fund: {
                contribution: 0, payment_from_fines: 0, solicitations: 0, donations: 0, other_sources: 0,
                current_available_funds: 0, other_sources_note: '', ...(src || {})
            },
            uses_of_fund: Array.isArray(uses) ? uses : [],
        }
        errors.value = {}
    },
    { immediate: true }
)

const statusSafe = computed(() => String(form.value?.status || '').toLowerCase())
const readOnly = computed(() => props.mode === 'edit' && statusSafe.value !== 'draft')
const titleText = computed(() =>
    props.mode !== 'edit' ? 'New Liquidation Fund' : (readOnly.value ? 'View Liquidation (read-only)' : 'Edit Liquidation')
)
const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))

/* Activity Design label */
const adLabel = (ad) => {
    const name = ad?.name_of_activity || 'Untitled'
    const ref = ad?.reference_code ? ` [${ad.reference_code}]` : ''
    const doi = ad?.date_of_implementation ? ` • ${ad.date_of_implementation}` : ''
    return `${name}${ref}${doi}`
}

/* Client totals preview */
const num = (v) => (Number.isFinite(+v) ? +v : 0)
const sumSources = computed(() => {
    const s = form.value.sources_of_fund || {}
    return num(s.contribution) + num(s.payment_from_fines) + num(s.solicitations) + num(s.donations) + num(s.other_sources) + num(s.current_available_funds)
})
const sumUses = computed(() => (Array.isArray(form.value.uses_of_fund) ? form.value.uses_of_fund.reduce((a, b) => a + num(b?.amount), 0) : 0))
const cashOnHand = computed(() => sumSources.value - sumUses.value)
const fmt = (n) => Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* Uses of fund rows */
const addUseRow = () => {
    if (!Array.isArray(form.value.uses_of_fund)) form.value.uses_of_fund = []
    form.value.uses_of_fund.push({
        date: '', qty: 1, unit: '', particulars: '', sheet_no: '', amount: 0, in_charge: ''
    })
}
const removeUseRow = (idx) => {
    form.value.uses_of_fund.splice(idx, 1)
}

/* Validation */
const validate = () => {
    if (readOnly.value) return false
    const e = {}
    if (!form.value.activity_design_id) e.activity_design_id = 'Required'
    // basic sanity on numeric fields (non-negative)
    const s = form.value.sources_of_fund || {}
        ;['contribution', 'payment_from_fines', 'solicitations', 'donations', 'other_sources', 'current_available_funds'].forEach(k => {
            if (s[k] != null && Number(s[k]) < 0) e[`src_${k}`] = 'Must be ≥ 0'
        })
    if (Array.isArray(form.value.uses_of_fund)) {
        form.value.uses_of_fund.forEach((u, i) => {
            if (u?.qty != null && Number(u.qty) <= 0) e[`use_${i}_qty`] = 'Qty must be > 0'
            if (u?.amount != null && Number(u.amount) < 0) e[`use_${i}_amount`] = 'Must be ≥ 0'
        })
    }
    errors.value = e
    return Object.keys(e).length === 0
}

/* Submit */
const onSubmit = () => {
    if (readOnly.value) return
    if (!validate()) return
    const payload = { ...form.value }
    // set filed_by on create
    if (!payload.filed_by_user_id && auth.user?.id) payload.filed_by_user_id = auth.user.id
    // Only admins can set file_by_user_name
    if (!isAdmin.value) delete payload.file_by_user_name
    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 md:p-5 rounded-2xl shadow-xl w-[1096px] max-h-screen overflow-auto">
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
                This liquidation is <strong>{{ form.status }}</strong>. Editing is disabled.
            </div>

            <!-- Activity Design -->
            <div class="text-sm mb-3">
                <label class="block mb-1">Activity Design <span class="text-red-500">*</span></label>
                <select v-model="form.activity_design_id" class="w-full border rounded px-2.5 py-2"
                    :disabled="readOnly || adStore.isLoading"
                    :class="errors.activity_design_id ? 'border-red-500' : ''">
                    <option value="">Select approved activity design…</option>
                    <option v-for="ad in approvedAds" :key="ad.id" :value="ad.id">
                        {{ adLabel(ad) }}
                    </option>
                </select>
                <p v-if="errors.activity_design_id" class="text-red-600 text-[11px] mt-1">{{ errors.activity_design_id
                }}</p>
                <p v-if="adStore.isLoading" class="text-[11px] text-gray-500 mt-1">Loading approved activities…</p>
                <p v-else-if="!approvedAds.length" class="text-[11px] text-amber-700 mt-1">No approved activity designs
                    found.</p>
            </div>

            <!-- Sources of Fund -->
            <div class="mt-2 p-3 border rounded-lg bg-white">
                <div class="text-sm font-medium mb-2">Sources of Fund</div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <label class="block mb-1">Contribution</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.contribution" :disabled="readOnly"
                            :class="errors.src_contribution ? 'border-red-500' : ''" />
                    </div>
                    <div>
                        <label class="block mb-1">Payment from Fines</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.payment_from_fines" :disabled="readOnly"
                            :class="errors.src_payment_from_fines ? 'border-red-500' : ''" />
                    </div>
                    <div>
                        <label class="block mb-1">Solicitations</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.solicitations" :disabled="readOnly"
                            :class="errors.src_solicitations ? 'border-red-500' : ''" />
                    </div>
                    <div>
                        <label class="block mb-1">Donations</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.donations" :disabled="readOnly"
                            :class="errors.src_donations ? 'border-red-500' : ''" />
                    </div>
                    <div>
                        <label class="block mb-1">Other Sources</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.other_sources" :disabled="readOnly"
                            :class="errors.src_other_sources ? 'border-red-500' : ''" />
                    </div>
                    <div>
                        <label class="block mb-1">Current Available Funds</label>
                        <input type="number" step="0.01" min="0" class="w-full border rounded px-2.5 py-2"
                            v-model.number="form.sources_of_fund.current_available_funds" :disabled="readOnly"
                            :class="errors.src_current_available_funds ? 'border-red-500' : ''" />
                    </div>
                    <div class="md:col-span-2">
                        <label class="block mb-1">Other Sources Note (optional)</label>
                        <textarea rows="2" class="w-full border rounded px-2.5 py-2"
                            v-model="form.sources_of_fund.other_sources_note" :disabled="readOnly" />
                    </div>
                </div>

                <div class="mt-3 text-sm">
                    <div class="flex flex-wrap gap-4">
                        <div>Total Sources: <strong>{{ fmt(sumSources) }}</strong></div>
                        <div>Total Uses: <strong>{{ fmt(sumUses) }}</strong></div>
                        <div>Cash on Hand: <strong :class="cashOnHand < 0 ? 'text-red-600' : 'text-emerald-700'">{{
                            fmt(cashOnHand) }}</strong></div>
                    </div>
                    <p class="text-[11px] text-gray-500 mt-1">Server recalculates totals on save.</p>
                </div>
            </div>

            <!-- Uses of Fund -->
            <div class="mt-4 text-sm">
                <div class="flex items-center justify-between">
                    <label class="block mb-1 font-medium">Use of Fund</label>
                    <button class="px-3 py-1 bg-gray-200 rounded text-xs" :disabled="readOnly" @click="addUseRow">Add
                        Row</button>
                </div>

                <div class="mt-2 border rounded overflow-hidden">
                    <table class="w-full text-xs">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="text-left p-2">Date</th>
                                <th class="text-left p-2">Qty</th>
                                <th class="text-left p-2">Unit</th>
                                <th class="text-left p-2">Particulars</th>
                                <th class="text-left p-2">Sheet No.</th>
                                <th class="text-left p-2">Amount</th>
                                <th class="text-left p-2">In-Charge</th>
                                <th class="p-2 w-16"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(u, idx) in form.uses_of_fund" :key="idx" class="border-t">
                                <td class="p-2"><input type="date" v-model="u.date" class="border rounded px-2 py-1"
                                        :disabled="readOnly" /></td>
                                <td class="p-2">
                                    <input type="number" min="1" v-model.number="u.qty"
                                        class="w-20 border rounded px-2 py-1" :disabled="readOnly"
                                        :class="errors[`use_${idx}_qty`] ? 'border-red-500' : ''" />
                                </td>
                                <td class="p-2"><input v-model="u.unit" class="w-20 border rounded px-2 py-1"
                                        :disabled="readOnly" /></td>
                                <td class="p-2"><input v-model="u.particulars" class="w-52 border rounded px-2 py-1"
                                        :disabled="readOnly" /></td>
                                <td class="p-2"><input v-model="u.sheet_no" class="w-24 border rounded px-2 py-1"
                                        :disabled="readOnly" /></td>
                                <td class="p-2">
                                    <input type="number" step="0.01" min="0" v-model.number="u.amount"
                                        class="w-28 border rounded px-2 py-1" :disabled="readOnly"
                                        :class="errors[`use_${idx}_amount`] ? 'border-red-500' : ''" />
                                </td>
                                <td class="p-2"><input v-model="u.in_charge" class="w-32 border rounded px-2 py-1"
                                        :disabled="readOnly" /></td>
                                <td class="p-2 text-right">
                                    <button class="px-2 py-1 bg-red-50 text-red-700 rounded" :disabled="readOnly"
                                        @click="removeUseRow(idx)">Remove</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="mt-2 text-right text-sm">
                    <span class="mr-4">Total Uses:</span>
                    <strong>{{ fmt(sumUses) }}</strong>
                </div>
            </div>

            <!-- Remarks -->
            <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div v-if="isAdmin">
                    <label class="block mb-1">Filer Name Override (optional)</label>
                    <input v-model="form.file_by_user_name" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly" placeholder="If provided, this name appears as the filer" />
                </div>

                <div>
                    <label class="block mb-1">Remarks</label>
                    <textarea v-model="form.remarks" rows="3" class="w-full border rounded px-2.5 py-2"
                        :disabled="readOnly"></textarea>
                </div>
            </div>


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
