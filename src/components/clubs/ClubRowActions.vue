<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import {
    mdiAccountMultiple,
    mdiFileDocument,
    mdiPencil,
    mdiTrashCan,
    mdiDotsHorizontal,
    mdiEye, // 👈 added
} from '@mdi/js'

const props = defineProps({
    row: { type: Object, required: true },
})
const emit = defineEmits(['members', 'docs', 'edit', 'delete', 'view']) // 👈 added "view"

const open = ref(false)
const menuRef = ref(null)
const btnRef = ref(null)

const onDocumentClick = (e) => {
    if (!open.value) return
    const m = menuRef.value
    const b = btnRef.value
    if (m && !m.contains(e.target) && b && !b.contains(e.target)) open.value = false
}

onMounted(() => {
    document.addEventListener('click', onDocumentClick)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
})
</script>

<template>
    <div class="flex items-center gap-1 md:gap-2">
        <!-- new "View" action -->
        <IconifyButton :icon-path="mdiEye" color="text-gray-700" label="View" tooltip="View Club" size="sm"
            @click="$emit('view', row)" />

        <!-- primary actions -->
        <IconifyButton :icon-path="mdiAccountMultiple" color="text-blue-600" label="Members" tooltip="View Members"
            size="sm" @click="$emit('members', row)" />
        <IconifyButton :icon-path="mdiFileDocument" color="text-indigo-600" label="Docs" tooltip="View Documents"
            size="sm" @click="$emit('docs', row)" />
        <IconifyButton :icon-path="mdiPencil" color="text-emerald-600" label="Edit" tooltip="Edit Club" size="sm"
            @click="$emit('edit', row)" />
        <IconifyButton :icon-path="mdiTrashCan" color="text-red-600" label="Delete" tooltip="Delete Club" size="sm"
            @click="$emit('delete', row)" />

        <!-- dropdown menu -->
        <div class="relative md:hidden" ref="btnRef">
            <button
                class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
                :aria-expanded="open" aria-haspopup="menu" title="More" @click="open = !open">
                <svg style="width: 18px; height: 18px" viewBox="0 0 24 24" aria-hidden="true">
                    <path :d="mdiDotsHorizontal" />
                </svg>
            </button>

            <div v-if="open" ref="menuRef" role="menu"
                class="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border bg-white shadow-lg">
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('view', row)">
                    View Club
                </button>
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('members', row)">
                    View Members
                </button>
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('docs', row)">
                    View Documents
                </button>
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('edit', row)">
                    Edit Club
                </button>
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    @click="open = false; $emit('delete', row)">
                    Delete
                </button>
            </div>
        </div>
    </div>
</template>
