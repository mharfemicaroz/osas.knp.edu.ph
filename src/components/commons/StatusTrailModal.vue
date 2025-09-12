<!-- src/components/commons/StatusTrailModal.vue -->
<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import StatusTrail from '@/components/commons/StatusTrail.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Remarks / Audit Trail' },
  items: { type: Array, default: () => [] },
  canAdd: { type: Boolean, default: true },
  currentUserId: { type: [String, Number], default: null },
})
const emit = defineEmits(['update:modelValue', 'add', 'markAllRead'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const auth = useAuthStore()
const effectiveUserId = computed(() => props.currentUserId ?? auth.user?.id ?? null)
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
    <div class="bg-white w-[560px] max-w-[95vw] rounded-xl shadow-lg p-3">
      <div class="flex items-center justify-between mb-2">
        <h3 class="text-base font-semibold">{{ title }}</h3>
        <button class="px-2 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
      </div>
      <StatusTrail :model-value="items" :can-add="canAdd" :current-user-id="effectiveUserId" @add="(e) => emit('add', e)" @markAllRead="() => emit('markAllRead')" />
    </div>
  </div>
  
</template>
