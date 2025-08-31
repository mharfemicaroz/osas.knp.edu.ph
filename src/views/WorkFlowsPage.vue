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

import { useAnnualPlanStore } from '@/stores/annualPlan'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useLiquidationFundStore } from '@/stores/liquidationFund'

import { mdiTableBorder, mdiFilter, mdiRefresh, mdiCheck, mdiClose, mdiCancel, mdiTrashCan } from '@mdi/js'

const apStore = useAnnualPlanStore()
const adStore = useActivityDesignStore()
const urStore = useUtilizationRequestStore()
const lfStore = useLiquidationFundStore()

// ---------------- Filters ----------------
const TYPES = [
  { key: 'AP', label: 'Annual Plan' },
  { key: 'AD', label: 'Activity Design' },
  { key: 'UR', label: 'Utilization' },
  { key: 'LF', label: 'Liquidation' },
]

const lastQuery = ref({
  page: 1,
  limit: 10,
  q: '',
  status: '',
  types: new Set(['AP', 'AD', 'UR', 'LF']),
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

  // Optional client-side search refinement
  const q = (lastQuery.value.q || '').trim().toLowerCase()
  let list = out
  if (q) list = list.filter((x) => `${x.reference} ${x.title} ${x.club}`.toLowerCase().includes(q))
  const st = (lastQuery.value.status || '').trim().toLowerCase()
  if (st) list = list.filter((x) => String(x.status || '').toLowerCase() === st)
  return list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
})

const tableWrap = computed(() => ({
  total: rows.value.length,
  totalPages: 1,
  currentPage: 1,
  pageSize: rows.value.length,
  data: rows.value,
}))

const STATUS_TONE = {
  draft: 'gray', pending: 'amber', approved: 'emerald', rejected: 'red', cancelled: 'zinc', completed: 'indigo'
}
const statusTone = (s) => STATUS_TONE[String(s || '').toLowerCase()] || 'gray'
const isPending = (row) => String(row?.status || '').toLowerCase() === 'pending'
const isApproved = (row) => String(row?.status || '').toLowerCase() === 'approved'

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
      <div class="p-3 mb-4 rounded-xl border bg-white/60">
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
              @click="(lastQuery.q = '', (lastQuery.status = ''), (lastQuery.types = new Set(['AP', 'AD', 'UR', 'LF'])), fetchAll(true))">Reset</button>
          </div>
        </div>
      </div>

      <BaseTable :columns="columns" :data="tableWrap"
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
            <button v-if="isPending(row)"
              class="px-2 py-1 text-[12px] rounded bg-emerald-100 hover:bg-emerald-200 inline-flex items-center gap-1"
              @click="handleApprove(row)" title="Approve">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiCheck" />
              </svg>
              Approve
            </button>
            <button v-if="isPending(row)" class="px-2 py-1 text-[12px] rounded bg-amber-100 hover:bg-amber-200 inline-flex items-center gap-1"
              @click="handleReject(row)" title="Reject">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiClose" />
              </svg>
              Reject
            </button>
            <button v-if="isApproved(row)" class="px-2 py-1 text-[12px] rounded bg-zinc-100 hover:bg-zinc-200 inline-flex items-center gap-1"
              @click="handleCancel(row)" title="Cancel">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path :d="mdiCancel" />
              </svg>
              Cancel
            </button>
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
    </SectionMain>
  </LayoutAuthenticated>
</template>
