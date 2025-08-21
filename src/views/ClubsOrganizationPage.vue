<!-- src/views/ClubPageView.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'

import Editor from '@tinymce/tinymce-vue'

const createEditorRef = ref(null)            // TinyMCE editor instance
const isCreateEditorFullscreen = ref(false)  // track fullscreen state

const onCreateEditorInit = (evt, editor) => {
    createEditorRef.value = editor
}

const toggleCreateFullscreen = () => {
    if (!createEditorRef.value) return
    // TinyMCE fullscreen command
    createEditorRef.value.execCommand('mceFullScreen')
    isCreateEditorFullscreen.value = !isCreateEditorFullscreen.value
}

// When closing the modal, ensure we exit fullscreen if active
const closeCreateDocModal = () => {
    if (isCreateEditorFullscreen.value && createEditorRef.value) {
        createEditorRef.value.execCommand('mceFullScreen')
        isCreateEditorFullscreen.value = false
    }
    isCreateDocModalVisible.value = false
}

const tinymceInit = {
    menubar: false,
    height: 320,
    plugins: 'lists link image table code paste fullscreen',
    toolbar:
        'undo redo | blocks | bold italic underline strikethrough | ' +
        'forecolor backcolor | alignleft aligncenter alignright alignjustify | ' +
        'bullist numlist outdent indent | link image | removeformat | code | fullscreen',
    paste_data_images: true,
    image_dimensions: true,
    image_caption: true,
    object_resizing: 'img',
    // (optional) better content defaults
    branding: false,
    content_style:
        'body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif; font-size:14px}',
    automatic_uploads: false,
    file_picker_types: 'image',
    file_picker_callback: (cb) => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*'
        input.onchange = () => {
            const file = input.files?.[0]
            if (!file) return
            const reader = new FileReader()
            reader.onload = () => cb(reader.result) // passes data:URL to TinyMCE
            reader.readAsDataURL(file)
        }
        input.click()
    }
}

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'

import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'
import { useClubDocStore } from '@/stores/clubDoc'
import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiEye,
    mdiPlus,
    mdiPencil,
    mdiTrashCan,
    mdiAccount,
    mdiAccountMultiple,
    mdiFileDocument,
} from '@mdi/js'

const clubStore = useClubStore()
const userStore = useUserStore()
const docStore = useClubDocStore()

/* ===============================
 * LIST STATE
 * ============================= */
const lastQuery = ref({ page: 1, limit: 10 })
const fetchClubs = async (queryParams = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...queryParams }
    await clubStore.fetchAll(lastQuery.value, force)
}
onMounted(() => fetchClubs({ page: 1, limit: 10 }))

const clubsData = computed(() => ({
    total: clubStore.clubs.total || 0,
    totalPages: clubStore.clubs.totalPages || 1,
    currentPage: clubStore.clubs.currentPage || 1,
    pageSize: clubStore.clubs.pageSize || 10,
    data: clubStore.clubs.data || [],
}))

/* ===============================
 * MEMBERS MODAL STATE
 * ============================= */
const isMembersModalVisible = ref(false)
const selectedClubId = ref(null)
const selectedClubName = ref('')
const membersModalData = ref([]) // raw members of selected club
const membersDisplayPage = ref(1)
const membersDisplayPageSize = 10

// ---- Member list search & filters ----
const memberSearch = ref('')
const roleView = ref('all') // 'all' | 'officers' | 'members'
const statusView = ref('all') // 'all' | 'pending' | 'active' | 'inactive'

// officer order (lower = higher rank)
const ROLE_ORDER = [
    'president',
    'vice-president',
    'secretary',
    'treasurer',
    'pio',
    'business manager',
    'bod',
    'officer',
]
const OFFICER_ROLES = new Set([...ROLE_ORDER, 'officer'])
const ALLOWED_ROLE_OPTIONS = [...ROLE_ORDER, 'member'] // include "member" so we can demote/promote

const normalizeRole = (role) => {
    const r = (role ?? 'member').toString().trim().toLowerCase()
    return r || 'member'
}
const roleRank = (role) => {
    const r = normalizeRole(role)
    if (r === 'member') return 999
    const idx = ROLE_ORDER.indexOf(r)
    return idx === -1 ? ROLE_ORDER.indexOf('officer') : idx
}
const isOfficer = (u) => {
    const r = normalizeRole(u?.UserClub?.role)
    return OFFICER_ROLES.has(r)
}

// status helpers
const allowedStatuses = ['pending', 'active', 'inactive']
const normalizeStatus = (status) => {
    const s = (status ?? 'active').toString().trim().toLowerCase()
    return allowedStatuses.includes(s) ? s : 'active'
}

// when rendering role select, if API returns some unknown non-member role, show as 'officer'
const roleValueForSelect = (u) => {
    const r = normalizeRole(u?.UserClub?.role)
    if (r === 'member') return 'member'
    return ALLOWED_ROLE_OPTIONS.includes(r) ? r : 'officer'
}

