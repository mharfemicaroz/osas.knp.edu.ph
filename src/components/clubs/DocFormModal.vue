<!-- src/components/docs/DocFormModal.vue -->
<script setup>
import { ref, watch, computed } from 'vue'
import Editor from '@tinymce/tinymce-vue'
import { useTinyMCE } from '@/composables/useTinyMCE'

const DOC_STATUS_OPTIONS = ['draft', 'published', 'archived']
const DOC_TYPE_OPTIONS = ['cbl', 'resolution', 'minute']

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' }, // 'create' | 'edit'
    initial: {
        type: Object,
        default: () => ({
            id: null,
            type: 'cbl',
            title: '',
            content: '',
            status: 'draft',
            doc_date: '',
        }),
    },
})

const emit = defineEmits(['update:modelValue', 'submit', 'closed'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const { editorRef, isFullscreen, onInit, toggleFullscreen, ensureExitFullscreen, tinymceInit } = useTinyMCE()

const form = ref({ ...props.initial })
const errors = ref({})

watch(
    () => props.initial,
    (val) => {
        form.value = { ...val }
        errors.value = {}
    },
    { immediate: true }
)

const titleText = computed(() => (props.mode === 'edit' ? 'Edit Document' : 'Add Document'))
const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))

const validate = () => {
    const errs = {}
    if (!form.value.type) errs.type = 'Type is required'
    if (!form.value.title?.trim()) errs.title = 'Title is required'
    if (!form.value.content?.trim()) errs.content = 'Content is required'
    if (form.value.status && !DOC_STATUS_OPTIONS.includes(form.value.status)) errs.status = 'Invalid status'
    errors.value = errs
    return Object.keys(errs).length === 0
}

const onSubmit = () => {
    if (!validate()) return
    const payload = {
        ...form.value,
        doc_date: form.value.doc_date || null,
    }
    emit('submit', payload)
}

const close = () => {
    ensureExitFullscreen()
    visible.value = false
    emit('closed')
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded shadow-lg w-[1024px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-2">
                <h2 class="text-lg font-semibold">{{ titleText }}</h2>
                <div class="flex items-center gap-2">
                    <button class="px-3 py-1 text-xs bg-indigo-600 text-white rounded" @click="toggleFullscreen">
                        {{ isFullscreen ? 'Restore' : 'Maximize' }}
                    </button>
                    <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="close">Close</button>
                </div>
            </div>

            <div class="bg-white w-full max-w-[1024px] max-h-screen rounded-2xl shadow-lg flex flex-col">
                <div class="p-5 flex-1 overflow-auto">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label class="block mb-1 font-medium text-gray-700">Type <span
                                    class="text-red-500">*</span></label>
                            <select v-model="form.type" :aria-invalid="!!errors.type"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="errors.type ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="t in DOC_TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                            </select>
                            <p v-if="errors.type" class="text-red-600 text-xs mt-1">{{ errors.type }}</p>
                        </div>

                        <div>
                            <label class="block mb-1 font-medium text-gray-700">Status</label>
                            <select v-model="form.status" :aria-invalid="!!errors.status"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="errors.status ? 'border-red-500' : 'border-gray-300'">
                                <option v-for="s in ['draft', 'published', 'archived']" :key="s" :value="s">{{ s }}
                                </option>
                            </select>
                            <p v-if="errors.status" class="text-red-600 text-xs mt-1">{{ errors.status }}</p>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block mb-1 font-medium text-gray-700">Title <span
                                    class="text-red-500">*</span></label>
                            <input v-model="form.title" :aria-invalid="!!errors.title" placeholder="Document title"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                :class="errors.title ? 'border-red-500' : 'border-gray-300'" />
                            <p v-if="errors.title" class="text-red-600 text-xs mt-1">{{ errors.title }}</p>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block mb-1 font-medium text-gray-700">Content <span
                                    class="text-red-500">*</span></label>
                            <div :class="['rounded-lg border', errors.content ? 'border-red-500' : 'border-gray-300']">
                                <Editor v-model="form.content" :init="tinymceInit" :onInit="onInit"
                                    :tinymce-script-src="`/tinymce/tinymce.min.js`" licenseKey="gpl" />
                            </div>
                            <p v-if="errors.content" class="text-red-600 text-xs mt-1">{{ errors.content }}</p>
                        </div>

                        <div class="md:col-span-2">
                            <label class="block mb-1 font-medium text-gray-700">Document Date</label>
                            <input v-model="form.doc_date" type="date"
                                class="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300" />
                        </div>
                    </div>
                </div>

                <div class="border-t p-4 bg-white flex items-center justify-end gap-2">
                    <button type="button"
                        class="px-4 py-2 rounded-lg text-xs border border-gray-300 hover:bg-gray-100 transition"
                        @click="close">
                        Cancel
                    </button>
                    <button type="button" class="px-4 py-2 rounded-lg text-xs"
                        :class="props.mode === 'edit' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-blue-600 text-white hover:bg-blue-700'"
                        @click="onSubmit">
                        {{ submitText }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
