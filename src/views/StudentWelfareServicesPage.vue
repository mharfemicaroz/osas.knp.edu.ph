<script setup>
import LayoutLanding from "@/layouts/LayoutLanding.vue";
</script>

<template>
  <LayoutLanding>
    <section class="relative overflow-hidden bg-[linear-gradient(180deg,_#f8fafc_0%,_#f0fdfa_45%,_#f8fafc_100%)]">
      <div class="absolute -left-16 top-20 h-72 w-72 rounded-full bg-emerald-200/40 blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-teal-200/30 blur-3xl"></div>

      <div class="relative mx-auto flex min-h-[calc(100vh-176px)] max-w-5xl items-center px-4 py-12 sm:px-6 lg:px-8">
        <div class="w-full rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_20px_70px_-28px_rgba(15,23,42,0.35)] backdrop-blur sm:p-10">
          <div class="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
            <i class="mdi mdi-heart-pulse text-4xl"></i>
          </div>
          <h1 class="mt-6 text-3xl font-black tracking-tight text-slate-900">Student Welfare Services</h1>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            This route is intentionally empty for now. The page is in place so welfare-specific modules can be added later without revisiting the admin landing flow.
          </p>
          <div class="mt-8">
            <RouterLink
              :to="{ name: 'admin-landing' }"
              class="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              <i class="mdi mdi-arrow-left"></i>
              <span>Back to Service Landing</span>
            </RouterLink>
          </div>
        </div>
      </div>
    </section>
  </LayoutLanding>
</template>