// search helpers
const matchesMemberQuery = (u, q) => {
    if (!q) return true
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const username = (u.username || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(q) || username.includes(q) || email.includes(q)
}

// filtered + ordered members
const filteredSortedMembers = computed(() => {
    const q = memberSearch.value.trim().toLowerCase()
    const view = roleView.value
    const statusFilter = statusView.value
    let base = membersModalData.value || []

    // filter officers/members
    if (view === 'officers') base = base.filter(isOfficer)
    else if (view === 'members') base = base.filter((u) => !isOfficer(u))

    // filter by status (treat null/unknown as 'active' consistently)
    if (statusFilter !== 'all') {
        base = base.filter((u) => normalizeStatus(u?.UserClub?.status) === statusFilter)
    }

    // search
    if (q) base = base.filter((u) => matchesMemberQuery(u, q))

    // sort: officers by rank then name; members alphabetical
    return base.slice().sort((a, b) => {
        const ra = roleRank(a.UserClub?.role)
        const rb = roleRank(b.UserClub?.role)
        if (ra !== rb) return ra - rb
        const aLast = (a.last_name || '').toLowerCase()
        const bLast = (b.last_name || '').toLowerCase()
        if (aLast !== bLast) return aLast.localeCompare(bLast)
        const aFirst = (a.first_name || '').toLowerCase()
        const bFirst = (b.first_name || '').toLowerCase()
        if (aFirst !== bFirst) return aFirst.localeCompare(bFirst)
        return (a.username || '').toLowerCase().localeCompare((b.username || '').toLowerCase())
    })
})

// counts for header (unfiltered totals, by officers vs members)
const officersCount = computed(() => (membersModalData.value || []).filter(isOfficer).length)
const membersCountOnly = computed(() => (membersModalData.value || []).filter((u) => !isOfficer(u)).length)

// pagination after filtering/sorting
const membersCardData = computed(() => {
    const total = filteredSortedMembers.value.length
    const totalPages = Math.ceil(Math.max(total, 1) / membersDisplayPageSize)
    const current = Math.min(membersDisplayPage.value, totalPages || 1)
    const startIndex = (current - 1) * membersDisplayPageSize
    const pageData = filteredSortedMembers.value.slice(startIndex, startIndex + membersDisplayPageSize)
    return { total, totalPages, currentPage: current, pageSize: membersDisplayPageSize, data: pageData }
})
watch([memberSearch, roleView, statusView], () => {
    membersDisplayPage.value = 1
})

/* ===============================
 * USER AUTOCOMPLETE FOR ADDING
 * ============================= */
const userSearch = ref('')
const userSuggestions = ref([])
const userSearchLoading = ref(false)
const selectedToAdd = ref([])
let userSearchDebounce = null

const buildUserFilters = (q) => {
    const f = {}
    if (!q) return f
    if (q.includes('@')) f.email = q
    else f.username = q
    f.is_active = true
    return f
}
const excludeExistingAndSelected = (list) => {
    const existingIds = new Set((membersModalData.value || []).map((u) => u.id))
    const selectedIds = new Set((selectedToAdd.value || []).map((u) => u.id))
    return (list || []).filter((u) => !existingIds.has(u.id) && !selectedIds.has(u.id))
}
const runUserSearch = async () => {
    const q = userSearch.value.trim()
    if (!q) {
        userSuggestions.value = []
        return
    }
    userSearchLoading.value = true
    try {
        await userStore.fetchAll({ page: 1, limit: 8, filters: buildUserFilters(q) }, true)
        userSuggestions.value = excludeExistingAndSelected(userStore.users.data || [])
    } finally {
        userSearchLoading.value = false
    }
}
watch(userSearch, (q) => {
    clearTimeout(userSearchDebounce)
    if (!q?.trim()) {
        userSuggestions.value = []
        return
    }
    userSearchDebounce = setTimeout(runUserSearch, 250)
})
const selectSuggestion = (u) => {
    selectedToAdd.value.push(u)
    userSuggestions.value = userSuggestions.value.filter((s) => s.id !== u.id)
    userSearch.value = ''
}
const removeSelectedCandidate = (id) => {
    selectedToAdd.value = selectedToAdd.value.filter((u) => u.id !== id)
}
const addSelectedCandidates = async () => {
    if (!selectedToAdd.value.length || !selectedClubId.value) return
    const ids = selectedToAdd.value.map((u) => u.id)
    await clubStore.addUsersToClub(selectedClubId.value, ids)
    membersModalData.value = Array.isArray(clubStore.selectedClub?.users) ? clubStore.selectedClub.users : []
    selectedToAdd.value = []
    userSuggestions.value = []
    userSearch.value = ''
    membersDisplayPage.value = 1
}

/* ===============================
 * CREATE / EDIT CLUB
 * ============================= */
const isCreateModalVisible = ref(false)
const createForm = ref({
    name: '',
    code: '',
    category: '',
    description: '',
    is_active: true,
    established_at: '',
    website: '',
    email: '',
    phone: '',
})
const createErrors = ref({})
const openCreateModal = () => {
    createErrors.value = {}
    Object.assign(createForm.value, {
        name: '',
        code: '',
        category: '',
        description: '',
        is_active: true,
        established_at: '',
        website: '',
        email: '',
        phone: '',
    })
    isCreateModalVisible.value = true
}
const validateCreate = () => {
    const errs = {}
    if (!createForm.value.name?.trim()) errs.name = 'Name is required'
    if (!createForm.value.code?.trim()) errs.code = 'Code is required'
    createErrors.value = errs
    return Object.keys(errs).length === 0
}
const submitCreate = async () => {
    if (!validateCreate()) return
    const payload = { ...createForm.value }
    Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null
    })
    await clubStore.create(payload)
    isCreateModalVisible.value = false
    await fetchClubs(lastQuery.value, true)
}

