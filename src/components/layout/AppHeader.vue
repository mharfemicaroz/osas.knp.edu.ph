<!-- src/components/layout/AppHeader.vue -->
<!-- Header -->
<template>
  <div class="flex justify-between items-center px-4 sm:px-6 py-3 bg-primary text-white">
    <div class="flex items-center gap-3">
      <button class="md:hidden focus:outline-none" @click="$emit('toggle')">
        <i class="mdi mdi-menu text-white text-2xl"></i>
      </button>
      <div class="logo-box flex items-center">
        <a href="javascript:void(0)" class="flex items-center">
          <img src="/images/logo-banner.png" alt="Logo" class="hidden md:block" width="158" height="45" />
          <img src="/images/logo-sm.png" alt="Logo" class="block md:hidden" width="36" height="36" />
        </a>
      </div>
    </div>

    <nav class="relative flex items-center gap-4">
      <!-- Notifications bell -->
      <div class="relative" ref="notifRef">
        <!-- Overlay to close on outside click -->
        <div v-if="notifOpen" class="fixed inset-0 z-30" @click="notifOpen = false"></div>
        <button
          class="relative inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
          @click="toggleNotifs" aria-label="Notifications">
          <i class="mdi mdi-bell-outline text-xl"></i>
          <span v-if="notifBadge > 0"
            class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] leading-4 text-center">
            {{ Math.min(notifBadge, 99) }}
          </span>
        </button>

        <!-- Notifications dropdown -->
        <div v-if="notifOpen" class="absolute right-0 mt-2 z-40 w-80">
          <div class="absolute right-6 -top-2 h-3 w-3 rotate-45 bg-white ring-1 ring-black/5"></div>
          <div class="relative bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <div class="text-[11px] uppercase tracking-wide text-gray-500">Notifications</div>
              <button class="text-xs text-indigo-600 hover:underline" @click="markAllRead">Mark all read</button>
            </div>
            <div v-if="notifStore.isLoading" class="p-3 text-sm text-gray-500">Loading…</div>
            <div v-else class="max-h-80 overflow-auto">
              <div v-if="!listAll.length" class="p-3 text-sm text-gray-500">No notifications</div>
              <template v-else>
                <div v-if="nNew" class="px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500">New</div>
                <ul v-if="nNew">
                  <li :key="nNew.id" class="px-4 py-3 border-b flex items-start gap-2" :class="nNew.is_read ? 'bg-white' : 'bg-indigo-50'">
                    <div class="mt-0.5">
                      <i :class="['mdi', nNew.is_read ? 'mdi-bell-outline text-gray-400' : 'mdi-bell-ring-outline text-indigo-600']"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm truncate" :title="nNew.message">{{ nNew.message }}</div>
                      <div class="text-[11px] text-gray-500">{{ nNew.created_at ? new Date(nNew.created_at).toLocaleString() : '' }}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="toggleRead(nNew)">{{ nNew.is_read ? 'Unread' : 'Read' }}</button>
                    </div>
                  </li>
                </ul>

                <div v-if="todayList.length" class="px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500">Today</div>
                <ul>
                  <li v-for="n in todayList" :key="n.id" class="px-4 py-3 border-b flex items-start gap-2" :class="n.is_read ? 'bg-white' : 'bg-indigo-50'">
                    <div class="mt-0.5">
                      <i :class="['mdi', n.is_read ? 'mdi-bell-outline text-gray-400' : 'mdi-bell-ring-outline text-indigo-600']"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm truncate" :title="n.message">{{ n.message }}</div>
                      <div class="text-[11px] text-gray-500">{{ n.created_at ? new Date(n.created_at).toLocaleString() : '' }}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="toggleRead(n)">{{ n.is_read ? 'Unread' : 'Read' }}</button>
                    </div>
                  </li>
                </ul>

                <div v-if="earlierList.length" class="px-4 py-2 text-[11px] uppercase tracking-wide text-gray-500">Earlier</div>
                <ul>
                  <li v-for="n in earlierList" :key="n.id" class="px-4 py-3 border-b flex items-start gap-2" :class="n.is_read ? 'bg-white' : 'bg-indigo-50'">
                    <div class="mt-0.5">
                      <i :class="['mdi', n.is_read ? 'mdi-bell-outline text-gray-400' : 'mdi-bell-ring-outline text-indigo-600']"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-sm truncate" :title="n.message">{{ n.message }}</div>
                      <div class="text-[11px] text-gray-500">{{ n.created_at ? new Date(n.created_at).toLocaleString() : '' }}</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button class="text-[11px] px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200" @click="toggleRead(n)">{{ n.is_read ? 'Unread' : 'Read' }}</button>
                    </div>
                  </li>
                </ul>
              </template>
            </div>
            <div class="px-3 py-2 bg-gray-50 border-t text-right flex items-center justify-between">
              <button class="text-xs text-gray-600" @click="notifOpen = false">Close</button>
              <button class="text-xs text-indigo-600 hover:underline" @click="openMore">See more</button>
            </div>
          </div>
        </div>
      </div>
      <!-- Profile/Name clickable area with chevron -->
      <!-- Mobile avatar chip (xs only) -->
      <button
        class="flex sm:hidden items-center gap-1.5 px-1.5 py-1 rounded-full bg-transparent text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        @click="toggleDropdown" :aria-expanded="isOpen ? 'true' : 'false'">
        <div class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 grid place-items-center ring-1 ring-gray-200">
          <img v-if="headerAvatar" :src="headerAvatar" alt="Avatar" class="h-full w-full object-cover" />
          <div v-else class="h-full w-full grid place-items-center text-gray-700 text-xs font-semibold">
            {{ initials(headerName) }}
          </div>
        </div>
        <i :class="['mdi', isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down', 'text-lg text-white/90']"></i>
      </button>

      <button
        class="hidden sm:flex items-center gap-2 pl-1 pr-2 py-1 mr-1 rounded-full bg-transparent text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        @click="toggleDropdown" :aria-expanded="isOpen ? 'true' : 'false'">
        <div class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 grid place-items-center ring-1 ring-gray-200">
          <img v-if="headerAvatar" :src="headerAvatar" alt="Avatar" class="h-full w-full object-cover" />
          <div v-else class="h-full w-full grid place-items-center text-gray-700 text-xs font-semibold">
            {{ initials(headerName) }}
          </div>
        </div>
        <span class="font-medium truncate max-w-[12rem] text-left">{{ headerName }}</span>
        <i :class="['mdi', isOpen ? 'mdi-chevron-up' : 'mdi-chevron-down', 'text-lg text-white/90']"></i>
      </button>

      <!-- Dropdown overlay to close on outside click -->
      <div v-if="isOpen" class="fixed inset-0 z-30" @click="isOpen = false"></div>

      <!-- Dropdown panel -->
      <div v-if="isOpen" class="absolute right-0 top-full mt-2 z-40 w-64 sm:w-80">
        <!-- Caret pointer -->
        <div class="absolute right-4 sm:right-6 -top-2 h-3 w-3 rotate-45 bg-white ring-1 ring-black/5"></div>
        <div class="relative bg-white text-gray-900 rounded-xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
          <div class="px-4 py-3 border-b bg-gray-50">
            <div class="text-[11px] uppercase tracking-wide text-gray-500">Account</div>
          </div>

          <!-- See your profile -->
          <button class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50" @click="goToProfile">
            <div
              class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
              <img v-if="avatarSrc" :src="avatarSrc" alt="avatar" class="h-full w-full object-cover" />
              <i v-else class="mdi mdi-account text-gray-400 text-xl"></i>
            </div>
            <div class="min-w-0 flex-1 text-left">
              <div class="text-sm font-medium truncate">See your profile</div>
              <div class="text-xs text-gray-500 truncate">{{ fullname }}</div>
            </div>
            <i class="mdi mdi-chevron-right text-gray-400"></i>
          </button>

          <div class="my-1 border-t border-gray-200"></div>

          <div>
            <!-- Skeleton while loading clubs -->
            <div v-if="loadingClubs" class="px-4 py-3 space-y-3">
              <div v-for="i in 2" :key="i" class="flex items-center gap-3 animate-pulse">
                <div class="h-8 w-8 rounded-md bg-gray-200"></div>
                <div class="flex-1">
                  <div class="h-3 w-40 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>

            <button v-if="!loadingClubs" v-for="c in topClubs" :key="c.id"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50" @click="goToClub(c)">
              <div
                class="h-8 w-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
                <img v-if="logoUrl(c.logo)" :src="logoUrl(c.logo)" alt="logo" class="h-full w-full object-cover" />
                <i v-else class="mdi mdi-account-group text-gray-400 text-xl"></i>
              </div>
              <div class="min-w-0 flex-1 text-left">
                <div class="text-sm font-medium truncate">{{ c.name || 'Club' }}</div>
              </div>
              <i class="mdi mdi-chevron-right text-gray-400"></i>
            </button>

            <div v-if="!loadingClubs && !hasClubs" class="px-4 py-6 text-center text-sm text-gray-500">
              No club affiliations yet.
            </div>
          </div>

          <div class="px-4 py-2 bg-gray-50 border-t border-gray-200 space-y-2">
            <button class="w-full px-3 py-2 text-sm rounded-lg transition"
              :class="loadingClubs ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'"
              :disabled="loadingClubs || !hasMore" @click="openClubsModal">
              See all clubs
            </button>
            <div class="border-t border-gray-200"></div>
            <button
              class="w-full px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
              @click="isOpen = false; $emit('request-logout')">
              <i class="mdi mdi-logout text-lg"></i>
              <span>Log out</span>
            </button>
          </div>
        </div>
      </div>

    </nav>
  </div>

  <!-- All clubs modal -->
  <ClubsListModal v-model="showClubs" :clubs="clubs" :loading="loadingClubs" @select="goToClub" />
  <NotificationsListModal v-model="showNotifs" />
 </template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useAppContextStore } from '@/stores/appContext'
