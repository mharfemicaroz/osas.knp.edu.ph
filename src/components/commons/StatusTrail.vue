<!-- src/components/commons/StatusTrail.vue -->
<script setup>
import { ref, watch, computed, nextTick, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  canAdd: { type: Boolean, default: false },
  addPlaceholder: { type: String, default: 'Add a note…' },
  dense: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
})
const emit = defineEmits(['update:modelValue', 'add', 'markAllRead'])

const list = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []))

const normalize = (it) => {
  if (!it || typeof it !== 'object') return it
  const entry = { ...it }
  if (!Array.isArray(entry.read_by)) entry.read_by = (entry.user_id != null ? [entry.user_id] : [])
  return entry
}

const uidNum = computed(() => (props.currentUserId == null ? null : Number(props.currentUserId)))
const isUnreadForMe = (it) => {
  if (!it) return false
  const e = normalize(it)
  const uid = uidNum.value
  if (uid == null) return false
  if (Number(e.user_id ?? null) === uid) return false
  const rb = Array.isArray(e.read_by) ? e.read_by.map((v) => Number(v)) : []
  return !rb.includes(uid)
}

const newMsg = ref('')
const canSubmit = computed(() => props.canAdd && newMsg.value.trim().length > 0)

const onAdd = async () => {
  if (!canSubmit.value) return
  const entry = { message: newMsg.value.trim(), datetime: new Date().toISOString() }
  emit('add', entry)
  newMsg.value = ''
  await nextTick()
    const box = document.getElementById('status-trail-scroll')
    if (box) box.scrollTop = box.scrollHeight
}

const fmtTime = (iso) => {
  try {
    const d = new Date(iso)
    return d.toLocaleString()
  } catch {
    return iso
  }
}

const initials = (name = '') => {
  const parts = String(name).trim().split(/[\s,]+/).filter(Boolean)
  if (!parts.length) return '—'
  const last = parts[0]
  const firstInitial = (parts[1] || '').slice(0, 1)
  return `${(last[0]||'').toUpperCase()}${(firstInitial||'').toUpperCase()}`
}

// Mark-as-read helpers
const unreadCount = computed(() => (list.value || []).filter((it) => isUnreadForMe(it)).length)
const scrolledOnce = ref(false)
const scrollRef = ref(null)

const onScroll = () => {
  if (scrolledOnce.value) return
  if (unreadCount.value > 0) {
    scrolledOnce.value = true
    emit('markAllRead')
  }
}

onMounted(() => {
  if (scrollRef.value) {
    scrollRef.value.addEventListener('scroll', onScroll, { passive: true })
  }
})
onBeforeUnmount(() => {
  if (scrollRef.value) scrollRef.value.removeEventListener('scroll', onScroll)
})
</script>

<template>
  <div class="border rounded-lg bg-white">
    <div class="flex items-center justify-between px-2 py-1 border-b bg-gray-50 text-[11px] text-gray-600" v-if="unreadCount > 0">
      <span>{{ unreadCount }} new</span>
      <button class="px-2 py-0.5 rounded bg-emerald-600 text-white" @click="emit('markAllRead')">Mark all read</button>
    </div>
    <div id="status-trail-scroll" ref="scrollRef" class="max-h-60 overflow-y-auto divide-y">
      <div v-for="(it, idx) in list" :key="idx" class="flex items-start gap-2 p-2">
        <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600">
          {{ initials(it.user_name) }}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between text-[11px] text-gray-500">
            <span class="truncate">{{ it.user_name || 'System' }}</span>
            <span>{{ fmtTime(it.datetime) }}</span>
          </div>
          <div class="text-sm text-gray-800 break-words flex items-center gap-2">
            <span class="inline-block">{{ it.message || '' }}</span>
            <span v-if="isUnreadForMe(it)" class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">[new]</span>
          </div>
        </div>
      </div>
      <div v-if="!list.length" class="p-3 text-sm text-gray-500">No remarks yet.</div>
    </div>

    <div v-if="canAdd" class="p-2 border-t bg-gray-50">
      <div class="flex items-start gap-2">
        <textarea v-model="newMsg" rows="2" :placeholder="addPlaceholder"
          class="flex-1 border rounded px-2 py-1.5 text-sm" />
        <button class="px-3 py-1.5 text-xs rounded text-white"
          :class="canSubmit ? 'bg-blue-600' : 'bg-blue-300 cursor-not-allowed'"
          :disabled="!canSubmit" @click="onAdd">Add</button>
      </div>
    </div>
  </div>
</template>
