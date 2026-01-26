<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
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
  mdiMessageTextOutline,
  mdiChevronDown,
} from '@mdi/js'

const props = defineProps({
  row: { type: Object, required: true },
  moderator: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
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
  'remarks',
])

const statusSafe = computed(() => String(props.row?.status || '').toLowerCase())
const canSubmit = computed(() => statusSafe.value === 'draft')
const canEdit = computed(() => statusSafe.value === 'draft')
const canView = computed(() => statusSafe.value !== 'draft')
const canModerate = computed(() => props.moderator && statusSafe.value === 'pending')
const canCancel = computed(() => props.moderator && (statusSafe.value === 'approved' || statusSafe.value === 'pending'))
const canPrint = computed(() => statusSafe.value === 'approved')
const canEmail = computed(() => props.moderator && statusSafe.value === 'approved')

const isSplitWorkflow = computed(() => canModerate.value)

const reasonFor = (key) => {
  switch (key) {
    case 'view':
      return 'Drafts open in edit mode.'
    case 'submit':
      return 'Only draft activities can be submitted.'
    case 'edit':
      return 'Only draft activities can be edited.'
    case 'approve':
      return 'Only moderators can approve pending activities.'
    case 'reject':
      return 'Only moderators can reject pending activities.'
    case 'cancel':
      return 'Only moderators can cancel pending or approved activities.'
    case 'print':
      return 'Only approved activities can be printed.'
    case 'email':
      return 'Only moderators can email approved activities.'
    case 'delete':
      return 'Only moderators can delete pending activities.'
    default:
      return 'Unavailable for this status.'
  }
}

const primaryAction = computed(() => {
  if (isSplitWorkflow.value) {
    return { key: 'approve', label: 'Approve', icon: mdiCheckDecagram, emit: 'approve', allowed: canModerate.value, reason: reasonFor('approve') }
  }
  if (canSubmit.value) {
    return { key: 'edit', label: 'Edit', icon: mdiPencil, emit: 'edit', allowed: canEdit.value, reason: reasonFor('edit') }
  }
  if (canPrint.value) {
    return { key: 'print', label: 'Print', icon: mdiPrinter, emit: 'print', allowed: canPrint.value, reason: reasonFor('print') }
  }
  if (canView.value) {
    return { key: 'view', label: 'View', icon: mdiEye, emit: 'view', allowed: canView.value, reason: reasonFor('view') }
  }
  return { key: 'view', label: 'View', icon: mdiEye, emit: 'view', allowed: false, reason: reasonFor('view') }
})

const inlineKeys = computed(() => {
  const keys = new Set(['attachments', 'remarks'])
  if (primaryAction.value?.key) keys.add(primaryAction.value.key)
  if (isSplitWorkflow.value) {
    keys.add('approve')
    keys.add('reject')
    if (canCancel.value) keys.add('cancel')
  }
  return keys
})

const moreItems = computed(() => {
  const items = [
    { key: 'view', label: 'View', icon: mdiEye, emit: 'view', allowed: canView.value, reason: reasonFor('view') },
    { key: 'edit', label: 'Edit', icon: mdiPencil, emit: 'edit', allowed: canEdit.value, reason: reasonFor('edit') },
    { key: 'submit', label: 'Submit', icon: mdiSend, emit: 'submit', allowed: canSubmit.value, reason: reasonFor('submit') },
    { key: 'approve', label: 'Approve', icon: mdiCheckDecagram, emit: 'approve', allowed: canModerate.value, reason: reasonFor('approve') },
    { key: 'reject', label: 'Reject', icon: mdiCloseOctagon, emit: 'reject', allowed: canModerate.value, reason: reasonFor('reject'), tone: 'danger' },
    { key: 'cancel', label: 'Cancel', icon: mdiCancel, emit: 'cancel', allowed: canCancel.value, reason: reasonFor('cancel'), tone: 'warning' },
    { key: 'print', label: 'Print', icon: mdiPrinter, emit: 'print', allowed: canPrint.value, reason: reasonFor('print') },
    { key: 'email', label: 'Email', icon: mdiEmailOutline, emit: 'email', allowed: canEmail.value, reason: reasonFor('email') },
    { key: 'delete', label: 'Delete', icon: mdiTrashCan, emit: 'delete', allowed: canModerate.value, reason: reasonFor('delete'), tone: 'danger' },
  ]
  return items.filter((item) => !inlineKeys.value.has(item.key) && item.allowed)
})

