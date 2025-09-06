<!-- src/components/annualPlan/AnnualPlanRowActions.vue -->
<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import {
    mdiPaperclip, mdiSend, mdiCheckDecagram, mdiCloseOctagon,
    mdiPencil, mdiEye, mdiTrashCan, mdiDotsHorizontal, mdiCancel
} from '@mdi/js'

const props = defineProps({
    row: { type: Object, required: true },
    moderator: { type: Boolean, default: false },
    busy: { type: Boolean, default: false },
})
const emit = defineEmits(['attachments', 'submit', 'approve', 'reject', 'edit', 'delete', 'view', 'cancel'])

const statusSafe = computed(() => String(props.row?.status || '').toLowerCase())
const canSubmit = computed(() => statusSafe.value === 'draft')
const canEdit = computed(() => statusSafe.value === 'draft')
const canView = computed(() => statusSafe.value !== 'draft')
const canModerate = computed(() => props.moderator && statusSafe.value === 'pending')
// Cancel and Delete must be admin/manager only
const canCancel = computed(() => props.moderator && statusSafe.value === 'approved')
const canDelete = computed(() => props.moderator)

const open = ref(false)
const menuRef = ref(null)
const btnRef = ref(null)
const onDocumentClick = (e) => {
    if (!open.value) return
    const m = menuRef.value, b = btnRef.value
    if (m && !m.contains(e.target) && b && !b.contains(e.target)) open.value = false
}
onMounted(() => document.addEventListener('click', onDocumentClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocumentClick))
</script>

<template>
    <div class="flex items-center gap-1 md:gap-2">
        <IconifyButton :icon-path="mdiPaperclip" color="text-indigo-600" label="Attachments" tooltip="Attachments"
            size="sm" :disabled="busy" @click="$emit('attachments', row)" />

        <IconifyButton v-if="canView" :icon-path="mdiEye" color="text-gray-700" label="View" tooltip="View (read-only)"
            size="sm" :disabled="busy" @click="$emit('view', row)" />

        <IconifyButton v-if="canSubmit" :icon-path="mdiSend" color="text-blue-600" label="Submit" tooltip="Submit"
            size="sm" :disabled="busy" @click="$emit('submit', row)" />
        <IconifyButton v-if="canEdit" :icon-path="mdiPencil" color="text-amber-600" label="Edit" tooltip="Edit"
            size="sm" :disabled="busy" @click="$emit('edit', row)" />

        <IconifyButton v-if="canModerate" :icon-path="mdiCheckDecagram" color="text-emerald-600" label="Approve"
            tooltip="Approve" size="sm" :disabled="busy" @click="$emit('approve', row)" />
        <IconifyButton v-if="canModerate" :icon-path="mdiCloseOctagon" color="text-rose-600" label="Reject"
            tooltip="Reject" size="sm" :disabled="busy" @click="$emit('reject', row)" />

        <IconifyButton v-if="canCancel" :icon-path="mdiCancel" color="text-orange-600" label="Cancel"
            tooltip="Cancel plan" size="sm" :disabled="busy" @click="$emit('cancel', row)" />

        <IconifyButton v-if="canDelete" :icon-path="mdiTrashCan" color="text-red-600" label="Delete" tooltip="Delete" size="sm"
            :disabled="busy" @click="$emit('delete', row)" />

        <!-- Mobile menu -->
        <div class="relative md:hidden" ref="btnRef">
            <button class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100"
                :aria-expanded="open" aria-haspopup="menu" title="More" @click="open = !open">
                <svg style="width: 18px; height: 18px" viewBox="0 0 24 24">
                    <path :d="mdiDotsHorizontal" />
                </svg>
            </button>
            <div v-if="open" ref="menuRef" role="menu"
                class="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border bg-white shadow-lg">
                <button role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('attachments', row)">Attachments</button>
                <button v-if="canView" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('view', row)">View (read-only)</button>
                <button v-if="canSubmit" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('submit', row)">Submit</button>
                <button v-if="canEdit" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('edit', row)">Edit</button>
                <button v-if="canModerate" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('approve', row)">Approve</button>
                <button v-if="canModerate" role="menuitem"
                    class="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
                    @click="open = false; $emit('reject', row)">Reject</button>
                <button v-if="canCancel" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    @click="open = false; $emit('cancel', row)">Cancel</button>
                <button v-if="canDelete" role="menuitem" class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    @click="open = false; $emit('delete', row)">Delete</button>
            </div>
        </div>
    </div>
</template>
