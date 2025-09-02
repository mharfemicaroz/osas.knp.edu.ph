<!-- src/views/MembershipPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'
import ToasterComponent from '@/components/ToasterComponent.vue'

import { useUserStore } from '@/stores/user'
import { useClubStore } from '@/stores/club'
import { useAuthStore } from '@/stores/auth'

import { mdiAccountMultiple, mdiFilter, mdiRefresh, mdiAccountGroup, mdiPlus, mdiClose } from '@mdi/js'

const userStore = useUserStore()
const clubStore = useClubStore()
const auth = useAuthStore()

// ------------- filters/list -------------
const ROLES = ['admin', 'manager', 'officer', 'student']
const BOOL_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Yes', value: 'true' },
  { label: 'No', value: 'false' },
]

const lastQuery = ref({ page: 1, limit: 10, q: '', role: '', is_active: '' })

const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
  ;['q','role','is_active'].forEach((k) => { if (params[k] === '' || params[k] == null) delete params[k] })
  if (params.q) { params.username = params.q; delete params.q }
  await userStore.fetchAll(params, force)
}

onMounted(async () => {
  await fetchAll({ page: 1, limit: 10 }, true)
})

const dataWrap = computed(() => ({
  total: userStore.users.total || 0,
  totalPages: userStore.users.totalPages || 1,
  currentPage: userStore.users.currentPage || 1,
  pageSize: userStore.users.pageSize || 10,
  data: userStore.users.data || [],
}))

const statusTone = (v) => (v ? 'emerald' : 'zinc')

