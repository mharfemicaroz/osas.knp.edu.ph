<!-- src/components/utilization/UtilizationAttachmentsModal.vue -->
<script setup>
import { ref, computed, watch } from 'vue'
import Swal from 'sweetalert2'
import { useUtilizationRequestStore } from '@/stores/utilizationRequest'
import {
    mdiFilePdfBox,
    mdiFileWordBox,
    mdiFileExcelBox,
    mdiFileImage,
    mdiFileDocumentOutline,
    mdiOpenInNew,
    mdiTrashCan,
    mdiUpload,
    mdiDownload,
} from '@mdi/js'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    row: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])

const visible = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

const store = useUtilizationRequestStore()
const current = ref(null)
const uploading = ref(false)

/* ---------- Helpers ---------- */
const ALLOWED_MIMES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
])
const ALLOWED_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'pdf', 'docx', 'xlsx'])
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

const extFromName = (name = '') => (String(name).toLowerCase().match(/\.([a-z0-9]+)$/i)?.[1] || '')
const mimeFromDataUrl = (d = '') => (typeof d === 'string' ? (d.match(/^data:([^;]+);base64,/i)?.[1] || '') : '')
const isAllowedFile = (file) => {
    const byMime = file?.type && ALLOWED_MIMES.has(file.type)
    const byExt = file?.name && ALLOWED_EXTS.has(extFromName(file.name))
    return byMime || byExt
}
const isImageMime = (m = '') => String(m).startsWith('image/')
const isPdfMime = (m = '') => m === 'application/pdf'
const isWordMime = (m = '') => m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const isExcelMime = (m = '') => m === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const iconForMime = (m = '') => (isPdfMime(m) ? mdiFilePdfBox : isWordMime(m) ? mdiFileWordBox : isExcelMime(m) ? mdiFileExcelBox : isImageMime(m) ? mdiFileImage : mdiFileDocumentOutline)
const labelForMime = (m = '') => (isPdfMime(m) ? 'PDF' : isWordMime(m) ? 'Word' : isExcelMime(m) ? 'Excel' : isImageMime(m) ? 'Image' : 'File')
const extForMime = (m = '') => (isPdfMime(m) ? 'pdf' : isWordMime(m) ? 'docx' : isExcelMime(m) ? 'xlsx' : m === 'image/png' ? 'png' : m === 'image/jpeg' ? 'jpg' : m === 'image/webp' ? 'webp' : '')
const ensureFilenameWithExt = (base = 'attachment', ext = '') => (/\.[a-z0-9]+$/i.test(base) ? base : (ext ? `${base}.${ext.startsWith('.') ? ext.slice(1) : ext}` : base))
const formatBytes = (n) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / (1024 * 1024)).toFixed(1)} MB`)

/* ---------- Normalize attachments ---------- */
const rawAttachments = computed(() => {
    const raw = current.value?.attachments
    if (!raw) return []
    try { return Array.isArray(raw) ? raw : JSON.parse(raw || '[]') } catch { return [] }
})
const attachments = computed(() =>
    (rawAttachments.value || []).map((a, idx) => {
        const mime =
            a.mime ||
            mimeFromDataUrl(a.data) ||
            (a.name ? (extFromName(a.name) === 'pdf' && 'application/pdf') : '') ||
            ''
        const ext = extFromName(a.name || '') || extForMime(mime)
        const size = a.size ?? null
        const name = a.name || `${labelForMime(mime)} ${idx + 1}`
        return {
            id: a.id ?? idx + 1,
            name,
            data: a.data || '',
            url: a.url || a.href || a.path || '',
            mime,
            ext,
            size,
            filename: ensureFilenameWithExt(name, ext),
        }
    })
)

/* ---------- Load when opened ---------- */
watch(
    () => props.modelValue,
    async (v) => {
        if (v && props.row?.id) {
            await store.fetchById(props.row.id)
            current.value = store.selected || props.row
        }
    },
    { immediate: false }
)

/* ---------- Upload ---------- */
const onFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !current.value?.id) return

    if (file.size > MAX_SIZE) {
        await Swal.fire('File too large', 'Maximum size is 10 MB.', 'warning')
        return
    }
    if (!isAllowedFile(file)) {
        await Swal.fire(
            'Unsupported file',
            'Only images (PNG/JPEG/WEBP), PDF, DOCX, and XLSX are allowed.',
            'warning'
        )
        return
    }

    try {
        uploading.value = true
        await store.uploadAttachment(current.value.id, file)
        await store.fetchById(current.value.id)
        current.value = store.selected
    } finally {
        uploading.value = false
    }
}

/* ---------- Remove ---------- */
const removeAttachment = async (attId) => {
    if (!current.value?.id) return
    const ok = await Swal.fire({
        title: 'Remove attachment?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Remove',
        confirmButtonColor: '#d33',
    })
    if (!ok.isConfirmed) return
    await store.deleteAttachment(current.value.id, attId)
    await store.fetchById(current.value.id)
    current.value = store.selected
}

/* ---------- Open / Download ---------- */
const openPreview = (att) => {
    if (att.data && String(att.data).startsWith('data:') && isImageMime(att.mime)) {
        const win = window.open()
        if (win) {
            win.document.write(
                `<img src="${att.data}" style="display:block;max-width:100%;height:auto;margin:0 auto;object-fit:contain"/>`
            )
        }
        return
    }
    if (att.url) window.open(String(att.url), '_blank')
}
const dataURLToBlob = (dataUrl) => {
    const [header, b64] = dataUrl.split(',')
    const mime = header.match(/data:([^;]+);base64/i)?.[1] || 'application/octet-stream'
    const binary = atob(b64)
    const len = binary.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
    return new Blob([bytes], { type: mime })
}
const triggerDownload = (blob, filename) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || 'download'
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
}
const downloadAttachment = async (att) => {
    if (att.data && String(att.data).startsWith('data:')) {
        const blob = dataURLToBlob(att.data)
        triggerDownload(blob, att.filename)
        return
    }
    if (att.url) {
        try {
            const resp = await fetch(att.url, { credentials: 'include' })
            const blob = await resp.blob()
            triggerDownload(blob, att.filename)
        } catch {
            const a = document.createElement('a')
            a.href = String(att.url)
            a.setAttribute('download', att.filename)
            document.body.appendChild(a)
            a.click()
            a.remove()
        }
    }
}
const primaryLabel = (att) => (isImageMime(att.mime) ? 'Open' : 'Download')
const primaryIcon = (att) => (isImageMime(att.mime) ? mdiOpenInNew : mdiDownload)
const onPrimary = (att) => (isImageMime(att.mime) ? openPreview(att) : downloadAttachment(att))
</script>

<template>
    <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 rounded-xl shadow-xl w-[980px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold">
                    Utilization Attachments — <span class="text-gray-600">{{ current?.reference_code || '' }}</span>
                </h2>
                <button class="px-3 py-1 text-xs bg-gray-200 rounded" @click="visible = false">Close</button>
            </div>

            <div class="flex items-center justify-between gap-2">
                <div class="text-sm text-gray-600">
                    Activity: <strong>{{ current?.activity_design?.name_of_activity || '—' }}</strong>
                </div>

                <label
                    class="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded text-xs cursor-pointer disabled:opacity-60"
                    :class="{ 'opacity-60 pointer-events-none': uploading }">
                    <svg style="width:16px;height:16px" viewBox="0 0 24 24" aria-hidden="true">
                        <path :d="mdiUpload" />
                    </svg>
                    <span>{{ uploading ? 'Uploading…' : 'Upload' }}</span>
                    <input type="file" class="hidden" :disabled="uploading" @change="onFileChange"
                        accept=".png,.jpg,.jpeg,.webp,.pdf,.docx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/png,image/jpeg,image/webp" />
                </label>
            </div>

            <!-- Cards -->
            <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div v-for="a in attachments" :key="a.id" class="border rounded-lg p-2 bg-gray-50 flex flex-col">
                    <div class="aspect-video bg-white border rounded overflow-hidden flex items-center justify-center">
                        <img v-if="isImageMime(a.mime) && (a.data && a.data.startsWith('data:'))" :src="a.data"
                            class="object-contain w-full h-full" alt="Attachment preview" />
                        <div v-else class="flex items-center justify-center w-full h-full">
                            <svg style="width:64px;height:64px" viewBox="0 0 24 24" aria-hidden="true" :class="{
                                'text-red-600': isPdfMime(a.mime),
                                'text-blue-600': isWordMime(a.mime),
                                'text-emerald-600': isExcelMime(a.mime),
                                'text-gray-500': !a.mime || (!isImageMime(a.mime) && !isPdfMime(a.mime)),
                            }">
                                <path :d="iconForMime(a.mime)" />
                            </svg>
                        </div>
                    </div>

                    <div class="mt-2 text-xs">
                        <div class="font-medium truncate" :title="a.name">{{ a.name }}</div>
                        <div class="text-gray-500 flex items-center justify-between">
                            <span>{{ labelForMime(a.mime) }} <span v-if="a.ext">({{ a.ext.toUpperCase()
                                    }})</span></span>
                            <span v-if="a.size">{{ formatBytes(a.size) }}</span>
                        </div>
                    </div>

                    <div class="mt-2 flex items-center justify-between gap-2">
                        <button
                            class="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-xs hover:bg-gray-50"
                            @click="onPrimary(a)" :title="primaryLabel(a)">
                            <svg style="width:16px;height:16px" viewBox="0 0 24 24" aria-hidden="true">
                                <path :d="primaryIcon(a)" />
                            </svg>
                            {{ primaryLabel(a) }}
                        </button>

                        <button class="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white rounded text-xs"
                            @click="removeAttachment(a.id)" title="Remove">
                            <svg style="width:16px;height:16px" viewBox="0 0 24 24" aria-hidden="true">
                                <path :d="mdiTrashCan" />
                            </svg>
                            Remove
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="!attachments.length" class="mt-6 text-center text-sm text-gray-500">
                No attachments yet.
            </div>
        </div>
    </div>
</template>
