<!-- src/views/ActivityDesignsPage.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
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

import ActivityDesignFormModal from '@/components/activity/ActivityDesignFormModal.vue'
import ActivityRowActions from '@/components/activity/ActivityRowActions.vue'
import ActivityAttachmentsModal from '@/components/activity/ActivityAttachmentsModal.vue'

import { printActivityDesignPdf } from '@/utils/printActivityDesign'

import { useAuthStore } from '@/stores/auth'
import { useActivityDesignStore } from '@/stores/activityDesign'
import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'

import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiPlus,
    mdiFilter,
    mdiRefresh,
} from '@mdi/js'

const store = useActivityDesignStore()
const authStore = useAuthStore()
const clubStore = useClubStore()
const userStore = useUserStore()

/* --- date range pickers (2-in-1) --- */
const dpRangeCommon = {
    range: true,
    partialRange: true,
    multiCalendars: 2,
    modelType: 'yyyy-MM-dd',
    enableTimePicker: false,
    autoApply: true,
    clearable: true,
}

const lastQuery = ref({
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'DESC',
    q: '',
    status: '',
    nature_of_activity: '',
    school_year: '',
    semester: '',
    club_id: '',
    filed_by_user_id: '',
    date_filed_from: '',
    date_filed_to: '',
    impl_from: '',
    impl_to: '',
})

const dateFiledRange = computed({
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

const implRange = computed({
    get: () => {
        const { impl_from: s, impl_to: e } = lastQuery.value
        return s || e ? [s || null, e || null] : null
    },
    set: (val) => {
        if (!val) {
            lastQuery.value.impl_from = null
            lastQuery.value.impl_to = null
        } else {
            const [s, e] = val
            lastQuery.value.impl_from = s || null
            lastQuery.value.impl_to = e || null
        }
    },
})

const SEMESTERS = ['1st Semester', '2nd Semester', 'Summer']
const schoolYearOptions = computed(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 6 }, (_, i) => `${y - i}-${y - i + 1}`)
})

/* ---------- DATA FETCH ---------- */
const fetchAll = async (patch = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...patch }
    if (typeof lastQuery.value.officer === 'undefined') {
        lastQuery.value.officer = true
    }

    const params = { ...lastQuery.value }
        ;[
            'q', 'status', 'nature_of_activity', 'school_year', 'semester',
            'club_id', 'filed_by_user_id', 'date_filed_from', 'date_filed_to',
            'impl_from', 'impl_to',
        ].forEach((k) => {
            if (params[k] === '' || params[k] == null) delete params[k]
        })

    params.officer = lastQuery.value.officer
    await store.fetchAll(params, force)
}

onMounted(async () => {
    await Promise.all([
        fetchAll({ page: 1, limit: 10 }),
        clubStore.fetchAll({ page: 1, limit: 200, officer: true }, true),
        userStore.fetchAll({ page: 1, limit: 200 }, true),
    ])
})

/* ---------- CLUB → FILED-BY DEPENDENCY ---------- */
const clubMembers = ref([])
watch(
    () => lastQuery.value.club_id,
    async (cid) => {
        lastQuery.value.filed_by_user_id = ''
        if (!cid) {
            clubMembers.value = []
            return
        }
        try {
            await clubStore.fetchById(cid)
            clubMembers.value = Array.isArray(clubStore.selectedClub?.users)
                ? clubStore.selectedClub.users
                : []
        } catch {
            clubMembers.value = []
        }
    }
)

const filedByOptions = computed(() =>
    lastQuery.value.club_id ? clubMembers.value : (userStore.users.data || [])
)

/* ---------- TABLE WRAP ---------- */
const dataWrap = computed(() => ({
    total: store.items.total || 0,
    totalPages: store.items.totalPages || 1,
    currentPage: store.items.currentPage || 1,
    pageSize: store.items.pageSize || 10,
    data: store.items.data || [],
}))

