<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import IconifyButton from '@/components/commons/IconifyButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import {
    mdiPaperclip,
    mdiAccountMultiple,
    mdiFileDocument,
    mdiPencil,
    mdiTrashCan,
    mdiDotsHorizontal,
    mdiEye,
} from '@mdi/js'

const props = defineProps({
    row: { type: Object, required: true },
    moderator: { type: Boolean, default: false },
})
const emit = defineEmits(['members', 'docs', 'edit', 'delete', 'view', 'attachments'])

const canDelete = computed(() => props.moderator)

const moreItems = computed(() => {
    const items = [
        { key: 'delete', label: 'Delete', icon: mdiTrashCan, emit: 'delete', allowed: canDelete.value, tone: 'danger' },
    ]
    return items.filter((item) => item.allowed)
})
const hasMoreItems = computed(() => moreItems.value.length > 0)

const open = ref(false)
const menuRef = ref(null)
const btnRef = ref(null)
const menuStyle = ref({ top: '0px', left: '0px', minWidth: '192px' })

const confirmDelete = ref(false)
let confirmTimer = null

const resetConfirmDelete = () => {
    confirmDelete.value = false
    if (confirmTimer) {
        clearTimeout(confirmTimer)
        confirmTimer = null
    }
}

const requestDelete = () => {
    if (!confirmDelete.value) {
        confirmDelete.value = true
        if (confirmTimer) clearTimeout(confirmTimer)
        confirmTimer = setTimeout(() => resetConfirmDelete(), 3000)
        return
    }
    resetConfirmDelete()
    emit('delete', props.row)
    open.value = false
}

const handleMenuItem = (item) => {
    if (!item || !item.allowed) return
    if (item.key === 'delete') {
        requestDelete()
        return
    }
    emit(item.emit, props.row)
    open.value = false
}

const toneClass = (item) => {
    const t = String(item?.tone || '').toLowerCase()
    if (t === 'danger') return 'text-red-600 hover:bg-red-50'
    return ''
}

const positionMenu = (el, styleRef, width, heightGuess = 160) => {
    if (!el || typeof el.getBoundingClientRect !== 'function') return
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth || document.documentElement.clientWidth
    const vh = window.innerHeight || document.documentElement.clientHeight
    const gap = 6
    const w = width
    const h = heightGuess
    let left = Math.min(vw - w - 8, Math.max(8, rect.right - w))
    let top = rect.bottom + gap
    const spaceBelow = vh - rect.bottom
    const spaceAbove = rect.top
    if (spaceBelow < 140 && spaceAbove > spaceBelow) {
        top = Math.max(8, rect.top - gap - h)
    }
    styleRef.value = { position: 'fixed', top: `${top}px`, left: `${left}px`, minWidth: `${w}px` }
}

const toggleMenu = () => {
    open.value = !open.value
    if (open.value) positionMenu(btnRef.value, menuStyle, 192, 160)
    else resetConfirmDelete()
}

const closeAll = () => {
    open.value = false
    resetConfirmDelete()
}

const onDocumentClick = (e) => {
    const m = menuRef.value
    const b = btnRef.value
    if (open.value && m && b && !m.contains(e.target) && !b.contains(e.target)) {
        open.value = false
        resetConfirmDelete()
    }
}

let scrollHandler = null
onMounted(() => {
    document.addEventListener('click', onDocumentClick)
    scrollHandler = () => closeAll()
    window.addEventListener('resize', scrollHandler)
    window.addEventListener('scroll', scrollHandler, true)
})
onBeforeUnmount(() => {
    document.removeEventListener('click', onDocumentClick)
    if (scrollHandler) {
        window.removeEventListener('resize', scrollHandler)
        window.removeEventListener('scroll', scrollHandler, true)
    }
    resetConfirmDelete()
})
</script>

<template>
    <div class="relative">
        <div class="flex items-center gap-1.5 md:gap-2">
            <IconifyButton :icon-path="mdiPaperclip" color="text-indigo-600" label="" tooltip="Attachments"
                size="sm" @click="$emit('attachments', row)" />

            <IconifyButton :icon-path="mdiEye" color="text-gray-700" label="" tooltip="View club"
                size="sm" @click="$emit('view', row)" />

            <IconifyButton :icon-path="mdiAccountMultiple" color="text-blue-600" label="" tooltip="Members"
                size="sm" @click="$emit('members', row)" />

            <IconifyButton :icon-path="mdiFileDocument" color="text-indigo-600" label="" tooltip="Documents"
                size="sm" @click="$emit('docs', row)" />

            <BaseButton :icon="mdiPencil" :label="'Edit'" color="primary" small
                @click="$emit('edit', row)" />

            <div v-if="hasMoreItems" class="relative" ref="btnRef">
                <button
                    class="inline-flex items-center justify-center rounded-xl p-1.5 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
                    :aria-expanded="open" aria-haspopup="menu" title="More actions" @click="toggleMenu">
                    <svg style="width: 18px; height: 18px" viewBox="0 0 24 24" aria-hidden="true">
                        <path :d="mdiDotsHorizontal" />
                    </svg>
                </button>
            </div>
        </div>

        <teleport to="body">
            <div v-if="open && hasMoreItems" ref="menuRef" role="menu" :style="menuStyle"
                class="fixed z-[9999] w-48 overflow-hidden rounded-xl border bg-white shadow-lg">
                <button v-for="item in moreItems" :key="item.key" role="menuitem"
                    class="w-full px-3 py-2 text-left text-sm flex items-center gap-2"
                    :class="[toneClass(item), 'hover:bg-gray-50']"
                    :title="item.label"
                    @click="handleMenuItem(item)">
                    <svg v-if="item.icon" class="w-4 h-4" viewBox="0 0 24 24">
                        <path :d="item.icon" />
                    </svg>
                    <span class="truncate">{{ item.key === 'delete' && confirmDelete ? 'Confirm delete' : item.label }}</span>
                </button>
            </div>
        </teleport>
    </div>
</template>
