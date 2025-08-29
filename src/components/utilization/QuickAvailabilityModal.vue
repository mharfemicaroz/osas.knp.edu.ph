<!-- src/components/utilization/QuickAvailabilityModal.vue -->
<template>
    <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-3 md:p-4 rounded-xl shadow-lg w-[560px] max-h-[85vh] overflow-y-auto">
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
                <h3 class="text-base font-semibold">Quick Availability Check</h3>
                <button class="px-2.5 py-1 text-[11px] bg-gray-200 rounded" @click="close">Close</button>
            </div>

            <!-- Form -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <div>
                    <label class="block mb-0.5">Start Date</label>
                    <input v-model="startDate" type="date" class="w-full border rounded px-2 py-1.5" />
                </div>
                <div>
                    <label class="block mb-0.5">Start Time</label>
                    <input v-model="startTime" type="time" class="w-full border rounded px-2 py-1.5" />
                </div>

                <div>
                    <label class="block mb-0.5">End Date</label>
                    <input v-model="endDate" type="date" class="w-full border rounded px-2 py-1.5" />
                </div>
                <div>
                    <label class="block mb-0.5">End Time</label>
                    <input v-model="endTime" type="time" class="w-full border rounded px-2 py-1.5" />
                </div>

                <div class="md:col-span-2">
                    <label class="block mb-0.5">Facilities</label>
                    <select v-model="selectedFacilities" multiple
                        class="w-full border rounded px-2 py-1.5 min-h-[40px]">
                        <option v-for="f in facilities" :key="f" :value="f">{{ f }}</option>
                    </select>
                    <p class="text-[11px] text-gray-500 mt-0.5">Hold Ctrl/Cmd to select multiple.</p>
                </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-1.5 mt-4">
                <button class="px-3 py-1.5 bg-gray-200 rounded text-xs" @click="reset">Reset</button>
                <button class="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs" @click="runCheck">Check</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import Swal from 'sweetalert2'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    facilities: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])

const store = useUtilizationRequestStore()

const startDate = ref('')
const startTime = ref('08:00')
const endDate = ref('')
const endTime = ref('10:00')
const selectedFacilities = ref([])

const validFacilities = computed(() =>
    (selectedFacilities.value || []).filter((f) => props.facilities.includes(f))
)

const close = () => emit('update:modelValue', false)

const reset = () => {
    startDate.value = ''
    startTime.value = '08:00'
    endDate.value = ''
    endTime.value = '10:00'
    selectedFacilities.value = []
}

const runCheck = async () => {
    if (!startDate.value || !endDate.value || !validFacilities.value.length) {
        await Swal.fire('Missing fields', 'Start/End dates and at least one facility are required.', 'info')
        return
    }
    try {
        const res = await store.checkAvailability({
            start_date: startDate.value,
            start_time: startTime.value || '00:00',
            end_date: endDate.value,
            end_time: endTime.value || '00:00',
            facilities: validFacilities.value,
        })

        const msg = res.available_for_all
            ? `All selected facilities are available.`
            : `Conflicts on: ${(res.conflict_facilities || []).join(', ') || '—'}`

        await Swal.fire({
            icon: res.available_for_all ? 'success' : 'warning',
            title: 'Availability Result',
            html: `<div class="text-left text-sm">
        <div><strong>Facilities:</strong> ${(res.facilities || []).join(', ')}</div>
        <div class="mt-2"><strong>Status:</strong> ${msg}</div>
        <div class="mt-2"><strong>Conflicts:</strong> ${Array.isArray(res.conflicts) && res.conflicts.length
                    ? `<ul class="list-disc ml-5">${res.conflicts
                        .map(
                            (c) =>
                                `<li>${c.reference_code} — ${new Date(c.start_at).toLocaleString()} to ${new Date(
                                    c.end_at
                                ).toLocaleString()}</li>`
                        )
                        .join('')}</ul>`
                    : 'None'
                }</div>
      </div>`,
        })
    } catch (e) {
        await Swal.fire('Error', store.error || 'Failed to check availability.', 'error')
        console.error(e)
    }
}
</script>
