// src/utils/clubScope.js
import { storeToRefs } from 'pinia'
import { useAppContextStore } from '@/stores/appContext'

export function useClubScope() {
  const ctx = useAppContextStore()
  const { isClub, activeClubId } = storeToRefs(ctx)

  const withClub = (params = {}) => {
    const p = { ...(params || {}) }
    if (isClub.value && activeClubId.value) {
      // prefer explicit param if already set by caller
      if (!('club_id' in p) || p.club_id == null || p.club_id === '') {
        p.club_id = activeClubId.value
      }
    }
    return p
  }

  return { isClub, activeClubId, withClub }
}

