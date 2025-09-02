<!-- src/views/WorkFlowsPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'
import ActivityDesignFormModal from '@/components/activity/ActivityDesignFormModal.vue'
import UtilizationRequestFormModal from '@/components/utilization/UtilizationRequestFormModal.vue'
import LiquidationFundFormModal from '@/components/liquidation/LiquidationFundFormModal.vue'
import AnnualPlanFormModal from '@/components/annualPlan/AnnualPlanFormModal.vue'

import { useAnnualPlanStore } from '@/stores/annualPlan'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useLiquidationFundStore } from '@/stores/liquidationFund'
import { useGrievanceStore } from '@/stores/grievance'

import { mdiTableBorder, mdiFilter, mdiRefresh, mdiCheck, mdiClose, mdiCancel, mdiTrashCan } from '@mdi/js'

const apStore = useAnnualPlanStore()
const adStore = useActivityDesignStore()
const urStore = useUtilizationRequestStore()
const lfStore = useLiquidationFundStore()
const grvStore = useGrievanceStore()

// ---------------- Filters ----------------
const TYPES = [
  { key: 'AP', label: 'Annual Plan' },
  { key: 'AD', label: 'Activity Design' },
  { key: 'UR', label: 'Utilization' },
  { key: 'LF', label: 'Liquidation' },
  { key: 'GRV', label: 'Grievance' },
]

const lastQuery = ref({
  page: 1,
  limit: 10,
  q: '',
  status: '',
  types: new Set(['AP', 'AD', 'UR', 'LF', 'GRV']),
})

const toggleType = (k) => {
  const s = lastQuery.value.types
  if (s.has(k)) {
    s.delete(k);
  } else {
    s.add(k);
  }
}

const fetchAll = async (force = true) => {
  const base = { limit: 300, officer: 'true' }
  const { q, status } = lastQuery.value
  const params = (extra = {}) => ({ ...base, ...(q ? { q } : {}), ...(status ? { status } : {}), ...extra })
  await Promise.allSettled([
    apStore.fetchAll(params({ order: 'DESC', sort: 'approved_at' }), force),
    adStore.fetchAll(params({ order: 'DESC', sort: 'created_at' }), force),
    urStore.fetchAll(params({ order: 'DESC', sort: 'start_at' }), force),
    lfStore.fetchAll(params({ order: 'DESC', sort: 'created_at' }), force),
    grvStore.fetchAll(params({ order: 'DESC', sort: 'created_at' }), force),
  ])
}

onMounted(async () => { await fetchAll(true) })

