<!-- src/components/grievance/GrievanceFormModal.vue -->
<script setup>
import { ref, watch, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClubStore } from '@/stores/club'
import { useUserStore } from '@/stores/user'
import { useGrievanceStore } from '@/stores/grievance'
import { useClubScope } from '@/utils/clubScope'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'create' }, // 'create' | 'edit'
  initial: {
    type: Object,
    default: () => ({
      id: null,
      title: '',
      description: '',
      club_id: '',
      filed_by_user_id: '',
      assigned_to_user_id: '',
      status: 'submitted',
      resolution_notes: '',
    })
  }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v)
})

const auth = useAuthStore()
const clubStore = useClubStore()
const userStore = useUserStore()

const currentUserId = computed(() => auth.user?.id || null)
const role = computed(() => String(auth.user?.role || '').toLowerCase())
const isModerator = computed(() => ['admin', 'manager'].includes(role.value))

const { isClub, activeClubId } = useClubScope()
const form = ref({ ...props.initial })
const errors = ref({})
const uploading = ref(false)
const stagedAttachments = ref([]) // for create mode before ID exists
const grievanceStore = useGrievanceStore()

onMounted(async () => {
  if (!Array.isArray(clubStore.clubs?.data) || !clubStore.clubs.data.length) {
    await clubStore.fetchAll({ page: 1, limit: 200, officer: true }, true)
  }
  if (!Array.isArray(userStore.users?.data) || !userStore.users.data.length) {
    await userStore.fetchAll({ page: 1, limit: 200 }, true)
  }
  if (isClub.value && activeClubId.value && !form.value.club_id) {
    form.value.club_id = Number(activeClubId.value)
  }
})

watch(
  () => props.initial,
  (v) => {
    form.value = { ...v }
    if (!form.value.filed_by_user_id && currentUserId.value) {
      form.value.filed_by_user_id = currentUserId.value
    }
    if (!form.value.club_id && isClub.value && activeClubId.value) {
      form.value.club_id = Number(activeClubId.value)
    }
    errors.value = {}
  },
  { immediate: true }
)

const STATUSES = ['submitted', 'in_review', 'resolved', 'rejected']

const readOnly = computed(() => {
  if (props.mode === 'create') return false
  if (isModerator.value) return false
  // Student/officer: can edit only own grievance while submitted
  const isOwner = String(form.value.filed_by_user_id || '') === String(auth.user?.id || '')
  const isSubmitted = String(form.value.status || '') === 'submitted'
  return !(isOwner && isSubmitted)
})

const onSubmit = () => {
  errors.value = {}
  if (!form.value.title?.trim()) errors.value.title = 'Title is required'
  if (!form.value.description?.trim()) errors.value.description = 'Description is required'
  if (!form.value.club_id) errors.value.club_id = 'Club is required'
  if (Object.keys(errors.value).length) return

  const payload = { ...form.value }
  // If creating with staged attachments, include them as JSON array of {data, filename, mime}
  if (!form.value.id && stagedAttachments.value.length) {
    payload.attachments = stagedAttachments.value.map((x) => ({
      data: x.data,
      filename: x.filename,
      mime: x.mime,
    }))
  }
  emit('submit', payload)
}

/* ---------- Attachments helpers ---------- */
const isExisting = computed(() => !!form.value?.id)
const allowModifyAttachments = computed(() => !readOnly.value)
const parsedAttachments = computed(() => {
  const raw = form.value?.attachments
  if (!raw) return []
  try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
})

const onFileChange = async (e) => {
  const file = e.target?.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!allowModifyAttachments.value) return

  if (!isExisting.value) {
    // Create mode: stage locally as data URL
    const reader = new FileReader()
    reader.onload = () => {
      stagedAttachments.value.push({ data: reader.result, filename: file.name, mime: file.type })
    }
    reader.readAsDataURL(file)
    return
  }

  try {
    uploading.value = true
    const updated = await grievanceStore.uploadAttachment(form.value.id, file)
    form.value = { ...updated }
  } finally {
    uploading.value = false
  }
}

const removeAttachment = async (attIdOrIndex) => {
  if (!allowModifyAttachments.value) return
  if (!isExisting.value) {
    // remove from staged list by index
    if (typeof attIdOrIndex === 'number') {
      stagedAttachments.value.splice(attIdOrIndex, 1)
    }
    return
  }
  const id = String(attIdOrIndex)
  const updated = await grievanceStore.deleteAttachment(form.value.id, id)
  form.value = { ...updated }
}
</script>

