<!-- src/components/clubs/ClubFormModal.vue -->
<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'create' },
    initial: {
        type: Object,
        default: () => ({
            id: null,
            name: '',
            code: '',
            category: '',
            description: '',
            is_active: true,
            established_at: '',
            website: '',
            email: '',
            phone: '',
            logo: '',
            banner: ''
        })
    }
})

const emit = defineEmits(['update:modelValue', 'submit'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v)
})

const API_ROOT = import.meta.env.VITE_API_ROOT_URL || ''
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

const titleText = computed(() => (props.mode === 'edit' ? 'Edit Club' : 'Add New Club'))
const submitText = computed(() => (props.mode === 'edit' ? 'Save Changes' : 'Create'))

const logoSrc = computed(() => {
    const v = form.value.logo
    if (!v) return ''
    return v.startsWith('data:') ? v : `${API_ROOT}${v}`
})
const bannerSrc = computed(() => {
    const v = form.value.banner
    if (!v) return ''
    return v.startsWith('data:') ? v : `${API_ROOT}${v}`
})

const validate = () => {
    const errs = {}
    if (!form.value.name?.trim()) errs.name = 'Name is required'
    if (!form.value.code?.trim()) errs.code = 'Code is required'
    errors.value = { ...errors.value, ...errs }
    return Object.keys(errs).length === 0
}

// ---- File constraints ----
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg']

const readAsBase64 = (file) =>
    new Promise((resolve, reject) => {
        const r = new FileReader()
        r.onload = (e) => resolve(e.target.result)
        r.onerror = reject
        r.readAsDataURL(file)
    })

function validateFile(file, target) {
    // target: 'logo' | 'banner'
    // Clear previous error
    errors.value[target] = ''

    if (!ALLOWED_TYPES.includes(file.type)) {
        errors.value[target] = 'Invalid file type. Please upload a PNG or JPEG image.'
        return false
    }
    if (file.size > MAX_FILE_SIZE) {
        errors.value[target] = 'File too large. Maximum size is 2 MB.'
        return false
    }
    return true
}

const onLogoChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!validateFile(f, 'logo')) {
        e.target.value = '' // reset input
        return
    }
    form.value.logo = await readAsBase64(f)
}

const onBannerChange = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!validateFile(f, 'banner')) {
        e.target.value = '' // reset input
        return
    }
    form.value.banner = await readAsBase64(f)
}

const removeLogo = () => {
    form.value.logo = ''
    errors.value.logo = ''
}
const removeBanner = () => {
    form.value.banner = ''
    errors.value.banner = ''
}

