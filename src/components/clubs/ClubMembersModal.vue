<!-- src/components/clubs/ClubMembersModal.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import Swal from 'sweetalert2'
import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    clubId: { type: [Number, String], required: true },
    clubName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const clubStore = useClubStore()
const userStore = useUserStore()

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const membersRaw = ref([])
const page = ref(1)
const pageSize = 10

// filters
const memberSearch = ref('')
const roleView = ref('all') // all | officers | members
const statusView = ref('all') // all | pending | active | inactive

// role helpers
const ROLE_ORDER = ['president', 'vice-president', 'secretary', 'treasurer', 'pio', 'business manager', 'bod', 'officer']
const OFFICER_ROLES = new Set([...ROLE_ORDER, 'officer'])
const ALLOWED_ROLE_OPTIONS = [...ROLE_ORDER, 'member']
const allowedStatuses = ['pending', 'active', 'inactive']

const normalizeRole = (role) => (role ?? 'member').toString().trim().toLowerCase() || 'member'
const roleRank = (role) => {
    const r = normalizeRole(role)
    if (r === 'member') return 999
    const idx = ROLE_ORDER.indexOf(r)
    return idx === -1 ? ROLE_ORDER.indexOf('officer') : idx
}
const isOfficer = (u) => OFFICER_ROLES.has(normalizeRole(u?.UserClub?.role))
const normalizeStatus = (status) => {
    const s = (status ?? 'active').toString().trim().toLowerCase()
    return allowedStatuses.includes(s) ? s : 'active'
}
const roleValueForSelect = (u) => {
    const r = normalizeRole(u?.UserClub?.role)
    if (r === 'member') return 'member'
    return ALLOWED_ROLE_OPTIONS.includes(r) ? r : 'officer'
}
const matchesMemberQuery = (u, q) => {
    if (!q) return true
    const name = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
    const username = (u.username || '').toLowerCase()
    const email = (u.email || '').toLowerCase()
    return name.includes(q) || username.includes(q) || email.includes(q)
}

