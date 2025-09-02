<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import liquidationFundService from '@/services/activity/liquidationFundService'
import QRCode from 'qrcode'

const route = useRoute()

const loading = ref(false)
const error = ref('')
const item = ref(null)
const shareUrl = ref('')
const qrDataUrl = ref('')
const copied = ref(false)

function isNumericId(v) {
  return /^[0-9]+$/.test(String(v || '').trim())
}

async function fetchItem(idOrRef) {
  error.value = ''
  item.value = null
  if (!idOrRef) {
    error.value = 'Missing id parameter'
    return
  }
  try {
    loading.value = true
    if (isNumericId(idOrRef)) {
      item.value = await liquidationFundService.getById(idOrRef)
    } else {
      const res = await liquidationFundService.list({ q: idOrRef, limit: 1, page: 1 })
      item.value = Array.isArray(res?.data) && res.data.length ? res.data[0] : null
    }
    if (!item.value) error.value = 'No matching Liquidation Fund found'
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to verify'
  } finally {
    loading.value = false
  }
}

function tone(status) {
  const s = String(status || '').toLowerCase()
  if (s === 'approved' || s === 'completed') return 'emerald'
  if (s === 'pending') return 'amber'
  if (s === 'rejected' || s === 'cancelled') return 'rose'
  return 'zinc'
}

onMounted(() => {
  shareUrl.value = window.location.href
  buildQr()
  fetchItem(route.query.id)
})
watch(() => route.query.id, (v) => {
  fetchItem(v)
  shareUrl.value = window.location.href
  buildQr()
})

async function buildQr() {
  try {
    qrDataUrl.value = await QRCode.toDataURL(shareUrl.value, { margin: 0, width: 140 })
  } catch { qrDataUrl.value = '' }
}

async function copyLink() {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl.value)
    } else {
      const el = document.createElement('textarea')
      el.value = shareUrl.value
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {}
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex items-center justify-center p-4">
    <div class="w-full max-w-2xl bg-white rounded-2xl shadow border p-5">
      <div class="mb-4">
        <h1 class="text-lg font-semibold">Verify: Liquidation Fund</h1>
        <p class="text-xs text-gray-500">Public verification page</p>
      </div>

      <div v-if="loading" class="text-sm text-gray-600">Loading…</div>
      <div v-else-if="error" class="text-sm text-rose-600">{{ error }}</div>
      <div v-else-if="!item" class="text-sm text-gray-600">No data.</div>
      <div v-else class="space-y-3">
        <div class="flex items-center gap-2 text-sm">
          <span class="px-2 py-0.5 rounded-full text-xs" :class="{
            'bg-emerald-100 text-emerald-700': tone(item.status)==='emerald',
            'bg-amber-100 text-amber-700': tone(item.status)==='amber',
            'bg-rose-100 text-rose-700': tone(item.status)==='rose',
            'bg-gray-200 text-gray-700': tone(item.status)==='zinc',
          }">{{ (item.status || '').toUpperCase() || 'UNKNOWN' }}</span>
          <span class="text-gray-500">Status</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          <div>
            <div class="text-gray-500">Reference</div>
            <div class="font-medium">{{ item.reference_code || '—' }}</div>
          </div>
          <div>
            <div class="text-gray-500">ID</div>
            <div class="font-medium">{{ item.id }}</div>
          </div>
          <div>
            <div class="text-gray-500">Activity Design</div>
            <div class="font-medium">{{ item?.activity_design?.name_of_activity || '—' }}</div>
          </div>
          <div>
            <div class="text-gray-500">Filed By</div>
            <div class="font-medium">{{ item?.file_by_user_name || (item?.filed_by ? `${item.filed_by.first_name||''} ${item.filed_by.last_name||''}`.trim() : '—') }}</div>
          </div>
        </div>
        <div class="pt-3 border-t flex items-center gap-3">
          <img v-if="qrDataUrl" :src="qrDataUrl" alt="QR" class="w-24 h-24 border rounded" />
          <div class="flex-1 min-w-0">
            <div class="text-xs text-gray-500 mb-1">Verification Link</div>
            <div class="text-sm truncate">{{ shareUrl }}</div>
            <div class="mt-2 flex items-center gap-2">
              <button class="px-3 py-1.5 text-xs bg-blue-600 text-white rounded" @click="copyLink">Copy Link</button>
              <span v-if="copied" class="text-[11px] text-emerald-600">Copied!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
