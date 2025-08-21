<!-- src/views/ClubPageView.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'

import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'
import { mdiTableBorder, mdiAlertCircle, mdiEye, mdiPlus, mdiPencil, mdiTrashCan } from '@mdi/js'

const clubStore = useClubStore()
const userStore = useUserStore()

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
    data: clubStore.clubs.data || []
}))

/* ===============================
 * MEMBERS MODAL STATE
 * ============================= */
const isMembersModalVisible = ref(false)
const selectedClubId = ref(null)
const membersModalData = ref([]) // raw members of selected club
const membersDisplayPage = ref(1)
const membersDisplayPageSize = 10

// ---- Member list search & filters ----
const memberSearch = ref('')
const roleView = ref('all')      // 'all' | 'officers' | 'members'
const statusView = ref('all')    // 'all' | 'pending' | 'active' | 'inactive'

// officer order (lower = higher rank)
const ROLE_ORDER = [
    'president',
    'vice-president',
    'secretary',
    'treasurer',
    'pio',
    'business manager',
    'bod',
    'officer'
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
    else if (view === 'members') base = base.filter(u => !isOfficer(u))

    // filter by status (treat null/unknown as 'active' consistently)
    if (statusFilter !== 'all') {
        base = base.filter(u => normalizeStatus(u?.UserClub?.status) === statusFilter)
    }

    // search
    if (q) base = base.filter(u => matchesMemberQuery(u, q))

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
const membersCountOnly = computed(() => (membersModalData.value || []).filter(u => !isOfficer(u)).length)

// pagination after filtering/sorting
const membersCardData = computed(() => {
    const total = filteredSortedMembers.value.length
    const totalPages = Math.ceil(Math.max(total, 1) / membersDisplayPageSize)
    const current = Math.min(membersDisplayPage.value, totalPages || 1)
    const startIndex = (current - 1) * membersDisplayPageSize
    const pageData = filteredSortedMembers.value.slice(startIndex, startIndex + membersDisplayPageSize)
    return { total, totalPages, currentPage: current, pageSize: membersDisplayPageSize, data: pageData }
})
watch([memberSearch, roleView, statusView], () => { membersDisplayPage.value = 1 })

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
    const existingIds = new Set((membersModalData.value || []).map(u => u.id))
    const selectedIds = new Set((selectedToAdd.value || []).map(u => u.id))
    return (list || []).filter(u => !existingIds.has(u.id) && !selectedIds.has(u.id))
}
const runUserSearch = async () => {
    const q = userSearch.value.trim()
    if (!q) { userSuggestions.value = []; return }
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
    if (!q?.trim()) { userSuggestions.value = []; return }
    userSearchDebounce = setTimeout(runUserSearch, 250)
})
const selectSuggestion = (u) => {
    selectedToAdd.value.push(u)
    userSuggestions.value = userSuggestions.value.filter(s => s.id !== u.id)
    userSearch.value = ''
}
const removeSelectedCandidate = (id) => {
    selectedToAdd.value = selectedToAdd.value.filter(u => u.id !== id)
}
const addSelectedCandidates = async () => {
    if (!selectedToAdd.value.length || !selectedClubId.value) return
    const ids = selectedToAdd.value.map(u => u.id)
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
    name: '', code: '', category: '', description: '',
    is_active: true, established_at: '', website: '', email: '', phone: ''
})
const createErrors = ref({})
const openCreateModal = () => {
    createErrors.value = {}
    Object.assign(createForm.value, {
        name: '', code: '', category: '', description: '',
        is_active: true, established_at: '', website: '', email: '', phone: ''
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
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
    await clubStore.create(payload)
    isCreateModalVisible.value = false
    await fetchClubs(lastQuery.value, true)
}

const isEditModalVisible = ref(false)
const editForm = ref({
    id: null, name: '', code: '', category: '', description: '',
    is_active: true, established_at: '', website: '', email: '', phone: ''
})
const editErrors = ref({})
const openEditModal = async (row) => {
    editErrors.value = {}
    selectedClubId.value = row.id
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
        phone: c.phone || ''
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
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null })
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
        cancelButtonText: 'Cancel'
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
    membersModalData.value = membersModalData.value.filter(u => u.id !== userId)
    if (userSearch.value.trim() && userSuggestions.value.length) {
        userSuggestions.value = excludeExistingAndSelected(userSuggestions.value)
    }
}
const handleLocalPageChange = (page) => { membersDisplayPage.value = page }

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
 * TABLE
 * ============================= */
const mainColumns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'code', label: 'Code', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'is_active', label: 'Active', sortable: true, formatter: v => (v ? 'Yes' : 'No') }
]
const handleQueryChange = async (query) => { await fetchClubs(query) }
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
                                <path :d="mdiEye" />
                            </svg>
                            View
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
                <button class="px-4 py-2 bg-emerald-600 text-white rounded text-xs" @click="submitEdit">Save
                    Changes</button>
            </div>
        </div>
    </div>

    <!-- MEMBERS MODAL -->
    <div v-if="isMembersModalVisible"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[860px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Club Members</h2>
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
                    Showing {{ membersCardData.total }} result(s). Officers: {{ officersCount }} • Members: {{
                        membersCountOnly }}
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
                                <strong>{{ user.UserClub?.joined_at ? new
                                    Date(user.UserClub.joined_at).toLocaleDateString()
                                    : '—' }}</strong>
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
</template>
