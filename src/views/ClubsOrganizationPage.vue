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
import Badge from '@/components/commons/Badge.vue'

import ClubFormModal from '@/components/clubs/ClubFormModal.vue'
import ClubMembersModal from '@/components/clubs/ClubMembersModal.vue'
import ClubDocsModal from '@/components/clubs/ClubDocsModal.vue'
import ClubRowActions from '@/components/clubs/ClubRowActions.vue'
import ClubAttachmentsModal from '../components/clubs/ClubAttachmentsModal.vue'

import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'

import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiPlus,
    mdiFilter,
    mdiRefresh,
} from '@mdi/js'


const authStore = useAuthStore()
const clubStore = useClubStore()

/* list state + filters (mirrors ActivityDesignsPage patterns) */
const lastQuery = ref({
    page: 1,
    limit: 10,
    sort: 'established_at',
    order: 'DESC',
    q: '',
    name: '',
    code: '',
    category: '',
    is_active: '', // '', true, false
})

const showAdvanced = ref(false)
const hasAdvancedFilters = computed(() => Boolean(
    lastQuery.value.name ||
    lastQuery.value.code ||
    lastQuery.value.category
))
const activeFilterCount = computed(() => {
    const q = lastQuery.value
    let count = 0
    if (q.q) count += 1
    if (q.is_active !== '') count += 1
    if (q.name) count += 1
    if (q.code) count += 1
    if (q.category) count += 1
    return count
})

const fetchClubs = async (queryParams = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...queryParams };
    if (typeof lastQuery.value.officer === "undefined") {
        lastQuery.value.officer = true; // default ON (student officers see their clubs)
    }
    const params = { ...lastQuery.value };
    // Clean blanks and coerce is_active
    if (params.is_active === '') delete params.is_active; else params.is_active = params.is_active === true || params.is_active === 'true';
    ;['q','name','code','category'].forEach((k) => { if (params[k] === '' || params[k] == null) delete params[k] })
    await clubStore.fetchAll(params, force);
};
onMounted(() => fetchClubs({ page: 1, limit: 10 }))

watch(hasAdvancedFilters, (next) => {
    if (next) showAdvanced.value = true
}, { immediate: true })

const clubsData = computed(() => ({
    total: clubStore.clubs.total || 0,
    totalPages: clubStore.clubs.totalPages || 1,
    currentPage: clubStore.clubs.currentPage || 1,
    pageSize: clubStore.clubs.pageSize || 10,
    data: clubStore.clubs.data || [],
}))

/* attachments */
const attachVisible = ref(false)
const attachRow = ref(null)
const openAttachments = async (row) => {
    await clubStore.fetchById(row.id)
    attachRow.value = clubStore.selectedClub || row
    attachVisible.value = true
}

/* create / edit club */
const createVisible = ref(false)
const editVisible = ref(false)
const editInitial = ref(null)

const openCreate = () => {
    createVisible.value = true
}

const onCreateSubmit = async (payload) => {
    await clubStore.create(payload)
    createVisible.value = false
    await fetchClubs(lastQuery.value, true)
}

const openEdit = async (row) => {
    await clubStore.fetchById(row.id)
    const c = clubStore.selectedClub || row
    editInitial.value = {
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
        logo: c.logo || '',
        banner: c.banner || '',
    }
    editVisible.value = true
}

const onEditSubmit = async (payload) => {
    const { id, ...rest } = payload
    await clubStore.updateById(id, rest)
    editVisible.value = false
    await fetchClubs(lastQuery.value, true)
}

/* delete club */
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

/* members & docs modals */
const membersVisible = ref(false)
const docsVisible = ref(false)
const selectedClubId = ref(null)
const selectedClubName = ref('')

const viewMembers = (row) => {
    selectedClubId.value = row.id
    selectedClubName.value = row.name || ''
    membersVisible.value = true
}

const viewDocs = (row) => {
    selectedClubId.value = row.id
    selectedClubName.value = row.name || ''
    docsVisible.value = true
}

/* NEW: view single club in a new tab */
const viewClub = (row) => {
    if (!row?.id) return
    // using hash history per your router config
    window.open(`/#/club/${row.id}`, '_self')
}

