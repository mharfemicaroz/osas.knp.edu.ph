<!-- src/views/AnnualPlansPage.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import AnnualPlanRowActions from '@/components/annualPlan/AnnualPlanRowActions.vue'
import AnnualPlanFormModal from '@/components/annualPlan/AnnualPlanFormModal.vue'
import AnnualPlanAttachmentsModal from '@/components/annualPlan/AnnualPlanAttachmentsModal.vue'
import AnnualPlansCalendarModal from '@/components/annualPlan/AnnualPlansCalendarModal.vue'
import StatusTrailModal from '@/components/commons/StatusTrailModal.vue'

import { useAuthStore } from '@/stores/auth'
import { useAnnualPlanStore } from '@/stores/annualPlan'
import { useClubScope } from '@/utils/clubScope'
import axiosInstance from '@/plugins/axiosConfig'

import {
    mdiTableBorder, mdiAlertCircle, mdiPlus, mdiFilter, mdiRefresh, mdiCalendarClock,
} from '@mdi/js'

const store = useAnnualPlanStore()
const authStore = useAuthStore()
const isAdminManager = computed(() => ['admin','manager'].includes(String(authStore.user?.role || '').toLowerCase()))
const displayName = computed(() => { const ln = authStore.user?.last_name || ''; const fi = (authStore.user?.first_name || '').slice(0,1); return `${ln}${ln ? ', ' : ''}${fi ? fi + '.' : ''}` })
const parseRemarks = (v) => {
  try {
    const arr = Array.isArray(v) ? v : (JSON.parse(v || '[]') || [])
    return (arr || []).map((it) => {
      if (!it || typeof it !== 'object') return it
      if (!Array.isArray(it.read_by)) it.read_by = (it.user_id != null ? [it.user_id] : [])
      return it
    })
  } catch {
    return []
  }
}

/* Calendar modal */
const calendarVisible = ref(false)
const openCalendar = () => { calendarVisible.value = true }

/* Remarks modal */
const remarksVisible = ref(false)
const remarksRow = ref(null)
const openRemarks = async (row) => {
    try { await store.fetchById(row.id); remarksRow.value = store.selected || row } catch { remarksRow.value = row }
    remarksVisible.value = true
}
const addRemarkToRow = async (entry) => {
    if (!remarksRow.value) return
    const arr = parseRemarks(remarksRow.value.remarks)
    arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: entry?.message || '', datetime: entry?.datetime || new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
    // Optimistically update modal view
    try { remarksRow.value.remarks = JSON.stringify(arr) } catch {}
    try { await store.updateById(remarksRow.value.id, { remarks: JSON.stringify(arr) }); await fetchAll({}, true) } catch {}
}
const markAllReadForRow = async () => {
    if (!remarksRow.value) return
    const uid = authStore.user?.id || null
    const arr = parseRemarks(remarksRow.value.remarks)
    const next = arr.map(x => {
      if (!x || x.user_id === uid) return x
      const read_by = Array.isArray(x.read_by) ? x.read_by.slice() : []
      if (!read_by.includes(uid)) read_by.push(uid)
      return { ...x, read_by }
    })
    // Optimistically update modal view
    try { remarksRow.value.remarks = JSON.stringify(next) } catch {}
    try { await store.updateById(remarksRow.value.id, { remarks: JSON.stringify(next) }); await fetchAll({}, true) } catch {}
}

// Deep-link to open remarks from header inbox
const route = useRoute()
const router = useRouter()
const handleOpenFromQuery = async () => {
  const t = String(route.query.open_remarks_type || '')
  const id = Number(route.query.open_remarks_id || '')
  if (t === 'AP' && Number.isFinite(id)) {
    try { await store.fetchById(id) } catch {}
    const row = store.selected
    if (row) await openRemarks(row)
    const next = { ...route.query }
    delete next.open_remarks_type
    delete next.open_remarks_id
    router.replace({ query: next })
  }
}
onMounted(handleOpenFromQuery)
watch(() => [route.query.open_remarks_type, route.query.open_remarks_id], () => { handleOpenFromQuery() })
const openFromCalendar = async (annualPlanId) => {
    try {
        await store.fetchById(annualPlanId)
        const r = store.selected
        if (r) await openEdit(r)
    } catch (e) { console.error(e) } finally { calendarVisible.value = false }
}

