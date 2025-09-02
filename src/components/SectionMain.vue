<!-- Sectionmain.vue -->
<script setup>
import { containerMaxW } from '@/config.js'
</script>

<template>
    <!-- full bleed container, no spacing -->
    <section class="w-full h-full m-0 p-0" :class="containerMaxW">
        <slot />
    </section>
</template>
