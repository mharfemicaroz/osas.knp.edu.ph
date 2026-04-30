<script setup>
import { computed, onMounted, reactive } from "vue";
import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionMain from "@/components/SectionMain.vue";
import Badge from "@/components/commons/Badge.vue";
import NotificationBar from "@/components/NotificationBar.vue";
import DisciplineModuleNav from "@/components/discipline/DisciplineModuleNav.vue";
import { appealsGuidelines, confidentialityRules } from "@/data/disciplineModule";
import { useDisciplineCaseStore } from "@/stores/disciplineCase";

const store = useDisciplineCaseStore();

const appealForm = reactive({
  submitted_by_name: "",
  submitted_by_relationship: "parent",
  appeal_reason: "",
  new_evidence_summary: "",
  status: "submitted",
  submitted_at: "",
});

const recordForm = reactive({
  record_type: "decision_letter",
  title: "",
  content_text: "",
  storage_location: "Password-protected digital database",
  confidentiality_level: "highly_confidential",
});

const rows = computed(() => store.items?.data || []);
const selected = computed(() => store.selected);

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

async function submitAppeal() {
  if (!selected.value?.id) return;
  await store.createAppeal(selected.value.id, {
    ...appealForm,
    submitted_at: appealForm.submitted_at || null,
  });
  Object.assign(appealForm, {
    submitted_by_name: "",
    submitted_by_relationship: "parent",
    appeal_reason: "",
    new_evidence_summary: "",
    status: "submitted",
    submitted_at: "",
  });
}