/* Clubs quick lookup for filter labels */
const clubs = ref([])
const loadClubs = async () => {
    try {
        const { data } = await axiosInstance.get('/clubs', { params: { page: 1, limit: 500, order: 'ASC', sort: 'name' } })
        clubs.value = Array.isArray(data?.data) ? data.data : []
    } catch { clubs.value = [] }
}
onMounted(loadClubs)
const clubName = (id) => clubs.value.find((c) => c.id === Number(id))?.name || '—'

const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

/* ---------- QUERY STATE ---------- */
const lastQuery = ref({
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'DESC',
    q: '',
    status: '',
    school_year: '',
    club_id: '',
    filed_by_user_id: '',
    approver_user_id: '',
})
const { isClub, activeClubId, withClub } = useClubScope()

const showAdvanced = ref(false)
const hasAdvancedFilters = computed(() => Boolean(lastQuery.value.club_id))
const activeFilterCount = computed(() => {
    const q = lastQuery.value
    let count = 0
    if (q.q) count += 1
    if (q.status) count += 1
    if (q.school_year) count += 1
    if (q.club_id) count += 1
    return count
})

const fetchAll = async (patch = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...patch }
    const params = withClub({ ...lastQuery.value })
        ;['q', 'status', 'school_year', 'club_id', 'filed_by_user_id', 'approver_user_id'].forEach(k => {
            if (params[k] === '' || params[k] == null) delete params[k]
        })
    await store.fetchAll(params, force)
}
const resetFilters = async () => {
    await fetchAll({
        q: '',
        status: '',
        school_year: '',
        club_id: '',
        filed_by_user_id: '',
        approver_user_id: '',
        page: 1,
    })
    showAdvanced.value = false
}
onMounted(async () => { await fetchAll({ page: 1, limit: 10, club_id: isClub ? activeClubId : '' }) })

watch(hasAdvancedFilters, (next) => {
    if (next) showAdvanced.value = true
}, { immediate: true })

const dataWrap = computed(() => ({
    total: store.items.total || 0,
    totalPages: store.items.totalPages || 1,
    currentPage: store.items.currentPage || 1,
    pageSize: store.items.pageSize || 10,
    data: store.items.data || [],
}))

