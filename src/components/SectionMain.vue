<script setup>
import { containerMaxW } from '@/config.js'
</script>

<template>
    <section class="w-full h-full m-0 p-0" :class="containerMaxW">
        <slot />
    </section>
</template>
