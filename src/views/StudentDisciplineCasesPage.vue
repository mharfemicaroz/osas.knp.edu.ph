<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import LayoutAuthenticated from "@/layouts/LayoutAuthenticated.vue";
import SectionMain from "@/components/SectionMain.vue";
import Badge from "@/components/commons/Badge.vue";
import NotificationBar from "@/components/NotificationBar.vue";
import DisciplineModuleNav from "@/components/discipline/DisciplineModuleNav.vue";
import { intakeChecklist, investigationChecklist, getStepMeta } from "@/data/disciplineModule";
import { useDisciplineCaseStore } from "@/stores/disciplineCase";

const store = useDisciplineCaseStore();
const filters = reactive({ q: "", category: "", current_step: "", priority: "" });
const attachmentFile = ref(null);
const showCreateForm = ref(false);
const activeWorkspaceTab = ref("overview");

const caseForm = reactive({
  student_name: "",
  student_school_id: "",
  course_block: "",
  reporter_name: "",
  reporter_type: "faculty",
  reporter_contact: "",
  incident_at: "",
  location: "",
  offense_title: "",
  offense_description: "",
  category: "A",
  offense_count: 1,
  priority: "medium",
  current_step: "intake",
  status: "intake_review",
  witness_information_text: "",
  evidence_summary_text: "",
  confidential_notes: "",
});

const progressForm = reactive({
  current_step: "intake",
  status: "intake_review",
  finding_summary: "",
  sanction_summary: "",
  confidential_notes: "",
  appeal_deadline_at: "",
});

const noteForm = reactive({
  note_type: "interview",
  title: "",
  content: "",
  interviewee_name: "",
  interviewee_role: "",
  occurred_at: "",
});

const findingForm = reactive({
  determination: "pending",
  finding_text: "",
  basis_summary: "",
  standard_used: "Preponderance of evidence",
  recommended_action: "",
  issued_at: "",
  is_final: false,
});

const rows = computed(() => store.items?.data || []);
const selected = computed(() => store.selected);
const selectedStepMeta = computed(() => getStepMeta(selected.value?.current_step || "intake"));
const queueSummary = computed(() => ({
  total: rows.value.length,
  intake: rows.value.filter((item) => item.current_step === "intake").length,
  investigation: rows.value.filter((item) => item.current_step === "investigation").length,
  decision: rows.value.filter((item) => ["findings", "sanctioning", "notification"].includes(item.current_step)).length,
}));

function categoryTone(category) {
  if (category === "A") return "emerald";
  if (category === "B") return "amber";
  return "red";
}

function priorityTone(priority) {
  if (priority === "critical") return "red";
  if (priority === "high") return "amber";
  if (priority === "medium") return "blue";
  return "gray";
}