/* ---------- CONSTANTS ---------- */
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled', 'archived']
const statusTone = (s) => {
    switch (String(s || '').toLowerCase()) {
        case 'draft': return 'gray'
        case 'pending': return 'amber'
        case 'approved': return 'emerald'
        case 'rejected': return 'red'
        case 'cancelled': return 'zinc'
        case 'archived': return 'slate'
        default: return 'gray'
    }
}
const currency = (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return '—'
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/* ---------- TABLE COLUMNS ---------- */
const mainColumns = [
    { key: 'reference_code', label: 'Ref Code', sortable: true, width: 140 },
    { key: 'school_year', label: 'School Year', sortable: true, width: 120 },
    {
        key: 'club', label: 'Club', sortable: false, minWidth: 200,
        formatter: (value, row) => row.club?.name || clubName(row.club_id) || ''
    },
    { key: 'total_budget', label: 'Total Budget', sortable: true, width: 140 },
    { key: 'status', label: 'Status', sortable: true, width: 110 },
    { key: 'created_at', label: 'Created', sortable: true, width: 170 },
    { key: 'actions', label: 'Actions', isAction: true, stickyRight: true },
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

    let plans = []
    try { plans = Array.isArray(r.plans) ? r.plans : JSON.parse(r.plans || '[]') } catch { }
    editInitial.value = {
        id: r.id,
        reference_code: r.reference_code,
        school_year: r.school_year || '',
        club_id: r.club_id || '',
        filed_by_user_id: r.filed_by_user_id || (authStore.user?.id || ''),
        approver_user_id: r.approver_user_id || '',
        plans,
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
        title: `Delete annual plan "${row.reference_code}"?`,
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
        await Swal.fire('Deleted', 'The annual plan has been deleted.', 'success')
    }
}

const openView = async (row) => { await openEdit(row) }

const submitItem = async (row) => {
    const res = await Swal.fire({
        title: 'Submit for approval?', text: 'You can no longer edit after submission.',
        icon: 'question', showCancelButton: true, confirmButtonText: 'Submit', cancelButtonText: 'Cancel',
    })
    if (!res.isConfirmed) return
    try {
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} submitted annual plan.`, datetime: new Date().toISOString(), is_read: false })
        await store.updateById(row.id, { remarks: JSON.stringify(arr) })
        await store.submit(row.id)
        await fetchAll({}, true)
        await Swal.fire('Submitted', 'Annual plan is now pending approval.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to submit.', 'error')
    }
}

const approveItem = async (row) => {
    const res = await Swal.fire({
        title: 'Approve annual plan?', input: 'textarea', inputLabel: 'Remarks (optional)',
        inputPlaceholder: 'Add a note…', showCancelButton: true, confirmButtonText: 'Approve', cancelButtonText: 'Cancel',
    })
    if (!res.isConfirmed) return
    try {
        const arr = parseRemarks(row.remarks)
        const note = res.value || ''
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} approved annual plan.${note ? ' - ' + note : ''}`, datetime: new Date().toISOString(), is_read: false })
        await store.approve(row.id, JSON.stringify(arr))
        await fetchAll({}, true)
        await Swal.fire('Approved', 'Annual plan has been approved.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to approve.', 'error')
    }
}

const rejectItem = async (row) => {
    const res = await Swal.fire({
        title: 'Reject annual plan?', input: 'textarea', inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…', inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Reject', cancelButtonText: 'Cancel',
    })
    if (!res.isConfirmed) return
    try {
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} rejected annual plan - ${res.value}.`, datetime: new Date().toISOString(), is_read: false })
        await store.reject(row.id, JSON.stringify(arr))
        await fetchAll({}, true)
        await Swal.fire('Rejected', 'Annual plan has been rejected.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to reject.', 'error')
    }
}

const cancelItem = async (row) => {
    const res = await Swal.fire({
        title: 'Cancel annual plan?', input: 'textarea', inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…', inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Cancel Plan', cancelButtonText: 'Keep',
    })
    if (!res.isConfirmed) return
    try {
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} cancelled annual plan - ${res.value}.`, datetime: new Date().toISOString(), is_read: false })
        // Perform cancel action with remarks log, then revert status back to draft for editing
        await store.cancel(row.id, JSON.stringify(arr))
        await store.updateById(row.id, { status: 'draft' })
        await fetchAll({}, true)
        await Swal.fire('Moved to Draft', 'Annual plan was cancelled and returned to Draft for editing.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to cancel.', 'error')
    }
}

