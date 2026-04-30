<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import LayoutLanding from "@/layouts/LayoutLanding.vue";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const authStore = useAuthStore();

const fullName = computed(() => {
  const firstName = authStore.user?.first_name || "";
  const lastName = authStore.user?.last_name || "";
  return [firstName, lastName].filter(Boolean).join(" ") || authStore.user?.username || "Administrator";
});

const menuCards = [
  {
    key: "sdos",
    title: "Student Development and Organization Services",
    shortTitle: "SDOS",
    subtitle: "Core OSAS workflow for dashboards, clubs, plans, activities, utilization, liquidations, and related operations.",
    icon: "mdi-view-dashboard-outline",
    accent: "from-primary via-sky-700 to-cyan-600",
    ring: "ring-primary/20",
    iconWrap: "bg-white/16 text-white",
    actionLabel: "Open SDOS",
    route: { name: "dashboard" },
  },
  {
    key: "welfare",
    title: "Student Welfare Services",
    shortTitle: "Student Welfare Services",
    subtitle: "Reserved route for welfare modules and service workflows. This section is ready for future development.",
    icon: "mdi-heart-pulse",
    accent: "from-emerald-600 via-teal-600 to-cyan-600",
    ring: "ring-emerald-500/20",
    iconWrap: "bg-emerald-100 text-emerald-700",
    actionLabel: "Open Placeholder",
    route: { name: "student-welfare-services" },
  },
  {
    key: "discipline",
    title: "Student Discipline and Conduct",
    shortTitle: "Student Discipline and Conduct",
    subtitle: "Reserved route for discipline, case handling, and conduct-related processes. This section is ready for future development.",
    icon: "mdi-scale-balance",
    accent: "from-amber-600 via-orange-600 to-rose-600",
    ring: "ring-amber-500/20",
    iconWrap: "bg-amber-100 text-amber-700",
    actionLabel: "Open Placeholder",
    route: { name: "student-discipline-conduct" },
  },
];

function openCard(card) {
  router.push(card.route);
}
</script>

<template>
  <LayoutLanding>
    <section class="relative overflow-hidden">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,116,144,0.18),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(2,132,199,0.12),_transparent_28%),linear-gradient(180deg,_#f8fafc_0%,_#eef6ff_38%,_#f8fafc_100%)]"></div>
      <div class="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/10 blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-cyan-200/30 blur-3xl"></div>

      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-primary shadow-sm backdrop-blur">
            <i class="mdi mdi-compass-outline text-sm"></i>
            <span>Service Landing Route</span>
          </div>
          <h1 class="mt-5 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Welcome, {{ fullName }}.
          </h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Choose the service area you want to access. Student Development and Organization Services (SDOS) opens the current OSAS administrative system, while Student Welfare Services and Student Discipline and Conduct are prepared as dedicated service portals for their respective functions.
          </p>
        </div>

        <div class="mt-10 grid grid-cols-1 gap-6 xl:grid-cols-12">
          <button
            v-for="card in menuCards"
            :key="card.key"
            type="button"
            class="group relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 text-left shadow-[0_18px_60px_-28px_rgba(15,23,42,0.45)] ring-1 backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_80px_-30px_rgba(15,23,42,0.5)]"
            :class="[card.ring, card.key === 'sdos' ? 'xl:col-span-6' : 'xl:col-span-3']"
            @click="openCard(card)"
          >
            <div v-if="card.key === 'sdos'" class="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r" :class="card.accent"></div>
            <div
              v-else
              class="absolute inset-0 opacity-0 transition duration-300 group-hover:opacity-100"
              :class="['bg-gradient-to-br', card.accent]"
              style="mask-image: linear-gradient(to bottom, rgba(0,0,0,0.14), transparent 58%);"
            ></div>

            <div class="relative flex h-full flex-col p-6 sm:p-7">
              <div class="flex items-start justify-between gap-4">
                <div
                  class="inline-flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ring-1 ring-black/5"
                  :class="[card.iconWrap, card.key === 'sdos' ? 'bg-primary text-white' : '']"
                >
                  <i :class="['mdi text-3xl', card.icon]"></i>
                </div>

                <span
                  class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]"
                  :class="card.key === 'sdos' ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'"
                >
                  {{ card.shortTitle }}
                </span>
              </div>

              <div class="mt-7">
                <h2 class="text-xl font-bold text-slate-900 sm:text-2xl">
                  {{ card.title }}
                </h2>
                <p class="mt-3 text-sm leading-7 text-slate-600">
                  {{ card.subtitle }}
                </p>
              </div>

              <div class="mt-8 flex items-center justify-between border-t border-slate-200/80 pt-5">
                <span class="text-sm font-semibold text-slate-700">{{ card.actionLabel }}</span>
                <span
                  class="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition group-hover:border-primary group-hover:bg-primary group-hover:text-white"
                >
                  <i class="mdi mdi-arrow-right text-xl"></i>
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
    </section>
  </LayoutLanding>
</template>