async function submitRecord() {
  if (!selected.value?.id) return;
  await store.createRecord(selected.value.id, { ...recordForm });
  Object.assign(recordForm, {
    record_type: "decision_letter",
    title: "",
    content_text: "",
    storage_location: "Password-protected digital database",
    confidentiality_level: "highly_confidential",
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
            <i class="mdi mdi-file-document-check-outline"></i>
            <span>Appeals and Records</span>
          </div>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-900">Appeal Handling, Notification, and Confidential Records</h1>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Register appeals, preserve closing documents, and keep confidential records organized for review by the Prefect of Discipline and School Administration.
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
                  <div class="text-sm font-bold text-slate-900">{{ item.reference_code }}</div>
                  <div class="mt-1 text-sm text-slate-700">{{ item.student_name }}</div>
                  <div class="text-xs text-slate-500">{{ humanize(item.status) }}</div>
                </button>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Appeals Process</h2>
              <div class="mt-5 space-y-4">
                <div v-for="(item, index) in appealsGuidelines" :key="item" class="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{{ index + 1 }}</div>
                  <div class="text-sm leading-6 text-slate-700">{{ item }}</div>
                </div>
              </div>
              <div class="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div class="text-sm font-bold text-amber-900">Appeal Deadline</div>
                <p class="mt-2 text-sm leading-6 text-amber-800">
                  Written appeals must be filed within three school days from receipt of the disciplinary decision unless school administration accepts a justified late filing.
                </p>
              </div>
            </div>
          </div>

          <div class="xl:col-span-8 space-y-6">
            <div v-if="selected" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">{{ selected.reference_code }} - {{ selected.student_name }}</h2>
                  <p class="text-sm text-slate-500">Appeal deadline: {{ formatDate(selected.appeal_deadline_at) }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <Badge :text="humanize(selected.status)" tone="gray" />
                  <Badge :text="selected.parental_notification_sent_at ? 'Parent notified' : 'Parent notice pending'" :tone="selected.parental_notification_sent_at ? 'emerald' : 'amber'" />
                </div>
              </div>

              <div class="mt-5 grid gap-6 xl:grid-cols-12">
                <div class="xl:col-span-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Register Appeal</h3>
                  <div class="mt-4 grid gap-3">
                    <input v-model="appealForm.submitted_by_name" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Submitted by">
                    <div class="grid gap-3 md:grid-cols-2">
                      <select v-model="appealForm.submitted_by_relationship" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="parent">Parent</option><option value="guardian">Guardian</option><option value="student">Student</option><option value="representative">Representative</option></select>
                      <select v-model="appealForm.status" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="submitted">Submitted</option><option value="in_review">In review</option><option value="upheld">Upheld</option><option value="modified">Modified</option><option value="overturned">Overturned</option><option value="denied">Denied</option></select>
                    </div>
                    <input v-model="appealForm.submitted_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <textarea v-model="appealForm.appeal_reason" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Grounds for appeal"></textarea>
                    <textarea v-model="appealForm.new_evidence_summary" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="New evidence summary"></textarea>
                    <button class="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90" @click="submitAppeal">Save Appeal</button>
                  </div>
                </div>

                <div class="xl:col-span-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 class="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Create Confidential Record</h3>
                  <div class="mt-4 grid gap-3">
                    <select v-model="recordForm.record_type" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="notice_of_allegation">Notice of allegation</option><option value="finding_of_facts">Finding of facts</option><option value="decision_letter">Decision letter</option><option value="appeal_letter">Appeal letter</option><option value="appeal_resolution">Appeal resolution</option><option value="evidence_index">Evidence index</option><option value="parent_notice">Parent notice</option><option value="other">Other</option></select>
                    <input v-model="recordForm.title" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Document title">
                    <textarea v-model="recordForm.content_text" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Document summary or contents"></textarea>
                    <input v-model="recordForm.storage_location" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Storage location">
                    <input v-model="recordForm.confidentiality_level" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Confidentiality level">
                    <button class="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" @click="submitRecord">Save Record</button>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="selected" class="grid gap-6 xl:grid-cols-12">
              <div class="xl:col-span-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900">Appeals Register</h2>
                <div class="mt-4 space-y-3">
                  <div v-for="item in selected.appeals || []" :key="item.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div><div class="text-sm font-bold text-slate-900">{{ item.submitted_by_name }}</div><div class="text-xs uppercase tracking-[0.16em] text-slate-400">{{ humanize(item.status) }}</div></div>
                      <div class="text-xs text-slate-500">{{ formatDate(item.submitted_at || item.created_at) }}</div>
                    </div>
                    <div class="mt-2 text-sm text-slate-700">{{ item.appeal_reason }}</div>
                    <div v-if="item.new_evidence_summary" class="mt-2 text-sm text-slate-500">New evidence: {{ item.new_evidence_summary }}</div>
                    <div v-if="item.decision_summary" class="mt-2 text-sm text-slate-500">Decision: {{ item.decision_summary }}</div>
                  </div>
                  <div v-if="!(selected.appeals || []).length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No appeals encoded yet for this case.</div>
                </div>
              </div>

              <div class="xl:col-span-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 class="text-lg font-bold text-slate-900">Confidential Records</h2>
                <div class="mt-4 space-y-3">
                  <div v-for="item in selected.records || []" :key="item.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div class="flex items-start justify-between gap-4">
                      <div><div class="text-sm font-bold text-slate-900">{{ item.title }}</div><div class="text-xs uppercase tracking-[0.16em] text-slate-400">{{ humanize(item.record_type) }}</div></div>
                      <div class="text-xs text-slate-500">{{ item.confidentiality_level || "confidential" }}</div>
                    </div>
                    <div class="mt-2 text-sm text-slate-700">{{ item.content_text || "No summary provided." }}</div>
                    <div class="mt-2 text-sm text-slate-500">Storage: {{ item.storage_location || "Not specified" }}</div>
                  </div>
                  <div v-if="!(selected.records || []).length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No records encoded yet for this case.</div>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Confidentiality Controls</h2>
              <div class="mt-5 grid gap-3 md:grid-cols-2">
                <div v-for="rule in confidentialityRules" :key="rule" class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{{ rule }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionMain>
  </LayoutAuthenticated>
</template>