import ClubsListModal from '@/components/clubs/ClubsListModal.vue'
import NotificationsListModal from '@/components/notifications/NotificationsListModal.vue'
import { useNotificationStore } from '@/stores/notification'
defineOptions({ name: "AppHeader" });

const props = defineProps({
  fullname: { type: String, default: "" },
  avatar: { type: String, default: "" },
});

defineEmits(["toggle", "request-logout"]);

const avatarSrc = computed(() => props.avatar || "");
function initials(name) {
  return String(name || "")
    .split(" ")
    .filter(Boolean)
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// --- Clubs dropdown logic ---
const router = useRouter()
const auth = useAuthStore()
const userStore = useUserStore()
const appCtx = useAppContextStore()
const notifStore = useNotificationStore()

const API_ROOT = import.meta.env.VITE_API_ROOT_URL || ''
const mediaUrl = (v) => {
  if (!v) return ''
  if (typeof v !== 'string') return ''
  return v.startsWith('http') || v.startsWith('data:') ? v : `${API_ROOT}${v}`
}
const logoUrl = (v) => mediaUrl(v)

const isOpen = ref(false)
const notifOpen = ref(false)
const showClubs = ref(false)
const loadingClubs = ref(false)
const clubs = computed(() => Array.isArray(userStore.selectedUserClubs) ? userStore.selectedUserClubs : [])
const hasClubs = computed(() => (clubs.value?.length || 0) > 0)
const topClubs = computed(() => clubs.value.slice(0, 2))
const hasMore = computed(() => (clubs.value?.length || 0) > 2)

// --- Header display context (user or selected club) ---
const headerName = computed(() => appCtx.isClub ? (appCtx.headerName || props.fullname) : props.fullname)
const headerAvatar = computed(() => appCtx.isClub ? (appCtx.headerAvatar || '') : (props.avatar || ''))

const loadClubs = async () => {
  const uid = auth.user?.id
  if (!uid) return
  try {
    loadingClubs.value = true
    await userStore.fetchUserClubs(uid, { force: true })
  } catch { }
  finally { loadingClubs.value = false }
}

onMounted(() => { loadClubs() })
watch(() => auth.user?.id, () => loadClubs())

const toggleDropdown = () => {
  const next = !isOpen.value
  isOpen.value = next
  if (next && (!clubs.value || clubs.value.length === 0)) {
    // Prefetch on first open if not loaded yet
    loadClubs()
  }
}
const openClubsModal = () => { isOpen.value = false; showClubs.value = true }

const goToClub = (club) => {
  const id = typeof club === 'object' ? club?.id : club
  if (!id) return
  isOpen.value = false
  showClubs.value = false
  // switch header to club context
  if (typeof club === 'object') {
    appCtx.setClubContext({ id, name: club?.name || '', logo: logoUrl(club?.logo) })
  }
  router.push({ name: 'club-view', params: { id } })
}

const goToProfile = () => {
  isOpen.value = false
  showClubs.value = false
  const uid = auth.user?.id
  // switch header to user context
  appCtx.setUserContext()
  if (uid) router.push({ name: 'profile', params: { id: uid } })
  else router.push({ name: 'profile' })
}

// --- Notifications ---
const notifBadge = computed(() => notifStore.unreadTotal || 0)
const listAll = computed(() => (notifStore.items?.data || []).slice())
const nNew = computed(() => listAll.value.length ? listAll.value[0] : null)
const todayList = computed(() => {
  const out = []
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const items = listAll.value.slice(1)
  for (const n of items) {
    const t = n.created_at ? new Date(n.created_at) : null
    if (t && t >= start) out.push(n)
    if (out.length >= 2) break
  }
  return out
})
const earlierList = computed(() => {
  const now = new Date(); const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const items = listAll.value.slice(1).filter(n => {
    const t = n.created_at ? new Date(n.created_at) : null
    return  !(t && t >= start) 
  })
  return items.slice(0, 3)
})
const openNotifs = async () => {
  if (!auth?.token) return
  await notifStore.fetchAll({ page: 1, limit: 10, order: 'DESC', sort: 'created_at' }, true)
  await refreshBadge()
}
const toggleNotifs = async () => {
  const next = !notifOpen.value
  notifOpen.value = next
  if (next) {
    await openNotifs()
    // Do NOT auto-mark read on open; user controls read/unread explicitly
    await refreshBadge()
  }
}
const markAllRead = async () => { await notifStore.markAllRead(); await refreshBadge() }
const toggleRead = async (n) => { try { n.is_read ? await notifStore.markUnread(n.id) : await notifStore.markRead(n.id) } finally { await refreshBadge() } }
const showNotifs = ref(false)
const openMore = async () => { if (!auth?.token) return; showNotifs.value = true; await notifStore.fetchAll({ page: 1, limit: 10, order: 'DESC', sort: 'created_at' }, true) }

// Helper to refresh unread badge
let refreshing = false
async function refreshBadge() {
  if (refreshing) return
  refreshing = true
  try { await notifStore.refreshUnread() } catch {}
  finally { refreshing = false }
}

// Initial badge load and window focus refresh
let pollId = null
onMounted(() => {
  if (auth?.token) refreshBadge()
  window.addEventListener('focus', () => { if (auth?.token) refreshBadge() })
  // Periodic focused polling (every 60s) without hammering (store-throttled)
  pollId = window.setInterval(() => {
    if (document.hasFocus() && auth?.token) refreshBadge()
  }, 60000)
})
onBeforeUnmount(() => {
  window.removeEventListener('focus', refreshBadge)
  if (pollId) { window.clearInterval(pollId); pollId = null }
})
</script>
