<!-- src/components/clubs/ClubsListModal.vue -->
<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  clubs: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const q = ref('')
const API_ROOT = import.meta.env.VITE_API_ROOT_URL || ''
const mediaUrl = (v) => {
  if (!v) return ''
  if (typeof v !== 'string') return ''
  return v.startsWith('http') || v.startsWith('data:') ? v : `${API_ROOT}${v}`
}

const filtered = computed(() => {
  const query = q.value.trim().toLowerCase()
  if (!query) return props.clubs || []
  return (props.clubs || []).filter((c) => String(c?.name || '').toLowerCase().includes(query))
})

const choose = (club) => emit('select', club)
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-2" @click.self="visible = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full sm:w-[560px] max-w-[95vw] max-h-[85vh] overflow-hidden">
      <div class="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-gray-500">Affiliated Clubs</div>
          <h2 class="text-base font-semibold truncate">Your memberships</h2>
        </div>
        <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
      </div>

      <div class="p-4 space-y-3">
        <div class="relative">
          <i class="mdi mdi-magnify absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
          <input
            v-model="q"
            type="text"
            placeholder="Search clubs"
            class="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div class="divide-y border rounded-xl overflow-hidden max-h-[55vh] overflow-auto">
          <!-- Skeletons while loading -->
          <div v-if="loading" class="px-4 py-3 space-y-3">
            <div v-for="i in 6" :key="i" class="flex items-center gap-3 animate-pulse">
              <div class="h-10 w-10 rounded-md bg-gray-200"></div>
              <div class="flex-1 space-y-2">
                <div class="h-3 w-48 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>

          <template v-else>
            <button
              v-for="c in filtered"
              :key="c.id"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left"
              @click="choose(c)"
            >
              <div class="h-10 w-10 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
                <img v-if="mediaUrl(c.logo)" :src="mediaUrl(c.logo)" alt="logo" class="h-full w-full object-cover" />
                <i v-else class="mdi mdi-account-group text-gray-400 text-2xl"></i>
              </div>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium truncate">{{ c.name || 'Club' }}</div>
              </div>
              <i class="mdi mdi-chevron-right text-gray-400"></i>
            </button>

            <div v-if="!filtered.length" class="py-10 text-center text-sm text-gray-500">
              No clubs found.
            </div>
          </template>
        </div>
      </div>

      <div class="px-4 py-2 text-[11px] text-gray-500 border-t bg-gray-50">
        Click outside or Close to dismiss.
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