const hasMoreItems = computed(() => moreItems.value.length > 0)

const open = ref(false)
const menuRef = ref(null)
const btnRef = ref(null)
const menuStyle = ref({ top: '0px', left: '0px', minWidth: '208px' })

const workflowOpen = ref(false)
const workflowMenuRef = ref(null)
const workflowBtnRef = ref(null)
const workflowMenuStyle = ref({ top: '0px', left: '0px', minWidth: '176px' })

const confirmDelete = ref(false)
let confirmTimer = null

const resetConfirmDelete = () => {
  confirmDelete.value = false
  if (confirmTimer) {
    clearTimeout(confirmTimer)
    confirmTimer = null
  }
}

const requestDelete = () => {
  if (!confirmDelete.value) {
    confirmDelete.value = true
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => resetConfirmDelete(), 3000)
    return
  }
  resetConfirmDelete()
  emit('delete', props.row)
  open.value = false
}

const handleMenuItem = (item) => {
  if (!item || !item.allowed) return
  if (item.key === 'delete') {
    requestDelete()
    return
  }
  emit(item.emit, props.row)
  open.value = false
}

const toneClass = (item) => {
  const t = String(item?.tone || '').toLowerCase()
  if (t === 'danger') return 'text-red-600 hover:bg-red-50'
  if (t === 'warning') return 'text-amber-700 hover:bg-amber-50'
  if (t === 'success') return 'text-emerald-700 hover:bg-emerald-50'
  return ''
}

const positionMenu = (el, styleRef, width, heightGuess = 240) => {
  if (!el || typeof el.getBoundingClientRect !== 'function') return
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth || document.documentElement.clientWidth
  const vh = window.innerHeight || document.documentElement.clientHeight
  const gap = 6
  const w = width
  const h = heightGuess
  let left = Math.min(vw - w - 8, Math.max(8, rect.right - w))
  let top = rect.bottom + gap
  const spaceBelow = vh - rect.bottom
  const spaceAbove = rect.top
  if (spaceBelow < 140 && spaceAbove > spaceBelow) {
    top = Math.max(8, rect.top - gap - h)
  }
  styleRef.value = { position: 'fixed', top: `${top}px`, left: `${left}px`, minWidth: `${w}px` }
}

const toggleMenu = () => {
  open.value = !open.value
  if (open.value) positionMenu(btnRef.value, menuStyle, 208, 260)
  else resetConfirmDelete()
}

const toggleWorkflowMenu = () => {
  workflowOpen.value = !workflowOpen.value
  if (workflowOpen.value) positionMenu(workflowBtnRef.value, workflowMenuStyle, 176, 120)
}

const closeAll = () => {
  open.value = false
  workflowOpen.value = false
  resetConfirmDelete()
}

const onDocumentClick = (e) => {
  const m = menuRef.value
  const b = btnRef.value
  if (open.value && m && b && !m.contains(e.target) && !b.contains(e.target)) {
    open.value = false
    resetConfirmDelete()
  }

  const wm = workflowMenuRef.value
  const wb = workflowBtnRef.value
  if (workflowOpen.value && wm && wb && !wm.contains(e.target) && !wb.contains(e.target)) {
    workflowOpen.value = false
  }
}

let scrollHandler = null
onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  scrollHandler = () => closeAll()
  window.addEventListener('resize', scrollHandler)
  window.addEventListener('scroll', scrollHandler, true)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  if (scrollHandler) {
    window.removeEventListener('resize', scrollHandler)
    window.removeEventListener('scroll', scrollHandler, true)
  }
  resetConfirmDelete()
})