// ---------------- Data merge ----------------
const rows = computed(() => {
  const out = []
  if (lastQuery.value.types.has('AP')) {
    for (const r of apStore.items.data || []) {
      out.push({
        id: r.id,
        type: 'AP',
        reference: r.reference_code || `AP-${r.id}`,
        title: r.school_year ? `Annual Plan SY ${r.school_year}` : 'Annual Plan',
        club: r.club?.name || '',
        date: r.approved_at || r.submitted_at || r.created_at,
        status: r.status || '',
        raw: r,
      })
    }
  }
  if (lastQuery.value.types.has('AD')) {
    for (const r of adStore.items.data || []) {
      out.push({
        id: r.id,
        type: 'AD',
        reference: r.reference_code || `AD-${r.id}`,
        title: r.name_of_activity || 'Activity',
        club: r.club?.name || '',
        date: r.date_of_implementation || r.created_at,
        status: r.status || '',
        raw: r,
      })
    }
  }
  if (lastQuery.value.types.has('UR')) {
    for (const r of urStore.items.data || []) {
      out.push({
        id: r.id,
        type: 'UR',
        reference: r.reference_code || `UR-${r.id}`,
        title: r.activity_design?.name_of_activity ? `Utilization • ${r.activity_design.name_of_activity}` : 'Utilization',
        club: r.activity_design?.club?.name || '',
        date: r.start_at || r.created_at,
        status: r.status || '',
        raw: r,
      })
    }
  }
  if (lastQuery.value.types.has('LF')) {
    for (const r of lfStore.items.data || []) {
      out.push({
        id: r.id,
        type: 'LF',
        reference: r.reference_code || `LF-${r.id}`,
        title: r.purpose || 'Liquidation',
        club: r.activity_design?.club?.name || r.club?.name || '',
        date: r.date_filed || r.created_at,
        status: r.status || '',
        raw: r,
      })
    }
  }
  if (lastQuery.value.types.has('GRV')) {
    for (const r of grvStore.items.data || []) {
      out.push({
        id: r.id,
        type: 'GRV',
        reference: r.reference_code || `GRV-${r.id}`,
        title: r.title || 'Grievance',
        club: r.club?.name || '',
        date: r.created_at,
        status: r.status || '',
        raw: r,
      })
    }
  }

  // Optional client-side search refinement
  const q = (lastQuery.value.q || '').trim().toLowerCase()
  let list = out
  if (q) list = list.filter((x) => `${x.reference} ${x.title} ${x.club}`.toLowerCase().includes(q))
  const st = (lastQuery.value.status || '').trim().toLowerCase()
  if (st) list = list.filter((x) => String(x.status || '').toLowerCase() === st)
  return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

// Pagination for BaseTable
const pagedRows = computed(() => {
  const page = Math.max(parseInt(lastQuery.value.page, 10) || 1, 1)
  const limit = Math.max(parseInt(lastQuery.value.limit, 10) || 10, 1)
  const start = (page - 1) * limit
  return rows.value.slice(start, start + limit)
})

const tableWrap = computed(() => ({
  total: rows.value.length,
  totalPages: Math.max(Math.ceil(rows.value.length / (parseInt(lastQuery.value.limit, 10) || 10)), 1),
  currentPage: Math.max(parseInt(lastQuery.value.page, 10) || 1, 1),
  pageSize: Math.max(parseInt(lastQuery.value.limit, 10) || 10, 1),
  data: pagedRows.value,
}))

const handleQueryChange = (q) => {
  if (q?.page != null) lastQuery.value.page = q.page
  if (q?.limit != null) lastQuery.value.limit = q.limit
}

const STATUS_TONE = {
  draft: 'gray', pending: 'amber', approved: 'emerald', rejected: 'red', cancelled: 'zinc', completed: 'indigo',
  submitted: 'amber', in_review: 'blue', resolved: 'emerald'
}
const statusTone = (s) => STATUS_TONE[String(s || '').toLowerCase()] || 'gray'
const isPending = (row) => String(row?.status || '').toLowerCase() === 'pending'
const isApproved = (row) => String(row?.status || '').toLowerCase() === 'approved'

// Grievance transitions helpers
const grvMarkInReview = async (row) => { await grvStore.updateById(row.id, { status: 'in_review' }); await fetchAll(true) }
const grvResolve = async (row) => { await grvStore.updateById(row.id, { status: 'resolved' }); await fetchAll(true) }
const grvReject = async (row) => { await grvStore.updateById(row.id, { status: 'rejected' }); await fetchAll(true) }

// ---------------- Actions ----------------
async function confirmRemarks(title, confirmText) {
  const res = await Swal.fire({
    title, input: 'text', inputLabel: 'Remarks (optional)', inputPlaceholder: 'Enter remarks...', showCancelButton: true,
    confirmButtonText: confirmText || 'Confirm', cancelButtonText: 'Cancel'
  })
  if (!res.isConfirmed) return null
  return res.value || ''
}

async function handleApprove(row) {
  const remarks = await confirmRemarks(`Approve ${row.type}-${row.reference}?`, 'Approve')
  if (remarks === null) return
  switch (row.type) {
    case 'AP': await apStore.approve(row.id, remarks); break
    case 'AD': await adStore.approve(row.id, remarks); break
    case 'UR': await urStore.approve(row.id, remarks); break
    case 'LF': await lfStore.approve(row.id, remarks); break
  }
  await fetchAll(true)
  await Swal.fire('Approved', 'Item has been approved.', 'success')
}

async function handleReject(row) {
  const remarks = await confirmRemarks(`Reject ${row.type}-${row.reference}?`, 'Reject')
  if (remarks === null) return
  switch (row.type) {
    case 'AP': await apStore.reject(row.id, remarks); break
    case 'AD': await adStore.reject(row.id, remarks); break
    case 'UR': await urStore.reject(row.id, remarks); break
    case 'LF': await lfStore.reject(row.id, remarks); break
  }
  await fetchAll(true)
  await Swal.fire('Rejected', 'Item has been rejected.', 'success')
}

async function handleCancel(row) {
  const remarks = await confirmRemarks(`Cancel ${row.type}-${row.reference}?`, 'Cancel')
  if (remarks === null) return
  switch (row.type) {
    case 'AP': await apStore.cancel(row.id, remarks); break
    case 'AD': await adStore.cancel(row.id, remarks); break
    case 'UR': await urStore.cancel(row.id, remarks); break
    case 'LF': await lfStore.cancel(row.id, remarks); break
  }
  await fetchAll(true)
  await Swal.fire('Cancelled', 'Item has been cancelled.', 'success')
}

async function handleDelete(row) {
  const res = await Swal.fire({ title: `Delete ${row.type}-${row.reference}?`, text: 'This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })
  if (!res.isConfirmed) return
  switch (row.type) {
    case 'AP': await apStore.deleteById(row.id); break
    case 'AD': await adStore.deleteById(row.id); break
    case 'UR': await urStore.deleteById(row.id); break
    case 'LF': await lfStore.deleteById(row.id); break
  }
  await fetchAll(true)
  await Swal.fire('Deleted', 'Item removed.', 'success')
}

const columns = [
  { key: 'type', label: 'Type', sortable: false, width: 110 },
  { key: 'reference', label: 'Reference', sortable: true, width: 140 },
  { key: 'title', label: 'Title', sortable: false, minWidth: 240 },
  { key: 'club', label: 'Club', sortable: false, minWidth: 160 },
  { key: 'date', label: 'Date', sortable: true, width: 140 },
  { key: 'status', label: 'Status', sortable: true, width: 120 },
]

// ---------- View transaction details (read-only) ----------
const apVisible = ref(false)
const adVisible = ref(false)
const urVisible = ref(false)
const lfVisible = ref(false)
const apInitial = ref(null)
const adInitial = ref(null)
const urInitial = ref(null)
const lfInitial = ref(null)

const openDetails = async (row) => {
  try {
    if (row.type === 'AP') {
      await apStore.fetchById(row.id)
      const r = apStore.selected
      if (!r) return
      let plans = r.plans
      try { plans = Array.isArray(plans) ? plans : JSON.parse(plans || '[]') } catch { plans = [] }
      apInitial.value = {
        id: r.id,
        reference_code: r.reference_code || '',
        school_year: r.school_year || '',
        club_id: r.club_id || r.club?.id || '',
        filed_by_user_id: r.filed_by_user_id || '',
        approver_user_id: r.approver_user_id || null,
        plans: plans || [],
        remarks: r.remarks || '',
        status: r.status || 'draft',
      }
      apVisible.value = true
    } else if (row.type === 'AD') {
      await adStore.fetchById(row.id)
      const r = adStore.selected
      if (!r) return
      adInitial.value = {
        ...r,
        date_filed: r.date_filed || '',
        date_of_implementation: r.date_of_implementation || '',
      }
      adVisible.value = true
    } else if (row.type === 'UR') {
      await urStore.fetchById(row.id)
      const r = urStore.selected
      if (!r) return
      // normalize JSON to arrays for form
      let facilities = []
      let equipment_items = []
      try { facilities = Array.isArray(r.facilities) ? r.facilities : JSON.parse(r.facilities || '[]') } catch {}
      try { equipment_items = Array.isArray(r.equipment_items) ? r.equipment_items : JSON.parse(r.equipment_items || '[]') } catch {}
      urInitial.value = {
        id: r.id,
        reference_code: r.reference_code,
        date_filed: r.date_filed || '',
        activity_design_id: r.activity_design_id || '',
        facilities,
        equipment_items,
        utilization_details: r.utilization_details || '',
        start_date: r.start_date || String(r.start_at || '').slice(0, 10),
        start_time: r.start_time || (r.start_at ? new Date(r.start_at).toTimeString().slice(0, 5) : ''),
        end_date: r.end_date || String(r.end_at || '').slice(0, 10),
        end_time: r.end_time || (r.end_at ? new Date(r.end_at).toTimeString().slice(0, 5) : ''),
        status: r.status || 'draft',
        availability_status: r.availability_status || 'pending-check',
        remarks: r.remarks || '',
      }
      urVisible.value = true
    } else if (row.type === 'LF') {
      await lfStore.fetchById(row.id)
      const r = lfStore.selected
      if (!r) return
      let sources_of_fund = {}
      let uses_of_fund = []
      try { sources_of_fund = typeof r.sources_of_fund === 'string' ? JSON.parse(r.sources_of_fund || '{}') : (r.sources_of_fund || {}) } catch {}
      try { uses_of_fund = Array.isArray(r.uses_of_fund) ? r.uses_of_fund : JSON.parse(r.uses_of_fund || '[]') } catch {}
      lfInitial.value = {
        id: r.id,
        reference_code: r.reference_code,
        date_filed: r.date_filed || '',
        activity_design_id: r.activity_design_id || '',
        sources_of_fund,
        uses_of_fund,
        remarks: r.remarks || '',
        status: r.status || 'draft',
      }
      lfVisible.value = true
    }
  } catch (e) {
    console.error(e)
    await Swal.fire('Error', 'Failed to load details.', 'error')
  }
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <NotificationBar v-if="apStore.error || adStore.error || urStore.error || lfStore.error" color="danger">
        {{ apStore.error || adStore.error || urStore.error || lfStore.error }}
      </NotificationBar>

      <SectionTitleLineWithButton :icon="mdiTableBorder" title="Workflows" main>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll(true)" />
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
          <input v-model="lastQuery.q" placeholder="Search title, ref, club…"
            class="border rounded px-2 py-2 md:col-span-2" @keyup.enter="fetchAll()" />
          <select v-model="lastQuery.status" class="border rounded px-2 py-2">
            <option value="">All status</option>
            <option value="draft">draft</option>
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </select>
          <div class="md:col-span-3 flex items-center gap-2 flex-wrap">
            <label v-for="t in TYPES" :key="t.key"
              class="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gray-100">
              <input type="checkbox" :checked="lastQuery.types.has(t.key)" @change="toggleType(t.key)" />
              <span class="text-xs">{{ t.label }}</span>
            </label>
          </div>
          <div class="flex items-center gap-2 md:col-span-2">
            <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="fetchAll()">Apply</button>
            <button class="px-4 py-2 bg-gray-200 rounded text-xs"
              @click="(lastQuery.q = '', (lastQuery.status = ''), (lastQuery.types = new Set(['AP', 'AD', 'UR', 'LF', 'GRV'])), fetchAll(true))">Reset</button>
          </div>
        </div>
      </div>

      <BaseTable :columns="columns" :data="tableWrap" @query-change="handleQueryChange"
        :loading="apStore.isLoading || adStore.isLoading || urStore.isLoading || lfStore.isLoading">
        <template #cell-type="{ value }">
          <Badge :text="value" tone="indigo" />
        </template>
        <template #cell-date="{ value }">
          {{ value ? new Date(value).toLocaleDateString() : '—' }}
        </template>
        <template #cell-status="{ value }">
          <Badge :text="value || '—'" :tone="statusTone(value)" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex items-center gap-1">
            <button class="px-2 py-1 text-[12px] rounded bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-1"
              @click="openDetails(row)" title="View">
              View
            </button>
            <button v-if="row.type !== 'GRV' && isPending(row)"
              class="px-2 py-1 text-[12px] rounded bg-emerald-100 hover:bg-emerald-200 inline-flex items-center gap-1"
              @click="handleApprove(row)" title="Approve">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiCheck" />
              </svg>
              Approve
            </button>
            <button v-if="row.type !== 'GRV' && isPending(row)" class="px-2 py-1 text-[12px] rounded bg-amber-100 hover:bg-amber-200 inline-flex items-center gap-1"
              @click="handleReject(row)" title="Reject">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiClose" />
              </svg>
              Reject
            </button>
            <button v-if="row.type !== 'GRV' && isApproved(row)" class="px-2 py-1 text-[12px] rounded bg-zinc-100 hover:bg-zinc-200 inline-flex items-center gap-1"
              @click="handleCancel(row)" title="Cancel">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiCancel" />
              </svg>
              Cancel
            </button>
            <!-- Grievance moderation -->
            <button v-if="row.type === 'GRV' && String(row.status).toLowerCase() === 'submitted'"
              class="px-2 py-1 text-[12px] rounded bg-blue-100 hover:bg-blue-200 inline-flex items-center gap-1"
              @click="grvMarkInReview(row)" title="In Review">In Review</button>
            <button v-if="row.type === 'GRV' && String(row.status).toLowerCase() === 'in_review'"
              class="px-2 py-1 text-[12px] rounded bg-emerald-100 hover:bg-emerald-200 inline-flex items-center gap-1"
              @click="grvResolve(row)" title="Resolve">Resolve</button>
            <button v-if="row.type === 'GRV' && String(row.status).toLowerCase() === 'in_review'"
              class="px-2 py-1 text-[12px] rounded bg-rose-100 hover:bg-rose-200 inline-flex items-center gap-1"
              @click="grvReject(row)" title="Reject">Reject</button>

            <button class="px-2 py-1 text-[12px] rounded bg-rose-100 hover:bg-rose-200 inline-flex items-center gap-1"
              @click="handleDelete(row)" title="Delete">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiTrashCan" />
              </svg>
              Delete
            </button>
          </div>
        </template>
      </BaseTable>
      <!-- Read-only detail modals -->
      <AnnualPlanFormModal v-model="apVisible" mode="edit" :initial="apInitial || {}" />
      <ActivityDesignFormModal v-model="adVisible" mode="edit" :initial="adInitial || {}" />
      <UtilizationRequestFormModal v-model="urVisible" mode="edit" :initial="urInitial || {}" />
      <LiquidationFundFormModal v-model="lfVisible" mode="edit" :initial="lfInitial || {}" />
    </SectionMain>
  </LayoutAuthenticated>
</template>

