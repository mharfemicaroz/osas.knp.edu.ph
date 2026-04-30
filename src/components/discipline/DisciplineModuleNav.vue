<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";

const route = useRoute();

const links = [
  {
    name: "student-discipline-conduct",
    label: "Dashboard",
    icon: "mdi-view-dashboard-outline",
  },
  {
    name: "student-discipline-cases",
    label: "Case Workflow",
    icon: "mdi-clipboard-text-search-outline",
  },
  {
    name: "student-discipline-sanctions",
    label: "Sanctions & Offenses",
    icon: "mdi-gavel",
  },
  {
    name: "student-discipline-appeals",
    label: "Appeals & Records",
    icon: "mdi-file-document-check-outline",
  },
];

const activeName = computed(() => route.name);
</script>

<template>
  <div class="rounded-[1.75rem] border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur">
    <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
      <RouterLink
        v-for="link in links"
        :key="link.name"
        :to="{ name: link.name }"
        class="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition"
        :class="activeName === link.name ? 'bg-primary text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'"
      >
        <span
          class="inline-flex h-10 w-10 items-center justify-center rounded-2xl"
          :class="activeName === link.name ? 'bg-white/15 text-white' : 'bg-white text-primary ring-1 ring-slate-200'"
        >
          <i :class="['mdi text-xl', link.icon]"></i>
        </span>
        <span>{{ link.label }}</span>
      </RouterLink>
    </div>
  </div>
</template>
