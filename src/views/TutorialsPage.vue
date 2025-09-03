<!-- src/views/TutorialsPage.vue -->
<script setup>
import { onMounted } from 'vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import Badge from '@/components/commons/Badge.vue'
import {
  mdiBookOpenVariant,
  mdiPlayCircleOutline,
  mdiMonitorDashboard,
  mdiCalendar,
  mdiFileDocument,
  mdiPencil,
  mdiCalendarClock,
  mdiCashCheck,
  mdiAccountGroup,
  mdiPaperclip,
  mdiShieldAccount,
  mdiCheckCircle,
  mdiClockOutline,
  mdiMagnify,
  mdiInformationOutline,
  mdiAccount,
  mdiTable,
  mdiLinkVariant,
} from '@mdi/js'

const sections = [
  { id: 'about', icon: mdiInformationOutline, title: 'About This System' },
  { id: 'accounts-roles', icon: mdiAccount, title: 'Accounts & Roles' },
  { id: 'getting-started', icon: mdiPlayCircleOutline, title: 'Getting Started' },
  { id: 'dashboard', icon: mdiMonitorDashboard, title: 'Dashboard Overview' },
  { id: 'navigation', icon: mdiMagnify, title: 'Navigation & Search' },
  { id: 'data-tables', icon: mdiTable, title: 'Tables & Actions' },
  { id: 'annual-plans', icon: mdiFileDocument, title: 'Annual Plans' },
  { id: 'activity-designs', icon: mdiPencil, title: 'Activity Designs' },
  { id: 'utilizations', icon: mdiCalendarClock, title: 'Utilization Requests' },
  { id: 'liquidations', icon: mdiCashCheck, title: 'Liquidation Funds' },
  { id: 'clubs', icon: mdiAccountGroup, title: 'Clubs & Memberships' },
  { id: 'attachments', icon: mdiPaperclip, title: 'Attachments, Printing & Email' },
  { id: 'verification', icon: mdiLinkVariant, title: 'Verification Links' },
  { id: 'workflows', icon: mdiCheckCircle, title: 'Workflows & Statuses' },
  { id: 'roles', icon: mdiShieldAccount, title: 'Roles & Permissions' },
  { id: 'tips', icon: mdiCalendar, title: 'Tips & Shortcuts' },
  { id: 'faq', icon: mdiBookOpenVariant, title: 'FAQs' },
]