// Remarks helpers for unread badge
const parseRemarks = (r) => {
  if (!r) return []
  if (Array.isArray(r)) return r
  try { return JSON.parse(r || '[]') || [] } catch { return [] }
}
const unreadCount = computed(() => {
  const uid = props.currentUserId == null ? null : Number(props.currentUserId)
  const items = parseRemarks(props.row?.remarks) || []
  return items.filter((x) => {
    if (!x) return false
    if (x.is_read === true) return false
    const authorId = x.user_id == null ? null : Number(x.user_id)
    if (uid != null && authorId === uid) return false
    const readBy = Array.isArray(x.read_by) ? x.read_by.map((v) => Number(v)) : []
    return uid != null ? !readBy.includes(uid) : false
  }).length
})
</script>

<template>
  <div class="relative">
    <div class="flex items-center gap-1.5 md:gap-2">
      <IconifyButton :icon-path="mdiPaperclip" color="text-indigo-600" label="" tooltip="Attachments" size="sm"
        @click="$emit('attachments', row)" />

      <div class="relative inline-flex">
        <IconifyButton :icon-path="mdiMessageTextOutline" color="text-slate-700" label="" tooltip="Remarks" size="sm"
          @click="$emit('remarks', row)" />
        <span v-if="unreadCount > 0"
          class="absolute -top-1 -right-1 text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-rose-600 text-white">{{ unreadCount }}</span>
      </div>

      <template v-if="isSplitWorkflow">
        <div class="relative inline-flex items-center" ref="workflowBtnRef">
          <button
            class="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-l border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
            @click="$emit('approve', row)">
            <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path :d="mdiCheckDecagram" /></svg>
            <span class="hidden md:inline">Approve</span>
          </button>
          <button
            class="inline-flex items-center justify-center px-2 py-1 text-xs rounded-r border border-l-0 border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            :aria-expanded="workflowOpen" aria-haspopup="menu" title="More workflow"
            @click="toggleWorkflowMenu">
            <svg class="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true"><path :d="mdiChevronDown" /></svg>
          </button>
        </div>
      </template>
      <template v-else>
        <BaseButton :icon="primaryAction.icon" :label="primaryAction.label" color="primary" small
          :disabled="!primaryAction.allowed" :title="primaryAction.allowed ? primaryAction.label : primaryAction.reason"
          @click="primaryAction.allowed && $emit(primaryAction.emit, row)" />
      </template>

      <div v-if="hasMoreItems" class="relative" ref="btnRef">
        <button
          class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
          :aria-expanded="open" aria-haspopup="menu" title="More actions" @click="toggleMenu">
          <svg style="width: 18px; height: 18px" viewBox="0 0 24 24" aria-hidden="true">
            <path :d="mdiDotsHorizontal" />
          </svg>
        </button>
      </div>
    </div>

    <teleport to="body">
      <div v-if="open && hasMoreItems" ref="menuRef" role="menu" :style="menuStyle"
        class="fixed z-[9999] w-52 overflow-hidden rounded-xl border bg-white shadow-lg">
        <button v-for="item in moreItems" :key="item.key" role="menuitem"
          class="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
          :class="[toneClass(item), 'hover:bg-gray-50']"
          :title="item.label"
          @click="handleMenuItem(item)">
          <svg v-if="item.icon" class="w-4 h-4" viewBox="0 0 24 24">
            <path :d="item.icon" />
          </svg>
          <span class="truncate">{{ item.key === 'delete' && confirmDelete ? 'Confirm delete' : item.label }}</span>
        </button>
      </div>
    </teleport>

    <teleport to="body">
      <div v-if="workflowOpen" ref="workflowMenuRef" role="menu" :style="workflowMenuStyle"
        class="fixed z-[9999] w-44 overflow-hidden rounded-xl border bg-white shadow-lg">
        <button role="menuitem" class="w-full px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"
          @click="workflowOpen = false; $emit('reject', row)">Reject</button>
        <button v-if="canCancel" role="menuitem" class="w-full px-3 py-2 text-left text-sm text-amber-700 hover:bg-amber-50"
          @click="workflowOpen = false; $emit('cancel', row)">Cancel</button>
      </div>
    </teleport>
  </div>
</template>
