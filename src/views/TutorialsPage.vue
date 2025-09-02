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
} from '@mdi/js'

const sections = [
  { id: 'getting-started', icon: mdiPlayCircleOutline, title: 'Getting Started' },
  { id: 'dashboard', icon: mdiMonitorDashboard, title: 'Dashboard Overview' },
  { id: 'navigation', icon: mdiMagnify, title: 'Navigation & Search' },
  { id: 'annual-plans', icon: mdiFileDocument, title: 'Annual Plans' },
  { id: 'activity-designs', icon: mdiPencil, title: 'Activity Designs' },
  { id: 'utilizations', icon: mdiCalendarClock, title: 'Utilization Requests' },
  { id: 'liquidations', icon: mdiCashCheck, title: 'Liquidation Funds' },
  { id: 'clubs', icon: mdiAccountGroup, title: 'Clubs & Memberships' },
  { id: 'attachments', icon: mdiPaperclip, title: 'Attachments, Printing & Email' },
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
            <button v-for="s in sections" :key="s.id" class="w-full text-left px-2 py-1.5 rounded hover:bg-gray-50 flex items-center gap-2 text-sm"
              @click="go(s.id)">
              <svg class="w-4 h-4 text-gray-600" viewBox="0 0 24 24"><path :d="s.icon" /></svg>
              <span>{{ s.title }}</span>
            </button>
          </nav>
        </aside>

        <!-- Content -->
        <div class="lg:col-span-9 xl:col-span-10 space-y-6">
          <!-- Getting Started -->
          <section id="getting-started" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPlayCircleOutline" /></svg>
              Getting Started
            </h2>
            <p class="text-sm text-gray-600 mb-3">This guide walks you through the OSAS dashboard kiosk — from logging in to submitting and managing workflows.</p>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Sign in with your school account. New here? Register from the login page.</li>
              <li>Students land on Student Dashboard; admins on Dashboard.</li>
              <li>Use the left sidebar to navigate modules like Annual Plans, Activity Designs, Utilization, Liquidation, and Clubs.</li>
              <li>Each module follows a simple pattern: Draft → Submit → Approve/Reject → Optional: Cancel/Print/Email.</li>
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
                <p class="text-sm text-gray-600">Quick links to modules, filtered by your role.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Activity Calendar</h3>
                <p class="text-sm text-gray-600">See approved activities and schedules at-a-glance.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Notifications</h3>
                <p class="text-sm text-gray-600">Errors and important updates appear at the top of each page.</p>
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
              <li>Use filters on each list (status, school year, date ranges, clubs) to refine results.</li>
              <li>Click column headers where available to sort.</li>
              <li>Use the search box to match by reference code, names, or remarks.</li>
            </ul>
          </section>

          <!-- Annual Plans -->
          <section id="annual-plans" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiFileDocument" /></svg>
              Annual Plans
            </h2>
            <ol class="list-decimal pl-5 space-y-2 text-sm">
              <li>Click New Annual Plan to create a draft: set School Year, Club, and add planned items with budget.</li>
              <li>Attachments can be added from the row actions.</li>
              <li>Submit when ready. After submission, editing is locked until decision.</li>
              <li>Admins/Managers can Approve/Reject. Approved plans can be Cancelled by Admin/Manager; cancelled plans return to Draft for edits.</li>
            </ol>
            <div class="mt-2 text-xs text-gray-600">Statuses: <Badge text="draft" tone="gray" /> <Badge text="pending" tone="amber" /> <Badge text="approved" tone="emerald" /> <Badge text="rejected" tone="red" /> <Badge text="cancelled" tone="zinc" /></div>
          </section>

          <!-- Activity Designs -->
          <section id="activity-designs" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPencil" /></svg>
              Activity Designs
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Draft activity details, link to an approved Annual Plan item when applicable.</li>
              <li>Submit for approval. Admin/Manager can Approve/Reject; Approved can be Cancelled by Admin/Manager.</li>
              <li>Print and Email become available for approved records.</li>
            </ul>
          </section>

          <!-- Utilization Requests -->
          <section id="utilizations" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCalendarClock" /></svg>
              Utilization Requests
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Specify facilities, date and time ranges, and equipment needs.</li>
              <li>Track availability status and overall approval status.</li>
              <li>Approved requests can be printed and emailed; Admin/Manager may cancel if needed.</li>
            </ul>
          </section>

          <!-- Liquidation Funds -->
          <section id="liquidations" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiCashCheck" /></svg>
              Liquidation Funds
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Encode sources and uses of funds, attach receipts or proofs.</li>
              <li>Follow the same Draft → Submit → Approve/Reject workflow; Admin/Manager can cancel approved records.</li>
              <li>Print and Email are available for approved liquidations.</li>
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
            </ul>
          </section>

          <!-- Attachments, Printing & Email -->
          <section id="attachments" class="rounded-2xl border bg-white p-4 sm:p-6 shadow-sm">
            <h2 class="text-lg font-semibold mb-1 flex items-center gap-2">
              <svg class="w-5 h-5" viewBox="0 0 24 24"><path :d="mdiPaperclip" /></svg>
              Attachments, Printing & Email
            </h2>
            <ul class="list-disc pl-5 space-y-1 text-sm">
              <li>Use Attachments in row actions to upload files (PDF/JPG/PNG).</li>
              <li>Print generates a PDF from approved records.</li>
              <li>Email is available to Admin/Manager for approved records; auto‑attaches the generated PDF.</li>
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
                <p class="text-sm text-gray-600">Draft → Submit (lock edits) → Approve/Reject. Approved may be Cancelled by Admin/Manager when necessary.</p>
              </div>
              <div class="rounded-xl border p-3">
                <h3 class="font-medium mb-1">Timestamps</h3>
                <p class="text-sm text-gray-600 inline-flex items-center gap-1">
                  <svg class="w-4 h-4" viewBox="0 0 24 24"><path :d="mdiClockOutline" /></svg>
                  Created/Updated and Approved dates appear in tables and PDFs.
                </p>
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
                <div class="font-medium">Why can’t I edit after submission?</div>
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
            </div>
          </section>
        </div>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
</template>

<style scoped>
</style>

