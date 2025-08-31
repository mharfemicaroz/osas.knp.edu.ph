<!-- src/components/layout/AppFooter.vue -->
<template>
    <footer class="bg-primary p-4 text-center text-white">
        <p class="text-sm">
            {{ currentYear }} &copy; OSAS Kiosk by
            <a href="#" target="_blank" class="text-yellow-300 hover:underline">Dr. Mharfe M. Micaroz</a>
        </p>
    </footer>
</template>

<script setup>
defineOptions({ name: "AppFooter" });

const currentYear = new Date().getFullYear();
</script>
