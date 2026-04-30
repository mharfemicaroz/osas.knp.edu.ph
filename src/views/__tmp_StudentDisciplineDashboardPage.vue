<script setup>
import { computed, onMounted } from "vue";
import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionMain from "@/components/SectionMain.vue";
import Badge from "@/components/commons/Badge.vue";
import NotificationBar from "@/components/NotificationBar.vue";
import DisciplineModuleNav from "@/components/discipline/DisciplineModuleNav.vue";
import { disciplineProcessSteps, sanctionMatrix, getStepMeta } from "@/data/disciplineModule";
import { useDisciplineCaseStore } from "@/stores/disciplineCase";

const store = useDisciplineCaseStore();
const dashboard = computed(() => store.dashboard || {});
const totals = computed(() => dashboard.value.totals || {});
const activeCases = computed(() => dashboard.value.active_cases || []);
const categorySummary = computed(() => dashboard.value.category_breakdown || []);

const metrics = computed(() => [
  { label: "Logged Cases", value: totals.value.total_cases || 0, note: "All discipline cases recorded in the active database", icon: "mdi-clipboard-text-outline", tone: "text-primary", bg: "bg-primary/10" },
  { label: "Critical Cases", value: totals.value.critical_cases || 0, note: "Priority cases requiring immediate administrative attention", icon: "mdi-alert-octagon-outline", tone: "text-rose-700", bg: "bg-rose-100" },
  { label: "Active Investigations", value: totals.value.active_investigations || 0, note: "Cases still under formal fact-finding and evidence review", icon: "mdi-magnify-scan", tone: "text-amber-700", bg: "bg-amber-100" },
  { label: "Awaiting Decision", value: totals.value.awaiting_decision || 0, note: "Cases ready for findings issuance or sanction action", icon: "mdi-gavel", tone: "text-emerald-700", bg: "bg-emerald-100" },
]);

function priorityTone(priority) {
  if (priority === "critical") return "red";
  if (priority === "high") return "amber";
  if (priority === "medium") return "blue";
  return "gray";
}

function categoryTone(category) {
  if (category === "A") return "emerald";
  if (category === "B") return "amber";
  return "red";
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString();
}

