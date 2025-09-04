// src/stores/appContext.js
import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

const KEY = 'appContext'

export const useAppContextStore = defineStore('appContext', () => {
  const mode = ref('user') // 'user' | 'club'
  const club = ref({ id: null, name: '', logo: '' })

  // hydrate from localStorage
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.mode) mode.value = parsed.mode
      if (parsed?.club) club.value = { id: parsed.club.id || null, name: parsed.club.name || '', logo: parsed.club.logo || '' }
    }
  } catch {}

  const isClub = computed(() => mode.value === 'club' && !!club.value?.id)
  const activeClubId = computed(() => (isClub.value ? club.value.id : null))

  const headerName = computed(() => (isClub.value ? (club.value.name || '') : ''))
  const headerAvatar = computed(() => (isClub.value ? (club.value.logo || '') : ''))

  const setUserContext = () => {
    mode.value = 'user'
    club.value = { id: null, name: '', logo: '' }
  }
  const setClubContext = ({ id, name, logo }) => {
    mode.value = 'club'
    club.value = { id, name: name || '', logo: logo || '' }
  }

  watch([mode, club], () => {
    try { localStorage.setItem(KEY, JSON.stringify({ mode: mode.value, club: club.value })) } catch {}
  }, { deep: true })

  return { mode, club, isClub, activeClubId, headerName, headerAvatar, setUserContext, setClubContext }
})

