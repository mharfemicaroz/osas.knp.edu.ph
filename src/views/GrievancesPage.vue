<!-- src/views/GrievancesPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import GrievanceFormModal from '@/components/grievance/GrievanceFormModal.vue'

import { useAuthStore } from '@/stores/auth'
import { useGrievanceStore } from '@/stores/grievance'
import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'

import { mdiPlus, mdiFilter, mdiRefresh, mdiPencil, mdiTrashCan } from '@mdi/js'
import GrievanceRowActions from '@/components/grievance/GrievanceRowActions.vue'

const store = useGrievanceStore()
const authStore = useAuthStore()
const clubStore = useClubStore()
const userStore = useUserStore()

const role = computed(() => String(authStore.user?.role || '').toLowerCase())
const isModerator = computed(() => ['admin', 'manager'].includes(role.value))

const lastQuery = ref({ page: 1, limit: 10, q: '', status: '', club_id: '', filed_by_user_id: '' })

const STATUSES = ['submitted', 'in_review', 'resolved', 'rejected']
const statusTone = (s) => {
  switch (String(s || '').toLowerCase()) {
    case 'submitted': return 'amber'
    case 'in_review': return 'blue'
    case 'resolved': return 'emerald'
    case 'rejected': return 'red'
    default: return 'gray'
  }
}

const dataWrap = computed(() => ({
  total: store.items.total || 0,
  totalPages: store.items.totalPages || 1,
  currentPage: store.items.currentPage || 1,
  pageSize: store.items.pageSize || 10,
  data: store.items.data || [],
}))

const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
  ;['q', 'status', 'club_id', 'filed_by_user_id'].forEach((k) => {
    if (params[k] === '' || params[k] == null) delete params[k]
  })
  await store.fetchAll(params, force)
}

onMounted(async () => {
  await Promise.all([
    fetchAll({ page: 1, limit: 10 }),
    clubStore.fetchAll({ page: 1, limit: 200, officer: true }, true),
    userStore.fetchAll({ page: 1, limit: 200 }, true),
  ])
})

const mainColumns = [
  { key: 'reference_code', label: 'Ref Code', sortable: true, width: 140 },
  { key: 'title', label: 'Title', sortable: true, minWidth: 220 },
  { key: 'club_id', label: 'Club', sortable: false },
  { key: 'filed_by_user_id', label: 'Filed By', sortable: false },
  { key: 'assigned_to_user_id', label: 'Assignee', sortable: false },
  { key: 'status', label: 'Status', sortable: true, width: 120 },
  { key: 'created_at', label: 'Created', sortable: true, width: 160 },
  { key: 'updated_at', label: 'Updated', sortable: true, width: 160 },
  { key: 'resolved_at', label: 'Resolved', sortable: true, width: 160 },
]

const createVisible = ref(false)
const editVisible = ref(false)
const editInitial = ref(null)

const openCreate = () => { createVisible.value = true }

const openEdit = async (row) => {
  await store.fetchById(row.id)
  const r = store.selected || row
  editInitial.value = {
    id: r.id,
    title: r.title || '',
    description: r.description || '',
    club_id: r.club_id || '',
    filed_by_user_id: r.filed_by_user_id || '',
    assigned_to_user_id: r.assigned_to_user_id || '',
    status: r.status || 'submitted',
    resolution_notes: r.resolution_notes || '',
  }
  editVisible.value = true
}

const onCreateSubmit = async (payload) => {
  await store.create(payload)
  createVisible.value = false
  await fetchAll({}, true)
}

const onEditSubmit = async (payload) => {
  const { id, ...rest } = payload
  await store.updateById(id, rest)
  editVisible.value = false
  await fetchAll({}, true)
}

const markInReview = async (row) => {
  if (!isModerator.value) return
  const res = await Swal.fire({
    title: 'Mark as In Review?',
    text: 'This will move the grievance into review.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes',
    cancelButtonText: 'Cancel',
  })
  if (!res.isConfirmed) return
  await store.updateById(row.id, { status: 'in_review' })
  await fetchAll({}, true)
}

const resolveRow = async (row) => {
  if (!isModerator.value) return
  const res = await Swal.fire({
    title: 'Resolve grievance?',
    text: 'This will mark the grievance as resolved.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Resolve',
    cancelButtonText: 'Cancel',
  })
  if (!res.isConfirmed) return
  await store.updateById(row.id, { status: 'resolved' })
  await fetchAll({}, true)
}