const NATURES = ['Curricular', 'Co-Curricular', 'Extra-Curricular']
const STATUSES = ['draft', 'pending', 'approved', 'rejected', 'cancelled']

const statusTone = (s) => {
    switch (String(s || '').toLowerCase()) {
        case 'draft': return 'gray'
        case 'pending': return 'amber'
        case 'approved': return 'emerald'
        case 'rejected': return 'red'
        case 'cancelled': return 'zinc'
        default: return 'gray'
    }
}

const currency = (n) => {
    const num = Number(n)
    if (!Number.isFinite(num)) return '0.00'
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const mainColumns = [
    { key: 'reference_code', label: 'Ref Code', sortable: true, width: 140 },
    { key: 'name_of_activity', label: 'Activity', sortable: true, minWidth: 220 },
    { key: 'annual_plan_item', label: 'Annual Plan / Item', sortable: false, minWidth: 260 }, // NEW COLUMN
    { key: 'club_id', label: 'Club', sortable: false, formatter: (value, row) => (row.club ? row.club.name : '') },
    { key: 'semester', label: 'Sem', sortable: true, width: 110 },
    { key: 'school_year', label: 'S.Y.', sortable: true, width: 110 },
    { key: 'date_of_implementation', label: 'Implementation', sortable: true, width: 140, formatter: v => v ? new Date(v).toLocaleDateString() : '—' },
    // { key: 'nature_of_activity', label: 'Nature', sortable: true, width: 150 },
    { key: 'status', label: 'Status', sortable: true, width: 120 },
]

const handleQueryChange = async (q) => {
    await fetchAll(q)
}

/* ---------- CRUD + WORKFLOW ---------- */
const createVisible = ref(false)
const editVisible = ref(false)
const editInitial = ref(null)

const openCreate = () => { createVisible.value = true }

const parseJson = (j) => {
    if (!j) return null
    if (typeof j === 'object') return j
    try { return JSON.parse(j) } catch { return null }
}

const onCreateSubmit = async (payload) => {
    await store.create(payload)
    createVisible.value = false
    await fetchAll({}, true)
}

const openEdit = async (row) => {
    await store.fetchById(row.id)
    const r = store.selected || row

    editInitial.value = {
        id: r.id,
        date_filed: r.date_filed || '',
        semester: r.semester || '',
        office_department: r.office_department || '',
        school_year: r.school_year || '',
        name_of_activity: r.name_of_activity || '',
        venue: r.venue || '',
        date_of_implementation: r.date_of_implementation || '',
        proposed_budget: r.proposed_budget ?? '',
        participants: r.participants || '',
        nature_of_activity: r.nature_of_activity || 'Curricular',
        rationale: r.rationale || '',
        objectives: r.objectives || '',
        details_of_activity: r.details_of_activity || '',
        budgetary_requirements: r.budgetary_requirements || '',
        filed_by_user_id: r.filed_by_user_id || '',
        club_id: r.club_id || '',
        status: r.status || 'draft',
        remarks: r.remarks || '',
        // NEW: pass through annual plan link (id + snapshot of item)
        annual_plan_id: r.annual_plan_id || '',
        annual_plan_item: parseJson(r.annual_plan_item),
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
        title: `Delete "${row.name_of_activity}"?`,
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
        await Swal.fire('Deleted', 'The activity design has been deleted.', 'success')
    }
}

const openView = async (row) => {
    await store.fetchById(row.id)
    const r = store.selected || row
    editInitial.value = {
        ...r,
        date_filed: r.date_filed ? String(r.date_filed).slice(0, 10) : '',
        date_of_implementation: r.date_of_implementation ? String(r.date_of_implementation).slice(0, 10) : '',
        annual_plan_id: r.annual_plan_id || '',
        annual_plan_item: parseJson(r.annual_plan_item),
    }
    editVisible.value = true
}

/* workflow */
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
        await Swal.fire('Submitted', 'Activity is now pending approval.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to submit activity.', 'error')
    }
}

