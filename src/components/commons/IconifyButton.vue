<!-- src/components/commons/IconifyButton.vue -->
<script setup>
/**
 * Small, rounded icon button with optional label and tooltip.
 * Props:
 * - iconPath: mdi path string
 * - color: tailwind text color (e.g. 'text-blue-600')
 * - variant: 'ghost' | 'solid'
 * - label: optional text shown next to icon on md+ screens
 * - tooltip: string for title + aria-label
 * - size: 'sm' | 'md'
 */
const props = defineProps({
    iconPath: { type: String, required: true },
    color: { type: String, default: 'text-gray-700' },
    variant: { type: String, default: 'ghost' },
    label: { type: String, default: '' },
    tooltip: { type: String, default: '' },
    size: { type: String, default: 'sm' },
    disabled: { type: Boolean, default: false },
    throttleMs: { type: Number, default: 1200 },
})
const emit = defineEmits(['click'])

let locked = false
const handleClick = () => {
    if (props.disabled || locked) return
    locked = true
    emit('click')
    setTimeout(() => { locked = false }, Math.max(0, Number(props.throttleMs) || 0))
}

const base =
    'inline-flex items-center gap-2 rounded-xl transition focus:outline-none focus:ring-2 focus:ring-offset-1'
const sizes = {
    sm: 'px-2 py-1 text-[12px]',
    md: 'px-3 py-1.5 text-sm',
}
const variants = {
    ghost: 'bg-transparent hover:bg-gray-100',
    solid: 'text-white hover:opacity-90',
}
</script>

<template>
    <button :title="tooltip || label" :aria-label="tooltip || label" :disabled="disabled" :class="[
        base,
        sizes[size],
        variant === 'solid' ? 'bg-gray-800' : '',
        variant === 'ghost' ? variants.ghost : variants.solid,
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        color,
    ]" @click="handleClick">
        <svg :style="{ width: size === 'sm' ? '18px' : '20px', height: size === 'sm' ? '18px' : '20px' }"
            viewBox="0 0 24 24" aria-hidden="true">
            <path :d="iconPath" />
        </svg>
        <!-- show label on md+ screens only to keep rows compact -->
        <span class="hidden md:inline-block">{{ label }}</span>
    </button>
</template>