function humanizeStatus(value) {
  return String(value || "").split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

onMounted(async () => {
  await store.fetchDashboard(true);
});
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <section class="space-y-6">
        <div class="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_#0f766e_0%,_#0f172a_52%,_#1e40af_100%)] px-6 py-8 text-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.55)] sm:px-8">
          <div class="absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl"></div>
          <div class="absolute -left-6 bottom-0 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl"></div>
          <div class="relative">
            <div class="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.24em]">
              <i class="mdi mdi-scale-balance text-sm"></i>
              <span>Prefect of Discipline</span>
            </div>
            <h1 class="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Student Discipline and Conduct Dashboard</h1>
            <p class="mt-4 max-w-3xl text-sm leading-7 text-slate-100/90 sm:text-base">
              Monitor disciplinary matters from intake through appeal, surface urgent cases early, and keep due-process records in one operational workspace.
            </p>
          </div>
        </div>

        <NotificationBar v-if="store.error" color="danger">{{ store.error }}</NotificationBar>

        <DisciplineModuleNav />

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div v-for="metric in metrics" :key="metric.label" class="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-medium text-slate-500">{{ metric.label }}</div>
                <div class="mt-3 text-3xl font-black text-slate-900">{{ metric.value }}</div>
                <p class="mt-2 text-sm leading-6 text-slate-500">{{ metric.note }}</p>
              </div>
              <div :class="['inline-flex h-14 w-14 items-center justify-center rounded-2xl', metric.bg]">
                <i :class="['mdi text-3xl', metric.icon, metric.tone]"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div class="xl:col-span-8 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div class="flex items-center justify-between gap-4">
              <div>
                <h2 class="text-lg font-bold text-slate-900">Active Discipline Queue</h2>
                <p class="text-sm text-slate-500">Live cases coming from the backend discipline register.</p>
              </div>
              <RouterLink :to="{ name: 'student-discipline-cases' }" class="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">
                <span>Open Case Workflow</span>
                <i class="mdi mdi-arrow-right"></i>
              </RouterLink>
            </div>

            <div class="mt-5 space-y-3">
              <div v-if="!activeCases.length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                No active cases yet. Create the first intake record in the case workflow page.
              </div>

              <div v-for="item in activeCases" :key="item.id" class="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <Badge :text="item.reference_code" tone="gray" />
                      <Badge :text="`Category ${item.category}`" :tone="categoryTone(item.category)" />
                      <Badge :text="String(item.priority || '').toUpperCase()" :tone="priorityTone(item.priority)" />
                    </div>
                    <h3 class="mt-3 text-base font-bold text-slate-900">{{ item.student_name }}</h3>
                    <p class="text-sm text-slate-600">{{ item.course_block || "Course or block not set" }}<span v-if="item.student_school_id"> | {{ item.student_school_id }}</span></p>
                    <p class="mt-2 text-sm text-slate-700">{{ item.offense_title }}</p>
                    <p class="mt-1 text-sm text-slate-500">{{ item.offense_description }}</p>
                  </div>

                  <div class="min-w-[240px] rounded-2xl border border-slate-200 bg-white p-4">
                    <div class="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Current Stage</div>
                    <div class="mt-2 text-sm font-bold text-slate-900">{{ getStepMeta(item.current_step).title }}</div>
                    <div class="mt-1 text-sm text-slate-500">{{ humanizeStatus(item.status) }}</div>
                    <div class="mt-3 text-xs text-slate-500">
                      Reporter: {{ item.reporter_name }}<br>
                      Incident: {{ formatDate(item.incident_at) }}<br>
                      Assignee: {{ item.assignee ? `${item.assignee.first_name} ${item.assignee.last_name}` : "Unassigned" }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="xl:col-span-4 space-y-6">
            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Five-Step Process</h2>
              <div class="mt-5 space-y-4">
                <div v-for="step in disciplineProcessSteps" :key="step.key" class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div class="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{{ step.step }}</div>
                  <div class="mt-1 text-sm font-bold text-slate-900">{{ step.title }}</div>
                  <p class="mt-2 text-sm leading-6 text-slate-600">{{ step.summary }}</p>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Sanction Matrix Snapshot</h2>
              <div class="mt-4 space-y-3">
                <div v-for="row in sanctionMatrix" :key="row.band" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="text-sm font-bold text-slate-900">{{ row.band }}</div>
                  <div class="mt-2 text-sm text-slate-600">{{ row.examples }}</div>
                  <div class="mt-2 text-sm font-medium text-slate-800">{{ row.actions }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div class="xl:col-span-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900">Offense Distribution</h2>
            <div class="mt-5 grid grid-cols-1 gap-3">
              <div v-for="item in categorySummary" :key="item.category" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center justify-between">
                  <div>
                    <div class="text-sm font-bold text-slate-900">Category {{ item.category }}</div>
                    <div class="text-sm text-slate-500">{{ item.category === "A" ? "Minor" : item.category === "B" ? "Major" : "Grave" }}</div>
                  </div>
                  <div class="text-3xl font-black text-slate-900">{{ item.count }}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="xl:col-span-7 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
            <h2 class="text-lg font-bold text-slate-900">Case Management Priorities</h2>
            <div class="mt-5 grid gap-4 md:grid-cols-2">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div class="text-sm font-bold text-slate-900">Immediate Actions</div>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Issue formal notices before interviews begin.</li>
                  <li>Preserve screenshots, CCTV references, witness statements, and uploaded attachments in one case packet.</li>
                  <li>Escalate grave offenses needing CHED-governed sanctions to school administration early.</li>
                </ul>
              </div>
              <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div class="text-sm font-bold text-slate-900">Administrative Controls</div>
                <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                  <li>Track offense repetition to distinguish first, second, and third offenses.</li>
                  <li>Maintain parent or guardian notification status and appeal deadline dates.</li>
                  <li>Keep findings, sanctions, and appeal records complete before closure.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionMain>
  </LayoutAuthenticated>
</template>