const isEditModalVisible = ref(false)
const editForm = ref({
    id: null,
    name: '',
    code: '',
    category: '',
    description: '',
    is_active: true,
    established_at: '',
    website: '',
    email: '',
    phone: '',
})
const editErrors = ref({})
const openEditModal = async (row) => {
    editErrors.value = {}
    selectedClubId.value = row.id
    selectedClubName.value = row.name || ''
    await clubStore.fetchById(row.id)
    const c = clubStore.selectedClub || row
    Object.assign(editForm.value, {
        id: c.id,
        name: c.name || '',
        code: c.code || '',
        category: c.category || '',
        description: c.description || '',
        is_active: c.is_active ?? true,
        established_at: c.established_at ? String(c.established_at).slice(0, 10) : '',
        website: c.website || '',
        email: c.email || '',
        phone: c.phone || '',
    })
    isEditModalVisible.value = true
}
const validateEdit = () => {
    const errs = {}
    if (!editForm.value.name?.trim()) errs.name = 'Name is required'
    if (!editForm.value.code?.trim()) errs.code = 'Code is required'
    editErrors.value = errs
    return Object.keys(errs).length === 0
}
const submitEdit = async () => {
    if (!validateEdit()) return
    const { id, ...rest } = editForm.value
    const payload = { ...rest }
    Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null
    })
    await clubStore.updateById(id, payload)
    isEditModalVisible.value = false
    await fetchClubs(lastQuery.value, true)
}

/* ===============================
 * DELETE CLUB
 * ============================= */
const confirmDelete = async (row) => {
    if (!row?.id) return
    const result = await Swal.fire({
        title: `Delete club "${row.name}"?`,
        text: 'This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
    })
    if (result.isConfirmed) {
        await clubStore.deleteById(row.id)
        await fetchClubs(lastQuery.value, true)
        await Swal.fire('Deleted!', 'The club has been deleted.', 'success')
    }
}

/* ===============================
 * MEMBERS HANDLERS
 * ============================= */
const viewMembers = async (row) => {
    selectedClubId.value = row.id
    selectedClubName.value = row.name || ''
    membersDisplayPage.value = 1
    await clubStore.fetchById(row.id)
    membersModalData.value = Array.isArray(clubStore.selectedClub?.users) ? clubStore.selectedClub.users : []
    // reset search/add panels
    memberSearch.value = ''
    roleView.value = 'all'
    statusView.value = 'all'
    userSearch.value = ''
    userSuggestions.value = []
    selectedToAdd.value = []
    isMembersModalVisible.value = true
}
const removeMember = async (userId) => {
    if (!selectedClubId.value) return
    await clubStore.removeUserFromClub(selectedClubId.value, userId)
    membersModalData.value = membersModalData.value.filter((u) => u.id !== userId)
    if (userSearch.value.trim() && userSuggestions.value.length) {
        userSuggestions.value = excludeExistingAndSelected(userSuggestions.value)
    }
}
const handleLocalPageChange = (page) => {
    membersDisplayPage.value = page
}

/* ===============================
 * STATUS & ROLE UPDATE (optimistic)
 * ============================= */
const savingStatus = ref(new Set())
const savingRole = ref(new Set())

const changeMemberStatus = async (user, nextStatusRaw) => {
    if (!selectedClubId.value) return
    const nextStatus = normalizeStatus(nextStatusRaw)
    const prev = normalizeStatus(user.UserClub?.status)
    if (prev === nextStatus) return
    savingStatus.value.add(user.id)
    if (!user.UserClub) user.UserClub = {}
    user.UserClub.status = nextStatus
    try {
        await clubStore.updateMemberStatus(selectedClubId.value, user.id, nextStatus)
    } catch (e) {
        user.UserClub.status = prev
        Swal.fire('Update failed', clubStore.error || 'Unable to update status', 'error')
    } finally {
        savingStatus.value.delete(user.id)
    }
}

const changeMemberRole = async (user, nextRoleRaw) => {
    if (!selectedClubId.value) return
    const nextRole = normalizeRole(nextRoleRaw)
    const prev = normalizeRole(user.UserClub?.role)
    if (prev === nextRole) return
    savingRole.value.add(user.id)
    if (!user.UserClub) user.UserClub = {}
    user.UserClub.role = nextRole
    try {
        await clubStore.updateMemberRole(selectedClubId.value, user.id, nextRole)
        // resort + counts recompute via computed
    } catch (e) {
        user.UserClub.role = prev
        Swal.fire('Update failed', clubStore.error || 'Unable to update role', 'error')
    } finally {
        savingRole.value.delete(user.id)
    }
}

/* ===============================
 * CLUB DOCS MODAL STATE
 * ============================= */
const isDocsModalVisible = ref(false)
const docsRaw = ref([]) // raw docs for selected club
const docsDisplayPage = ref(1)
const docsDisplayPageSize = 10

const docSearch = ref('')
const docTypeView = ref('all') // 'all' | 'cbl' | 'resolution' | 'minute'
const docStatusView = ref('all') // 'all' | 'draft' | 'published' | 'archived'

const DOC_TYPE_ORDER = ['cbl', 'resolution', 'minute']
const DOC_STATUS_OPTIONS = ['draft', 'published', 'archived']
const DOC_TYPE_OPTIONS = ['cbl', 'resolution', 'minute']

const normalizeDocType = (t) => {
    const v = (t || '').toString().toLowerCase()
    return DOC_TYPE_OPTIONS.includes(v) ? v : 'cbl'
}

const docTypeRank = (t) => {
    const v = normalizeDocType(t)
    const idx = DOC_TYPE_ORDER.indexOf(v)
    return idx === -1 ? 999 : idx
}

const matchesDocQuery = (d, q) => {
    if (!q) return true
    const title = (d.title || '').toLowerCase()
    const content = (d.content || '').toLowerCase()
    return title.includes(q) || content.includes(q)
}

