<template>
    <nav v-if="show" class="bg-secondary text-white md:hidden overflow-x-auto">
        <ul class="flex space-x-4 p-2 whitespace-nowrap">
            <li v-for="(item, index) in menuAside" :key="index">
                <router-link :to="item.to" active-class="bg-tertiary"
                    class="flex items-center p-2 hover:bg-tertiary rounded">
                    <BaseIcon :path="item.icon" :size="20" cls="mr-2 text-yellow-300" />
                    <span class="text-sm">{{ item.label }}</span>
                </router-link>
            </li>
        </ul>
    </nav>
</template>

<script setup>
import menuAside from "@/menu/menuAside";
import BaseIcon from "@/components/commons/BaseIcon.vue";

defineOptions({ name: "AppMobileNav" });

defineProps({
    show: { type: Boolean, default: false },
});
</script>
