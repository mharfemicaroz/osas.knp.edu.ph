<template>
    <ul>
        <li v-for="(item, index) in menu" :key="index" class="mb-2">
            <NavbarItem :item="item" />
        </li>
    </ul>
</template>

<script setup>
import NavbarItem from "./NavbarItem.vue";

defineOptions({ name: "NavbarMenuList" });

defineProps({
    menu: { type: Array, default: () => [] }
});
</script>