<template>
  <div v-if="visible"
       class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
    <div class="w-full max-w-3xl bg-white rounded-lg shadow-lg p-4">
      <div class="flex items-center justify-between">
        <h3 class="font-semibold text-lg">
          {{ mode === 'create' ? 'File Grievance' : 'Edit Grievance' }}
        </h3>
        <button class="text-gray-500 hover:text-gray-800" @click="visible = false">✕</button>
      </div>

      <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        <div class="md:col-span-2">
          <label class="block mb-0.5">Title <span class="text-red-500">*</span></label>
          <input v-model="form.title" class="w-full border rounded px-2 py-1.5" :disabled="readOnly"
                 placeholder="e.g., Complaint about equipment request"
                 :class="errors.title ? 'border-red-500' : ''" />
          <p v-if="errors.title" class="text-red-600 text-[11px] mt-0.5">{{ errors.title }}</p>
        </div>

        <div>
          <label class="block mb-0.5">Club <span class="text-red-500">*</span></label>
          <select v-model="form.club_id" class="w-full border rounded px-2 py-1.5" :disabled="readOnly || (isClub && !!activeClubId)">
            <option value="">Select club…</option>
            <option v-for="c in (isClub && activeClubId ? (clubStore.clubs.data || []).filter(cc => Number(cc.id) === Number(activeClubId)) : (clubStore.clubs.data || []))" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
          <p v-if="errors.club_id" class="text-red-600 text-[11px] mt-0.5">{{ errors.club_id }}</p>
        </div>

        <div>
          <label class="block mb-0.5">Filed By</label>
          <select v-model="form.filed_by_user_id" class="w-full border rounded px-2 py-1.5" :disabled="true">
            <option :value="auth.user?.id">{{ auth.user?.first_name }} {{ auth.user?.last_name }}</option>
          </select>
        </div>

        <div class="md:col-span-2">
          <label class="block mb-0.5">Description <span class="text-red-500">*</span></label>
          <textarea v-model="form.description" rows="5" class="w-full border rounded px-2 py-1.5"
                    placeholder="Describe the issue, when it happened, and any context"
                    :disabled="readOnly"
                    :class="errors.description ? 'border-red-500' : ''" />
          <p v-if="errors.description" class="text-red-600 text-[11px] mt-0.5">{{ errors.description }}</p>
        </div>

        <div v-if="isModerator" class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="block mb-0.5">Status</label>
            <select v-model="form.status" class="w-full border rounded px-2 py-1.5">
              <option v-for="s in STATUSES" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="block mb-0.5">Assigned To</label>
            <select v-model="form.assigned_to_user_id" class="w-full border rounded px-2 py-1.5">
              <option value="">— Unassigned —</option>
              <option v-for="u in (userStore.users.data || [])" :key="u.id" :value="u.id">
                {{ u.first_name }} {{ u.last_name }} ({{ u.username }})
              </option>
            </select>
          </div>
        </div>

        <div v-if="isModerator" class="md:col-span-2">
          <label class="block mb-0.5">Resolution Notes</label>
          <textarea v-model="form.resolution_notes" rows="3" class="w-full border rounded px-2 py-1.5"
                    placeholder="Steps taken, resolution, or decision (visible to moderators)" />
        </div>
      </div>

      <div class="flex justify-end gap-1.5 mt-4">
        <button class="px-3 py-1.5 bg-gray-200 rounded text-xs" @click="visible = false">Close</button>
        <button v-if="!readOnly" class="px-3 py-1.5 bg-blue-600 text-white rounded text-xs" v-pending-click="onSubmit">
          {{ mode === 'create' ? 'File Grievance' : 'Save Changes' }}
        </button>
      </div>

      <!-- Attachments -->
      <div class="mt-4 border-t pt-3">
        <div class="flex items-center justify-between">
          <h4 class="font-medium text-sm">Attachments</h4>
          <label class="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs cursor-pointer disabled:opacity-60"
                 :class="{ 'opacity-60 pointer-events-none': uploading || !allowModifyAttachments }">
            <span>{{ uploading ? 'Uploading…' : (isExisting ? 'Upload' : 'Add File') }}</span>
            <input type="file" class="hidden" :disabled="uploading || !allowModifyAttachments" @change="onFileChange"
                   accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp" />
          </label>
        </div>

        <!-- Existing attachments (edit mode) -->
        <div v-if="isExisting && parsedAttachments.length" class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div v-for="a in parsedAttachments" :key="a.id" class="border rounded p-2 bg-gray-50">
            <div class="text-xs font-medium truncate" :title="a.filename || a.name">{{ a.filename || a.name || 'Attachment' }}</div>
            <div class="mt-1">
              <img v-if="String(a?.mime || '').startsWith('image/') && a.data?.startsWith('data:')" :src="a.data" class="w-full h-24 object-contain border rounded" />
            </div>
            <div class="mt-2 flex justify-between items-center">
              <a v-if="a.data?.startsWith('data:')" :href="a.data" target="_blank" class="text-xs text-blue-600">Open</a>
              <button v-if="allowModifyAttachments" class="text-xs text-red-600" @click="removeAttachment(a.id)">Remove</button>
            </div>
          </div>
        </div>

        <!-- Staged attachments (create mode) -->
        <div v-if="!isExisting && stagedAttachments.length" class="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          <div v-for="(a, idx) in stagedAttachments" :key="idx" class="border rounded p-2 bg-gray-50">
            <div class="text-xs font-medium truncate" :title="a.filename">{{ a.filename }}</div>
            <div class="mt-1">
              <img v-if="String(a?.mime || '').startsWith('image/') && a.data?.startsWith('data:')" :src="a.data" class="w-full h-24 object-contain border rounded" />
            </div>
            <div class="mt-2 flex justify-end items-center">
              <button class="text-xs text-red-600" @click="removeAttachment(idx)">Remove</button>
            </div>
          </div>
        </div>
        <div v-if="(isExisting && !parsedAttachments.length) || (!isExisting && !stagedAttachments.length)" class="text-xs text-gray-500 mt-2">No attachments yet.</div>
      </div>
    </div>
  </div>
</template>