function humanize(value) {
  return String(value || "").split("_").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function formatDateTime(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleString();
}

function toLines(value) {
  return String(value || "").split("\n").map((item) => item.trim()).filter(Boolean);
}

async function fetchCases(force = true) {
  const params = { ...filters };
  Object.keys(params).forEach((key) => !params[key] && delete params[key]);
  await store.fetchAll({ page: 1, limit: 50, ...params }, force);
  if (!selected.value?.id && rows.value.length) await store.fetchById(rows.value[0].id);
}

async function selectCase(id) {
  if (!id) return;
  await store.fetchById(id);
}

function syncProgressForm(row) {
  if (!row) return;
  progressForm.current_step = row.current_step || "intake";
  progressForm.status = row.status || "intake_review";
  progressForm.finding_summary = row.finding_summary || "";
  progressForm.sanction_summary = row.sanction_summary || "";
  progressForm.confidential_notes = row.confidential_notes || "";
  progressForm.appeal_deadline_at = row.appeal_deadline_at ? String(row.appeal_deadline_at).slice(0, 10) : "";
}

watch(() => selected.value, (row) => {
  syncProgressForm(row);
  if (row && !showCreateForm.value) activeWorkspaceTab.value = "overview";
}, { immediate: true });

async function submitCase() {
  const payload = {
    ...caseForm,
    witness_information: toLines(caseForm.witness_information_text),
    evidence_summary: toLines(caseForm.evidence_summary_text),
  };
  delete payload.witness_information_text;
  delete payload.evidence_summary_text;
  const created = await store.create(payload);
  Object.assign(caseForm, {
    student_name: "", student_school_id: "", course_block: "", reporter_name: "", reporter_type: "faculty",
    reporter_contact: "", incident_at: "", location: "", offense_title: "", offense_description: "",
    category: "A", offense_count: 1, priority: "medium", current_step: "intake", status: "intake_review",
    witness_information_text: "", evidence_summary_text: "", confidential_notes: "",
  });
  await fetchCases(true);
  if (created?.id) await selectCase(created.id);
  showCreateForm.value = false;
  activeWorkspaceTab.value = "overview";
}

async function saveProgress() {
  if (!selected.value?.id) return;
  await store.updateById(selected.value.id, {
    current_step: progressForm.current_step,
    status: progressForm.status,
    finding_summary: progressForm.finding_summary,
    sanction_summary: progressForm.sanction_summary,
    confidential_notes: progressForm.confidential_notes,
    appeal_deadline_at: progressForm.appeal_deadline_at || null,
  });
}

async function submitNote() {
  if (!selected.value?.id) return;
  await store.createInvestigationNote(selected.value.id, { ...noteForm, occurred_at: noteForm.occurred_at || null });
  Object.assign(noteForm, { note_type: "interview", title: "", content: "", interviewee_name: "", interviewee_role: "", occurred_at: "" });
}

async function submitFinding() {
  if (!selected.value?.id) return;
  await store.createFinding(selected.value.id, { ...findingForm, issued_at: findingForm.issued_at || null });
  Object.assign(findingForm, {
    determination: "pending", finding_text: "", basis_summary: "", standard_used: "Preponderance of evidence",
    recommended_action: "", issued_at: "", is_final: false,
  });
}

async function submitAttachment() {
  if (!selected.value?.id || !attachmentFile.value) return;
  await store.uploadAttachment(selected.value.id, attachmentFile.value);
  attachmentFile.value = null;
}

async function removeAttachment(attachmentId) {
  if (!selected.value?.id || !attachmentId) return;
  await store.deleteAttachment(selected.value.id, attachmentId);
}

onMounted(async () => {
  await fetchCases(true);
  showCreateForm.value = !rows.value.length;
});
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <section class="space-y-6">
        <div class="rounded-[2rem] border border-slate-200 bg-white px-6 py-7 shadow-sm">
          <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-slate-600">
            <i class="mdi mdi-clipboard-text-search-outline"></i>
            <span>Case Workflow</span>
          </div>
          <h1 class="mt-4 text-3xl font-black tracking-tight text-slate-900">Disciplinary Case Workflow</h1>
          <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
            Create intake records, move cases through the five-step process, and document interviews, findings, and supporting evidence in the live discipline module.
          </p>
        </div>

        <NotificationBar v-if="store.error" color="danger">{{ store.error }}</NotificationBar>
        <DisciplineModuleNav />

        <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs uppercase tracking-[0.18em] text-slate-400">Open Queue</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ queueSummary.total }}</div>
            <div class="mt-2 text-sm text-slate-500">Cases currently loaded into the workflow board.</div>
          </div>
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs uppercase tracking-[0.18em] text-slate-400">Intake Review</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ queueSummary.intake }}</div>
            <div class="mt-2 text-sm text-slate-500">New reports still being checked for completeness.</div>
          </div>
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs uppercase tracking-[0.18em] text-slate-400">Investigation</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ queueSummary.investigation }}</div>
            <div class="mt-2 text-sm text-slate-500">Cases requiring interviews, evidence gathering, or notices.</div>
          </div>
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div class="text-xs uppercase tracking-[0.18em] text-slate-400">Decision Stage</div>
            <div class="mt-2 text-3xl font-black text-slate-900">{{ queueSummary.decision }}</div>
            <div class="mt-2 text-sm text-slate-500">Cases in findings, sanctioning, or final notification.</div>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div class="xl:col-span-4 space-y-6">
            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <h2 class="text-lg font-bold text-slate-900">Step 1: Intake Report</h2>
                  <p class="mt-1 text-sm text-slate-500">Start a new case only when a written incident report is ready.</p>
                </div>
                <button class="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 transition hover:bg-slate-50" @click="showCreateForm = !showCreateForm">
                  {{ showCreateForm ? "Hide Form" : "New Intake" }}
                </button>
              </div>

              <div v-if="showCreateForm" class="mt-5 grid gap-3">
                <input v-model="caseForm.student_name" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Student full name">
                <div class="grid gap-3 md:grid-cols-2">
                  <input v-model="caseForm.student_school_id" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="School ID">
                  <input v-model="caseForm.course_block" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Course and block">
                </div>
                <div class="grid gap-3 md:grid-cols-2">
                  <input v-model="caseForm.reporter_name" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reporter name">
                  <select v-model="caseForm.reporter_type" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    <option value="faculty">Faculty</option><option value="staff">Staff</option><option value="student">Student</option><option value="parent">Parent</option><option value="other">Other</option>
                  </select>
                </div>
                <input v-model="caseForm.reporter_contact" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Reporter contact">
                <div class="grid gap-3 md:grid-cols-2">
                  <input v-model="caseForm.incident_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                  <input v-model="caseForm.location" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Incident location">
                </div>
                <input v-model="caseForm.offense_title" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Offense title">
                <textarea v-model="caseForm.offense_description" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Clear factual description"></textarea>
                <div class="grid gap-3 md:grid-cols-3">
                  <select v-model="caseForm.category" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="A">Category A</option><option value="B">Category B</option><option value="C">Category C</option></select>
                  <select v-model="caseForm.priority" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="critical">Critical priority</option></select>
                  <input v-model.number="caseForm.offense_count" type="number" min="1" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Offense count">
                </div>
                <textarea v-model="caseForm.witness_information_text" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Witness names and contacts, one per line"></textarea>
                <textarea v-model="caseForm.evidence_summary_text" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Evidence summary, one item per line"></textarea>
                <textarea v-model="caseForm.confidential_notes" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Confidential intake notes"></textarea>
                <button class="rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60" :disabled="store.isLoading" @click="submitCase">Create Case</button>
              </div>
              <div v-else class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                Use <span class="font-semibold text-slate-700">New Intake</span> when you need to log a fresh disciplinary report.
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Intake Requirements</h2>
              <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li v-for="item in intakeChecklist" :key="item" class="flex gap-3"><i class="mdi mdi-check-circle-outline mt-0.5 text-primary"></i><span>{{ item }}</span></li>
              </ul>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h2 class="text-lg font-bold text-slate-900">Investigation Checklist</h2>
              <ul class="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <li v-for="item in investigationChecklist" :key="item" class="flex gap-3"><i class="mdi mdi-file-search-outline mt-0.5 text-amber-600"></i><span>{{ item }}</span></li>
              </ul>
            </div>
          </div>

          <div class="xl:col-span-8 space-y-6">
            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
                <input v-model="filters.q" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm lg:flex-1" placeholder="Search case, student, ID, course, or offense">
                <div class="grid gap-3 sm:grid-cols-3 lg:w-[520px]">
                  <select v-model="filters.category" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="">All categories</option><option value="A">Category A</option><option value="B">Category B</option><option value="C">Category C</option></select>
                  <select v-model="filters.current_step" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="">All steps</option><option value="intake">Intake</option><option value="investigation">Investigation</option><option value="findings">Findings</option><option value="sanctioning">Sanctioning</option><option value="notification">Notification</option></select>
                  <select v-model="filters.priority" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="">All priorities</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
                </div>
                <button class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" @click="fetchCases(true)">Refresh</button>
              </div>

              <div class="mt-5 grid gap-3">
                <button v-for="item in rows" :key="item.id" class="rounded-2xl border p-4 text-left transition" :class="selected?.id === item.id ? 'border-primary bg-primary/5' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'" @click="selectCase(item.id)">
                  <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div class="flex flex-wrap gap-2">
                        <Badge :text="item.reference_code" tone="gray" />
                        <Badge :text="`Category ${item.category}`" :tone="categoryTone(item.category)" />
                        <Badge :text="humanize(item.status)" :tone="priorityTone(item.priority)" />
                      </div>
                      <div class="mt-3 text-base font-bold text-slate-900">{{ item.student_name }}</div>
                      <div class="text-sm text-slate-500">{{ item.student_school_id || "No ID" }} | {{ item.course_block || "No course or block" }}</div>
                      <div class="mt-2 text-sm text-slate-700">{{ item.offense_title }}</div>
                    </div>
                    <div class="text-sm text-slate-500">{{ getStepMeta(item.current_step).title }}<br>{{ formatDateTime(item.incident_at) }}</div>
                  </div>
                </button>
              </div>
            </div>

            <div v-if="selected" class="grid gap-6 xl:grid-cols-12">
              <div class="xl:col-span-6 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <h2 class="text-lg font-bold text-slate-900">{{ selected.reference_code }}</h2>
                    <p class="text-sm text-slate-500">{{ selected.student_name }} | {{ selected.student_school_id || "No ID" }}</p>
                    <p class="mt-2 text-sm font-medium text-primary">{{ selectedStepMeta.step }} - {{ selectedStepMeta.title }}</p>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <Badge :text="`Category ${selected.category}`" :tone="categoryTone(selected.category)" />
                    <Badge :text="String(selected.priority || '').toUpperCase()" :tone="priorityTone(selected.priority)" />
                  </div>
                </div>

                <div class="mt-5 grid gap-3 text-sm text-slate-700">
                  <div class="grid gap-3 sm:grid-cols-3">
                    <button class="rounded-2xl border px-4 py-3 text-sm font-semibold transition" :class="activeWorkspaceTab === 'overview' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 bg-slate-50 text-slate-700'" @click="activeWorkspaceTab = 'overview'">
                      Overview
                    </button>
                    <button class="rounded-2xl border px-4 py-3 text-sm font-semibold transition" :class="activeWorkspaceTab === 'investigation' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 bg-slate-50 text-slate-700'" @click="activeWorkspaceTab = 'investigation'">
                      Investigation
                    </button>
                    <button class="rounded-2xl border px-4 py-3 text-sm font-semibold transition" :class="activeWorkspaceTab === 'findings' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-200 bg-slate-50 text-slate-700'" @click="activeWorkspaceTab = 'findings'">
                      Findings
                    </button>
                  </div>

                  <div v-if="activeWorkspaceTab === 'overview'" class="space-y-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Incident Summary</div>
                      <div class="mt-2">{{ selected.offense_title }}</div>
                      <div class="mt-1 text-slate-500">{{ selected.offense_description }}</div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Reporter and Witnesses</div>
                      <div class="mt-2">Reporter: {{ selected.reporter_name }} ({{ selected.reporter_type || "unspecified" }})</div>
                      <div class="mt-1">Contact: {{ selected.reporter_contact || "Not provided" }}</div>
                      <div class="mt-3 text-slate-500">
                        <div v-if="selected.witness_information?.length"><div v-for="entry in selected.witness_information" :key="entry">{{ entry }}</div></div>
                        <div v-else>No witnesses encoded.</div>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Step Control</div>
                      <div class="mt-3 grid gap-3 md:grid-cols-2">
                        <select v-model="progressForm.current_step" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="intake">Intake</option><option value="investigation">Investigation</option><option value="findings">Findings</option><option value="sanctioning">Sanctioning</option><option value="notification">Notification</option></select>
                        <select v-model="progressForm.status" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="intake_review">Intake review</option><option value="under_investigation">Under investigation</option><option value="for_findings">For findings</option><option value="for_sanction">For sanction</option><option value="for_notification">For notification</option><option value="decision_served">Decision served</option><option value="under_appeal">Under appeal</option><option value="closed">Closed</option></select>
                      </div>
                      <textarea v-model="progressForm.finding_summary" rows="3" class="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Short findings summary for the case card"></textarea>
                      <textarea v-model="progressForm.sanction_summary" rows="3" class="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Short sanction summary for the case card"></textarea>
                      <textarea v-model="progressForm.confidential_notes" rows="3" class="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Confidential notes visible only to discipline staff"></textarea>
                      <input v-model="progressForm.appeal_deadline_at" type="date" class="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                      <button class="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" @click="saveProgress">Save Case Progress</button>
                    </div>
                  </div>

                  <div v-else-if="activeWorkspaceTab === 'investigation'" class="space-y-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Evidence and Attachments</div>
                      <div class="mt-2 text-slate-500">Upload screenshots, written statements, or supporting files tied to this case.</div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Investigation Note Form</div>
                      <div class="mt-2 text-slate-500">Use one note per interview, evidence review, or conference entry.</div>
                    </div>
                  </div>

                  <div v-else class="space-y-3">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="font-semibold text-slate-900">Finding of Facts</div>
                      <div class="mt-2 text-slate-500">Record the factual determination and recommended action once the investigation is complete.</div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="xl:col-span-6 space-y-6">
                <div v-if="activeWorkspaceTab === 'overview'" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 class="text-lg font-bold text-slate-900">Recommended Next Action</h2>
                  <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div class="text-xs uppercase tracking-[0.18em] text-primary">{{ selectedStepMeta.step }}</div>
                    <div class="mt-2 text-base font-bold text-slate-900">{{ selectedStepMeta.title }}</div>
                    <p class="mt-3 text-sm leading-6 text-slate-600">{{ selectedStepMeta.summary }}</p>
                  </div>
                  <div class="mt-4 grid gap-3">
                    <button class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100" @click="activeWorkspaceTab = 'investigation'">
                      Continue to investigation workspace
                    </button>
                    <button class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm transition hover:bg-slate-100" @click="activeWorkspaceTab = 'findings'">
                      Continue to findings workspace
                    </button>
                  </div>
                </div>

                <div v-if="activeWorkspaceTab === 'investigation'" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 class="text-lg font-bold text-slate-900">Attachments and Evidence</h2>
                  <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <input type="file" class="w-full text-sm" @change="attachmentFile = $event.target.files?.[0] || null">
                    <button class="mt-3 rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60" :disabled="!attachmentFile" @click="submitAttachment">Upload Attachment</button>
                  </div>
                  <div class="mt-4 space-y-3">
                    <div v-for="attachment in selected.attachments || []" :key="attachment.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="flex items-center justify-between gap-3">
                        <div class="text-sm"><div class="font-semibold text-slate-900">{{ attachment.filename || "Uploaded attachment" }}</div><div class="text-slate-500">{{ attachment.mime || "Stored as base64 record" }}</div></div>
                        <button class="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50" @click="removeAttachment(attachment.id)">Remove</button>
                      </div>
                    </div>
                    <div v-if="!(selected.attachments || []).length" class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No attachments uploaded yet.</div>
                  </div>
                </div>

                <div v-if="activeWorkspaceTab === 'investigation'" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 class="text-lg font-bold text-slate-900">Add Investigation Note</h2>
                  <div class="mt-4 grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2">
                      <select v-model="noteForm.note_type" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="interview">Interview</option><option value="evidence">Evidence</option><option value="observation">Observation</option><option value="notice">Notice</option><option value="conference">Conference</option></select>
                      <input v-model="noteForm.occurred_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    </div>
                    <input v-model="noteForm.title" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Note title">
                    <div class="grid gap-3 md:grid-cols-2">
                      <input v-model="noteForm.interviewee_name" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Interviewee">
                      <input v-model="noteForm.interviewee_role" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Role">
                    </div>
                    <textarea v-model="noteForm.content" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Interview or evidence note"></textarea>
                    <button class="rounded-2xl bg-amber-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-amber-500" @click="submitNote">Save Investigation Note</button>
                  </div>

                  <div class="mt-5 space-y-3">
                    <div v-for="note in selected.investigation_notes || []" :key="note.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="flex items-start justify-between gap-4">
                        <div><div class="text-sm font-bold text-slate-900">{{ note.title }}</div><div class="text-xs uppercase tracking-[0.16em] text-slate-400">{{ humanize(note.note_type) }}</div></div>
                        <div class="text-xs text-slate-500">{{ formatDateTime(note.occurred_at || note.created_at) }}</div>
                      </div>
                      <div class="mt-2 text-sm text-slate-700">{{ note.content }}</div>
                    </div>
                  </div>
                </div>

                <div v-if="activeWorkspaceTab === 'findings'" class="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 class="text-lg font-bold text-slate-900">Add Finding of Facts</h2>
                  <div class="mt-4 grid gap-3">
                    <div class="grid gap-3 md:grid-cols-2">
                      <select v-model="findingForm.determination" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm"><option value="pending">Pending</option><option value="substantiated">Substantiated</option><option value="partially_substantiated">Partially substantiated</option><option value="not_substantiated">Not substantiated</option></select>
                      <input v-model="findingForm.issued_at" type="datetime-local" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm">
                    </div>
                    <textarea v-model="findingForm.finding_text" rows="4" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Written finding of facts"></textarea>
                    <textarea v-model="findingForm.basis_summary" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Basis summary"></textarea>
                    <input v-model="findingForm.standard_used" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Standard used">
                    <textarea v-model="findingForm.recommended_action" rows="3" class="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Recommended action"></textarea>
                    <label class="inline-flex items-center gap-2 text-sm text-slate-600"><input v-model="findingForm.is_final" type="checkbox"><span>Mark as final finding</span></label>
                    <button class="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500" @click="submitFinding">Save Finding</button>
                  </div>

                  <div class="mt-5 space-y-3">
                    <div v-for="finding in selected.findings || []" :key="finding.id" class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div class="flex items-start justify-between gap-4">
                        <div class="text-sm font-bold text-slate-900">{{ humanize(finding.determination) }}</div>
                        <Badge :text="finding.is_final ? 'Final' : 'Draft'" :tone="finding.is_final ? 'emerald' : 'gray'" />
                      </div>
                      <div class="mt-2 text-sm text-slate-700">{{ finding.finding_text }}</div>
                      <div v-if="finding.recommended_action" class="mt-2 text-sm text-slate-500">Recommended action: {{ finding.recommended_action }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SectionMain>
  </LayoutAuthenticated>
</template>
