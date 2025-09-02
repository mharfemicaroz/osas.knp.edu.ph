<!-- src/views/LiquidationFundsPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'

import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import ActivityRowActions from '@/components/activity/ActivityRowActions.vue'
import LiquidationFundFormModal from '@/components/liquidation/LiquidationFundFormModal.vue'
import LiquidationAttachmentsModal from '@/components/liquidation/LiquidationAttachmentsModal.vue'

import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useLiquidationFundStore } from '@/stores/liquidationFund'

import { printLiquidationFormPdf, buildLiquidationFormPdfDoc } from '@/utils/printLiquidationFormPdf'

import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiPlus,
    mdiFilter,
    mdiRefresh,
    mdiMagnify,
} from '@mdi/js'

const store = useLiquidationFundStore()
const authStore = useAuthStore()
const userStore = useUserStore()

/* --- date range picker common --- */
const dpRangeCommon = {
    range: true,
    partialRange: true,
    multiCalendars: 2,
    modelType: 'yyyy-MM-dd',
    enableTimePicker: false,
    autoApply: true,
    clearable: true,
}

/* ---------- QUERY STATE ---------- */
const lastQuery = ref({
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'DESC',
    q: '',
    status: '',
    activity_design_id: '',
    filed_by_user_id: '',
    date_filed_from: '',
    date_filed_to: '',
})

const filedRange = computed({
    get: () => {
        const { date_filed_from: s, date_filed_to: e } = lastQuery.value
        return s || e ? [s || null, e || null] : null
    },
    set: (val) => {
        if (!val) {
            lastQuery.value.date_filed_from = null
            lastQuery.value.date_filed_to = null
        } else {
            const [s, e] = val
            lastQuery.value.date_filed_from = s || null
            lastQuery.value.date_filed_to = e || null
        }
    },
})

/* ---------- DATA FETCH ---------- */
const fetchAll = async (patch = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...patch }
    const params = { ...lastQuery.value }
        ;['q', 'status', 'activity_design_id', 'filed_by_user_id', 'date_filed_from', 'date_filed_to']
            .forEach(k => { if (params[k] === '' || params[k] == null) delete params[k] })
    await store.fetchAll(params, force)
}

onMounted(async () => {
    await fetchAll({ page: 1, limit: 10 })
})

/* ---------- TABLE DATA WRAP ---------- */
const dataWrap = computed(() => ({
    total: store.items.total || 0,
    totalPages: store.items.totalPages || 1,
    currentPage: store.items.currentPage || 1,
    pageSize: store.items.pageSize || 10,
    data: store.items.data || [],
}))

/* ---------- CONSTANTS ---------- */
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'completed']
const statusTone = (s) => {
    switch (String(s || '').toLowerCase()) {
        case 'draft': return 'gray'
        case 'pending': return 'amber'
        case 'approved': return 'emerald'
        case 'rejected': return 'red'
        case 'cancelled': return 'zinc'
        case 'completed': return 'blue'
        default: return 'gray'
    }
}

