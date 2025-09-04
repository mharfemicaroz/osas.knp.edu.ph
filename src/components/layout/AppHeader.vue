<!-- src/components/layout/AppHeader.vue -->
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
      <!-- Profile/Name clickable area with chevron -->
      <!-- Mobile avatar chip (xs only) -->
      <button
        class="flex sm:hidden items-center gap-1.5 px-1.5 py-1 rounded-full bg-transparent text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
        @click="toggleDropdown"
        :aria-expanded="isOpen ? 'true' : 'false'"
      >
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
        @click="toggleDropdown"
        :aria-expanded="isOpen ? 'true' : 'false'"
      >
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
          <button
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
            @click="goToProfile"
          >
            <div class="h-8 w-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
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

            <button
              v-if="!loadingClubs"
              v-for="c in topClubs"
              :key="c.id"
              class="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
              @click="goToClub(c)"
            >
              <div class="h-8 w-8 rounded-md overflow-hidden bg-gray-100 flex items-center justify-center ring-1 ring-gray-200">
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
            <button
              class="w-full px-3 py-2 text-sm rounded-lg transition"
              :class="loadingClubs ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-gray-900 text-white hover:bg-black'"
              :disabled="loadingClubs || !hasMore"
              @click="openClubsModal"
            >
              See all clubs
            </button>
            <div class="border-t border-gray-200"></div>
            <button
              class="w-full px-3 py-2 text-sm rounded-lg text-gray-700 hover:bg-gray-100 flex items-center justify-center gap-2"
              @click="isOpen = false; $emit('request-logout')"
            >
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
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { useAppContextStore } from '@/stores/appContext'
import ClubsListModal from '@/components/clubs/ClubsListModal.vue'
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

const API_ROOT = import.meta.env.VITE_API_ROOT_URL || ''
const mediaUrl = (v) => {
  if (!v) return ''
  if (typeof v !== 'string') return ''
  return v.startsWith('http') || v.startsWith('data:') ? v : `${API_ROOT}${v}`
}
const logoUrl = (v) => mediaUrl(v)

const isOpen = ref(false)
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
  } catch {}
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
</script>
