<!-- src/views/UtilizationRequestsPage.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

/* Reuse generic row actions UI (submit/approve/reject/cancel/attachments/edit/delete) */
import ActivityRowActions from '@/components/activity/ActivityRowActions.vue'

/* Utilization-specific modals */
import UtilizationRequestFormModal from '@/components/utilization/UtilizationRequestFormModal.vue'
import UtilizationAttachmentsModal from '@/components/utilization/UtilizationAttachmentsModal.vue'
import CalendarViewModal from '@/components/utilization/CalendarViewModal.vue'
import QuickAvailabilityModal from '@/components/utilization/QuickAvailabilityModal.vue'

import { printUtilizationRequestPdf, buildUtilizationRequestPdfDoc } from '@/utils/printUtilizationRequest'
import StatusTrailModal from '@/components/commons/StatusTrailModal.vue'

import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import { useClubScope } from '@/utils/clubScope'

import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiPlus,
    mdiFilter,
    mdiRefresh,
    mdiCalendarClock,
    mdiMagnify,
    mdiCalendarCheck,
} from '@mdi/js'

const store = useUtilizationRequestStore()
const { isClub, activeClubId, withClub } = useClubScope()
const authStore = useAuthStore()
const userStore = useUserStore()
const displayName = computed(() => { const ln = authStore.user?.last_name || ''; const fi = (authStore.user?.first_name || '').slice(0,1); return `${ln}${ln ? ', ' : ''}${fi ? fi + '.' : ''}` })
const parseRemarks = (v) => {
  try {
    const arr = Array.isArray(v) ? v : (JSON.parse(v || '[]') || [])
    return (arr || []).map((it) => {
      if (!it || typeof it !== 'object') return it
      if (!Array.isArray(it.read_by)) it.read_by = (it.user_id != null ? [it.user_id] : [])
      return it
    })
  } catch { return [] }
}

const calendarVisible = ref(false)
const openCalendar = () => { calendarVisible.value = true }

const quickCheckVisible = ref(false)
const openQuickCheck = () => { quickCheckVisible.value = true }

const openFromCalendar = async (id) => {
    try {
        await store.fetchById(id)
        const r = store.selected
        if (r) {
            // Open the view/edit modal (same pattern as elsewhere)
            await openEdit(r)
        }
    } catch (e) {
        console.error(e)
    } finally {
        calendarVisible.value = false
    }
}

const resetAvailability = () => {
    avStartDate.value = ''
    avStartTime.value = '08:00'
    avEndDate.value = ''
    avEndTime.value = '10:00'
    avFacilities.value = []
}

/* Remarks modal */
const remarksVisible = ref(false)
const remarksRow = ref(null)
const openRemarks = async (row) => {
  try {
    await store.fetchById(row.id)
    remarksRow.value = store.selected || row
  } catch {
    remarksRow.value = row
  }
  remarksVisible.value = true
}
const addRemarkToRow = async (entry) => {
  if (!remarksRow.value) return
  const arr = parseRemarks(remarksRow.value.remarks)
  arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: entry?.message || '', datetime: entry?.datetime || new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
  // Optimistic update for modal
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
  // Optimistic update for modal
  try { remarksRow.value.remarks = JSON.stringify(next) } catch {}
  try { await store.updateById(remarksRow.value.id, { remarks: JSON.stringify(next) }); await fetchAll({}, true) } catch {}
}

