<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import {
  mdiPaperclip,
  mdiPencil,
  mdiEye,
  mdiTrashCan,
  mdiDotsHorizontal,
  mdiProgressClock,
  mdiCheckDecagram,
  mdiCloseOctagon,
} from '@mdi/js'

const props = defineProps({
  row: { type: Object, required: true },
  moderator: { type: Boolean, default: false },
})

const emit = defineEmits([
  'attachments',
  'edit',
  'view',
  'markInReview',
  'resolve',
  'reject',
  'delete',
])

const statusSafe = computed(() => String(props.row?.status || '').toLowerCase())
const canEdit = computed(() => statusSafe.value === 'submitted')
const canView = computed(() => true)
const canMarkInReview = computed(() => props.moderator && statusSafe.value === 'submitted')
const canResolve = computed(() => props.moderator && (statusSafe.value === 'in_review'))
const canReject = computed(() => props.moderator && (statusSafe.value === 'in_review'))
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
    <IconifyButton :icon-path="mdiPaperclip" color="text-indigo-600" label="Attachments" tooltip="Attachments" size="sm"
      @click="$emit('attachments', row)" />

    <IconifyButton v-if="canView" :icon-path="mdiEye" color="text-gray-700" label="View" tooltip="View" size="sm"
      @click="$emit('view', row)" />
    <IconifyButton v-if="canEdit" :icon-path="mdiPencil" color="text-amber-600" label="Edit" tooltip="Edit" size="sm"
      @click="$emit('edit', row)" />

    <!-- Moderation -->
    <IconifyButton v-if="canMarkInReview" :icon-path="mdiProgressClock" color="text-blue-600" label="In Review"
      tooltip="Mark In Review" size="sm" @click="$emit('markInReview', row)" />
    <IconifyButton v-if="canResolve" :icon-path="mdiCheckDecagram" color="text-emerald-600" label="Resolve"
      tooltip="Resolve" size="sm" @click="$emit('resolve', row)" />
    <IconifyButton v-if="canReject" :icon-path="mdiCloseOctagon" color="text-rose-600" label="Reject" tooltip="Reject"
      size="sm" @click="$emit('reject', row)" />

    <IconifyButton v-if="canDelete" :icon-path="mdiTrashCan" color="text-red-600" label="Delete" tooltip="Delete"
      size="sm" @click="$emit('delete', row)" />

    <!-- Dropdown (mobile) -->
    <div class="relative md:hidden" ref="btnRef">
      <button class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
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
          @click="open = false; $emit('view', row)">View</button>
        <button v-if="canEdit" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="open = false; $emit('edit', row)">Edit</button>
        <button v-if="canMarkInReview" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="open = false; $emit('markInReview', row)">Mark In Review</button>
        <button v-if="canResolve" role="menuitem" class="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
          @click="open = false; $emit('resolve', row)">Resolve</button>
        <button v-if="canReject" role="menuitem" class="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          @click="open = false; $emit('reject', row)">Reject</button>
        <button v-if="canDelete" role="menuitem" class="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          @click="open = false; $emit('delete', row)">Delete</button>
      </div>
    </div>
  </div>
</template>

