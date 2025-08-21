<!-- src/components/BaseTable.vue -->
<template>
    <div ref="tableContainer" class="table-container relative rounded-lg border border-gray-200 shadow-sm bg-white">
        <table class="w-full border-collapse bg-white min-w-max">
            <thead class="bg-white text-gray-700 text-sm border-b">
                <tr>
                    <!-- Checkbox column -->
                    <th v-if="checkable" class="p-2 w-10 text-center">
                        <TableCheckboxCell :modelValue="allSelected" @update:modelValue="toggleSelectAll" />
                    </th>

                    <!-- Table columns -->
                    <th v-for="col in columns" :key="col.key" class="px-4 py-2 text-left whitespace-nowrap">
                        <div class="flex items-center justify-between">
                            <span class="font-medium">{{ col.label }}</span>
                            <div class="flex items-center gap-2">
                                <BaseButton v-if="col.sortable" :icon="internalSortKey === col.key
                                    ? internalSortOrder === 'asc'
                                        ? mdiChevronUp
                                        : mdiChevronDown
                                    : mdiChevronDown
                                    " small @click="toggleSort(col.key)" />
                                <BaseButton v-if="col.filterable" :icon="mdiMagnify" small
                                    @click="toggleFilterDropdown(col.key)" />
                            </div>
                        </div>
                        <transition name="fade">
                            <div v-if="showFilters[col.key]" class="mt-1 p-2 border rounded bg-white shadow-md">
                                <input v-model="internalFilters[col.key]"
                                    class="w-full px-2 py-1 text-xs border rounded" placeholder="Filter..."
                                    @input="setFilter(col.key, $event.target.value)" />
                            </div>
                        </transition>
                    </th>

                    <!-- Action column (conditionally shown) -->
                    <th v-if="showAction" class="px-2 py-1 whitespace-nowrap text-right w-1"></th>
                </tr>
            </thead>

            <tbody>
                <!-- Data rows -->
                <tr v-for="item in safeData.data" :key="item.id" class="border-t text-sm hover:bg-gray-50">
                    <!-- Checkbox cell -->
                    <td v-if="checkable" class="p-2 w-10 text-center" data-label="Select">
                        <TableCheckboxCell :modelValue="selectedRows.has(item.id)"
                            @update:modelValue="toggleSelectRow($event, item)" />
                    </td>

                    <!-- Data cells -->
                    <td v-for="col in columns" :key="col.key" class="px-4 py-2 whitespace-nowrap"
                        :data-label="col.label">
                        <span v-if="col.formatter">
                            {{ col.formatter(item[col.key], item) }}
                        </span>
                        <span v-else>
                            {{ item[col.key] || '-' }}
                        </span>
                    </td>

                    <!-- Action cell with slot integration (conditionally shown) -->
                    <td v-if="showAction" class="px-4 py-2 whitespace-nowrap" data-label="Action">
                        <slot name="cell-actions" :row="item">
                            <BaseButtons>
                                <BaseButton :icon="mdiPencil" small @click="editRow(item)" />
                            </BaseButtons>
                        </slot>
                    </td>
                </tr>

                <!-- Aggregate Totals Row (only rendered if at least one column is set with aggregate: true) -->
                <tr v-if="hasAggregates" class="border-t text-sm font-semibold bg-gray-50">
                    <!-- If checkable, insert an empty cell for the checkbox column -->
                    <td v-if="checkable" class="p-2 w-10"></td>

                    <!-- For each column, show the aggregated value if enabled; otherwise empty -->
                    <td v-for="col in columns" :key="col.key" class="px-4 py-2 whitespace-nowrap"
                        :data-label="col.label">
                        <span v-if="col.aggregate">{{ aggregates[col.key] }}</span>
                    </td>

                    <!-- Empty cell for action column -->
                    <td v-if="showAction" class="px-4 py-2"></td>
                </tr>
            </tbody>
        </table>

        <!-- Pagination Footer -->
        <div class="p-3 border-t bg-white text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center">
            <span class="mb-2 sm:mb-0">
                {{ (internalPage - 1) * internalPageSize + 1 }} -
                {{ Math.min(internalPage * internalPageSize, safeData.total) }} of
                {{ safeData.total }} items
            </span>
            <div class="flex flex-wrap items-center gap-2">
                <BaseButton :icon="mdiChevronLeft" small :disabled="internalPage === 1"
                    @click="goToPage(internalPage - 1)" />
                <BaseButton v-for="(page, index) in paginationPages" :key="index"
                    :active="page !== '...' && page === internalPage" :label="page" small :disabled="page === '...'"
                    @click="page !== '...' && goToPage(page)" />
                <BaseButton :icon="mdiChevronRight" small :disabled="internalPage === totalPages"
                    @click="goToPage(internalPage + 1)" />
                <select class="border p-1 text-sm rounded" @change="updatePageSize" :value="internalPageSize">
                    <option value="5">5 / page</option>
                    <option value="10">10 / page</option>
                    <option value="20">20 / page</option>
                </select>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount, defineProps, defineEmits } from 'vue'
import { useLoading } from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

import TableCheckboxCell from '@/components/commons/TableCheckboxCell.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseButtons from '@/components/commons/BaseButtons.vue'

import {
    mdiPencil,
    mdiChevronUp,
    mdiChevronDown,
    mdiMagnify,
    mdiChevronLeft,
    mdiChevronRight
} from '@mdi/js'

// Props
const props = defineProps({
    columns: Array,
    data: {
        type: Object,
        default: () => ({
            total: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: 10,
            data: []
        })
    },
    checkable: Boolean,
    loading: {
        type: Boolean,
        default: false
    },
    showAction: {
        type: Boolean,
        default: true
    }
})