const go = (id) => {
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

onMounted(() => {
  const hash = decodeURIComponent(location.hash || '').replace('#', '')
  if (hash) setTimeout(() => go(hash), 50)
})
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiBookOpenVariant" title="Tutorials" main>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiPlayCircleOutline" color="primary" label="Start Here" @click="go('getting-started')" />
          <BaseButton :icon="mdiMonitorDashboard" color="info" label="Dashboard" @click="go('dashboard')" />
        </div>
      </SectionTitleLineWithButton>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <!-- TOC -->
        <aside class="lg:col-span-3 xl:col-span-2 bg-white/70 border rounded-2xl p-3 h-max sticky top-4">
          <div class="text-[12px] font-semibold text-gray-700 mb-2">On this page</div>
          <nav class="space-y-1">
            <button
              v-for="s in sections"
              :key="s.id"
              class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
              @click="go(s.id)"
            >
              <svg class="w-4 h-4 text-gray-600" viewBox="0 0 24 24"><path :d="s.icon" /></svg>
              <span>{{ s.title }}</span>
            </button>
          </nav>
        </aside>

        <!-- Content -->
        <div class="lg:col-span-9 xl:col-span-10 space-y-6">
          <!-- About -->
          <section id="about" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiInformationOutline" /></svg>
              About This System
            </h2>
            <p class="text-sm text-gray-600 mb-3">
              OSAS KNP is a workflow system for managing student organization activities end-to-end:
              planning, approvals, facility utilization, and funds liquidation. It supports attachments,
              printing of PDFs, email dispatch, and role-based approvals with an auditable trail.
            </p>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Versioned API at <code class="bg-gray-100 px-1 rounded">/api/osas/v1</code> with secure auth and rate-limits.</li>
              <li>Modules: Annual Plans, Activity Designs, Utilization Requests, Liquidation Funds, Clubs, Grievances, Users.</li>
              <li>Common lifecycle: Draft -> Submit -> Approve/Reject -> (optional) Cancel or Complete.</li>
            </ul>
          </section>

          <!-- Accounts & Roles -->
          <section id="accounts-roles" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiAccount" /></svg>
              Accounts & Roles
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li><b>Admin, Manager</b>: approve/reject, cancel approved records, delete, send emails, view session logs.</li>
              <li><b>Student Officer</b>: create and edit drafts, submit for approval, upload attachments.</li>
              <li><b>Student</b>: view own profile and dashboard; limited read-only access.</li>
              <li>Optional security: 2FA, email verification, password reset under Authentication.</li>
            </ul>
          </section>

          <!-- Getting Started -->
          <section id="getting-started" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPlayCircleOutline" /></svg>
              Getting Started
            </h2>
            <p class="text-sm text-gray-600 mb-3">This guide walks you through the OSAS dashboard: from sign-in to submitting and managing approvals.</p>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Sign in with your school account. New here? Register from the login page.</li>
              <li>Students land on Student Dashboard; admins on Dashboard.</li>
              <li>Use the left sidebar to navigate modules like Annual Plans, Activity Designs, Utilization, Liquidation, and Clubs.</li>
              <li>Each module follows a simple pattern: Draft -> Submit -> Approve/Reject -> Optional: Cancel/Print/Email.</li>
            </ul>
          </section>

          <!-- Dashboard Overview -->
          <section id="dashboard" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiMonitorDashboard" /></svg>
              Dashboard Overview
            </h2>
            <div class="grid sm:grid-cols-2 gap-4 mt-2">
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Header & Profile</h3>
                <p class="text-sm text-gray-600">Access your profile, change password, and sign out.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Sidebar Navigation</h3>
                <p class="text-sm text-gray-600">Quick links to modules; role-based menu visibility.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Widgets & Counters</h3>
                <p class="text-sm text-gray-600">Open items, recent approvals, and pending actions.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Notifications</h3>
                <p class="text-sm text-gray-600">System messages and errors appear inline near the top.</p>
              </div>
            </div>
          </section>

          <!-- Navigation & Search -->
          <section id="navigation" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiMagnify" /></svg>
              Navigation & Search
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Use module pages to list, filter, sort, and paginate records.</li>
              <li>Filters include text search, status, date ranges, club, and filed-by user (depends on club).</li>
              <li>Date pickers support ranges; press Enter in search fields to apply quickly.</li>
              <li>Reset restores defaults; Refresh reloads from the server.</li>
            </ul>
          </section>

          <!-- Tables & Actions -->
          <section id="data-tables" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiTable" /></svg>
              Tables & Actions
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Row actions: View/Edit, Submit, Approve, Reject, Cancel, Attachments, Print, Email (varies by status and role).</li>
              <li>Status chips: draft (gray), pending (amber), approved (green), rejected (red), cancelled (zinc), archived/completed where applicable.</li>
              <li>Reference codes are generated for traceability and appear in tables and PDFs.</li>
              <li>Pagination controls appear at bottom; page size respects server defaults and limits.</li>
            </ul>
          </section>

          <!-- Annual Plans -->
          <section id="annual-plans" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiFileDocument" /></svg>
              Annual Plans
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Purpose: capture planned activities for the school year with dates and budget.</li>
              <li>Create: select club and school year; add one or more plan items with date_of_implementation and funds.</li>
              <li>Search/Filter: by school year, club, status, filed-by, approver. Use calendar to view approved timelines.</li>
              <li>Workflow: Draft -> Submit -> Approve/Reject -> Archive (when superseded). Cancel is available to Admin/Manager.</li>
              <li>Attachments: upload supporting documents; role restrictions apply to delete.</li>
            </ul>
          </section>

          <!-- Activity Designs -->
          <section id="activity-designs" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPencil" /></svg>
              Activity Designs
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Purpose: detailed proposal of an activity (objectives, budget, participants, schedule, venue).</li>
              <li>Linkage: optionally link to an Annual Plan item; the snapshot is saved to preserve context.</li>
              <li>Workflow: Draft -> Submit (locks edits) -> Approve/Reject. Admin/Manager may Cancel with remarks.</li>
              <li>Outputs: Print generates a PDF for approved designs; Email sends PDF to recipients (admin/manager only).</li>
              <li>Filters: text, status, nature, school year, semester, club, filed-by, filed date range, implementation range.</li>
            </ul>
          </section>

          <!-- Utilization Requests -->
          <section id="utilizations" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCalendarClock" /></svg>
              Utilization Requests
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Purpose: reserve facilities and equipment for an approved activity design.</li>
              <li>Create: choose activity design, facilities, start/end date and time, and equipment items (name, qty, unit).</li>
              <li>Availability: system validates date/time ordering and tracks availability status (available, conflict, reserved, maintenance).</li>
              <li>Workflow: Draft -> Submit -> Approve/Reject -> Cancel/Complete. Print/Email enabled after approval.</li>
            </ul>
          </section>

          <!-- Liquidation Funds -->
          <section id="liquidations" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCashCheck" /></svg>
              Liquidation Funds
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Purpose: report sources of funds and the detailed uses with receipts.</li>
              <li>Create: fill Sources of Fund (contribution, fines, solicitations, donations, current funds, notes) and Uses of Fund rows.</li>
              <li>Workflow: Draft -> Submit -> Approve/Reject -> Cancel/Complete. Only approved records can be printed/emailed.</li>
              <li>Attachments: upload receipts and proofs. Deletion is restricted by role.</li>
            </ul>
          </section>

          <!-- Clubs & Members -->
          <section id="clubs" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiAccountGroup" /></svg>
              Clubs & Memberships
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>View club profiles, members, and documents. Admins can manage clubs; delete is admin/manager only.</li>
              <li>Open a club to see its approved activities calendar.</li>
              <li>Membership: add/remove users, update roles within the club (admin/manager restricted operations).</li>
              <li>Club documents: upload and manage requirements via the Docs tab.</li>
            </ul>
          </section>

          <!-- Attachments, Printing & Email -->
          <section id="attachments" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPaperclip" /></svg>
              Attachments, Printing & Email
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Attachments: upload via row actions. Supported types typically include PDF/JPG/PNG. Max 25MB per file.</li>
              <li>Printing: available for approved records; generates a standardized PDF.</li>
              <li>Email: admin/manager can send emails with the generated PDF attached. Fill From, To, Subject, and optional HTML body.</li>
            </ul>
          </section>

          <!-- Verification Links -->
          <section id="verification" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiLinkVariant" /></svg>
              Verification Links
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Each approved record has a reference code that can be verified.</li>
              <li>Pages: Verify Activity Design, Verify Utilization, Verify Liquidation. Use the reference code to look up details.</li>
              <li>Verification pages show essential fields, club, and approval timestamps for external validation.</li>
            </ul>
          </section>

          <!-- Workflows & Statuses -->
          <section id="workflows" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCheckCircle" /></svg>
              Workflows & Statuses
            </h2>
            <div class="grid sm:grid-cols-2 gap-4">
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Common Flow</h3>
                <p class="text-sm text-gray-600">Draft -> Submit (locks edits) -> Approve/Reject. Approved records may be Cancelled by Admin/Manager when necessary.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Timestamps</h3>
                <p class="text-sm text-gray-600 inline-flex items-center gap-1">
                  <svg class="w-4 h-4" viewBox="0 0 24 24"><path :d="mdiClockOutline" /></svg>
                  Created/Updated and Approved dates appear in tables and PDFs.
                </p>
              </div>
              <div class="rounded-xl border p-3 sm:col-span-2">
                <h3 class="font-medium mb-1">Status by Module</h3>
                <p class="text-sm text-gray-600">Annual Plans: draft, pending, approved, rejected, cancelled, archived.</p>
                <p class="text-sm text-gray-600">Activity Designs: draft, pending, approved, rejected, cancelled.</p>
                <p class="text-sm text-gray-600">Utilization & Liquidation: draft, pending, approved, rejected, cancelled, completed.</p>
              </div>
            </div>
          </section>

          <!-- Roles & Permissions -->
          <section id="roles" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiShieldAccount" /></svg>
              Roles & Permissions
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li><b>Admin/Manager</b>: Can approve/reject, cancel approved records, delete, and send emails.</li>
              <li><b>Student Officer</b>: Can create drafts and submit for approval; limited moderation actions.</li>
              <li><b>Student</b>: View dashboard and profile; limited access.</li>
              <li>Sensitive endpoints are rate-limited; attachments enforce size limits for stability.</li>
            </ul>
          </section>

          <!-- Tips -->
          <section id="tips" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCalendar" /></svg>
              Tips & Shortcuts
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Press Enter in search fields to apply filters quickly.</li>
              <li>Use the calendar modals to jump directly into editing approved items.</li>
              <li>When a cancellation is required, include clear remarks for audit trail.</li>
              <li>Only approved records can be printed. If disabled, check status and role.</li>
            </ul>
          </section>

          <!-- FAQs -->
          <section id="faq" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiBookOpenVariant" /></svg>
              FAQs
            </h2>
            <div class="space-y-3 text-sm">
              <div>
                <div class="font-medium">Why can't I edit after submission?</div>
                <div class="text-gray-600">Submitted items lock to preserve approval integrity. Cancel or wait for decision to make changes.</div>
              </div>
              <div>
                <div class="font-medium">Who can cancel or delete?</div>
                <div class="text-gray-600">Admin/Manager roles. Cancellations return certain records to Draft for further edits.</div>
              </div>
              <div>
                <div class="font-medium">Why is Email disabled?</div>
                <div class="text-gray-600">Email is available for approved records and restricted to Admin/Manager.</div>
              </div>
              <div>
                <div class="font-medium">How do I verify a document?</div>
                <div class="text-gray-600">Use the Verify pages (Activity Design, Utilization, Liquidation) and enter the reference code.</div>
              </div>
              <div>
                <div class="font-medium">Which files can I upload?</div>
                <div class="text-gray-600">Common formats: PDF, JPG, PNG. Max size is typically 25MB per file.</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
  </template>

<style scoped>
</style>