const filteredSortedDocs = computed(() => {
    const q = docSearch.value.trim().toLowerCase()
    const tFilter = docTypeView.value
    const sFilter = docStatusView.value

    let base = docsRaw.value || []

    if (tFilter !== 'all') {
        base = base.filter((d) => (d.type || '').toLowerCase() === tFilter)
    }
    if (sFilter !== 'all') {
        base = base.filter((d) => (d.status || '').toLowerCase() === sFilter)
    }
    if (q) {
        base = base.filter((d) => matchesDocQuery(d, q))
    }

    // Sort by type asc (per DOC_TYPE_ORDER), then date desc (doc_date, fallback to created_at)
    return base.slice().sort((a, b) => {
        const ta = docTypeRank(a.type)
        const tb = docTypeRank(b.type)
        if (ta !== tb) return ta - tb
        const aDateStr = a.doc_date || a.created_at
        const bDateStr = b.doc_date || b.created_at
        const aTime = aDateStr ? new Date(aDateStr).getTime() : 0
        const bTime = bDateStr ? new Date(bDateStr).getTime() : 0
        return bTime - aTime // newest first
    })
})

const docsCardData = computed(() => {
    const total = filteredSortedDocs.value.length
    const totalPages = Math.ceil(Math.max(total, 1) / docsDisplayPageSize)
    const current = Math.min(docsDisplayPage.value, totalPages || 1)
    const startIndex = (current - 1) * docsDisplayPageSize
    const pageData = filteredSortedDocs.value.slice(startIndex, startIndex + docsDisplayPageSize)
    return { total, totalPages, currentPage: current, pageSize: docsDisplayPageSize, data: pageData }
})
watch([docSearch, docTypeView, docStatusView], () => {
    docsDisplayPage.value = 1
})

const viewDocs = async (row) => {
    selectedClubId.value = row.id
    selectedClubName.value = row.name || ''
    // reset
    docSearch.value = ''
    docTypeView.value = 'all'
    docStatusView.value = 'all'
    docsDisplayPage.value = 1

    // fetch docs for this club (use a generous limit so local pagination works smoothly)

    await docStore.fetchByClub(row.id, { page: 1, limit: 200 })
    docsRaw.value = Array.isArray(docStore.docs?.data) ? docStore.docs.data : []
    isDocsModalVisible.value = true
}

/* ===============================
 * CREATE / EDIT / DELETE DOC
 * ============================= */
const isCreateDocModalVisible = ref(false)
const createDocForm = ref({
    type: 'cbl',
    title: '',
    content: '',
    status: 'draft',
    doc_date: '',
})
const createDocErrors = ref({})

const openCreateDocModal = () => {
    createDocErrors.value = {}
    Object.assign(createDocForm.value, {
        type: 'cbl',
        title: '',
        content: '',
        status: 'draft',
        doc_date: '',
    })
    isCreateDocModalVisible.value = true
}

const validateCreateDoc = () => {
    const errs = {}
    if (!createDocForm.value.type) errs.type = 'Type is required'
    if (!createDocForm.value.title?.trim()) errs.title = 'Title is required'
    if (!createDocForm.value.content?.trim()) errs.content = 'Content is required'
    if (createDocForm.value.status && !DOC_STATUS_OPTIONS.includes(createDocForm.value.status)) {
        errs.status = 'Invalid status'
    }
    createDocErrors.value = errs
    return Object.keys(errs).length === 0
}

const submitCreateDoc = async () => {
    if (!selectedClubId.value) return
    if (!validateCreateDoc()) return
    const payload = {
        club_id: selectedClubId.value,
        type: createDocForm.value.type,
        title: createDocForm.value.title,
        content: createDocForm.value.content,
        status: createDocForm.value.status || 'draft',
        doc_date: createDocForm.value.doc_date || null,
    }
    const created = await docStore.create(payload)
    // keep local list in sync
    docsRaw.value.unshift(created)
    isCreateDocModalVisible.value = false
}

const isEditDocModalVisible = ref(false)
const editDocForm = ref({
    id: null,
    type: 'cbl',
    title: '',
    content: '',
    status: 'draft',
    doc_date: '',
})
const editDocErrors = ref({})

const openEditDocModal = (doc) => {
    editDocErrors.value = {}
    Object.assign(editDocForm.value, {
        id: doc.id,
        type: doc.type || 'cbl',
        title: doc.title || '',
        content: doc.content || '',
        status: doc.status || 'draft',
        doc_date: doc.doc_date ? String(doc.doc_date).slice(0, 10) : '',
    })
    isEditDocModalVisible.value = true
}

const validateEditDoc = () => {
    const errs = {}
    if (editDocForm.value.type && !DOC_TYPE_OPTIONS.includes(editDocForm.value.type)) {
        errs.type = 'Invalid type'
    }
    if (!editDocForm.value.title?.trim()) errs.title = 'Title is required'
    if (!editDocForm.value.content?.trim()) errs.content = 'Content is required'
    if (editDocForm.value.status && !DOC_STATUS_OPTIONS.includes(editDocForm.value.status)) {
        errs.status = 'Invalid status'
    }
    editDocErrors.value = errs
    return Object.keys(errs).length === 0
}

const submitEditDoc = async () => {
    if (!validateEditDoc()) return
    const id = editDocForm.value.id
    const payload = {
        type: editDocForm.value.type,
        title: editDocForm.value.title,
        content: editDocForm.value.content,
        status: editDocForm.value.status,
        doc_date: editDocForm.value.doc_date || null,
    }
    const updated = await docStore.updateById(id, payload)
    // sync local list
    const idx = docsRaw.value.findIndex((d) => d.id === id)
    if (idx !== -1) docsRaw.value[idx] = updated
    isEditDocModalVisible.value = false
}

const deleteDoc = async (doc) => {
    const result = await Swal.fire({
        title: `Delete document "${doc.title}"?`,
        text: 'This cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it',
        cancelButtonText: 'Cancel',
    })
    if (!result.isConfirmed) return
    await docStore.deleteById(doc.id)
    docsRaw.value = docsRaw.value.filter((d) => d.id !== doc.id)
    await Swal.fire('Deleted!', 'The document has been deleted.', 'success')
}