/* filters */
const resetFilters = async () => {
    await fetchClubs({
        q: '',
        name: '',
        code: '',
        category: '',
        is_active: '',
        page: 1,
    })
    showAdvanced.value = false
}

/* table */
const mainColumns = [
    { key: 'name', label: 'Name', sortable: true, filterable: true },
    { key: 'code', label: 'Code', sortable: true, filterable: true },
    { key: 'category', label: 'Category', sortable: true, filterable: true },
    { key: 'is_active', label: 'Active', sortable: true, formatter: (v) => (v ? 'Yes' : 'No') },
    { key: 'actions', label: 'Actions', isAction: true, stickyRight: true },
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
                    <BaseButton v-if="authStore.user.role === 'admin'" :icon="mdiPlus" color="primary" label="Add Club"
                        @click="openCreate" />
                    <BaseButton :icon="mdiRefresh" color="info" label="Refresh"
                        @click="fetchClubs({ page: 1, limit: clubsData.pageSize }, true)" />
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
                            @click="fetchClubs({ page: 1 })">
                            Apply
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                    <div class="md:col-span-2">
                        <label class="block text-xs text-gray-500 mb-1">Search</label>
                        <input v-model="lastQuery.q" placeholder="Name, code, category"
                            class="border rounded px-2 py-2 w-full" @keyup.enter="fetchClubs({ page: 1 })" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Status</label>
                        <select v-model="lastQuery.is_active" class="border rounded px-2 py-2 w-full">
                            <option value="">All status</option>
                            <option :value="true">Active</option>
                            <option :value="false">Inactive</option>
                        </select>
                    </div>
                </div>

                <div v-show="showAdvanced" class="mt-3 grid grid-cols-1 md:grid-cols-6 gap-3 text-sm">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Name contains</label>
                        <input v-model="lastQuery.name" placeholder="Exact or partial"
                            class="border rounded px-2 py-2 w-full" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Code contains</label>
                        <input v-model="lastQuery.code" placeholder="e.g., ACM"
                            class="border rounded px-2 py-2 w-full" />
                    </div>

                    <div>
                        <label class="block text-xs text-gray-500 mb-1">Category contains</label>
                        <input v-model="lastQuery.category" placeholder="Academic, Arts, Sports"
                            class="border rounded px-2 py-2 w-full" />
                    </div>
                </div>
            </div>

            <div class="flex items-center justify-between mb-2 text-xs text-gray-600">
                <div>Showing <span class="font-medium text-gray-800">{{ clubsData.data.length }}</span> of {{ clubsData.total }} clubs</div>
                <div v-if="activeFilterCount" class="text-gray-500">Filtered view</div>
            </div>

            <BaseTable :columns="mainColumns" :data="clubsData" :loading="clubStore.isLoading" :show-action="false"
                @query-change="handleQueryChange">
                <template #cell-category="{ value }">
                    <Badge :text="value || '—'" tone="indigo" />
                </template>

                <template #cell-is_active="{ value }">
                    <Badge :text="value ? 'Active' : 'Inactive'" :tone="value ? 'emerald' : 'gray'" />
                </template>

                <template #cell-actions="{ row }">
                    <ClubRowActions :row="row"
                        :moderator="['admin','manager'].includes(String(authStore.user?.role || '').toLowerCase())"
                        @view="viewClub" @members="viewMembers" @docs="viewDocs" @edit="openEdit"
                        @delete="confirmDelete" @attachments="openAttachments" />
                </template>
            </BaseTable>

        </SectionMain>
    </LayoutAuthenticated>

    <!-- Club create/edit -->
    <ClubFormModal v-model="createVisible" mode="create" @submit="onCreateSubmit" />
    <ClubFormModal v-model="editVisible" mode="edit" :initial="editInitial || {}" @submit="onEditSubmit" />

    <!-- Members -->
    <ClubMembersModal v-model="membersVisible" :club-id="selectedClubId" :club-name="selectedClubName" />

    <!-- Docs -->
    <ClubDocsModal v-model="docsVisible" :club-id="selectedClubId" :club-name="selectedClubName" />

    <ClubAttachmentsModal v-model="attachVisible" :row="attachRow" />
</template>
