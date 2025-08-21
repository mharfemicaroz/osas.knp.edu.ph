<script setup>
import { containerMaxW } from '@/config.js'
</script>

<template>
    <section class="container mx-auto p-4 sm:p-6" :class="containerMaxW">
        <slot />
    </section>
</template>
