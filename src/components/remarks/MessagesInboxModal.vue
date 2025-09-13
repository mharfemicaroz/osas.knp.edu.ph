<!-- src/components/remarks/MessagesInboxModal.vue -->
<script setup>
import { computed } from 'vue'
import { useRemarksInboxStore } from '@/stores/remarksInbox'
import { useRouter } from 'vue-router'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const store = useRemarksInboxStore()
const router = useRouter()

const list = computed(() => store.items || [])
const badge = computed(() => store.unreadTotal || 0)

const open = async (it) => {
  if (!it) return
  const map = { AD: 'activity-designs', UR: 'utilization-requests', LF: 'liquidation-funds', AP: 'annual-plans' }
  const name = map[it.module] || 'dashboard'
  visible.value = false
  router.push({ name, query: { open_remarks_type: it.module, open_remarks_id: it.entityId } })
}

const refresh = async () => { await store.fetchUnread({ limitPerModule: 50 }) }
const markAll = async () => { await store.markAllRead(); await refresh() }
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div class="bg-white w-[640px] max-w-[95vw] rounded-xl shadow-lg ring-1 ring-black/5 overflow-hidden">
      <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-semibold">Messages</span>
          <span v-if="badge" class="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">{{ badge }} new</span>
        </div>
        <div class="flex items-center gap-2">
          <button class="text-xs text-indigo-600 hover:underline" @click="markAll">Mark all read</button>
          <button class="px-2 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
        </div>
      </div>

      <div class="max-h-[65vh] overflow-auto divide-y">
        <div v-if="!list.length" class="p-4 text-sm text-gray-500">No unread remarks</div>
        <button v-for="m in list" :key="m.key" class="w-full text-left px-4 py-3 hover:bg-gray-50" @click="open(m)">
          <div class="flex items-center gap-2 mb-0.5">
            <span class="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">{{ m.module }}</span>
            <span class="text-xs text-gray-500 truncate">{{ m.reference }}</span>
          </div>
          <div class="text-sm text-gray-800 truncate">{{ m.message }}</div>
          <div class="text-[11px] text-gray-500">{{ m.datetime ? new Date(m.datetime).toLocaleString() : '' }}</div>
        </button>
      </div>

      <div class="px-4 py-2 border-t bg-gray-50 text-right">
        <button class="text-xs text-gray-600 mr-2" @click="refresh">Refresh</button>
        <button class="px-3 py-1.5 text-xs rounded bg-gray-900 text-white" @click="visible = false">Close</button>
      </div>
    </div>
  </div>
</template>