const columns = [
  { key: 'username', label: 'Username', sortable: true, minWidth: 160 },
  {
    key: 'name', label: 'Name', sortable: false, minWidth: 200,
    formatter: (v, row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—'
  },
  { key: 'email', label: 'Email', sortable: true, minWidth: 220 },
  { key: 'role', label: 'Role', sortable: true, width: 120 },
  { key: 'is_active', label: 'Active', sortable: true, width: 100 },
]

const handleQueryChange = async (q) => { await fetchAll(q) }

// ------------- modal: manage membership -------------
const manageVisible = ref(false)
const selectedUser = ref(null)
const userClubs = ref([])
const userClubsLocal = ref([]) // editable copy
const baseline = ref({}) // { [clubId]: { role, status } }
const clubsLoading = ref(false)
const addClubId = ref('')
const updating = ref({}) // { [clubId]: boolean } to block concurrent updates
const toast = ref(null)

const openManage = async (row) => {
  selectedUser.value = row
  manageVisible.value = true
  await preloadClubs()
  await loadUserClubs(row.id)
}

const preloadClubs = async () => {
  try {
    clubsLoading.value = true
    await clubStore.fetchAll({ page: 1, limit: 500 }, true)
  } finally {
    clubsLoading.value = false
  }
}

const loadUserClubs = async (userId) => {
  try {
    clubsLoading.value = true
    const clubs = await userStore.fetchUserClubs(userId, { force: true })
    userClubs.value = Array.isArray(clubs) ? clubs : []
    // prepare editable copy and baseline
    userClubsLocal.value = userClubs.value.map((c) => ({
      ...c,
      membership: { ...(c.membership || {}) },
    }))
    const map = {}
    for (const c of userClubs.value) {
      map[c.id] = { role: c.membership?.role || 'member', status: c.membership?.status || 'active' }
    }
    baseline.value = map
  } finally {
    clubsLoading.value = false
  }
}

const currentClubIds = computed(() => new Set((userClubs.value || []).map(c => c.id)))
const availableClubs = computed(() => (clubStore.clubs.data || []).filter(c => !currentClubIds.value.has(c.id)))

const MEMBER_ROLES = ['member','officer','bod','business manager','pio','treasurer','secretary','vice-president','president']
const MEMBER_STATUSES = ['pending','active','inactive']

const addToClub = async () => {
  const cid = addClubId.value
  const uid = selectedUser.value?.id
  if (!cid || !uid) return
  try {
    clubsLoading.value = true
    await clubStore.addUsersToClub(cid, [uid])
    await loadUserClubs(uid)
    addClubId.value = ''
  } finally {
    clubsLoading.value = false
  }
}

const removeFromClub = async (cid) => {
  const uid = selectedUser.value?.id
  if (!cid || !uid) return
  try {
    clubsLoading.value = true
    await clubStore.removeUserFromClub(cid, uid)
    await loadUserClubs(uid)
  } finally {
    clubsLoading.value = false
  }
}

// Optimistic updates: apply immediately, sync in background, revert on error
const onChangeRole = async (clubId) => {
  const uid = selectedUser.value?.id
  if (!uid) return
  const current = userClubsLocal.value.find(c => c.id === clubId)
  if (!current) return
  const newRole = String(current.membership?.role || '').toLowerCase()
  const prevRole = String(baseline.value[clubId]?.role || '').toLowerCase()
  if (!newRole || newRole === prevRole) return
  updating.value[clubId] = true
  try {
    await clubStore.updateMemberRole(clubId, uid, newRole)
    baseline.value[clubId] = {
      ...(baseline.value[clubId] || {}),
      role: newRole,
    }
    toast.value?.showToast?.('success', 'Role updated')
  } catch (e) {
    // revert UI
    current.membership.role = prevRole || 'member'
    toast.value?.showToast?.('warning', e?.message || 'Failed to update role')
  } finally {
    updating.value[clubId] = false
  }
}

const onChangeStatus = async (clubId) => {
  const uid = selectedUser.value?.id
  if (!uid) return
  const current = userClubsLocal.value.find(c => c.id === clubId)
  if (!current) return
  const newStatus = String(current.membership?.status || '').toLowerCase()
  const prevStatus = String(baseline.value[clubId]?.status || '').toLowerCase()
  if (!newStatus || newStatus === prevStatus) return
  updating.value[clubId] = true
  try {
    await clubStore.updateMemberStatus(clubId, uid, newStatus)
    baseline.value[clubId] = {
      ...(baseline.value[clubId] || {}),
      status: newStatus,
    }
    toast.value?.showToast?.('success', 'Status updated')
  } catch (e) {
    // revert UI
    current.membership.status = prevStatus || 'active'
    toast.value?.showToast?.('warning', e?.message || 'Failed to update status')
  } finally {
    updating.value[clubId] = false
  }
}

// ------------- access guard (view only) -------------
const isAdmin = computed(() => String(auth.user?.role || '').toLowerCase() === 'admin')
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <NotificationBar v-if="userStore.error" color="danger">{{ userStore.error }}</NotificationBar>

      <SectionTitleLineWithButton :icon="mdiAccountMultiple" title="Memberships" main>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
        </div>
      </SectionTitleLineWithButton>

      <div v-if="!isAdmin" class="p-3 rounded-lg border bg-amber-50 text-amber-800 text-sm">
        This page is only available to administrators.
      </div>

      <div v-else>
        <!-- Filters -->
        <div class="p-3 mb-4 rounded-xl border bg-white/60">
          <div class="flex items-center gap-2 mb-2 text-gray-700">
            <svg class="w-4 h-4" viewBox="0 0 24 24"><path :d="mdiFilter" /></svg>
            <span class="font-medium text-sm">Filters</span>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-6 gap-2 text-sm">
            <input v-model="lastQuery.q" class="border rounded px-2 py-2 md:col-span-2" placeholder="Search username…" @keyup.enter="fetchAll({ page: 1 })" />
            <select v-model="lastQuery.role" class="border rounded px-2 py-2">
              <option value="">All roles</option>
              <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
            </select>
            <select v-model="lastQuery.is_active" class="border rounded px-2 py-2">
              <option v-for="o in BOOL_OPTIONS" :key="o.label" :value="o.value">Active: {{ o.label }}</option>
            </select>
            <div class="flex items-center gap-2 md:col-span-2">
              <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="fetchAll({ page: 1 })">Apply</button>
              <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="fetchAll({ q:'', role:'', is_active:'', page: 1 }, true)">Reset</button>
            </div>
          </div>
        </div>

        <BaseTable :columns="columns" :data="dataWrap" :loading="userStore.isLoading" @query-change="handleQueryChange">
          <template #cell-is_active="{ value }">
            <Badge :text="value ? 'Active' : 'Inactive'" :tone="statusTone(value)" />
          </template>
          <template #cell-actions="{ row }">
            <button class="px-2 py-1 text-[12px] rounded bg-gray-100 hover:bg-gray-200 inline-flex items-center gap-1" @click="openManage(row)">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"><path :d="mdiAccountGroup" /></svg>
              Manage
            </button>
          </template>
        </BaseTable>
      </div>
    </SectionMain>
  </LayoutAuthenticated>

  <!-- Manage Membership Modal -->
  <div v-if="manageVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div class="bg-white p-4 md:p-5 rounded-2xl shadow-xl w-[820px] max-h-screen overflow-auto">
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-lg font-semibold">Manage Membership — @{{ selectedUser?.username }}</h2>
        <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="manageVisible = false">Close</button>
      </div>

      <div class="mb-3 p-3 rounded-xl border bg-white/70">
        <div class="text-sm font-medium mb-2">Add to a Club</div>
        <div class="flex items-center gap-2">
          <select v-model="addClubId" class="border rounded px-2.5 py-2 min-w-[260px]" :disabled="clubsLoading || !availableClubs.length">
            <option value="" disabled>Select a club…</option>
            <option v-for="c in availableClubs" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <button class="px-3 py-2 bg-blue-600 text-white rounded text-xs disabled:opacity-50" :disabled="!addClubId || clubsLoading" @click="addToClub">
            <svg class="w-3.5 h-3.5 inline-block mr-1" viewBox="0 0 24 24"><path :d="mdiPlus" /></svg>
            Add
          </button>
        </div>
        <div v-if="!availableClubs.length" class="text-xs text-gray-500 mt-1">No more clubs available to add.</div>
      </div>

      <div class="p-3 rounded-xl border bg-white/70">
        <div class="text-sm font-medium mb-2">Current Clubs</div>
        <div v-if="clubsLoading" class="text-xs text-gray-500">Loading…</div>
        <div v-else-if="!userClubsLocal.length" class="text-xs text-gray-500">This user is not a member of any club.</div>
        <ul v-else class="space-y-2">
          <li v-for="c in userClubsLocal" :key="c.id" class="rounded border px-2 py-2 bg-gray-50">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div class="truncate">
                <div class="text-sm font-medium">{{ c.name }}</div>
                <div class="text-[11px] text-gray-500">@{{ c.code || '' }}</div>
              </div>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="text-xs text-gray-600">Role</div>
                <select v-model="c.membership.role" class="border rounded px-2 py-1 text-sm" :disabled="clubsLoading || updating[c.id]" @change="onChangeRole(c.id)">
                  <option v-for="r in MEMBER_ROLES" :key="r" :value="r">{{ r }}</option>
                </select>
                <div class="text-xs text-gray-600 ml-2">Status</div>
                <select v-model="c.membership.status" class="border rounded px-2 py-1 text-sm" :disabled="clubsLoading || updating[c.id]" @change="onChangeStatus(c.id)">
                  <option v-for="s in MEMBER_STATUSES" :key="s" :value="s">{{ s }}</option>
                </select>
                <button class="px-2 py-1 text-[12px] rounded bg-rose-100 hover:bg-rose-200 inline-flex items-center gap-1" @click="removeFromClub(c.id)">
                  <svg class="w-3.5 h-3.5" viewBox="0 0 24 24"><path :d="mdiClose" /></svg>
                  Remove
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
  <ToasterComponent ref="toast" />
</template>
