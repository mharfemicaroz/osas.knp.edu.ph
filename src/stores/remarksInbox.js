// src/stores/remarksInbox.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

import activityDesignService from '@/services/activity/activityDesignService'
import utilizationRequestService from '@/services/activity/utilizationRequestService'
import liquidationFundService from '@/services/activity/liquidationFundService'
import annualPlanService from '@/services/plan/annualPlanService'

import { useAuthStore } from '@/stores/auth'
import { useAppContextStore } from '@/stores/appContext'

function parseRemarks(raw) {
  try {
    const arr = Array.isArray(raw) ? raw : (JSON.parse(raw || '[]') || [])
    return (arr || []).map((it) => {
      if (!it || typeof it !== 'object') return it
      if (!Array.isArray(it.read_by)) it.read_by = (it.user_id != null ? [it.user_id] : [])
      return it
    })
  } catch { return [] }
}

function toNumber(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const useRemarksInboxStore = defineStore('remarksInbox', () => {
  const items = ref([]) // aggregated entries (latest unread per thread)
  const unreadTotal = ref(0) // total unread messages across all threads
  const isLoading = ref(false)
  const isLoaded = ref(false)
  const error = ref(null)

  const auth = useAuthStore()
  const appCtx = useAppContextStore()

  const currentUserId = computed(() => toNumber(auth.user?.id))

  const computeUnreadForUser = (entry) => {
    if (!entry) return false
    const uid = currentUserId.value
    if (uid == null) return false
    if (toNumber(entry.user_id) === uid) return false
    const rb = Array.isArray(entry.read_by) ? entry.read_by.map(toNumber) : []
    return !rb.includes(uid)
  }

  const fetchUnread = async ({ limitPerModule = 10 } = {}) => {
    error.value = null
    try {
      isLoading.value = true
      const paramsBase = { page: 1, limit: limitPerModule, order: 'DESC', sort: 'updated_at' }
      const clubId = appCtx.isClub ? appCtx.activeClubId : undefined

      const [adRes, urRes, lfRes, apRes] = await Promise.all([
        activityDesignService.list({ ...paramsBase, club_id: clubId }),
        utilizationRequestService.list({ ...paramsBase, club_id: clubId }),
        liquidationFundService.list({ ...paramsBase, club_id: clubId }),
        annualPlanService.list({ ...paramsBase, club_id: clubId }),
      ])

      const aggregate = []
      let totalUnread = 0

      const pushItem = (module, row, title) => {
        const remarks = parseRemarks(row?.remarks)
        const unread = remarks.filter(computeUnreadForUser)
        if (!unread.length) return
        // latest unread for preview
        const last = unread[unread.length - 1]
        totalUnread += unread.length
        aggregate.push({
          key: `${module}-${row.id}`,
          module,
          entityId: row.id,
          reference: row.reference_code || title || 'Item',
          message: last?.message || '',
          datetime: last?.datetime || row.updated_at || row.created_at,
        })
      }

      // Activity Designs
      for (const r of (adRes?.data || [])) {
        pushItem('AD', r, r?.name_of_activity || 'Activity Design')
      }
      // Utilization Requests
      for (const r of (urRes?.data || [])) {
        const title = r?.reference_code || r?.activity_design?.name_of_activity || 'Utilization'
        pushItem('UR', r, title)
      }
      // Liquidation Funds
      for (const r of (lfRes?.data || lfRes?.rows || [])) {
        const title = r?.reference_code || r?.activity_design?.name_of_activity || 'Liquidation'
        pushItem('LF', r, title)
      }
      // Annual Plans
      for (const r of (apRes?.data || [])) {
        const title = r?.reference_code || 'Annual Plan'
        pushItem('AP', r, title)
      }

      // sort by datetime desc
      aggregate.sort((a, b) => new Date(b.datetime || 0) - new Date(a.datetime || 0))

      items.value = aggregate
      unreadTotal.value = totalUnread
      isLoaded.value = true
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to load remarks inbox'
    } finally {
      isLoading.value = false
    }
  }

  const markThreadRead = async (module, entityId) => {
    const uid = currentUserId.value
    if (uid == null) return
    const addRead = (arr) => {
      const next = parseRemarks(arr)
      return next.map((x) => {
        if (!x || toNumber(x.user_id) === uid) return x
        const rb = Array.isArray(x.read_by) ? x.read_by.slice() : []
        if (!rb.map(toNumber).includes(uid)) rb.push(uid)
        return { ...x, read_by: rb }
      })
    }
    const apply = async (svc, id, row) => {
      const next = addRead(row?.remarks)
      const payload = { remarks: JSON.stringify(next) }
      await svc.updateById(id, payload)
    }
    try {
      if (module === 'AD') {
        const row = await activityDesignService.getById(entityId)
        await apply(activityDesignService, entityId, row)
      } else if (module === 'UR') {
        const row = await utilizationRequestService.getById(entityId)
        await apply(utilizationRequestService, entityId, row)
      } else if (module === 'LF') {
        const row = await liquidationFundService.getById(entityId)
        await apply(liquidationFundService, entityId, row)
      } else if (module === 'AP') {
        const row = await annualPlanService.getById(entityId)
        await apply(annualPlanService, entityId, row)
      }
    } catch {
      // ignore per-thread failure
    }
  }

  const markAllRead = async () => {
    const list = (items.value || []).slice()
    for (const it of list) {
      try { await markThreadRead(it.module, it.entityId) } catch {}
    }
    // after marking, refresh snapshot quickly
    try { await fetchUnread({}) } catch {}
  }

  return {
    items,
    unreadTotal,
    isLoading,
    isLoaded,
    error,
    fetchUnread,
    markThreadRead,
    markAllRead,
  }
})

