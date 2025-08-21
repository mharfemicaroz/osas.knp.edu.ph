<template>
    <aside class="w-64 bg-secondary text-white p-4 hidden md:block">
        <nav>
            <h2 class="text-lg font-bold mb-4 text-yellow-300">Navigation</h2>
            <NavbarMenuList :menu="menuAside" />
            <a href="#" @click.prevent.stop="$emit('request-logout')"
                class="flex items-center p-2 hover:bg-tertiary rounded mt-4">
                <BaseIcon :path="mdiLogout" :size="20" cls="mr-2 text-yellow-300" />
                <span>Log Out</span>
            </a>
        </nav>
    </aside>
</template>

<script setup>
import menuAside from "@/menu/menuAside";
import NavbarMenuList from "./NavbarMenuList.vue";
import BaseIcon from "@/components/commons/BaseIcon.vue";
import { mdiLogout } from "@mdi/js";

defineOptions({ name: "AppSidebar" });

defineEmits(["request-logout"]);
</script>