// Deep-link to open remarks from header inbox
const route = useRoute()
const router = useRouter()
const handleOpenFromQuery = async () => {
  const t = String(route.query.open_remarks_type || '')
  const id = Number(route.query.open_remarks_id || '')
  if (t === 'UR' && Number.isFinite(id)) {
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

/* Predefined facilities (authoritative list) */
const FACILITY_OPTIONS = [
    'EB 101', 'EB 102', 'EB 103', 'NB 104', 'NB 105', 'NB Lobby', 'NB 106', 'NB 107', 'NB 201', 'NB 3SR',
    'OB 108', 'OB 109', 'OB 110', 'OB 111', 'OB 112', 'OB 113', 'OB 114', 'OB 115', 'OB 116', 'OB 117',
    'Gym', 'AVR', 'Student Lobby', 'Activity Center', 'Library', 'Ground',
]

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

/* ---------- QUERY STATE ---------- */
const lastQuery = ref({
    page: 1,
    limit: 10,
    sort: 'created_at',
    order: 'DESC',
    q: '',
    status: '',
    availability_status: '',
    start_from: '',
    start_to: '',
    end_from: '',
    end_to: '',
    facilities_any: [], // array of strings from FACILITY_OPTIONS
})

const startRange = computed({
    get: () => {
        const { start_from: s, start_to: e } = lastQuery.value
        return s || e ? [s || null, e || null] : null
    },
    set: (val) => {
        if (!val) {
            lastQuery.value.start_from = null
            lastQuery.value.start_to = null
        } else {
            const [s, e] = val
            lastQuery.value.start_from = s || null
            lastQuery.value.start_to = e || null
        }
    },
})

const endRange = computed({
    get: () => {
        const { end_from: s, end_to: e } = lastQuery.value
        return s || e ? [s || null, e || null] : null
    },
    set: (val) => {
        if (!val) {
            lastQuery.value.end_from = null
            lastQuery.value.end_to = null
        } else {
            const [s, e] = val
            lastQuery.value.end_from = s || null
            lastQuery.value.end_to = e || null
        }
    },
})

/* ---------- DATA FETCH ---------- */
const fetchAll = async (patch = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...patch }

    const params = withClub({ ...lastQuery.value })
        ;[
            'q',
            'status',
            'availability_status',
            'start_from',
            'start_to',
            'end_from',
            'end_to',
        ].forEach((k) => {
            if (params[k] === '' || params[k] == null) delete params[k]
        })

    if (!Array.isArray(params.facilities_any) || !params.facilities_any.length) {
        delete params.facilities_any
    }

    await store.fetchAll(params, force)
}

onMounted(async () => {
    await fetchAll({ page: 1, limit: 10, club_id: isClub ? activeClubId : '' })
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
const AVAILS = ['unknown', 'pending-check', 'available', 'conflict', 'reserved', 'maintenance']

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
const availTone = (s) => {
    switch (String(s || '').toLowerCase()) {
        case 'available': return 'emerald'
        case 'reserved': return 'indigo'
        case 'conflict': return 'red'
        case 'maintenance': return 'orange'
        case 'pending-check': return 'amber'
        default: return 'gray'
    }
}

/* ---------- TABLE COLUMNS ---------- */
const mainColumns = [
    { key: 'reference_code', label: 'Ref Code', sortable: true, width: 140 },
    {
        key: 'activity_design',
        label: 'Activity',
        sortable: false,
        minWidth: 220,
        formatter: (value, row) => (row.activity_design ? row.activity_design.name_of_activity : ''),
    },
    { key: 'facilities', label: 'Facilities', sortable: false, minWidth: 260 },
    { key: 'start_at', label: 'Start', sortable: true, width: 170 },
    { key: 'end_at', label: 'End', sortable: true, width: 170 },
    { key: 'availability_status', label: 'Availability', sortable: true, width: 130 },
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

const onCreateSubmit = async (payload) => {
    await store.create(payload)
    createVisible.value = false
    await fetchAll({}, true)
}

const openEdit = async (row) => {
    await store.fetchById(row.id)
    const r = store.selected || row

    // Normalize JSON fields to arrays for the form
    let facilities = []
    let equipment_items = []
    try { facilities = Array.isArray(r.facilities) ? r.facilities : JSON.parse(r.facilities || '[]') } catch { }
    try { equipment_items = Array.isArray(r.equipment_items) ? r.equipment_items : JSON.parse(r.equipment_items || '[]') } catch { }

    editInitial.value = {
        id: r.id,
        reference_code: r.reference_code,
        date_filed: r.date_filed || '',
        activity_design_id: r.activity_design_id || '',
        file_by_user_name: r.file_by_user_name || '',
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
        title: `Delete utilization "${row.reference_code}"?`,
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
        await Swal.fire('Deleted', 'The utilization request has been deleted.', 'success')
    }
}

const openView = async (row) => {
    await openEdit(row) // same modal in read-only mode (handled inside)
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
        const doc = await buildUtilizationRequestPdfDoc(r)
        const dataUri = doc.output('datauristring')
        const b64 = String(dataUri).split(',')[1] || ''
        const filename = `${r.reference_code || 'Utilization_Request'}.pdf`
        emailRow.value = r
        emailForm.value = {
            from_email: 'osas@knp.edu.ph',
            from_name: `${authStore.user?.first_name || ''} ${authStore.user?.last_name || ''}`.trim(),
            to: '',
            subject: `Utilization Request ${r.reference_code || ''}`.trim(),
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
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} submitted utilization request.`, datetime: new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
        await store.updateById(row.id, { remarks: JSON.stringify(arr) })
        await store.submit(row.id)
        await fetchAll({}, true)
        await Swal.fire('Submitted', 'Utilization request is now pending approval.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to submit request.', 'error')
    }
}

const approveItem = async (row) => {
    const res = await Swal.fire({
        title: 'Approve utilization?',
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
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} approved utilization request.${remarks ? ' - ' + remarks : ''}`, datetime: new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
        await store.approve(row.id, JSON.stringify(arr))
        await fetchAll({}, true)
        await Swal.fire('Approved', 'Utilization has been approved and reserved.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to approve request.', 'error')
    }
}

const rejectItem = async (row) => {
    const res = await Swal.fire({
        title: 'Reject utilization?',
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
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} rejected utilization request - ${remarks}.`, datetime: new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
        await store.reject(row.id, JSON.stringify(arr))
        await fetchAll({}, true)
        await Swal.fire('Rejected', 'Utilization has been rejected.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to reject request.', 'error')
    }
}

const cancelItem = async (row) => {
    const res = await Swal.fire({
        title: 'Cancel utilization?',
        input: 'textarea',
        inputLabel: 'Reason (required)',
        inputPlaceholder: 'State the reason…',
        inputValidator: (v) => (!v?.trim() ? 'Reason is required' : undefined),
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Cancel Utilization',
        cancelButtonText: 'Keep',
        allowOutsideClick: false,
        allowEscapeKey: false,
    })
    if (!res.isConfirmed) return

    const remarks = res.value
    try {
        const arr = parseRemarks(row.remarks)
        arr.push({ user_id: authStore.user?.id || null, user_name: displayName.value, message: `${displayName.value} cancelled utilization request - ${res.value}.`, datetime: new Date().toISOString(), is_read: false, read_by: [authStore.user?.id || null] })
        await store.cancel(row.id, JSON.stringify(arr))
        await fetchAll({}, true)
        await Swal.fire('Cancelled', 'Utilization has been cancelled.', 'success')
    } catch {
        await Swal.fire('Error', store.error || 'Failed to cancel request.', 'error')
    }
}

const printItem = async (row) => {
    const status = String(row?.status || '').toLowerCase()
    if (status !== 'approved') {
        await Swal.fire('Not allowed', 'Only approved utilization request can be printed.', 'info')
        return
    }

    try {
        await store.fetchById(row.id)                              // get full record with includes
        const full = store.selected || row
        await printUtilizationRequestPdf(full)
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

/* availability checker (compact + strict facilities) */
const avStartDate = ref('')
const avStartTime = ref('08:00')
const avEndDate = ref('')
const avEndTime = ref('10:00')
const avFacilities = ref([]) // strict list

const runAvailability = async () => {
    const facilities = (avFacilities.value || []).filter((f) => FACILITY_OPTIONS.includes(f))
    if (!avStartDate.value || !avEndDate.value || !facilities.length) {
        await Swal.fire('Missing fields', 'Start/End dates and at least one facility are required.', 'info')
        return
    }

    try {
        const res = await store.checkAvailability({
            start_date: avStartDate.value,
            start_time: avStartTime.value || '00:00',
            end_date: avEndDate.value,
            end_time: avEndTime.value || '00:00',
            facilities,
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
        <div class="mt-2"><strong>Conflicts:</strong> ${Array.isArray(res.conflicts) && res.conflicts.length
                    ? `<ul class="list-disc ml-5">${res.conflicts
                        .map(
                            (c) =>
                                `<li>${c.reference_code} — ${new Date(c.start_at).toLocaleString()} to ${new Date(
                                    c.end_at
                                ).toLocaleString()}</li>`
                        )
                        .join('')}</ul>`
                    : 'None'
                }</div>
      </div>`,
        })
    } catch (e) {
        await Swal.fire('Error', store.error || 'Failed to check availability.', 'error')
        console.error(e)
    }
}

/* filters */
const selectedFacilitiesAny = ref([]) // strict list for filter

const applyFacilitiesFilter = async () => {
    lastQuery.value.facilities_any = (selectedFacilitiesAny.value || []).slice()
    await fetchAll({ page: 1 })
}

const resetFilters = async () => {
    selectedFacilitiesAny.value = []
    await fetchAll({
        q: '',
        status: '',
        availability_status: '',
        start_from: '',
        start_to: '',
        end_from: '',
        end_to: '',
        facilities_any: [],
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

            <SectionTitleLineWithButton :icon="mdiTableBorder" title="Utilization Requests" main>
                <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                    <BaseButton :icon="mdiCalendarClock" color="info" label="View Calendar" @click="openCalendar" />
                    <BaseButton :icon="mdiCalendarCheck" color="info" label="Quick Check" @click="openQuickCheck" />
                    <BaseButton :icon="mdiPlus" color="primary" label="New Request" @click="openCreate" />
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
                        <input v-model="lastQuery.q" placeholder="Search by ref, details, remarks…"
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

                    <select v-model="lastQuery.availability_status" class="border rounded px-2 py-2">
                        <option value="">Any availability</option>
                        <option v-for="a in AVAILS" :key="a" :value="a">{{ a }}</option>
                    </select>

                    <!-- Start and End Range (date-only) -->
                    <div class="md:col-span-1">
                        <Datepicker v-model="startRange" v-bind="dpRangeCommon" placeholder="Start date range" />
                    </div>
                    <div class="md:col-span-1">
                        <Datepicker v-model="endRange" v-bind="dpRangeCommon" placeholder="End date range" />
                    </div>

                    <!-- Facilities filter (ANY match, strict list) -->
                    <div class="md:col-span-2">
                        <label class="block text-[11px] text-gray-600 mb-1">Facilities (any)</label>
                        <select v-model="selectedFacilitiesAny" multiple
                            class="w-full border rounded px-2 py-2 min-h-[38px]">
                            <option v-for="f in FACILITY_OPTIONS" :key="f" :value="f">{{ f }}</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2 md:col-span-2">
                        <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="applyFacilitiesFilter">
                            Apply Filters
                        </button>
                        <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="resetFilters">Reset</button>
                    </div>
                </div>
            </div>

            <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading"
                @query-change="handleQueryChange">
                <template #cell-facilities="{ row }">
                    <div class="flex flex-wrap gap-1 max-w-[380px]">
                        <Badge
                            v-for="(f, i) in (() => { try { return Array.isArray(row.facilities) ? row.facilities : JSON.parse(row.facilities || '[]') } catch { return [] } })()"
                            :key="i" :text="f" tone="slate" />
                        <span v-if="!(row.facilities && JSON.parse(row.facilities || '[]').length)"
                            class="text-gray-400">—</span>
                    </div>
                </template>

                <template #cell-start_at="{ value }">
                    <span>{{ value ? new Date(value).toLocaleString() : '—' }}</span>
                </template>
                <template #cell-end_at="{ value }">
                    <span>{{ value ? new Date(value).toLocaleString() : '—' }}</span>
                </template>

                <template #cell-availability_status="{ value }">
                    <Badge :text="value || '—'" :tone="availTone(value)" />
                </template>

                <template #cell-status="{ value }">
                    <Badge :text="value || '—'" :tone="statusTone(value)" />
                </template>

                <template #cell-actions="{ row }">
                    <ActivityRowActions :row="row" :current-user-id="authStore.user?.id"
                        :moderator="['admin', 'manager'].includes(String(authStore.user?.role || '').toLowerCase())"
                        @attachments="openAttachments" @submit="submitItem" @approve="approveItem" @reject="rejectItem"
                        @edit="openEdit" @delete="confirmDelete" @view="openView(row)" @cancel="cancelItem" @remarks="openRemarks"
                        @print="printItem" @email="openEmail" />
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <!-- Modals -->
    <UtilizationRequestFormModal v-model="createVisible" mode="create" @submit="onCreateSubmit" />
    <UtilizationRequestFormModal v-model="editVisible" mode="edit" :initial="editInitial || {}"
        @submit="onEditSubmit" />
    <UtilizationAttachmentsModal v-model="attachVisible" :row="attachRow" />
    <StatusTrailModal v-model="remarksVisible" :title="'Remarks • ' + (remarksRow?.reference_code || remarksRow?.activity_design?.name_of_activity || 'Item')" :items="parseRemarks(remarksRow?.remarks)"
      :can-add="true" @add="addRemarkToRow" @markAllRead="markAllReadForRow" />
    <CalendarViewModal v-model="calendarVisible" @open="openFromCalendar" />
    <QuickAvailabilityModal v-model="quickCheckVisible" :facilities="FACILITY_OPTIONS" />

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
                        <input v-model="emailForm.to" class="flex-1 border rounded px-2 py-1.5"
                            placeholder="recipient@example.com" />
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
                <div class="text-[11px] text-gray-600">Attachment: {{ (emailForm.attachments?.[0]?.filename) ||
                    'utilization.pdf' }}</div>
            </div>
            <div class="mt-3 flex justify-end gap-2">
                <button class="px-3 py-1.5 text-xs bg-gray-200 rounded" @click="emailVisible = false">Cancel</button>
                <button class="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded"
                    @click="sendEmailNow">Send</button>
            </div>
        </div>
    </div>
</template>
