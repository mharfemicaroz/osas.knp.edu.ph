<template>
    <router-link v-if="item.to" :to="item.to" active-class="bg-tertiary"
        class="flex items-center p-2 hover:bg-tertiary rounded">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
        <span>{{ item.label }}</span>
    </router-link>

    <span v-else class="flex items-center p-2 text-gray-400 cursor-not-allowed">
        <BaseIcon :path="item.icon" :size="20" cls="mr-2" />
        <span>{{ item.label }}</span>
    </span>
</template>

<script setup>
import BaseIcon from "@/components/commons/BaseIcon.vue";

defineOptions({ name: "NavbarItem" });

defineProps({
    item: { type: Object, required: true }
});
</script>