const rejectRow = async (row) => {
  if (!isModerator.value) return
  const res = await Swal.fire({
    title: 'Reject grievance?',
    text: 'This will mark the grievance as rejected.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Reject',
    cancelButtonText: 'Cancel',
  })
  if (!res.isConfirmed) return
  await store.updateById(row.id, { status: 'rejected' })
  await fetchAll({}, true)
}

const confirmDelete = async (row) => {
  if (!row?.id) return
  const result = await Swal.fire({
    title: `Delete grievance?`,
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
    await Swal.fire('Deleted', 'The grievance has been deleted.', 'success')
  }
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiFilter" title="Grievances" main>
        <BaseButton :icon="mdiRefresh" small @click="fetchAll({}, true)" />
        <BaseButton v-if="true" :icon="mdiPlus" color="contrast" label="New" @click="openCreate" />
      </SectionTitleLineWithButton>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
        <input v-model="lastQuery.q" class="border rounded px-2 py-1.5 text-sm" placeholder="Search…"
               @keyup.enter="fetchAll({ page: 1 })" />
        <select v-model="lastQuery.status" class="border rounded px-2 py-1.5 text-sm" @change="fetchAll({ page: 1 })">
          <option value="">All statuses</option>
          <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-model="lastQuery.club_id" class="border rounded px-2 py-1.5 text-sm" @change="fetchAll({ page: 1 })">
          <option value="">All clubs</option>
          <option v-for="c in (clubStore.clubs.data || [])" :key="c.id" :value="c.id">{{ c.name }}</option>
        </select>
        <select v-model="lastQuery.filed_by_user_id" class="border rounded px-2 py-1.5 text-sm" @change="fetchAll({ page: 1 })">
          <option value="">Any filer</option>
          <option v-for="u in (userStore.users.data || [])" :key="u.id" :value="u.id">{{ u.first_name }} {{ u.last_name }}</option>
        </select>
      </div>

      <NotificationBar v-if="store.error" color="danger" :icon="mdiFilter">{{ store.error }}</NotificationBar>

      <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading" @query-change="fetchAll">
        <template #cell-club_id="{ row }">
          <span>{{ row.club?.name || (clubStore.clubs.data || []).find(c => c.id === row.club_id)?.name || '' }}</span>
        </template>
        <template #cell-filed_by_user_id="{ row }">
          <span>{{ row.filed_by?.first_name || '' }} {{ row.filed_by?.last_name || '' }}</span>
        </template>
        <template #cell-assigned_to_user_id="{ row }">
          <span>{{ row.assignee ? (row.assignee.first_name + ' ' + row.assignee.last_name) : '—' }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :text="row.status" :tone="statusTone(row.status)" />
        </template>
        <template #cell-created_at="{ row }">
          <span>{{ row.created_at ? new Date(row.created_at).toLocaleString() : '—' }}</span>
        </template>
        <template #cell-updated_at="{ row }">
          <span>{{ row.updated_at ? new Date(row.updated_at).toLocaleString() : '—' }}</span>
        </template>
        <template #cell-resolved_at="{ row }">
          <span>{{ row.resolved_at ? new Date(row.resolved_at).toLocaleString() : '—' }}</span>
        </template>
        

        <template #cell-actions="{ row }">
          <div class="flex justify-end">
            <GrievanceRowActions
              :row="row"
              :moderator="isModerator"
              @attachments="openEdit(row)"
              @view="openEdit(row)"
              @edit="openEdit(row)"
              @markInReview="markInReview(row)"
              @resolve="resolveRow(row)"
              @reject="rejectRow(row)"
              @delete="confirmDelete(row)"
            />
          </div>
        </template>

        <template #footer>
          <div />
        </template>
      </BaseTable>

      <!-- Create -->
      <GrievanceFormModal v-model="createVisible" mode="create" :initial="{}" @submit="onCreateSubmit" />
      <!-- Edit -->
      <GrievanceFormModal v-model="editVisible" mode="edit" :initial="editInitial" @submit="onEditSubmit" />
    </SectionMain>
  </LayoutAuthenticated>
  
</template>