// Emits
const emit = defineEmits(['query-change', 'selected', 'sort', 'filter', 'edit'])

// Reference to table container
const tableContainer = ref(null)

// Set up loading overlay
const $loading = useLoading()
const loaderInstance = ref(null)

watch(
    () => props.loading,
    (newVal) => {
        if (newVal) {
            if (!loaderInstance.value) {
                loaderInstance.value = $loading.show({
                    container: tableContainer.value,
                    canCancel: false,
                    isFullPage: false,
                    color: '#3b82f6',
                    opacity: 0.8
                })
            }
        } else {
            if (loaderInstance.value) {
                loaderInstance.value.hide()
                loaderInstance.value = null
            }
        }
    },
    { immediate: true }
)

onBeforeUnmount(() => {
    if (loaderInstance.value) {
        loaderInstance.value.hide()
        loaderInstance.value = null
    }
})

// --- Table Logic ---
const internalPage = ref(props.data.currentPage || 1)
const internalPageSize = ref(props.data.pageSize || 10)

const internalSortKey = ref(null)
const internalSortOrder = ref('desc')
const internalFilters = ref({})

const showFilters = ref({})

const selectedRows = ref(new Set())

watch(
    () => props.data.currentPage,
    (newVal) => {
        internalPage.value = newVal || 1
    }
)
watch(
    () => props.data.pageSize,
    (newVal) => {
        internalPageSize.value = newVal || 10
    }
)

const safeData = computed(
    () =>
        props.data || {
            total: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: 10,
            data: []
        }
)

// If you plan to support client-side filtering in addition to server-side,
// you may use the following computed property. (Note that the table rows
// still use safeData.data, so if filtering is server-side then safeData.data
// is already filtered.)
const filteredItems = computed(() => {
    return safeData.value.data.filter((item) => {
        return Object.keys(internalFilters.value).every((key) => {
            if (!internalFilters.value[key]) return true
            return item[key]?.toString().toLowerCase().includes(internalFilters.value[key].toLowerCase())
        })
    })
})

const allSelected = computed(
    () => selectedRows.value.size === filteredItems.value.length && filteredItems.value.length > 0
)

const totalPages = computed(() => {
    return safeData.value.totalPages || Math.ceil(safeData.value.total / internalPageSize.value) || 1
})

const paginationPages = computed(() => {
    const total = totalPages.value
    const current = internalPage.value
    const delta = 2
    const pages = []

    if (total <= 7) {
        for (let i = 1; i <= total; i++) {
            pages.push(i)
        }
    } else {
        pages.push(1)
        let left = Math.max(2, current - delta)
        let right = Math.min(total - 1, current + delta)
        if (left > 2) {
            pages.push('...')
        }
        for (let i = left; i <= right; i++) {
            pages.push(i)
        }
        if (right < total - 1) {
            pages.push('...')
        }
        pages.push(total)
    }
    return pages
})

const updateQuery = () => {
    emit('query-change', {
        page: internalPage.value,
        limit: internalPageSize.value,
        sort: internalSortKey.value,
        order: internalSortOrder.value,
        filters: internalFilters.value
    })
}

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        internalPage.value = page
        updateQuery()
    }
}

const updatePageSize = (event) => {
    internalPageSize.value = Number(event.target.value)
    internalPage.value = 1
    updateQuery()
}

const toggleSort = (key) => {
    if (internalSortKey.value === key) {
        internalSortOrder.value = internalSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        internalSortKey.value = key
        internalSortOrder.value = 'desc'
    }
    emit('sort', { key: internalSortKey.value, order: internalSortOrder.value })
    updateQuery()
}

const toggleFilterDropdown = (key) => {
    showFilters.value[key] = !showFilters.value[key]
}

const setFilter = (key, value) => {
    internalFilters.value[key] = value
    emit('filter', internalFilters.value)
    updateQuery()
}

const toggleSelectAll = (checked) => {
    if (checked) {
        selectedRows.value = new Set(filteredItems.value.map((item) => item.id))
    } else {
        selectedRows.value.clear()
    }
    emit('selected', Array.from(selectedRows.value))
}

const toggleSelectRow = (checked, row) => {
    if (checked) {
        selectedRows.value.add(row.id)
    } else {
        selectedRows.value.delete(row.id)
    }
    emit('selected', Array.from(selectedRows.value))
}

const editRow = (item) => {
    emit('edit', item)
}

// --- Aggregation Logic ---
// Compute the aggregates based on the currently displayed data (safeData.data).
const aggregates = computed(() => {
    const agg = {}
    // Loop through each column that has aggregate set to true
    props.columns.forEach((col) => {
        if (col.aggregate) {
            let sum = 0
            safeData.value.data.forEach((item) => {
                const value = parseFloat(item[col.key])
                if (!isNaN(value)) {
                    sum += value
                }
            })
            agg[col.key] = sum
        }
    })
    return agg
})

// Determine if at least one column has aggregation enabled.
const hasAggregates = computed(() => {
    return props.columns.some((col) => col.aggregate)
})
</script>

<style scoped>
.table-container {
    overflow-x: auto;
    white-space: nowrap;
}

th,
td {
    white-space: nowrap;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@media (max-width: 640px) {
    thead {
        display: none;
    }

    table,
    tbody,
    tr,
    td {
        display: block;
        width: 100%;
    }

    tr {
        margin-bottom: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: hidden;
    }

    td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #e5e7eb;
        position: relative;
        text-align: left;
    }

    td:last-child {
        border-bottom: 0;
    }

    td::before {
        content: attr(data-label);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        color: #6b7280;
        flex-basis: 40%;
    }

    td>*:first-child {
        flex-basis: 60%;
    }
}
</style>
