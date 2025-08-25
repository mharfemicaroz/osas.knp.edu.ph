<!-- src/views/ClubPageView.vue -->
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

import ClubFormModal from '@/components/clubs/ClubFormModal.vue'
import ClubMembersModal from '@/components/clubs/ClubMembersModal.vue'
import ClubDocsModal from '@/components/clubs/ClubDocsModal.vue'
import ClubRowActions from '@/components/clubs/ClubRowActions.vue'

import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'

import {
    mdiTableBorder,
    mdiAlertCircle,
    mdiPlus,
} from '@mdi/js'

const authStore = useAuthStore()
const clubStore = useClubStore()

/* list state */
const lastQuery = ref({ page: 1, limit: 10 })
const fetchClubs = async (queryParams = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...queryParams };
    if (typeof lastQuery.value.officer === "undefined") {
        lastQuery.value.officer = true; // default ON
    }
    await clubStore.fetchAll(lastQuery.value, force);
};
onMounted(() => fetchClubs({ page: 1, limit: 10 }))

const clubsData = computed(() => ({
    total: clubStore.clubs.total || 0,
    totalPages: clubStore.clubs.totalPages || 1,
    currentPage: clubStore.clubs.currentPage || 1,
    pageSize: clubStore.clubs.pageSize || 10,
    data: clubStore.clubs.data || [],
}))

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

/* table */
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
                    <BaseButton v-if="authStore.user.role === 'admin'" :icon="mdiPlus" color="primary" label="Add Club"
                        @click="openCreate" />
                    <BaseButton color="info" label="Refresh"
                        @click="fetchClubs({ page: 1, limit: clubsData.pageSize })" />
                </div>
            </SectionTitleLineWithButton>

            <BaseTable :columns="mainColumns" :data="clubsData" :loading="clubStore.isLoading"
                @query-change="handleQueryChange">
                <template #cell-category="{ value }">
                    <Badge :text="value || '—'" tone="indigo" />
                </template>

                <template #cell-is_active="{ value }">
                    <Badge :text="value ? 'Active' : 'Inactive'" :tone="value ? 'emerald' : 'gray'" />
                </template>

                <template #cell-actions="{ row }">
                    <ClubRowActions :row="row" @view="viewClub" @members="viewMembers" @docs="viewDocs" @edit="openEdit"
                        @delete="confirmDelete" />
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
</template>