/* Attachments */
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

            <SectionTitleLineWithButton :icon="mdiTableBorder" title="Annual Plans" main>
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <BaseButton :icon="mdiCalendarClock" color="info" label="View Calendar" @click="openCalendar" />
                    <BaseButton :icon="mdiPlus" color="primary" label="New Annual Plan" @click="openCreate" />
                    <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
                </div>
            </SectionTitleLineWithButton>

            <!-- Filters -->
            <div class="p-3 md:p-4 mb-4 rounded-xl border bg-white/70 shadow-sm">
                <div class="flex flex-wrap items-center justify-between gap-2 mb-3 text-gray-700">
                    <div class="flex items-center gap-2">
                        <svg class="w-4 h-4" viewBox="0 0 24 24">
                            <path :d="mdiFilter" />
                        </svg>
                        <span class="font-semibold text-sm">Filters</span>
                        <span v-if="activeFilterCount" class="text-xs text-gray-500">({{ activeFilterCount }} active)</span>
                        <span v-else class="text-xs text-gray-400">(none)</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button class="px-3 py-1.5 text-xs rounded border bg-white hover:bg-gray-50"
                            @click="showAdvanced = !showAdvanced">
                            {{ showAdvanced ? 'Hide advanced' : 'Advanced' }}
                        </button>
                        <button class="px-3 py-1.5 text-xs rounded bg-gray-100 hover:bg-gray-200" @click="resetFilters">
                            Reset
                        </button>
                        <button class="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                            @click="fetchAll({ page: 1 })">
                            Apply
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                    <div class="md:col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">Search</label>
                        <input v-model="lastQuery.q" placeholder="Ref code, club, notes"
                            class="border rounded px-2 py-2 w-full" @keyup.enter="fetchAll({ page: 1 })" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Status</label>
                        <select v-model="lastQuery.status" class="border rounded px-2 py-2 w-full">
                            <option value="">All status</option>
                            <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">School year</label>
                        <select v-model="lastQuery.school_year" class="border rounded px-2 py-2 w-full">
                            <option value="">All school years</option>
                            <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                        </select>
                    </div>
                </div>

                <div v-show="showAdvanced" class="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                    <div class="md:col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">Club</label>
                        <select v-model="lastQuery.club_id" class="border rounded px-2 py-2 w-full">
                            <option value="">Any club</option>
                            <option v-for="c in clubs" :key="c.id" :value="c.id">{{ c.name }}</option>
                        </select>
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between mb-2 text-xs text-gray-600">
                <div>Showing <span class="font-medium text-gray-800">{{ dataWrap.data.length }}</span> of {{ dataWrap.total }} plans</div>
                <div v-if="activeFilterCount" class="text-gray-500">Filtered view</div>
            </div>

            <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading" :show-action="false"
                @query-change="handleQueryChange">
                <template #cell-total_budget="{ value }">
                    <span class="font-medium">{{ currency(value) }}</span>
                </template>
                <template #cell-created_at="{ value }">
                    <span>{{ value ? new Date(value).toLocaleString() : '—' }}</span>
                </template>
                <template #cell-status="{ value }">
                    <Badge :text="value || '—'" :tone="statusTone(value)" />
                </template>
                <template #cell-actions="{ row }">
                    <AnnualPlanRowActions :row="row" :busy="store.isActing(row.id)" :current-user-id="authStore.user?.id"
                        :moderator="isAdminManager"
                        @attachments="openAttachments" @submit="submitItem" @approve="approveItem" @reject="rejectItem"
                        @edit="openEdit" @delete="confirmDelete" @view="openView(row)" @cancel="cancelItem" @remarks="openRemarks" />
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <!-- Modals -->
    <AnnualPlanFormModal v-model="createVisible" mode="create" :locked-club-id="isClub ? activeClubId : ''" @submit="onCreateSubmit" />
    <AnnualPlanFormModal v-model="editVisible" mode="edit" :initial="editInitial || {}" @submit="onEditSubmit" />
    <AnnualPlanAttachmentsModal v-model="attachVisible" :row="attachRow" />
    <AnnualPlansCalendarModal v-model="calendarVisible" @open="openFromCalendar" />
    <StatusTrailModal v-model="remarksVisible" :title="'Remarks • ' + (remarksRow?.reference_code || 'Annual Plan')" :items="parseRemarks(remarksRow?.remarks)"
      :can-add="true" @add="addRemarkToRow" @markAllRead="markAllReadForRow" />
</template>
