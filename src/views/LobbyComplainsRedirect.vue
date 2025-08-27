<!-- src/views/LobbyComplainsRedirect.vue -->
<template>
    <div class="p-6">
        <h1 class="text-xl font-semibold">Opening your email…</h1>
        <p>If nothing happens, <a :href="mailtoHref">click here</a>.</p>
    </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";

const mailtoHref = "mailto:osas@knp.edu.ph";
const router = useRouter();

onMounted(() => {
    window.open(mailtoHref, "_self");
    router.replace({ name: "dashboard" });
});
</script>
