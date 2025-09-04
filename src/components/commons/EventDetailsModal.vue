<!-- src/components/commons/EventDetailsModal.vue -->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  event: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

const e = computed(() => props.event || {})
const xp = computed(() => e.value?.extendedProps || {})

const type = computed(() => xp.value?.type || '')
const refCode = computed(() => xp.value?.ref || xp.value?.reference_code || '')
const title = computed(() => e.value?.title || 'Event')
const startAt = computed(() => e.value?.start ? new Date(e.value.start) : null)
const endAt = computed(() => e.value?.end ? new Date(e.value.end) : null)
const allDay = computed(() => !!e.value?.allDay)

const clubName = computed(() => xp.value?.club?.name || xp.value?.club_name || '')
const facilities = computed(() => Array.isArray(xp.value?.facilities) ? xp.value.facilities : [])

const record = computed(() => xp.value?.record || xp.value?.raw || null)

const displayPairs = computed(() => {
  const pairs = []
  if (type.value) pairs.push(['Type', type.value])
  if (refCode.value) pairs.push(['Reference', refCode.value])
  if (clubName.value) pairs.push(['Club', clubName.value])
  if (allDay.value) pairs.push(['All-day', 'Yes'])
  if (startAt.value) pairs.push(['Start', startAt.value.toLocaleString()])
  if (endAt.value) pairs.push(['End', endAt.value.toLocaleString()])

  // Derived by known types
  const r = record.value || {}
  const t = (type.value || '').toLowerCase()
  if (t.includes('activity')) {
    if (r.name_of_activity) pairs.push(['Activity', r.name_of_activity])
    if (r.venue) pairs.push(['Venue', r.venue])
    if (r.date_of_implementation) pairs.push(['Implementation Date', new Date(r.date_of_implementation).toLocaleDateString()])
    if (r.status) pairs.push(['Status', String(r.status).toUpperCase()])
  } else if (t.includes('utilization')) {
    if (r.activity_design?.name_of_activity) pairs.push(['Activity', r.activity_design.name_of_activity])
    if (facilities.value?.length) pairs.push(['Facilities', facilities.value.join(', ')])
    if (r.status) pairs.push(['Status', String(r.status).toUpperCase()])
  } else if (t.includes('annual plan')) {
    if (r.school_year) pairs.push(['School Year', r.school_year])
    if (r.status) pairs.push(['Status', String(r.status).toUpperCase()])
  }
  return pairs
})

const copyText = async (text) => {
  try { await navigator.clipboard.writeText(String(text || '')) } catch {}
}
</script>

<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm p-2" @click.self="visible = false">
    <div class="bg-white rounded-2xl shadow-2xl w-full sm:w-[720px] max-w-[95vw] max-h-[90vh] overflow-hidden">
      <div class="px-4 py-3 border-b flex items-center justify-between">
        <div class="min-w-0">
          <div class="text-xs uppercase tracking-wide text-gray-500">Event Details</div>
          <h2 class="text-base font-semibold truncate">{{ title }}</h2>
        </div>
        <div class="flex items-center gap-2">
          <button v-if="refCode" class="px-2 py-1 text-xs bg-gray-100 border rounded" @click="copyText(refCode)">Copy Ref</button>
          <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
        </div>
      </div>

      <div class="p-4 space-y-3 overflow-auto" style="max-height: 65vh;">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div v-for="(pair, idx) in displayPairs" :key="idx" class="flex flex-col rounded-lg border bg-white p-3">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">{{ pair[0] }}</div>
            <div class="text-sm text-gray-900 break-words">{{ pair[1] || '—' }}</div>
          </div>
        </div>

        
      </div>

      <div class="px-4 py-2 text-[11px] text-gray-500 border-t">
        Click outside or Close to dismiss.
      </div>
    </div>
  </div>
  
</template>

<style scoped>
</style>