const approveItem = async (row) => {
    const res = await Swal.fire({
        title: 'Approve activity?',
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

    const remarks = res.value || ''
    try {
        await store.approve(row.id, remarks)
        await fetchAll({}, true)
        await Swal.fire('Approved', 'Activity has been approved.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to approve activity.', 'error')
    }
}

const rejectItem = async (row) => {
    const res = await Swal.fire({
        title: 'Reject activity?',
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

    const remarks = res.value
    try {
        await store.reject(row.id, remarks)
        await fetchAll({}, true)
        await Swal.fire('Rejected', 'Activity has been rejected.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to reject activity.', 'error')
    }
}

const cancelItem = async (row) => {
    const res = await Swal.fire({
        title: 'Cancel activity?',
        input: 'textarea',
        inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…',
        inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Cancel Activity',
        cancelButtonText: 'Keep Activity',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return

    const remarks = res.value
    try {
        await store.cancel(row.id, remarks)
        await fetchAll({}, true)
        await Swal.fire('Cancelled', 'Activity has been cancelled.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to cancel activity.', 'error')
    }
}

const printItem = async (row) => {
    const status = String(row?.status || '').toLowerCase()
    if (status !== 'approved') {
        await Swal.fire('Not allowed', 'Only approved activities can be printed.', 'info')
        return
    }

    try {
        await store.fetchById(row.id)
        const full = store.selected || row
        await printActivityDesignPdf(full)
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

/* filters */
const resetFilters = async () => {
    await fetchAll({
        q: '',
        status: '',
        nature_of_activity: '',
        school_year: '',
        semester: '',
        club_id: '',
        filed_by_user_id: '',
        date_filed_from: '',
        date_filed_to: '',
        impl_from: '',
        impl_to: '',
        page: 1,
    })
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <NotificationBar v-if="store.error" :icon="mdiAlertCircle" color="danger">
                {{ store.error }}
            </NotificationBar>

            <SectionTitleLineWithButton :icon="mdiTableBorder" title="Activity Designs" main>
                <div class="flex items-center gap-2">
                    <BaseButton :icon="mdiPlus" color="primary" label="New Activity" @click="openCreate" />
                    <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
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
                    <input v-model="lastQuery.q" placeholder="Search by ref, activity, venue, office…"
                        class="border rounded px-2 py-2 md:col-span-2" @keyup.enter="fetchAll({ page: 1 })" />

                    <select v-model="lastQuery.status" class="border rounded px-2 py-2">
                        <option value="">All status</option>
                        <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
                    </select>

                    <select v-model="lastQuery.nature_of_activity" class="border rounded px-2 py-2">
                        <option value="">All natures</option>
                        <option v-for="n in NATURES" :key="n" :value="n">{{ n }}</option>
                    </select>

                    <select v-model="lastQuery.school_year" class="border rounded px-2 py-2 md:col-span-1">
                        <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">{{ sy }}</option>
                    </select>

                    <select v-model="lastQuery.semester" class="border rounded px-2 py-2 md:col-span-1">
                        <option disabled value="">Select semester…</option>
                        <option v-for="s in SEMESTERS" :key="s" :value="s">{{ s }}</option>
                    </select>

                    <!-- Club filter -->
                    <select v-model="lastQuery.club_id" class="border rounded px-2 py-2 md:col-span-2">
                        <option v-if="authStore.user.role === 'admin'" value="">All clubs</option>
                        <option v-for="c in (clubStore.clubs.data || [])" :key="c.id" :value="c.id">{{ c.name }}
                        </option>
                    </select>

                    <!-- Filed-by filter (dependent on club) -->
                    <select v-model="lastQuery.filed_by_user_id" class="border rounded px-2 py-2 md:col-span-2">
                        <option value="">
                            {{ lastQuery.club_id ? 'Filed by (club members)' : 'Filed by (any)' }}
                        </option>
                        <option v-for="u in filedByOptions" :key="u.id" :value="u.id">
                            {{ u.first_name }} {{ u.last_name }} (@{{ u.username }})
                        </option>
                    </select>

                    <!-- Filed date range -->
                    <div class="md:col-span-1">
                        <Datepicker v-model="dateFiledRange" v-bind="dpRangeCommon" placeholder="Filed date range" />
                    </div>

                    <!-- Implementation date range -->
                    <div class="md:col-span-1">
                        <Datepicker v-model="implRange" v-bind="dpRangeCommon"
                            placeholder="Implementation date range" />
                    </div>

                    <div class="flex items-center gap-2 md:col-span-2">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="fetchAll({ page: 1 })">
                            Apply
                        </button>
                        <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="resetFilters">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading"
                @query-change="handleQueryChange">
                <!-- Annual Plan / Item column -->
                <template #cell-annual_plan_item="{ row }">
                    <div class="flex flex-col gap-1">
                        <template v-if="row.annual_plan_id">
                            <div class="text-xs">
                                <span
                                    class="inline-flex items-center gap-2 px-2 py-1 rounded bg-emerald-50 border border-emerald-200">
                                    <span class="font-medium">{{ row.annual_plan?.reference_code ||
                                        `AP-${row.annual_plan_id}` }}</span>
                                    <span class="text-gray-600">SY {{ row.annual_plan?.school_year || '—' }}</span>
                                </span>
                            </div>

                            <div class="text-xs text-gray-700">
                                <span class="font-medium">
                                    {{
                                        (() => {
                                            try {
                                                const it = typeof row.annual_plan_item === 'string'
                                                    ? (JSON.parse(row.annual_plan_item || 'null') || {})
                                                    : (row.annual_plan_item || {})
                                                return it.item || it.title || it.name || it.activity || '—'
                                            } catch {
                                                return '—'
                                            }
                                        })()
                                    }}
                                </span>
                                <span class="text-gray-500">
                                    —
                                    ₱{{
                                        (() => {
                                            try {
                                                const it = typeof row.annual_plan_item === 'string'
                                                    ? (JSON.parse(row.annual_plan_item || 'null') || {})
                                                    : (row.annual_plan_item || {})
                                                return currency(it.funds ?? it.budget ?? 0)
                                            } catch {
                                                return currency(0)
                                            }
                                        })()
                                    }}
                                </span>
                            </div>

                        </template>
                        <span v-else class="text-gray-400 text-xs">—</span>
                    </div>
                </template>

                <template #cell-nature_of_activity="{ value }">
                    <Badge :text="value || '—'" tone="indigo" />
                </template>

                <template #cell-status="{ value }">
                    <Badge :text="value || '—'" :tone="statusTone(value)" />
                </template>

                <template #cell-actions="{ row }">
                    <ActivityRowActions
                        v-if="['admin', 'manager'].includes(String(authStore.user?.role || '').toLowerCase())"
                        :row="row" :moderator="true" @attachments="openAttachments" @submit="submitItem"
                        @approve="approveItem" @reject="rejectItem" @edit="openEdit" @delete="confirmDelete"
                        @view="openView(row)" @cancel="cancelItem" @print="printItem" />

                    <ActivityRowActions v-else :row="row" :moderator="false" @attachments="openAttachments"
                        @submit="submitItem" @edit="openEdit" @delete="confirmDelete" @view="openView(row)"
                        @cancel="cancelItem" @print="printItem" />
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <ActivityDesignFormModal v-model="createVisible" mode="create" @submit="onCreateSubmit" />
    <ActivityDesignFormModal v-model="editVisible" mode="edit" :initial="editInitial || {}" @submit="onEditSubmit" />

    <ActivityAttachmentsModal v-model="attachVisible" :row="attachRow" />
</template>
