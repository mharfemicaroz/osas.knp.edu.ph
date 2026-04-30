<script setup>
import { computed, onMounted, reactive } from "vue";
import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionMain from "@/components/SectionMain.vue";
import Badge from "@/components/commons/Badge.vue";
import NotificationBar from "@/components/NotificationBar.vue";
import DisciplineModuleNav from "@/components/discipline/DisciplineModuleNav.vue";
import { offenseCategories, sanctionTiers, sanctionMatrix } from "@/data/disciplineModule";
import { useDisciplineCaseStore } from "@/stores/disciplineCase";

const store = useDisciplineCaseStore();

const sanctionForm = reactive({
  offense_level: "minor",
  sanction_type: "",
  sanction_details: "",
  duration_value: "",
  duration_unit: "hours",
  requires_ched_approval: false,
  approval_status: "not_required",
  restitution_amount: "",
  effective_start_at: "",
  effective_end_at: "",
  imposed_at: "",
});

const rows = computed(() => store.items?.data || []);
const selected = computed(() => store.selected);

function toneFor(tone) {
  return tone || "gray";
}

function categoryTone(category) {
  if (category === "A") return "emerald";
  if (category === "B") return "amber";
  return "red";
}

function humanize(value) {
  return String(value || "").split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

async function fetchCases() {
  await store.fetchAll({ page: 1, limit: 50 }, true);
  if (!selected.value?.id && rows.value.length) await store.fetchById(rows.value[0].id);
}

async function selectCase(id) {
  if (!id) return;
  await store.fetchById(id);
}

async function submitSanction() {
  if (!selected.value?.id) return;
  await store.createSanction(selected.value.id, {
    ...sanctionForm,
    duration_value: sanctionForm.duration_value === "" ? null : Number(sanctionForm.duration_value),
    restitution_amount: sanctionForm.restitution_amount === "" ? null : sanctionForm.restitution_amount,
    effective_start_at: sanctionForm.effective_start_at || null,
    effective_end_at: sanctionForm.effective_end_at || null,
    imposed_at: sanctionForm.imposed_at || null,
  });
  Object.assign(sanctionForm, {
    offense_level: "minor",
    sanction_type: "",
    sanction_details: "",
    duration_value: "",
    duration_unit: "hours",
    requires_ched_approval: false,
    approval_status: "not_required",
    restitution_amount: "",
    effective_start_at: "",
    effective_end_at: "",
    imposed_at: "",
  });
}

onMounted(async () => {
  await fetchCases();
});
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <section class="space-y-6">
        <div class="rounded-[2rem] border border-slate-200 bg-white px-6 py-7 shadow-sm">
          <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            <i class="mdi mdi-gavel"></i>
            <span>Sanctions and Offenses</span>
          </div>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-900">Sanction Framework and Offense Catalog</h1>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Apply sanctions to live cases while keeping the policy framework and offense classifications visible to the discipline office.
          </p>
        </div>

        <NotificationBar v-if="store.error" color="danger">{{ store.error }}</NotificationBar>
        <DisciplineModuleNav />

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div class="xl:col-span-4 space-y-6">
            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Select Case</h2>
              <div class="mt-4 space-y-3">
                <button v-for="item in rows" :key="item.id" class="w-full rounded-2xl border p-4 text-left transition" :class="selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'" @click="selectCase(item.id)">
                  <div class="flex flex-wrap gap-2">
                    <Badge :text="item.reference_code" tone="gray" />
                    <Badge :text="`Category ${item.category}`" :tone="categoryTone(item.category)" />
                  </div>
                  <div class="mt-3 text-sm font-bold text-slate-900">{{ item.student_name }}</div>
                  <div class="text-xs text-slate-500">{{ item.offense_title }}</div>
                </button>
              </div>
            </div>

            <div v-for="tier in sanctionTiers" :key="tier.key" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">{{ tier.title }}</h2>
                  <p class="mt-2 text-sm leading-6 text-slate-600">{{ tier.description }}</p>
                </div>
                <Badge :text="tier.title" :tone="toneFor(tier.tone)" />
              </div>
              <ul class="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                <li v-for="sanction in tier.sanctions" :key="sanction" class="flex gap-3"><i class="mdi mdi-check-decagram-outline mt-0.5 text-primary"></i><span>{{ sanction }}</span></li>
              </ul>
            </div>
          </div>

          <div class="xl:col-span-8 space-y-6">
            <div v-if="selected" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">{{ selected.reference_code }} - {{ selected.student_name }}</h2>
                  <p class="text-sm text-slate-500">{{ selected.offense_title }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge :text="humanize(selected.status)" tone="gray" />
                  <Badge :text="`Category ${selected.category}`" :tone="categoryTone(selected.category)" />
                </div>
              </div>

              <div class="mt-5 grid gap-6 xl:grid-cols-12">
                <div class="xl:col-span-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Add Sanction</h3>
                  <div class="mt-4 grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2">
                      <select v-model="sanctionForm.offense_level" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="minor">Minor</option><option value="serious">Serious</option><option value="grave">Grave</option></select>
                      <select v-model="sanctionForm.approval_status" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="not_required">Approval not required</option><option value="pending">Approval pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
                    </div>
                    <input v-model="sanctionForm.sanction_type" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Sanction type">
                    <textarea v-model="sanctionForm.sanction_details" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Sanction details"></textarea>
                    <div class="grid gap-3 md:grid-cols-3">
                      <input v-model="sanctionForm.duration_value" type="number" min="0" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Duration">
                      <input v-model="sanctionForm.duration_unit" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Unit">
                      <input v-model="sanctionForm.restitution_amount" type="number" min="0" step="0.01" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Restitution">
                    </div>
                    <div class="grid gap-3 md:grid-cols-3">
                      <input v-model="sanctionForm.imposed_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <input v-model="sanctionForm.effective_start_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <input v-model="sanctionForm.effective_end_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    </div>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-600"><input v-model="sanctionForm.requires_ched_approval" type="checkbox"><span>Requires CHED approval</span></label>
                    <button class="rounded-2xl bg-rose-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600" @click="submitSanction">Save Sanction</button>
                  </div>
                </div>

                <div class="xl:col-span-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Live Sanction Register</h3>
                  <div class="mt-4 space-y-3">
                    <div v-for="item in selected.sanctions || []" :key="item.id" class="rounded-2xl border border-slate-200 bg-white p-4">
                      <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <div class="text-sm font-bold text-slate-900">{{ item.sanction_type }}</div>
                          <div class="text-xs uppercase tracking-[0.16em] text-slate-400">{{ humanize(item.offense_level) }} offense</div>
                          <div class="mt-2 text-sm text-slate-700">{{ item.sanction_details || "No details provided." }}</div>
                        </div>
                        <div class="flex flex-wrap gap-2">
                          <Badge :text="humanize(item.approval_status)" :tone="item.approval_status === 'approved' ? 'emerald' : item.approval_status === 'rejected' ? 'red' : item.approval_status === 'pending' ? 'amber' : 'gray'" />
                          <Badge :text="item.requires_ched_approval ? 'CHED approval' : 'Internal approval'" tone="blue" />
                        </div>
                      </div>
                      <div class="mt-3 grid gap-2 text-sm text-slate-500 md:grid-cols-2">
                        <div>Duration: {{ item.duration_value != null ? `${item.duration_value} ${item.duration_unit || ''}` : "Not set" }}</div>
                        <div>Restitution: {{ item.restitution_amount || "Not set" }}</div>
                        <div>Imposed: {{ formatDate(item.imposed_at) }}</div>
                        <div>Effective: {{ formatDate(item.effective_start_at) }} to {{ formatDate(item.effective_end_at) }}</div>
                      </div>
                    </div>
                    <div v-if="!(selected.sanctions || []).length" class="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">No sanctions encoded yet for this case.</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Illustrative Sanction Matrix</h2>
              <div class="mt-5 overflow-x-auto">
                <table class="min-w-full border-separate border-spacing-y-3">
                  <thead>
                    <tr class="text-left text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th class="px-4 py-2">Band</th><th class="px-4 py-2">Typical Example</th><th class="px-4 py-2">Sanction Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in sanctionMatrix" :key="row.band" class="rounded-2xl bg-slate-50">
                      <td class="rounded-l-2xl px-4 py-4 align-top text-sm font-bold text-slate-900">{{ row.band }}</td>
                      <td class="px-4 py-4 align-top text-sm leading-6 text-slate-600">{{ row.examples }}</td>
                      <td class="rounded-r-2xl px-4 py-4 align-top text-sm leading-6 text-slate-700">{{ row.actions }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="space-y-6">
              <div v-for="category in offenseCategories" :key="category.key" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <h2 class="text-lg font-bold text-slate-900">{{ category.title }}</h2>
                    <p class="mt-1 text-sm text-slate-500">{{ category.subtitle }}</p>
                  </div>
                  <Badge :text="category.subtitle" :tone="toneFor(category.tone)" />
                </div>
                <div class="mt-5 grid gap-3 md:grid-cols-2">
                  <div v-for="item in category.items" :key="item" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{{ item }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionMain>
  </LayoutAuthenticated>
</template>
