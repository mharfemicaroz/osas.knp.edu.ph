<!-- src/components/BaseIcon.vue -->
<template>
    <svg :width="size" :height="size" viewBox="0 0 24 24" class="shrink-0" :class="cls" aria-hidden="true"
        focusable="false">
        <path :d="path" fill="currentColor" />
    </svg>
</template>

<script setup>
import { toRefs } from 'vue'
defineOptions({ name: "BaseIcon" });

const props = defineProps({
    path: { type: String, required: true },            // from @mdi/js
    size: { type: [Number, String], default: 20 },
    cls: { type: [String, Array, Object], default: "text-white-300" },
});

const { path, size, cls } = toRefs(props);
</script>