/* ---------- TABLE COLUMNS ---------- */
const currency = (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return '—'
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
const mainColumns = [
    { key: 'reference_code', label: 'Ref Code', sortable: true, width: 140 },
    {
        key: 'activity_design',
        label: 'Activity',
        sortable: false,
        minWidth: 240,
        formatter: (value, row) => (row.activity_design ? row.activity_design.name_of_activity : ''),
    },
    { key: 'total_sources_amount', label: 'Sources', sortable: true, width: 120 },
    { key: 'total_uses_amount', label: 'Uses', sortable: true, width: 120 },
    { key: 'total_cash_on_hand', label: 'Cash on Hand', sortable: true, width: 140 },
    { key: 'date_filed', label: 'Date Filed', sortable: true, width: 120 },
    { key: 'status', label: 'Status', sortable: true, width: 120 },
]

const handleQueryChange = async (q) => { await fetchAll(q) }

/* ---------- CRUD + WORKFLOW ---------- */
const createVisible = ref(false)
const editVisible = ref(false)
const editInitial = ref(null)

const openCreate = () => { createVisible.value = true }

const onCreateSubmit = async (payload) => {
    await store.create(payload)
    createVisible.value = false
    await fetchAll({}, true)
}

const openEdit = async (row) => {
    await store.fetchById(row.id)
    const r = store.selected || row

    // Normalize JSON fields for the form
    let sources_of_fund = {}
    let uses_of_fund = []
    try { sources_of_fund = typeof r.sources_of_fund === 'string' ? JSON.parse(r.sources_of_fund || '{}') : (r.sources_of_fund || {}) } catch { }
    try { uses_of_fund = Array.isArray(r.uses_of_fund) ? r.uses_of_fund : JSON.parse(r.uses_of_fund || '[]') } catch { }

    editInitial.value = {
        id: r.id,
        reference_code: r.reference_code,
        date_filed: r.date_filed || '',
        activity_design_id: r.activity_design_id || '',
        file_by_user_name: r.file_by_user_name || '',
        sources_of_fund,
        uses_of_fund,
        remarks: r.remarks || '',
        status: r.status || 'draft',
    }
    editVisible.value = true
}

const onEditSubmit = async (payload) => {
    const { id, ...rest } = payload
    await store.updateById(id, rest)
    editVisible.value = false
    await fetchAll({}, true)
}

const confirmDelete = async (row) => {
    if (!row?.id) return
    const result = await Swal.fire({
        title: `Delete liquidation "${row.reference_code}"?`,
        text: 'This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
    })
    if (result.isConfirmed) {
        await store.deleteById(row.id)
        await fetchAll({}, true)
        await Swal.fire('Deleted', 'The liquidation fund has been deleted.', 'success')
    }
}

const openView = async (row) => { await openEdit(row) }

const submitItem = async (row) => {
    const res = await Swal.fire({
        title: 'Submit for approval?',
        text: 'You can no longer edit after submission.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Submit',
        cancelButtonText: 'Cancel',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return
    try {
        await store.submit(row.id)
        await fetchAll({}, true)
        await Swal.fire('Submitted', 'Liquidation is now pending approval.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to submit.', 'error')
    }
}

// ---------------- Email (Send PDF) ----------------
const emailVisible = ref(false)
const emailRow = ref(null)
const emailForm = ref({ from_email: '', from_name: '', to: '', subject: '', html: '', attachments: [] })

const toBase64 = (arrayBuffer) => {
  let binary = ''
  const bytes = new Uint8Array(arrayBuffer)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

const openEmail = async (row) => {
  try {
    await store.fetchById(row.id)
    const r = store.selected || row
    const doc = await buildLiquidationFormPdfDoc(r)
    const dataUri = doc.output('datauristring')
    const b64 = String(dataUri).split(',')[1] || ''
    const filename = `${r.reference_code || 'Liquidation_Fund'}.pdf`
    emailRow.value = r
    emailForm.value = {
      from_email: 'osas@knp.edu.ph',
      from_name: `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim(),
      to: '',
      subject: `Liquidation Fund ${r.reference_code || ''}`.trim(),
      html: 'Please see the attached file.',
      attachments: [{ filename, content: b64, type: 'application/pdf' }],
    }
    emailVisible.value = true
  } catch (e) {
    await Swal.fire('Error', store.error || 'Failed to prepare email.', 'error')
  }
}

const sendEmailNow = async () => {
  const r = emailRow.value
  if (!r) return
  try {
    await store.sendEmail(r.id, { ...emailForm.value })
    emailVisible.value = false
    await Swal.fire('Sent', 'Email sent successfully.', 'success')
  } catch (e) {
    await Swal.fire('Error', store.error || 'Failed to send email.', 'error')
  }
}

const approveItem = async (row) => {
    const res = await Swal.fire({
        title: 'Approve liquidation?',
        input: 'textarea',
        inputLabel: 'Remarks (optional)',
        inputPlaceholder: 'Add a note…',
        showCancelButton: true,
        confirmButtonText: 'Approve',
        cancelButtonText: 'Cancel',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return
    try {
        await store.approve(row.id, res.value || '')
        await fetchAll({}, true)
        await Swal.fire('Approved', 'Liquidation has been approved.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to approve.', 'error')
    }
}

const rejectItem = async (row) => {
    const res = await Swal.fire({
        title: 'Reject liquidation?',
        input: 'textarea',
        inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…',
        inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Reject',
        cancelButtonText: 'Cancel',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return
    try {
        await store.reject(row.id, res.value)
        await fetchAll({}, true)
        await Swal.fire('Rejected', 'Liquidation has been rejected.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to reject.', 'error')
    }
}

const cancelItem = async (row) => {
    const res = await Swal.fire({
        title: 'Cancel liquidation?',
        input: 'textarea',
        inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…',
        inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Cancel Liquidation',
        cancelButtonText: 'Keep',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return
    try {
        await store.cancel(row.id, res.value)
        await fetchAll({}, true)
        await Swal.fire('Cancelled', 'Liquidation has been cancelled.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to cancel.', 'error')
    }
}

const printItem = async (row) => {
    const status = String(row?.status || '').toLowerCase()
    if (status !== 'approved') {
        await Swal.fire('Not allowed', 'Only approved liquidation can be printed.', 'info')
        return
    }

    try {
        await store.fetchById(row.id)                              // get full record with includes
        const full = store.selected || row
        await printLiquidationFormPdf(full)
    } catch (e) {
        await Swal.fire('Error', store.error || 'Failed to generate PDF.', 'error')
        console.error(e)
    }
}

/* attachments */
const attachVisible = ref(false)
const attachRow = ref(null)
const openAttachments = async (row) => {
    await store.fetchById(row.id)
    attachRow.value = store.selected || row
    attachVisible.value = true
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <NotificationBar v-if="store.error" :icon="mdiAlertCircle" color="danger">
                {{ store.error }}
            </NotificationBar>

            <SectionTitleLineWithButton :icon="mdiTableBorder" title="Liquidation Funds" main>
                <div class="flex items-center gap-2">
                    <BaseButton :icon="mdiPlus" color="primary" label="New Liquidation" @click="openCreate" />
                    <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
                </div>
            </SectionTitleLineWithButton>

            <!-- Filters -->
            <div class="p-2 mb-4 rounded-xl border bg-white/60">
                <div class="flex items-center gap-2 mb-2 text-gray-700">
                    <svg class="w-4 h-4" viewBox="0 0 24 24">
                        <path :d="mdiFilter" />
                    </svg>
                    <span class="font-medium text-sm">Filters</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
                    <div class="md:col-span-2 flex">
                        <input v-model="lastQuery.q" placeholder="Search by ref, remarks…"
                            class="border rounded-s px-2 py-2 flex-1" @keyup.enter="fetchAll({ page: 1 })" />
                        <button class="px-3 border border-l-0 rounded-e bg-gray-50" title="Search"
                            @click="fetchAll({ page: 1 })">
                            <svg class="w-5 h-5" viewBox="0 0 24 24">
                                <path :d="mdiMagnify" />
                            </svg>
                        </button>
                    </div>

                    <select v-model="lastQuery.status" class="border rounded px-2 py-2">
                        <option value="">All status</option>
                        <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
                    </select>

                    <div class="md:col-span-2">
                        <Datepicker v-model="filedRange" v-bind="dpRangeCommon" placeholder="Date filed range" />
                    </div>

                    <div class="flex items-center gap-2 md:col-span-1">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="fetchAll({ page: 1 })">
                            Apply Filters
                        </button>
                        <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="() => {
                            lastQuery.value = { page: 1, limit: 10, sort: 'created_at', order: 'DESC', q: '', status: '', date_filed_from: '', date_filed_to: '' }
                            fetchAll({ page: 1 }, true)
                        }">Reset</button>
                    </div>
                </div>
            </div>

            <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading"
                @query-change="handleQueryChange">
                <template #cell-total_sources_amount="{ value }">
                    <span>{{ currency(value) }}</span>
                </template>
                <template #cell-total_uses_amount="{ value }">
                    <span>{{ currency(value) }}</span>
                </template>
                <template #cell-total_cash_on_hand="{ value }">
                    <span class="font-medium" :class="Number(value) < 0 ? 'text-red-600' : 'text-emerald-700'">
                        {{ currency(value) }}
                    </span>
                </template>
                <template #cell-status="{ value }">
                    <Badge :text="value || '—'" :tone="statusTone(value)" />
                </template>
                <template #cell-actions="{ row }">
                    <ActivityRowActions :row="row"
                        :moderator="['admin', 'manager'].includes(String(authStore.user?.role || '').toLowerCase())"
                        @attachments="openAttachments" @submit="submitItem" @approve="approveItem" @reject="rejectItem"
                        @edit="openEdit" @delete="confirmDelete" @view="openView(row)" @cancel="cancelItem"
                        @print="printItem" @email="openEmail" />
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <!-- Modals -->
    <LiquidationFundFormModal v-model="createVisible" mode="create" @submit="onCreateSubmit" />
    <LiquidationFundFormModal v-model="editVisible" mode="edit" :initial="editInitial || {}" @submit="onEditSubmit" />
    <LiquidationAttachmentsModal v-model="attachVisible" :row="attachRow" />

    <!-- Email Modal -->
    <div v-if="emailVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div class="bg-white w-[560px] rounded-xl shadow p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-base font-semibold">Send Email</h3>
          <button class="px-2 py-1 text-xs bg-gray-200 rounded" @click="emailVisible = false">Close</button>
        </div>
        <div class="grid grid-cols-1 gap-2 text-sm">
          <div>
            <label class="block mb-0.5">To</label>
            <div class="flex gap-2">
              <input v-model="emailForm.to" class="flex-1 border rounded px-2 py-1.5" placeholder="recipient@example.com" />
              <button class="px-2 py-1 text-[11px] rounded border bg-gray-50 hover:bg-gray-100"
                @click="() => { const id = (emailRow?.filed_by_user_id || emailRow?.filed_by?.id); if (id) userStore.fetchById(id).then(() => { const e = userStore.selectedUser?.email; if (e) emailForm.to = e; }); }">Use Filer</button>
              <button class="px-2 py-1 text-[11px] rounded border bg-rose-50 hover:bg-rose-100"
                @click="() => { emailForm.attachments = []; }">Remove Attachment</button>
            </div>
          </div>
          <div>
            <label class="block mb-0.5">Subject</label>
            <input v-model="emailForm.subject" class="w-full border rounded px-2 py-1.5" />
          </div>
          <div>
            <label class="block mb-0.5">Message</label>
            <textarea v-model="emailForm.html" rows="4" class="w-full border rounded px-2 py-1.5"></textarea>
          </div>
          <div class="text-[11px] text-gray-600">Attachment: {{ (emailForm.attachments?.[0]?.filename) || 'liquidation.pdf' }}</div>
        </div>
        <div class="mt-3 flex justify-end gap-2">
          <button class="px-3 py-1.5 text-xs bg-gray-200 rounded" @click="emailVisible = false">Cancel</button>
          <button class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded" @click="sendEmailNow">Send</button>
        </div>
      </div>
    </div>
</template>

