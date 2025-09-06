<!-- src/components/notifications/NotificationsListModal.vue -->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useNotificationStore } from '@/stores/notification'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const store = useNotificationStore()
const page = ref(1)
const limit = ref(10)
const order = ref('DESC')
const sort = ref('created_at')
const q = ref('')
const onlyUnread = ref(false)

const items = computed(() => store.items?.data || [])
const total = computed(() => store.items?.total || 0)
const totalPages = computed(() => store.items?.totalPages || 1)
const isLoading = computed(() => store.isLoading)

const fetchAll = async () => {
  const params = {
    page: page.value,
    limit: limit.value,
    order: order.value,
    sort: sort.value,
  }
  if (q.value) params.q = q.value
  if (onlyUnread.value) params.is_read = false
  await store.fetchAll(params, true)
}

onMounted(async () => { if (visible.value) await fetchAll() })
watch(() => props.modelValue, async (v) => { if (v) await fetchAll() })

const markToggle = async (n) => { n.is_read ? await store.markUnread(n.id) : await store.markRead(n.id) }
const del = async (n) => { await store.deleteById(n.id); await fetchAll() }

const goPage = async (p) => { if (p >= 1 && p <= totalPages.value) { page.value = p; await fetchAll() } }
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-2" @click.self="visible = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full sm:w-[720px] max-w-[95vw] max-h-[85vh] overflow-hidden">
      <div class="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-gray-500">Notifications</div>
          <h2 class="text-base font-semibold truncate">All notifications</h2>
        </div>
        <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
      </div>

      <div class="p-4 space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div class="sm:col-span-2 relative">
            <i class="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
            <input v-model="q" type="text" placeholder="Search notifications" class="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" @keyup.enter="() => { page = 1; fetchAll() }" />
          </div>
          <label class="inline-flex items-center gap-2 text-sm"><input type="checkbox" v-model="onlyUnread" @change="() => { page = 1; fetchAll() }"/><span>Only unread</span></label>
        </div>

        <div class="border rounded-xl overflow-hidden">
          <div v-if="isLoading" class="p-3 text-sm text-gray-500">Loading…</div>
          <template v-else>
            <div v-if="!items.length" class="p-10 text-center text-sm text-gray-500">No notifications found.</div>
            <ul v-else class="divide-y max-h-[55vh] overflow-auto">
              <li v-for="n in items" :key="n.id" class="px-4 py-3 flex items-start gap-3" :class="n.is_read ? 'bg-white' : 'bg-indigo-50'">
                <div class="mt-0.5">
                  <i :class="['mdi', n.is_read ? 'mdi-bell-outline text-gray-400' : 'mdi-bell-ring-outline text-indigo-600']"></i>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate" :title="n.message">{{ n.message }}</div>
                  <div class="text-[11px] text-gray-500">{{ n.created_at ? new Date(n.created_at).toLocaleString() : '' }}</div>
                </div>
                <div class="flex items-center gap-1">
                  <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="markToggle(n)">{{ n.is_read ? 'Unread' : 'Read' }}</button>
                  <button class="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 hover:bg-red-100" @click="del(n)">Delete</button>
                </div>
              </li>
            </ul>
          </template>
        </div>

        <div class="flex items-center justify-between text-sm">
          <div>
            Page {{ page }} of {{ totalPages }} ({{ total }} total)
          </div>
          <div class="flex items-center gap-2">
            <button class="px-2 py-1 border rounded" :disabled="page===1" @click="goPage(page-1)">Prev</button>
            <button class="px-2 py-1 border rounded" :disabled="page===totalPages" @click="goPage(page+1)">Next</button>
          </div>
        </div>
      </div>

      <div class="px-4 py-2 text-[11px] text-gray-500 border-t bg-gray-50">
        Click outside or Close to dismiss.
      </div>
    </div>
  </div>
</template>