const onSubmit = () => {
    if (!validate()) return
    const payload = { ...form.value }
    Object.keys(payload).forEach((k) => {
        if (payload[k] === '') payload[k] = null
    })
    emit('submit', payload)
}
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded-xl shadow-xl w-[920px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold">{{ titleText }}</h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                    <label class="block mb-1">Name <span class="text-red-500">*</span></label>
                    <input v-model="form.name" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                        placeholder="e.g. Math Society" />
                    <p v-if="errors.name" class="text-red-600 text-xs mt-1">{{ errors.name }}</p>
                </div>
                <div>
                    <label class="block mb-1">Code <span class="text-red-500">*</span></label>
                    <input v-model="form.code" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                        placeholder="e.g. MATHSOC" />
                    <p v-if="errors.code" class="text-red-600 text-xs mt-1">{{ errors.code }}</p>
                </div>

                <div>
                    <label class="block mb-1">Category</label>
                    <select v-model="form.category"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                        <option disabled value="">Select a category</option>
                        <option value="Academic">Academic</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Athletics">Athletics</option>
                        <option value="Social">Social</option>
                        <option value="Community Service">Community Service</option>
                        <option value="Religious/Spiritual">Religious / Spiritual</option>
                        <option value="Environmental">Environmental</option>
                        <option value="Leadership">Leadership</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                <div>
                    <label class="block mb-1">Active?</label>
                    <select v-model="form.is_active"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring">
                        <option :value="true">Yes</option>
                        <option :value="false">No</option>
                    </select>
                </div>

                <div class="col-span-2">
                    <label class="block mb-1">Description</label>
                    <textarea v-model="form.description"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring" rows="3" />
                </div>

                <div>
                    <label class="block mb-1">Established At</label>
                    <input v-model="form.established_at" type="date"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring" />
                </div>
                <div>
                    <label class="block mb-1">Website</label>
                    <input v-model="form.website" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                        placeholder="https://…" />
                </div>
                <div>
                    <label class="block mb-1">Email</label>
                    <input v-model="form.email" type="email"
                        class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                        placeholder="club@example.com" />
                </div>
                <div>
                    <label class="block mb-1">Phone</label>
                    <input v-model="form.phone" class="w-full border rounded px-3 py-2 focus:outline-none focus:ring"
                        placeholder="+63…" />
                </div>

                <div class="col-span-2 grid grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="block">Logo</label>
                        <div class="border-2 border-dashed rounded-xl p-4 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-16 h-16 bg-gray-50 border rounded-lg overflow-hidden flex items-center justify-center">
                                    <img v-if="logoSrc" :src="logoSrc" alt="Logo"
                                        class="w-full h-full object-contain" />
                                    <span v-else class="text-xs text-gray-400">No logo</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    <p class="font-medium text-gray-700">PNG/JPEG • ≤ 2MB</p>
                                    <p>Square works best</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="px-3 py-2 bg-gray-800 text-white rounded cursor-pointer text-xs">
                                    Change
                                    <input type="file" class="hidden" accept="image/png,image/jpeg"
                                        @change="onLogoChange" />
                                </label>
                                <button class="px-3 py-2 bg-gray-200 rounded text-xs" @click="removeLogo"
                                    :disabled="!form.logo">Remove</button>
                            </div>
                        </div>
                        <p v-if="errors.logo" class="text-red-600 text-xs mt-1">{{ errors.logo }}</p>
                        <p v-if="form.logo && !form.logo.startsWith('data:')" class="text-xs text-gray-500 break-all">
                            {{ API_ROOT + form.logo }}
                        </p>
                    </div>

                    <div class="space-y-2">
                        <label class="block">Banner</label>
                        <div class="border-2 border-dashed rounded-xl p-4 flex items-center justify-between gap-3">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-40 h-16 bg-gray-50 border rounded-lg overflow-hidden flex items-center justify-center">
                                    <img v-if="bannerSrc" :src="bannerSrc" alt="Banner"
                                        class="w-full h-full object-contain" />
                                    <span v-else class="text-xs text-gray-400">No banner</span>
                                </div>
                                <div class="text-xs text-gray-500">
                                    <p class="font-medium text-gray-700">PNG/JPEG • ≤ 2MB</p>
                                    <p>Wide 5:1 recommended</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <label class="px-3 py-2 bg-gray-800 text-white rounded cursor-pointer text-xs">
                                    Change
                                    <input type="file" class="hidden" accept="image/png,image/jpeg"
                                        @change="onBannerChange" />
                                </label>
                                <button class="px-3 py-2 bg-gray-200 rounded text-xs" @click="removeBanner"
                                    :disabled="!form.banner">Remove</button>
                            </div>
                        </div>
                        <p v-if="errors.banner" class="text-red-600 text-xs mt-1">{{ errors.banner }}</p>
                        <p v-if="form.banner && !form.banner.startsWith('data:')"
                            class="text-xs text-gray-500 break-all">
                            {{ API_ROOT + form.banner }}
                        </p>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-5">
                <button class="px-4 py-2 bg-gray-200 rounded text-xs" @click="visible = false">Cancel</button>
                <button class="px-4 py-2 bg-blue-600 text-white rounded text-xs" @click="onSubmit">{{ submitText
                    }}</button>
            </div>
        </div>
    </div>
</template>