const filteredSorted = computed(() => {
    const q = memberSearch.value.trim().toLowerCase()
    let base = membersRaw.value || []
    if (roleView.value === 'officers') base = base.filter(isOfficer)
    else if (roleView.value === 'members') base = base.filter((u) => !isOfficer(u))
    if (statusView.value !== 'all') base = base.filter((u) => normalizeStatus(u?.UserClub?.status) === statusView.value)
    if (q) base = base.filter((u) => matchesMemberQuery(u, q))

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

const officersCount = computed(() => (membersRaw.value || []).filter(isOfficer).length)
const membersCountOnly = computed(() => (membersRaw.value || []).filter((u) => !isOfficer(u)).length)

const cardData = computed(() => {
    const total = filteredSorted.value.length
    const totalPages = Math.ceil(Math.max(total, 1) / pageSize)
    const current = Math.min(page.value, totalPages || 1)
    const startIndex = (current - 1) * pageSize
    const pageData = filteredSorted.value.slice(startIndex, startIndex + pageSize)
    return { total, totalPages, currentPage: current, pageSize, data: pageData }
})

watch([memberSearch, roleView, statusView], () => (page.value = 1))

const load = async () => {
    await clubStore.fetchById(props.clubId)
    membersRaw.value = Array.isArray(clubStore.selectedClub?.users) ? clubStore.selectedClub.users : []
    memberSearch.value = ''
    roleView.value = 'all'
    statusView.value = 'all'
    page.value = 1
}

// add users
const userSearch = ref('')
const userSuggestions = ref([])
const userSearchLoading = ref(false)
const selectedToAdd = ref([])
let debounce = null

const buildUserFilters = (q) => {
    const f = {}
    if (!q) return f
    if (q.includes('@')) f.email = q
    else f.username = q
    f.is_active = true
    return f
}
const excludeExistingAndSelected = (list) => {
    const existingIds = new Set((membersRaw.value || []).map((u) => u.id))
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
    clearTimeout(debounce)
    if (!q?.trim()) {
        userSuggestions.value = []
        return
    }
    debounce = setTimeout(runUserSearch, 250)
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
    if (!selectedToAdd.value.length) return
    const ids = selectedToAdd.value.map((u) => u.id)
    await clubStore.addUsersToClub(props.clubId, ids)
    membersRaw.value = Array.isArray(clubStore.selectedClub?.users) ? clubStore.selectedClub.users : []
    selectedToAdd.value = []
    userSuggestions.value = []
    userSearch.value = ''
    page.value = 1
}

// member updates
const savingStatus = ref(new Set())
const savingRole = ref(new Set())

const changeMemberStatus = async (user, nextStatusRaw) => {
    const nextStatus = normalizeStatus(nextStatusRaw)
    const prev = normalizeStatus(user.UserClub?.status)
    if (prev === nextStatus) return
    savingStatus.value.add(user.id)
    if (!user.UserClub) user.UserClub = {}
    user.UserClub.status = nextStatus
    try {
        await clubStore.updateMemberStatus(props.clubId, user.id, nextStatus)
    } catch (_e) {
        user.UserClub.status = prev
        Swal.fire('Update failed', clubStore.error || 'Unable to update status', 'error')
    } finally {
        savingStatus.value.delete(user.id)
    }
}

const changeMemberRole = async (user, nextRoleRaw) => {
    const nextRole = normalizeRole(nextRoleRaw)
    const prev = normalizeRole(user.UserClub?.role)
    if (prev === nextRole) return
    savingRole.value.add(user.id)
    if (!user.UserClub) user.UserClub = {}
    user.UserClub.role = nextRole
    try {
        await clubStore.updateMemberRole(props.clubId, user.id, nextRole)
    } catch (_e) {
        user.UserClub.role = prev
        Swal.fire('Update failed', clubStore.error || 'Unable to update role', 'error')
    } finally {
        savingRole.value.delete(user.id)
    }
}

const removeMember = async (userId) => {
    await clubStore.removeUserFromClub(props.clubId, userId)
    membersRaw.value = membersRaw.value.filter((u) => u.id !== userId)
    if (userSearch.value.trim() && userSuggestions.value.length) {
        userSuggestions.value = excludeExistingAndSelected(userSuggestions.value)
    }
}

watch(
    () => props.modelValue,
    (v) => {
        if (v) load()
    },
    { immediate: false }
)
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[860px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Club Members — <span class="text-gray-600">{{ clubName }}</span></h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <!-- Filters -->
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
                    Showing {{ cardData.total }} result(s). Officers: {{ officersCount }} • Members: {{ membersCountOnly
                    }}
                </div>
            </div>

            <!-- Autocomplete + chips -->
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
                                    {{ u.first_name }} {{ u.last_name }} <span class="text-gray-500">@{{ u.username
                                    }}</span>
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
                <div v-for="user in cardData.data" :key="user.id"
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
                                    <option v-for="r in ALLOWED_ROLE_OPTIONS" :key="r" :value="r">{{ r }}</option>
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
                                    Date(user.UserClub.joined_at).toLocaleDateString() : '—'
                                }}</strong>
                            </span>
                            <span v-if="savingRole.has(user.id) || savingStatus.has(user.id)"
                                class="text-[11px] text-gray-500">Saving…</span>
                        </div>
                    </div>
                    <div>
                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs"
                            @click="removeMember(user.id)">Remove</button>
                    </div>
                </div>
            </div>

            <!-- pager -->
            <div class="flex justify-between items-center mt-3 text-xs text-gray-600">
                <button v-if="page > 1" @click="page = page - 1" class="px-3 py-1 bg-gray-300 rounded">Previous</button>
                <div>Page {{ cardData.currentPage }} of {{ cardData.totalPages || 1 }}</div>
                <button v-if="page < cardData.totalPages" @click="page = page + 1"
                    class="px-3 py-1 bg-gray-300 rounded">Next</button>
            </div>
        </div>
    </div>
</template>