/* ===============================
 * TABLE
 * ============================= */
const mainColumns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'code', label: 'Code', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'is_active', label: 'Active', sortable: true, formatter: (v) => (v ? 'Yes' : 'No') },
]
const handleQueryChange = async (query) => {
    await fetchClubs(query)
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <NotificationBar v-if="clubStore.error" :icon="mdiAlertCircle" color="danger">
                {{ clubStore.error }}
            </NotificationBar>

            <SectionTitleLineWithButton :icon="mdiTableBorder" title="Clubs" main>
                <div class="flex items-center gap-2">
                    <BaseButton :icon="mdiPlus" color="primary" label="Add Club" @click="openCreateModal" />
                    <BaseButton color="info" label="Refresh"
                        @click="fetchClubs({ page: 1, limit: clubsData.pageSize })" />
                </div>
            </SectionTitleLineWithButton>

            <BaseTable :columns="mainColumns" :data="clubsData" :loading="clubStore.isLoading"
                @query-change="handleQueryChange">
                <template #cell-actions="{ row }">
                    <div class="flex items-center gap-2">
                        <button class="text-blue-600 underline flex items-center gap-1" @click="viewMembers(row)"
                            title="View Members">
                            <svg style="width: 18px; height: 18px" viewBox="0 0 24 24">
                                <path :d="mdiAccountMultiple" />
                            </svg>
                            Members
                        </button>
                        <button class="text-indigo-600 underline flex items-center gap-1" @click="viewDocs(row)"
                            title="View Docs">
                            <svg style="width: 18px; height: 18px" viewBox="0 0 24 24">
                                <path :d="mdiFileDocument" />
                            </svg>
                            Documents
                        </button>
                        <button class="text-emerald-600 underline flex items-center gap-1" @click="openEditModal(row)"
                            title="Edit Club">
                            <svg style="width: 18px; height: 18px" viewBox="0 0 24 24">
                                <path :d="mdiPencil" />
                            </svg>
                            Edit
                        </button>
                        <button class="text-red-600 underline flex items-center gap-1" @click="confirmDelete(row)"
                            title="Delete Club">
                            <svg style="width: 18px; height: 18px" viewBox="0 0 24 24">
                                <path :d="mdiTrashCan" />
                            </svg>
                            Delete
                        </button>
                    </div>
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <!-- CREATE CLUB MODAL -->
    <div v-if="isCreateModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[860px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">Add New Club</h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded"
                    @click="isCreateModalVisible = false">Close</button>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="createForm.name" class="w-full border rounded px-2 py-1"
                        placeholder="e.g. Math Society" />
                    <p v-if="createErrors.name" class="text-red-600 text-xs mt-1">{{ createErrors.name }}</p>
                </div>
                <div>
                    <label class="block mb-1">Code <span class="text-red-500">*</span></label>
                    <input v-model="createForm.code" class="w-full border rounded px-2 py-1"
                        placeholder="e.g. MATHSOC" />
                    <p v-if="createErrors.code" class="text-red-600 text-xs mt-1">{{ createErrors.code }}</p>
                </div>
                <div>
                    <label class="block mb-1">Category</label>
                    <select v-model="createForm.category" class="w-full border rounded px-2 py-1">
                        <option disabled value="">Select a category</option>
                        <option value="Academic">Academic</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Athletics">Athletics</option>
                        <option value="Social">Social</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Religious/Spiritual">Religious / Spiritual</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Leadership">Leadership</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                <div>
                    <label class="block mb-1">Active?</label>
                    <select v-model="createForm.is_active" class="w-full border rounded px-2 py-1">
                        <option :value="true">Yes</option>
                        <option :value="false">No</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="block mb-1">Description</label>
                    <textarea v-model="createForm.description" class="w-full border rounded px-2 py-1" rows="3" />
                </div>
                <div>
                    <label class="block mb-1">Established At</label>
                    <input v-model="createForm.established_at" type="date" class="w-full border rounded px-2 py-1" />
                </div>
                <div>
                    <label class="block mb-1">Website</label>
                    <input v-model="createForm.website" class="w-full border rounded px-2 py-1"
                        placeholder="https://…" />
                </div>
                <div>
                    <label class="block mb-1">Email</label>
                    <input v-model="createForm.email" type="email" class="w-full border rounded px-2 py-1"
                        placeholder="club@example.com" />
                </div>
                <div>
                    <label class="block mb-1">Phone</label>
                    <input v-model="createForm.phone" class="w-full border rounded px-2 py-1" placeholder="+63…" />
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
                <button class="px-4 py-2 bg-gray-200 rounded text-xs"
                    @click="isCreateModalVisible = false">Cancel</button>
                <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="submitCreate">Create</button>
            </div>
        </div>
    </div>

    <!-- EDIT CLUB MODAL -->
    <div v-if="isEditModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[860px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">Edit Club</h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="isEditModalVisible = false">Close</button>
            </div>

            <div class="grid grid-cols-2 gap-3 text-sm">
                <div>
                    <label class="block mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="editForm.name" class="w-full border rounded px-2 py-1" />
                    <p v-if="editErrors.name" class="text-red-600 text-xs mt-1">{{ editErrors.name }}</p>
                </div>
                <div>
                    <label class="block mb-1">Code <span class="text-red-500">*</span></label>
                    <input v-model="editForm.code" class="w-full border rounded px-2 py-1" />
                    <p v-if="editErrors.code" class="text-red-600 text-xs mt-1">{{ editErrors.code }}</p>
                </div>
                <div>
                    <label class="block mb-1">Category</label>
                    <select v-model="editForm.category" class="w-full border rounded px-2 py-1">
                        <option disabled value="">Select a category</option>
                        <option value="Academic">Academic</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Athletics">Athletics</option>
                        <option value="Social">Social</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Religious/Spiritual">Religious / Spiritual</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Leadership">Leadership</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                <div>
                    <label class="block mb-1">Active?</label>
                    <select v-model="editForm.is_active" class="w-full border rounded px-2 py-1">
                        <option :value="true">Yes</option>
                        <option :value="false">No</option>
                    </select>
                </div>
                <div class="col-span-2">
                    <label class="block mb-1">Description</label>
                    <textarea v-model="editForm.description" class="w-full border rounded px-2 py-1" rows="3" />
                </div>
                <div>
                    <label class="block mb-1">Established At</label>
                    <input v-model="editForm.established_at" type="date" class="w-full border rounded px-2 py-1" />
                </div>
                <div>
                    <label class="block mb-1">Website</label>
                    <input v-model="editForm.website" class="w-full border rounded px-2 py-1" />
                </div>
                <div>
                    <label class="block mb-1">Email</label>
                    <input v-model="editForm.email" type="email" class="w-full border rounded px-2 py-1" />
                </div>
                <div>
                    <label class="block mb-1">Phone</label>
                    <input v-model="editForm.phone" class="w-full border rounded px-2 py-1" />
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
                <button class="px-4 py-2 bg-gray-200 rounded text-xs"
                    @click="isEditModalVisible = false">Cancel</button>
                <button class="px-4 py-2 bg-emerald-600 text-white rounded text-xs" @click="submitEdit">
                    Save Changes
                </button>
            </div>
        </div>
    </div>

    <!-- MEMBERS MODAL -->
    <div v-if="isMembersModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[860px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Club Members — <span class="text-gray-600">{{ selectedClubName
                        }}</span>
                </h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded"
                    @click="isMembersModalVisible = false">Close</button>
            </div>

            <!-- Filters for existing members -->
            <div class="mt-3 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <select v-model="roleView" class="border rounded px-2 py-1 text-sm">
                        <option value="all">All roles</option>
                        <option value="officers">Officers</option>
                        <option value="members">Members</option>
                    </select>
                    <select v-model="statusView" class="border rounded px-2 py-1 text-sm">
                        <option value="all">All statuses</option>
                        <option v-for="s in allowedStatuses" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <input v-model="memberSearch" type="text"
                        placeholder="Search club members by name, username, or email…"
                        class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div class="text-[12px] text-gray-600">
                    Showing {{ membersCardData.total }} result(s). Officers: {{ officersCount }} • Members:
                    {{ membersCountOnly }}
                </div>
            </div>

            <!-- Autocomplete Search + Selected Chips (add new members) -->
            <div class="mt-4">
                <div class="relative">
                    <input v-model="userSearch" type="text" placeholder="Add users: search by username or email…"
                        class="border rounded px-2 py-1 text-sm w-full" autocomplete="off" />
                    <div v-if="userSearch && (userSuggestions.length || userSearchLoading)"
                        class="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                        <div v-if="userSearchLoading" class="px-3 py-2 text-xs text-gray-500">Searching…</div>
                        <template v-else>
                            <button v-for="u in userSuggestions" :key="u.id"
                                class="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                                @click="selectSuggestion(u)">
                                <div class="font-medium">
                                    {{ u.first_name }} {{ u.last_name }}
                                    <span class="text-gray-500">@{{ u.username }}</span>
                                </div>
                                <div class="text-xs text-gray-500">{{ u.email }}</div>
                            </button>
                            <div v-if="!userSuggestions.length" class="px-3 py-2 text-xs text-gray-500">No matches</div>
                        </template>
                    </div>
                </div>

                <div v-if="selectedToAdd.length" class="flex flex-wrap gap-2 mt-2">
                    <span v-for="u in selectedToAdd" :key="u.id"
                        class="inline-flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs">
                        {{ u.first_name }} {{ u.last_name }} (@{{ u.username }})
                        <button class="ml-1 text-blue-600" @click="removeSelectedCandidate(u.id)">✕</button>
                    </span>
                </div>

                <div class="flex justify-end mt-2">
                    <button class="px-3 py-1 bg-blue-600 text-white rounded text-xs disabled:opacity-50"
                        :disabled="!selectedToAdd.length" @click="addSelectedCandidates">
                        Add Selected
                    </button>
                </div>
            </div>

            <!-- Members list -->
            <div class="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                <div v-for="user in membersCardData.data" :key="user.id"
                    class="flex items-start justify-between p-3 border bg-gray-50 rounded">
                    <div class="text-sm">
                        <div class="font-semibold">
                            {{ user.first_name }} {{ user.last_name }}
                            <span class="text-gray-500 text-xs">(@{{ user.username }})</span>
                        </div>
                        <div class="text-gray-600 text-xs">{{ user.email }}</div>
                        <div class="mt-1 text-xs flex flex-wrap items-center gap-3">
                            <span>Role:
                                <select class="border rounded px-1 py-0.5 text-xs" :disabled="savingRole.has(user.id)"
                                    :value="roleValueForSelect(user)"
                                    @change="e => changeMemberRole(user, e.target.value)">
                                    <option v-for="r in ALLOWED_ROLE_OPTIONS" :key="r" :value="r">
                                        {{ r }}
                                    </option>
                                </select>
                            </span>
                            <span>Status:
                                <select class="border rounded px-1 py-0.5 text-xs" :disabled="savingStatus.has(user.id)"
                                    :value="normalizeStatus(user.UserClub?.status)"
                                    @change="e => changeMemberStatus(user, e.target.value)">
                                    <option v-for="s in allowedStatuses" :key="s" :value="s">{{ s }}</option>
                                </select>
                            </span>
                            <span>Joined:
                                <strong>{{
                                    user.UserClub?.joined_at ? new Date(user.UserClub.joined_at).toLocaleDateString() :
                                        '—'
                                }}</strong>
                            </span>
                            <span v-if="savingRole.has(user.id) || savingStatus.has(user.id)"
                                class="text-[11px] text-gray-500">Saving…</span>
                        </div>
                    </div>
                    <div>
                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" @click="removeMember(user.id)">
                            Remove
                        </button>
                    </div>
                </div>
            </div>

            <!-- Local pager -->
            <div class="flex justify-between items-center mt-3 text-xs text-gray-600">
                <button v-if="membersDisplayPage > 1" @click="handleLocalPageChange(membersDisplayPage - 1)"
                    class="px-3 py-1 bg-gray-300 rounded">
                    Previous
                </button>
                <div>Page {{ membersCardData.currentPage }} of {{ membersCardData.totalPages || 1 }}</div>
                <button v-if="membersDisplayPage < membersCardData.totalPages"
                    @click="handleLocalPageChange(membersDisplayPage + 1)" class="px-3 py-1 bg-gray-300 rounded">
                    Next
                </button>
            </div>
        </div>
    </div>

    <!-- DOCUMENTS MODAL -->
    <div v-if="isDocsModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[900px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">
                    Club Documents — <span class="text-gray-600">{{ selectedClubName }}</span>
                </h2>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1 text-xs bg-blue-600 text-white rounded" @click="openCreateDocModal">
                        + Add Document
                    </button>
                    <button class="px-3 py-1 text-xs bg-gray-200 rounded"
                        @click="isDocsModalVisible = false">Close</button>
                </div>
            </div>

            <!-- Filters -->
            <div class="mt-3 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <select v-model="docTypeView" class="border rounded px-2 py-1 text-sm">
                        <option value="all">All types</option>
                        <option v-for="t in DOC_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                    </select>
                    <select v-model="docStatusView" class="border rounded px-2 py-1 text-sm">
                        <option value="all">All statuses</option>
                        <option v-for="s in DOC_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                    </select>
                    <input v-model="docSearch" type="text" placeholder="Search documents by title or content…"
                        class="border rounded px-2 py-1 text-sm w-full" />
                </div>
                <div class="text-[12px] text-gray-600">
                    Showing {{ docsCardData.total }} document(s). Ordered by type → date.
                </div>
            </div>

            <!-- Docs list -->
            <div class="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                <div v-for="doc in docsCardData.data" :key="doc.id"
                    class="border rounded p-3 bg-gray-50 flex items-start justify-between gap-4">
                    <div class="text-sm">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-semibold">{{ doc.title }}</span>
                            <span class="px-2 py-[2px] text-[11px] rounded bg-indigo-100 text-indigo-700 uppercase">
                                {{ doc.type }}
                            </span>
                            <span class="px-2 py-[2px] text-[11px] rounded" :class="{
                                'bg-yellow-100 text-yellow-700': doc.status === 'draft',
                                'bg-emerald-100 text-emerald-700': doc.status === 'published',
                                'bg-gray-200 text-gray-700': doc.status === 'archived',
                            }">
                                {{ doc.status }}
                            </span>
                            <span class="text-xs text-gray-600">
                                {{ doc.doc_date ? new Date(doc.doc_date).toLocaleDateString() : (doc.created_at
                                    ? new Date(doc.created_at).toLocaleDateString()
                                    : '—') }}
                            </span>
                        </div>
                        <!-- <div class="text-xs text-gray-700 mt-2 line-clamp-1 prose max-w-none" v-text="doc.content">
                        </div> -->
                    </div>
                    <div class="shrink-0 flex items-center gap-2">
                        <button class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs"
                            @click="openEditDocModal(doc)">
                            Edit
                        </button>
                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs" @click="deleteDoc(doc)">
                            Delete
                        </button>
                    </div>
                </div>
            </div>

            <!-- Local pager -->
            <div class="flex justify-between items-center mt-3 text-xs text-gray-600">
                <button v-if="docsDisplayPage > 1" @click="docsDisplayPage = docsDisplayPage - 1"
                    class="px-3 py-1 bg-gray-300 rounded">
                    Previous
                </button>
                <div>Page {{ docsCardData.currentPage }} of {{ docsCardData.totalPages || 1 }}</div>
                <button v-if="docsDisplayPage < docsCardData.totalPages" @click="docsDisplayPage = docsDisplayPage + 1"
                    class="px-3 py-1 bg-gray-300 rounded">
                    Next
                </button>
            </div>
        </div>
    </div>

    <!-- CREATE DOC MODAL -->
    <div v-if="isCreateDocModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[1024px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">Add Document</h2>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1 text-xs bg-indigo-600 text-white rounded" @click="toggleCreateFullscreen">
                        {{ isCreateEditorFullscreen ? 'Restore' : 'Maximize' }}
                    </button>
                    <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="closeCreateDocModal">
                        Close
                    </button>
                </div>
            </div>

            <div class="bg-white w-full max-w-[1024px] max-h-screen rounded-2xl shadow-lg flex flex-col">
                <div class="p-5 flex-1 overflow-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label for="doc-type" class="block mb-1 font-medium text-gray-700">Type <span
                                    class="text-red-500">*</span></label>
                            <select id="doc-type" v-model="createDocForm.type" :aria-invalid="!!createDocErrors.type"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="createDocErrors.type ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="t in DOC_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                            </select>
                            <p v-if="createDocErrors.type" class="text-red-600 text-xs mt-1">{{ createDocErrors.type }}
                            </p>
                        </div>

                        <div>
                            <label for="doc-status" class="block mb-1 font-medium text-gray-700">Status</label>
                            <select id="doc-status" v-model="createDocForm.status"
                                :aria-invalid="!!createDocErrors.status"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="createDocErrors.status ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="s in DOC_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                            </select>
                            <p v-if="createDocErrors.status" class="text-red-600 text-xs mt-1">{{ createDocErrors.status
                            }}
                            </p>
                        </div>

                        <div class="md:col-span-2">
                            <label for="doc-title" class="block mb-1 font-medium text-gray-700">Title <span
                                    class="text-red-500">*</span></label>
                            <input id="doc-title" v-model="createDocForm.title" :aria-invalid="!!createDocErrors.title"
                                placeholder="Document title"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="createDocErrors.title ? 'border-red-500' : 'border-gray-300'" />
                            <p v-if="createDocErrors.title" class="text-red-600 text-xs mt-1">{{ createDocErrors.title
                            }}
                            </p>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block mb-1 font-medium text-gray-700">Content <span
                                    class="text-red-500">*</span></label>
                            <div
                                :class="['rounded-lg border', createDocErrors.content ? 'border-red-500' : 'border-gray-300']">
                                <Editor v-model="createDocForm.content" :init="tinymceInit" :onInit="onCreateEditorInit"
                                    :tinymce-script-src="`/tinymce/tinymce.min.js`" licenseKey="gpl" />
                            </div>
                            <p v-if="createDocErrors.content" class="text-red-600 text-xs mt-1">{{
                                createDocErrors.content
                            }}</p>
                        </div>

                        <div class="md:col-span-2">
                            <label for="doc-date" class="block mb-1 font-medium text-gray-700">Document Date</label>
                            <input id="doc-date" v-model="createDocForm.doc_date" type="date"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300" />
                        </div>
                    </div>
                </div>

                <div class="border-t p-4 bg-white flex items-center justify-end gap-2">
                    <button type="button"
                        class="px-4 py-2 rounded-lg text-xs border border-gray-300 hover:bg-gray-100 transition"
                        @click="isCreateDocModalVisible = false">
                        Cancel
                    </button>
                    <button type="button"
                        class="px-4 py-2 rounded-lg text-xs bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition"
                        :disabled="isSubmitting" @click="submitCreateDoc">
                        Create
                    </button>
                </div>
            </div>

        </div>
    </div>

    <!-- EDIT DOC MODAL -->
    <div v-if="isEditDocModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[1024px] max-h-screen overflow-auto w-[760px]">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">Edit Document</h2>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1 text-xs bg-indigo-600 text-white rounded" @click="toggleCreateFullscreen">
                        {{ isCreateEditorFullscreen ? 'Restore' : 'Maximize' }}
                    </button>
                    <button class="px-3 py-1 text-xs bg-gray-200 rounded"
                        @click="isEditDocModalVisible = false">Close</button>
                </div>
            </div>

            <div class="bg-white w-full max-w-[1024px] max-h-screen rounded-2xl shadow-lg flex flex-col">
                <div class="p-5 flex-1 overflow-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label for="edit-type" class="block mb-1 font-medium text-gray-700">Type</label>
                            <select id="edit-type" v-model="editDocForm.type" :aria-invalid="!!editDocErrors.type"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="editDocErrors.type ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="t in DOC_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                            </select>
                            <p v-if="editDocErrors.type" class="text-red-600 text-xs mt-1">{{ editDocErrors.type }}</p>
                        </div>

                        <div>
                            <label for="edit-status" class="block mb-1 font-medium text-gray-700">Status</label>
                            <select id="edit-status" v-model="editDocForm.status" :aria-invalid="!!editDocErrors.status"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="editDocErrors.status ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="s in DOC_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                            </select>
                            <p v-if="editDocErrors.status" class="text-red-600 text-xs mt-1">{{ editDocErrors.status }}
                            </p>
                        </div>

                        <div class="md:col-span-2">
                            <label for="edit-title" class="block mb-1 font-medium text-gray-700">Title <span
                                    class="text-red-500">*</span></label>
                            <input id="edit-title" v-model="editDocForm.title" :aria-invalid="!!editDocErrors.title"
                                placeholder="Document title"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="editDocErrors.title ? 'border-red-500' : 'border-gray-300'" />
                            <p v-if="editDocErrors.title" class="text-red-600 text-xs mt-1">{{ editDocErrors.title }}
                            </p>
                        </div>

                        <div>
                            <label for="edit-date" class="block mb-1 font-medium text-gray-700">Document Date</label>
                            <input id="edit-date" v-model="editDocForm.doc_date" type="date"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300" />
                        </div>

                        <div class="md:col-span-2">
                            <label class="block mb-1 font-medium text-gray-700">Content <span
                                    class="text-red-500">*</span></label>
                            <div
                                :class="['rounded-lg border', editDocErrors.content ? 'border-red-500' : 'border-gray-300']">
                                <Editor v-model="editDocForm.content" :init="tinymceInit" :onInit="onCreateEditorInit"
                                    :tinymce-script-src="`/tinymce/tinymce.min.js`" licenseKey="gpl" />
                            </div>
                            <p v-if="editDocErrors.content" class="text-red-600 text-xs mt-1">{{ editDocErrors.content
                            }}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="border-t p-4 bg-white flex items-center justify-end gap-2">
                    <button type="button"
                        class="px-4 py-2 rounded-lg text-xs border border-gray-300 hover:bg-gray-100 transition"
                        @click="isEditDocModalVisible = false">
                        Cancel
                    </button>
                    <button type="button"
                        class="px-4 py-2 rounded-lg text-xs bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                        :disabled="isSubmitting" @click="submitEditDoc">
                        Save Changes
                    </button>
                </div>
            </div>

        </div>
    </div>
</template>
