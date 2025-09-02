<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import {
  mdiPaperclip,
  mdiSend,
  mdiCheckDecagram,
  mdiCloseOctagon,
  mdiPencil,
  mdiEye,
  mdiTrashCan,
  mdiDotsHorizontal,
  mdiCancel,
  mdiPrinter,
  mdiEmailOutline,
} from '@mdi/js'

const props = defineProps({
  row: { type: Object, required: true },
  moderator: { type: Boolean, default: false },
})

const emit = defineEmits([
  'attachments',
  'submit',
  'approve',
  'reject',
  'edit',
  'delete',
  'view',
  'cancel',
  'print',
  'email',
])

const statusSafe = computed(() => String(props.row?.status || '').toLowerCase())
const canSubmit = computed(() => statusSafe.value === 'draft')
const canEdit = computed(() => statusSafe.value === 'draft')
const canView = computed(() => statusSafe.value !== 'draft')
const canModerate = computed(() => props.moderator && statusSafe.value === 'pending')
const canCancel = computed(() => props.moderator && statusSafe.value === 'approved')
const canPrint = computed(() => statusSafe.value === 'approved')
// Email allowed only for admin/manager (moderator) and when approved
const canEmail = computed(() => props.moderator && statusSafe.value === 'approved')

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
    <IconifyButton :icon-path="mdiPaperclip" color="text-indigo-600" label="Attachments" tooltip="Attachments" size="sm"
      @click="$emit('attachments', row)" />

    <!-- View appears only when NOT draft -->
    <IconifyButton v-if="canView" :icon-path="mdiEye" color="text-gray-700" label="View" tooltip="View (read-only)"
      size="sm" @click="$emit('view', row)" />

    <!-- Only in DRAFT -->
    <IconifyButton v-if="canSubmit" :icon-path="mdiSend" color="text-blue-600" label="Submit" tooltip="Submit" size="sm"
      @click="$emit('submit', row)" />
    <IconifyButton v-if="canEdit" :icon-path="mdiPencil" color="text-amber-600" label="Edit" tooltip="Edit" size="sm"
      @click="$emit('edit', row)" />

    <!-- Approve/Reject (pending only) -->
    <IconifyButton v-if="canModerate" :icon-path="mdiCheckDecagram" color="text-emerald-600" label="Approve"
      tooltip="Approve" size="sm" @click="$emit('approve', row)" />
    <IconifyButton v-if="canModerate" :icon-path="mdiCloseOctagon" color="text-rose-600" label="Reject" tooltip="Reject"
      size="sm" @click="$emit('reject', row)" />

    <!-- Cancel, Print & Email (approved only) -->
    <IconifyButton v-if="canCancel" :icon-path="mdiCancel" color="text-orange-600" label="Cancel" tooltip="Cancel"
      size="sm" @click="$emit('cancel', row)" />
    <IconifyButton v-if="canPrint" :icon-path="mdiPrinter" color="text-slate-700" label="Print" tooltip="Print"
      size="sm" @click="$emit('print', row)" />
    <IconifyButton v-if="canEmail" :icon-path="mdiEmailOutline" color="text-emerald-700" label="Email"
      tooltip="Send Email" size="sm" @click="$emit('email', row)" />

    <!-- Delete (moderators) -->
    <IconifyButton v-if="canModerate" :icon-path="mdiTrashCan" color="text-red-600" label="Delete" tooltip="Delete"
      size="sm" @click="$emit('delete', row)" />

    <!-- dropdown menu (mobile) -->
    <div class="relative md:hidden" ref="btnRef">
      <button
        class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
        :aria-expanded="open" aria-haspopup="menu" title="More" @click="open = !open">
        <svg style="width: 18px; height: 18px" viewBox="0 0 24 24" aria-hidden="true">
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
        <button v-if="canPrint" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="open = false; $emit('print', row)">Print</button>
        <button v-if="canEmail" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="open = false; $emit('email', row)">Send Email</button>

        <button v-if="canModerate" role="menuitem"
          class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          @click="open = false; $emit('delete', row)">Delete</button>
      </div>
    </div>
  </div>
</template>
