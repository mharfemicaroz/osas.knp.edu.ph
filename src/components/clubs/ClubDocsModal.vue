<!-- src/components/docs/ClubDocsModal.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import Swal from 'sweetalert2'
import { useClubDocStore } from '@/stores/clubDoc'
import DocFormModal from '@/components/clubs/DocFormModal.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    clubId: { type: [Number, String], required: true },
    clubName: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue'])

const docStore = useClubDocStore()

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const docsRaw = ref([])
const page = ref(1)
const pageSize = 10
const docSearch = ref('')
const docTypeView = ref('all') // 'all' | 'cbl' | 'resolution' | 'minute'
const docStatusView = ref('all') // 'all' | 'draft' | 'published' | 'archived'

const DOC_TYPE_ORDER = ['cbl', 'resolution', 'minute']
const DOC_STATUS_OPTIONS = ['draft', 'published', 'archived']
const DOC_TYPE_OPTIONS = ['cbl', 'resolution', 'minute']

const normalizeDocType = (t) => (DOC_TYPE_OPTIONS.includes((t || '').toLowerCase()) ? (t || '').toLowerCase() : 'cbl')
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
    let base = docsRaw.value || []
    if (docTypeView.value !== 'all') base = base.filter((d) => (d.type || '').toLowerCase() === docTypeView.value)
    if (docStatusView.value !== 'all') base = base.filter((d) => (d.status || '').toLowerCase() === docStatusView.value)
    if (q) base = base.filter((d) => matchesDocQuery(d, q))
    return base.slice().sort((a, b) => {
        const ta = docTypeRank(a.type)
        const tb = docTypeRank(b.type)
        if (ta !== tb) return ta - tb
        const aDateStr = a.doc_date || a.created_at
        const bDateStr = b.doc_date || b.created_at
        const aTime = aDateStr ? new Date(aDateStr).getTime() : 0
        const bTime = bDateStr ? new Date(bDateStr).getTime() : 0
        return bTime - aTime
    })
})

const cardData = computed(() => {
    const total = filteredSortedDocs.value.length
    const totalPages = Math.ceil(Math.max(total, 1) / pageSize)
    const current = Math.min(page.value, totalPages || 1)
    const startIndex = (current - 1) * pageSize
    const pageData = filteredSortedDocs.value.slice(startIndex, startIndex + pageSize)
    return { total, totalPages, currentPage: current, pageSize, data: pageData }
})

watch([docSearch, docTypeView, docStatusView], () => (page.value = 1))

const load = async () => {
    docSearch.value = ''
    docTypeView.value = 'all'
    docStatusView.value = 'all'
    page.value = 1
    await docStore.fetchByClub(props.clubId, { page: 1, limit: 200 })
    docsRaw.value = Array.isArray(docStore.docs?.data) ? docStore.docs.data : []
}

// create / edit modals
const createVisible = ref(false)
const editVisible = ref(false)
const editInitial = ref(null)

const openCreate = () => {
    createVisible.value = true
}
const onCreateSubmit = async (payload) => {
    const created = await docStore.create({ ...payload, club_id: props.clubId })
    docsRaw.value.unshift(created)
    createVisible.value = false
}
const onCreateClosed = () => {
    // nothing extra
}

const openEdit = (doc) => {
    editInitial.value = {
        id: doc.id,
        type: doc.type || 'cbl',
        title: doc.title || '',
        content: doc.content || '',
        status: doc.status || 'draft',
        doc_date: doc.doc_date ? String(doc.doc_date).slice(0, 10) : '',
    }
    editVisible.value = true
}
const onEditSubmit = async (payload) => {
    const { id, ...rest } = payload
    const updated = await docStore.updateById(id, { ...rest })
    const idx = docsRaw.value.findIndex((d) => d.id === id)
    if (idx !== -1) docsRaw.value[idx] = updated
    editVisible.value = false
}
const onEditClosed = () => {
    // nothing extra
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
        <div class="bg-white p-4 rounded shadow-lg w-[900px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between">
                <h2 class="text-lg font-semibold">Club Documents — <span class="text-gray-600">{{ clubName }}</span>
                </h2>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1 text-xs bg-blue-600 text-white rounded" @click="openCreate">+ Add
                        Document</button>
                    <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
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
                    Showing {{ cardData.total }} document(s). Ordered by type → date.
                </div>
            </div>

            <!-- List -->
            <div class="space-y-2 mt-4 max-h-[60vh] overflow-y-auto pr-2 -mr-2">
                <div v-for="doc in cardData.data" :key="doc.id"
                    class="border rounded p-3 bg-gray-50 flex items-start justify-between gap-4">
                    <div class="text-sm">
                        <div class="flex flex-wrap items-center gap-2">
                            <span class="font-semibold">{{ doc.title }}</span>
                            <span class="px-2 py-[2px] text-[11px] rounded bg-indigo-100 text-indigo-700 uppercase">{{
                                doc.type }}</span>
                            <span class="px-2 py-[2px] text-[11px] rounded" :class="{
                                'bg-yellow-100 text-yellow-700': doc.status === 'draft',
                                'bg-emerald-100 text-emerald-700': doc.status === 'published',
                                'bg-gray-200 text-gray-700': doc.status === 'archived',
                            }">
                                {{ doc.status }}
                            </span>
                            <span class="text-xs text-gray-600">
                                {{
                                    doc.doc_date
                                        ? new Date(doc.doc_date).toLocaleDateString()
                                        : (doc.created_at ? new Date(doc.created_at).toLocaleDateString() : '—')
                                }}
                            </span>
                        </div>
                    </div>
                    <div class="shrink-0 flex items-center gap-2">
                        <button class="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded text-xs"
                            @click="openEdit(doc)">Edit</button>
                        <button class="px-2 py-1 bg-red-600 text-white rounded text-xs"
                            @click="deleteDoc(doc)">Delete</button>
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

        <!-- Doc forms -->
        <DocFormModal v-model="createVisible" mode="create"
            :initial="{ type: 'cbl', title: '', content: '', status: 'draft', doc_date: '' }" @submit="onCreateSubmit"
            @closed="onCreateClosed" />
        <DocFormModal v-model="editVisible" mode="edit"
            :initial="editInitial || { id: null, type: 'cbl', title: '', content: '', status: 'draft', doc_date: '' }"
            @submit="onEditSubmit" @closed="onEditClosed" />
    </div>
</template>
