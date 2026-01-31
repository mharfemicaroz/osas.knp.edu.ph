<!-- src/views/ProfileView.vue -->
<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import Swal from 'sweetalert2'
import { compressForAvatar, compressForCover, compressImage } from '@/utils/imageCompression'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import { usePostStore } from '@/stores/post'

import { mdiCameraPlus, mdiPencil } from '@mdi/js'

/* Stores */
const auth = useAuthStore()
const userStore = useUserStore()
const postStore = usePostStore()

/* Route (optional :id) */
const route = useRoute()
const routeUserId = computed(() => {
    const raw = route.params.id
    // handle undefined / string -> number
    return typeof raw === 'string' && raw.trim() ? Number(raw) : null
})

/* Signed-in user basics */
const currentUser = computed(() => auth.user || {})
const authUserId = computed(() => currentUser.value?.id || null)

/* Target user to view: route id (if provided) else auth user */
const targetUserId = computed(() => routeUserId.value || authUserId.value)
const isSelf = computed(() => !!authUserId.value && authUserId.value === targetUserId.value)

// Page loading state to avoid showing fallback user while fetching route profile
const pageLoading = ref(false)
const loadingClubs = ref(false)
const clubsForUser = ref([])

const loadClubsForUser = async () => {
    if (!targetUserId.value) return
    loadingClubs.value = true
    try {
        const clubs = await userStore.fetchUserClubs(targetUserId.value, { force: true })
        clubsForUser.value = (clubs || []).map((c) => ({
            id: c.id,
            name: c.name,
            code: c.code,
            logo: c.logo || c.logo_url || '',
            role: c.membership?.role || 'member',
            status: c.membership?.status || 'active',
        }))
    } catch (err) {
        clubsForUser.value = []
        console.error(err)
    } finally {
        loadingClubs.value = false
    }
}

const timelineFilter = ref('all')
const hasMorePosts = computed(() => {
    if (typeof postStore.items.hasMore === 'boolean') return postStore.items.hasMore
    return postStore.items.totalPages > postPage.value
})

const activeTimelineFilter = computed(() => (isSelf.value ? timelineFilter.value : 'profile'))

const loadPosts = async (reset = true) => {
    const mode = activeTimelineFilter.value
    if (mode === 'mine' && !authUserId.value) return
    if (mode === 'profile' && !targetUserId.value) return
    if (reset) {
        postStore.resetStore()
        postPage.value = 1
    }
    const query = {
        page: postPage.value,
        limit: postLimit.value,
        sort: 'created_at',
        order: 'DESC',
        cursor_mode: true,
    }
    if (postPage.value > 1 && postStore.items.cursor) {
        query.cursor = postStore.items.cursor
    }
    if (mode === 'mine') {
        query.user_id = authUserId.value
    } else if (mode === 'profile') {
        query.user_id = targetUserId.value
    }
    await postStore.fetchAll(query, true, postPage.value > 1)
}

const loadMorePosts = async () => {
    if (postStore.isLoading || !hasMorePosts.value) return
    postPage.value += 1
    await loadPosts(false)
}

/* Load full user into store on mount + when :id changes */
const loadUser = async () => {
    if (!targetUserId.value) return
    pageLoading.value = true
    try {
        await userStore.fetchById(targetUserId.value)
        await loadClubsForUser()
    } finally {
        pageLoading.value = false
    }
    await loadPosts(true)
}

const loadMoreRef = ref(null)
let loadMoreObserver = null

const setupLoadMoreObserver = () => {
    if (loadMoreObserver) loadMoreObserver.disconnect()
    if (!loadMoreRef.value) return
    loadMoreObserver = new IntersectionObserver(
        (entries) => {
            if (entries[0]?.isIntersecting) loadMorePosts()
        },
        { rootMargin: '200px' }
    )
    loadMoreObserver.observe(loadMoreRef.value)
}

onMounted(() => {
    loadUser()
    setupLoadMoreObserver()
})
onBeforeUnmount(() => {
    if (loadMoreObserver) loadMoreObserver.disconnect()
})
watch(() => loadMoreRef.value, () => {
    setupLoadMoreObserver()
})
watch(() => routeUserId.value, async () => {
    await loadUser()
})
watch(() => timelineFilter.value, async () => {
    if (!isSelf.value) return
    await loadPosts(true)
})

/* Single source of truth for profile UI */
// For route profile, only show the fetched user when it matches the route id
const storeUser = computed(() => {
    if (routeUserId.value) {
        const su = userStore.selectedUser
        return su && su.id === routeUserId.value ? su : null
    }
    return userStore.selectedUser || currentUser.value || {}
})

/* Computed: avatar/cover/bio straight from store */
const avatarUrl = computed(() => storeUser.value?.avatar || '')
const coverUrl = computed(() => storeUser.value?.cover || '')
const displayedBio = computed(() => storeUser.value?.bio || '')

/* File inputs */
const avatarInput = ref(null)
const coverInput = ref(null)

/* UI flags */
const uploadingAvatar = ref(false)
const uploadingCover = ref(false)
const composerText = ref('')
const composerOpen = ref(false)
const composerType = ref('text')
const composerFeeling = ref('')
const composerEvent = ref({ title: '', date: '', location: '' })
const composerMedia = ref(null)
const composerSubmitting = ref(false)
const photoInput = ref(null)
const commentDrafts = ref({})
const replyDrafts = ref({})
const postPage = ref(1)
const postLimit = ref(5)
const reactionPanelPostId = ref(null)
const reactionFilter = ref('all')
const reactionHoverId = ref(null)
let reactionHoverTimer = null
const commentPanelPostId = ref(null)
const activeReply = ref(null)
const expandedReplies = ref({})
const shareModalOpen = ref(false)
const shareDraft = ref('')
const shareTargetPost = ref(null)
const shareSubmitting = ref(false)
const mediaModalOpen = ref(false)

/* Helpers */
const fullName = computed(() => {
    const fn = storeUser.value?.first_name?.trim() || ''
    const ln = storeUser.value?.last_name?.trim() || ''
    return (fn || ln) ? `${fn} ${ln}`.trim() : (storeUser.value?.email || '')
})

const initials = (name) =>
    (name || '')
        .split(' ')
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

const normalizeMetadata = (meta) => {
    if (!meta) return {}
    if (typeof meta === 'string') {
        try {
            const parsed = JSON.parse(meta)
            return parsed && typeof parsed === 'object' ? parsed : {}
        } catch {
            return {}
        }
    }
    if (typeof meta === 'object' && !Array.isArray(meta)) return meta
    return {}
}

const personalMeta = computed(() => {
    const meta = normalizeMetadata(storeUser.value?.metadata)
    return {
        birthday: meta.birthday || '',
        sex: meta.sex || '',
        place_lived: meta.place_lived || meta.placeLived || '',
    }
})

const formatDate = (value) => {
    if (!value) return '-'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return String(value)
    return d.toLocaleDateString()
}

const formatRelativeTime = (value) => {
    if (!value) return 'Just now'
    const ts = new Date(value).getTime()
    if (Number.isNaN(ts)) return String(value)
    const diff = Math.max(0, Date.now() - ts)
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d`
    return new Date(ts).toLocaleDateString()
}

const reactionPalette = [
    { type: 'like', label: 'Like', icon: 'mdi-thumb-up', bg: 'bg-blue-600', text: 'text-blue-600' },
    { type: 'love', label: 'Love', icon: 'mdi-heart', bg: 'bg-rose-500', text: 'text-rose-500' },
    { type: 'happy', label: 'Happy', icon: 'mdi-emoticon-happy-outline', bg: 'bg-amber-500', text: 'text-amber-500' },
    { type: 'sad', label: 'Sad', icon: 'mdi-emoticon-sad-outline', bg: 'bg-sky-500', text: 'text-sky-500' },
    { type: 'wow', label: 'Wow', icon: 'mdi-emoticon-excited-outline', bg: 'bg-indigo-500', text: 'text-indigo-500' },
    { type: 'angry', label: 'Angry', icon: 'mdi-emoticon-angry-outline', bg: 'bg-orange-600', text: 'text-orange-600' },
]
const reactionMeta = reactionPalette.reduce((acc, item) => {
    acc[item.type] = item
    return acc
}, {})

const reactionTotal = (post) => {
    const r = post?.reactions || post?.metadata?.reactions || {}
    return Object.keys(r).reduce((sum, key) => sum + Number(r[key] || 0), 0)
}

const topReactionTypes = (post) => {
    const counts = post?.reactions || post?.metadata?.reactions || {}
    return Object.entries(counts)
        .filter(([type, count]) => count > 0 && reactionMeta[type])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([type]) => type)
}

const mapSharedPost = (shared) => {
    if (!shared || typeof shared !== 'object') return null
    let meta = shared.metadata || {}
    if (typeof meta === 'string') {
        try {
            meta = JSON.parse(meta)
        } catch {
            meta = {}
        }
    }
    const author = shared.author || {}
    const name =
        `${author.first_name || ''} ${author.last_name || ''}`.trim() ||
        author.username ||
        'Student'
    const handle = author.username ? `@${author.username}` : '@student'
    return {
        id: shared.id,
        authorName: name,
        handle,
        time: formatRelativeTime(shared.created_at),
        text: shared.content || '',
        post_type: shared.post_type || 'text',
        media: Array.isArray(meta.media) ? meta.media : [],
        feeling: meta.feeling || '',
        event: meta.event || null,
        authorAvatar: author.avatar || '',
    }
}

const mapPostToFeed = (post) => {
    if (!post) return null
    const author = post.author || {}
    const name =
        `${author.first_name || ''} ${author.last_name || ''}`.trim() ||
        author.username ||
        'Student'
    const handle = author.username ? `@${author.username}` : '@student'
    const meta = post.metadata || {}
    let sharedRaw = meta.shared_post || null
    if (typeof sharedRaw === 'string') {
        try {
            sharedRaw = JSON.parse(sharedRaw)
        } catch {
            sharedRaw = null
        }
    }
    const sharedPost = mapSharedPost(sharedRaw)
    const sharedPostId = meta.shared_post_id || sharedPost?.id || null
    const reactionUsers = Array.isArray(meta.reaction_users) ? meta.reaction_users : []
    const myReaction = reactionUsers.find((u) => String(u.user_id) === String(authUserId.value))
    return {
        ...post,
        authorName: name,
        handle,
        time: formatRelativeTime(post.created_at),
        text: post.content || '',
        reactions: meta.reactions || {},
        comments: meta.comments || [],
        shares: meta.shares || 0,
        media: meta.media || [],
        feeling: meta.feeling || '',
        event: meta.event || null,
        authorAvatar: author.avatar || '',
        reactionUsers,
        myReactionType: myReaction?.type || '',
        sharedPost,
        sharedPostId,
    }
}

const feedPosts = computed(() => {
    const rows = postStore.items?.data || []
    return rows.map((post) => mapPostToFeed(post)).filter(Boolean)
})

const canSubmitPost = computed(() => {
    if (!isSelf.value) return false
    const hasText = String(composerText.value || '').trim().length > 0
    const hasMedia = !!composerMedia.value
    const hasFeeling =
        composerType.value === 'feeling' && String(composerFeeling.value || '').trim().length > 0
    const hasEvent =
        composerType.value === 'event' &&
        (String(composerEvent.value.title || '').trim() ||
            String(composerEvent.value.date || '').trim() ||
            String(composerEvent.value.location || '').trim())
    return hasText || hasMedia || hasFeeling || hasEvent
})

const reactionSummaryText = (post) => {
    const users = post?.reactionUsers || []
    if (!users.length) {
        const total = reactionTotal(post)
        return total ? `${total} reactions` : 'Be the first to react'
    }
    const ordered = [...users].sort((a, b) => {
        const aTime = new Date(a.reacted_at || 0).getTime()
        const bTime = new Date(b.reacted_at || 0).getTime()
        return bTime - aTime
    })
    const names = ordered
        .map((u) => u.name || u.username || 'User')
        .filter((v, i, arr) => arr.indexOf(v) === i)
    const top = names.slice(0, 2)
    const remaining = Math.max(0, names.length - top.length)
    if (remaining) return `${top.join(', ')} and ${remaining} others`
    return top.join(', ')
}

const reactionPanelPost = computed(() =>
    feedPosts.value.find((post) => String(post.id) === String(reactionPanelPostId.value)) || null
)

const commentPanelPost = computed(() => {
    if (!commentPanelPostId.value) return null
    const fromFeed = feedPosts.value.find(
        (post) => String(post.id) === String(commentPanelPostId.value)
    )
    if (fromFeed) return fromFeed
    if (postStore.selected && String(postStore.selected.id) === String(commentPanelPostId.value)) {
        return mapPostToFeed(postStore.selected)
    }
    return null
})
const isMediaCommentModal = computed(() =>
    mediaModalOpen.value && !!commentPanelPost.value?.media?.length
)
const commentPanelThreads = computed(() => commentThreadsForPost(commentPanelPost.value))

const openReactionPanel = (post, filter = 'all') => {
    reactionPanelPostId.value = post?.id || null
    reactionFilter.value = filter
}

const closeReactionPanel = () => {
    reactionPanelPostId.value = null
    reactionFilter.value = 'all'
}

const filteredReactionUsers = computed(() => {
    const post = reactionPanelPost.value
    if (!post) return []
    const users = post.reactionUsers || []
    const list = reactionFilter.value === 'all'
        ? users
        : users.filter((u) => u.type === reactionFilter.value)
    return [...list].sort((a, b) => {
        const aTime = new Date(a.reacted_at || 0).getTime()
        const bTime = new Date(b.reacted_at || 0).getTime()
        return bTime - aTime
    })
})

const reactionCountFor = (post, type) => {
    const counts = post?.reactions || {}
    if (type === 'all') return reactionTotal(post)
    return Number(counts?.[type] || 0)
}

const showReactionMenu = (postId) => {
    if (reactionHoverTimer) clearTimeout(reactionHoverTimer)
    reactionHoverId.value = postId
}

const holdReactionMenu = () => {
    if (reactionHoverTimer) clearTimeout(reactionHoverTimer)
}

const hideReactionMenu = () => {
    if (reactionHoverTimer) clearTimeout(reactionHoverTimer)
    reactionHoverTimer = setTimeout(() => {
        reactionHoverId.value = null
    }, 160)
}

const openCommentPanel = (post) => {
    commentPanelPostId.value = post?.id || null
    activeReply.value = null
    expandedReplies.value = {}
    mediaModalOpen.value = false
}

const closeCommentPanel = () => {
    commentPanelPostId.value = null
    activeReply.value = null
    expandedReplies.value = {}
    mediaModalOpen.value = false
}

const openMediaModal = (post) => {
    if (!post?.id || !post.media || !post.media.length) return
    commentPanelPostId.value = post.id
    mediaModalOpen.value = true
    activeReply.value = null
    expandedReplies.value = {}
}


const openSharedPost = async (shared) => {
    const postId = shared?.id
    if (!postId) return
    if (shareModalOpen.value) {
        closeShareModal()
    }
    openCommentPanel({ id: postId })
    const existing = feedPosts.value.find((post) => String(post.id) === String(postId))
    if (!existing) {
        await postStore.fetchById(postId)
    }
}

const draftKeyFor = (postId, targetId) => `${postId}:draft:${targetId}`
const toggleKeyFor = (postId, parentId) => `${postId}:toggle:${parentId}`

const commentTimeValue = (comment) => {
    const raw = comment?.created_at || comment?.time
    const ts = new Date(raw || 0).getTime()
    return Number.isNaN(ts) ? 0 : ts
}

const sortCommentsByTime = (list = []) =>
    [...list].sort((a, b) => commentTimeValue(a) - commentTimeValue(b))

const getCommentInfo = (commentsById, comment) => {
    if (!comment?.id || !comment?.parent_id) {
        return { depth: 0, rootId: comment?.id || null, depth1Id: null, depth2Id: null }
    }
    const ancestors = []
    let current = comment
    const seen = new Set()
    while (current?.parent_id) {
        const parent = commentsById.get(String(current.parent_id))
        if (!parent || seen.has(String(parent.id))) {
            return { depth: 0, rootId: comment.id, depth1Id: null, depth2Id: null }
        }
        ancestors.push(parent)
        seen.add(String(parent.id))
        current = parent
        if (ancestors.length > 6) break
    }
    const depth = ancestors.length
    const root = ancestors[depth - 1]
    const depth1Id = depth === 1 ? comment.id : ancestors[depth - 2]?.id || null
    const depth2Id = depth >= 2
        ? (depth === 2 ? comment.id : ancestors[depth - 3]?.id || null)
        : null
    return {
        depth,
        rootId: root?.id || comment.id,
        depth1Id,
        depth2Id,
    }
}

const commentThreadsForPost = (post) => {
    const comments = Array.isArray(post?.comments) ? post.comments : []
    if (!comments.length) return []
    const commentsById = new Map(comments.map((comment) => [String(comment.id), comment]))
    const infoById = new Map()
    const roots = []
    comments.forEach((comment) => {
        const info = getCommentInfo(commentsById, comment)
        infoById.set(String(comment.id), info)
        if (info.depth === 0) roots.push(comment)
    })
    const rootsSorted = sortCommentsByTime(roots)
    const level1Map = new Map()
    const level2Map = new Map()

    comments.forEach((comment) => {
        const info = infoById.get(String(comment.id))
        if (!info) return
        if (info.depth === 1) {
            const list = level1Map.get(String(info.rootId)) || []
            list.push(comment)
            level1Map.set(String(info.rootId), list)
            return
        }
        if (info.depth >= 2 && info.depth1Id) {
            const entry = level2Map.get(String(info.depth1Id)) || new Map()
            const depth2Id = info.depth2Id || comment.id
            const anchor =
                commentsById.get(String(depth2Id)) ||
                commentsById.get(String(comment.id)) ||
                comment
            const thread = entry.get(String(depth2Id)) || { comment: anchor, replies: [] }
            if (info.depth === 2) {
                thread.comment = anchor
            } else {
                thread.replies.push(comment)
            }
            entry.set(String(depth2Id), thread)
            level2Map.set(String(info.depth1Id), entry)
        }
    })

    return rootsSorted.map((root) => {
        const level1 = sortCommentsByTime(level1Map.get(String(root.id)) || [])
        const replyThreads = level1.map((reply) => {
            const threadsMap = level2Map.get(String(reply.id)) || new Map()
            const threads = Array.from(threadsMap.values()).sort((a, b) =>
                commentTimeValue(a.comment) - commentTimeValue(b.comment)
            )
            threads.forEach((t) => {
                t.replies = sortCommentsByTime(t.replies || [])
            })
            const replyCount = threads.reduce(
                (sum, t) => sum + 1 + (t.replies?.length || 0),
                0
            )
            return {
                comment: reply,
                threads,
                replyCount,
            }
        })
        return {
            comment: root,
            replies: replyThreads,
            replyCount: replyThreads.length,
        }
    })
}

const isRepliesExpanded = (postId, parentId) =>
    !!expandedReplies.value?.[toggleKeyFor(postId, parentId)]

const toggleReplies = (postId, parentId) => {
    const key = toggleKeyFor(postId, parentId)
    const current = !!expandedReplies.value?.[key]
    expandedReplies.value = { ...expandedReplies.value, [key]: !current }
}

const isReplyingTo = (postId, targetId) =>
    activeReply.value &&
    String(activeReply.value.postId) === String(postId) &&
    String(activeReply.value.targetId) === String(targetId)

const stripLeadingMention = (text, mentionName) => {
    if (!mentionName) return String(text || '')
    const raw = String(text || '')
    const trimmed = raw.trimStart()
    const prefixes = [`@${mentionName}`, mentionName]
    for (const prefix of prefixes) {
        if (trimmed === prefix) return ''
        if (trimmed.startsWith(`${prefix} `)) {
            return trimmed.slice(prefix.length + 1)
        }
    }
    return raw
}

const replyDisplayText = (reply) => {
    if (!reply?.mention_name) return String(reply?.text || '')
    return stripLeadingMention(reply.text, reply.mention_name)
}

const startReply = (postId, comment) => {
    if (!postId || !comment) return
    const post = commentPanelPost.value
    const comments = Array.isArray(post?.comments) ? post.comments : []
    const commentsById = new Map(comments.map((item) => [String(item.id), item]))
    const info = getCommentInfo(commentsById, comment)
    const parentId = info.depth >= 2 && info.depth2Id ? info.depth2Id : comment.id
    const targetName = comment.name || 'User'
    const mentionName = info.depth >= 1 ? targetName : ''
    const mentionUserId = info.depth >= 1 ? comment.user_id : null
    activeReply.value = {
        postId,
        parentId,
        targetId: comment.id,
        mentionName,
        mentionUserId,
        targetName,
    }
    const key = draftKeyFor(postId, comment.id)
    if (mentionName) {
        const prefix = `${mentionName} `
        const current = String(replyDrafts.value?.[key] || '')
        if (!current.startsWith(prefix)) {
            const nextValue = current ? `${prefix}${current}` : prefix
            replyDrafts.value = { ...replyDrafts.value, [key]: nextValue }
        }
    } else if (replyDrafts.value?.[key] == null) {
        replyDrafts.value = { ...replyDrafts.value, [key]: '' }
    }
    const nextExpanded = { ...expandedReplies.value }
    if (info.rootId && !isRepliesExpanded(postId, info.rootId)) {
        nextExpanded[toggleKeyFor(postId, info.rootId)] = true
    }
    if (info.depth1Id && !isRepliesExpanded(postId, info.depth1Id)) {
        nextExpanded[toggleKeyFor(postId, info.depth1Id)] = true
    }
    if (!isRepliesExpanded(postId, parentId)) {
        nextExpanded[toggleKeyFor(postId, parentId)] = true
    }
    expandedReplies.value = nextExpanded
}

const cancelReply = () => {
    activeReply.value = null
}

const topCommentForPost = (post) => {
    const threads = commentThreadsForPost(post)
    if (!threads.length) return null
    return threads[threads.length - 1]?.comment || null
}

/* ===== Uploads (store updates only) ===== */
const onPickAvatar = () => {
    if (!isSelf.value) return
    avatarInput.value?.click()
}

const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isSelf.value || !targetUserId.value) return
    uploadingAvatar.value = true
    try {
        const compressed = await compressForAvatar(file)
        await userStore.uploadAvatar(targetUserId.value, compressed)
        Swal.fire('Updated', 'Profile photo updated!', 'success')
    } catch (err) {
        Swal.fire('Upload failed', userStore.error || 'Could not upload avatar', 'error')
    } finally {
        uploadingAvatar.value = false
        e.target.value = ''
    }
}

const handleCoverChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isSelf.value || !targetUserId.value) return
    uploadingCover.value = true
    try {
        const compressed = await compressForCover(file)
        await userStore.uploadCover(targetUserId.value, compressed)
        Swal.fire('Updated', 'Cover photo updated!', 'success')
    } catch (err) {
        Swal.fire('Upload failed', userStore.error || 'Could not upload cover', 'error')
    } finally {
        uploadingCover.value = false
        e.target.value = ''
    }
}

/* ===== Posts ===== */
const openComposer = (type = 'text') => {
    if (!isSelf.value) return
    composerOpen.value = true
    composerType.value = type
    if (type === 'photo') {
        photoInput.value?.click()
    }
}

const resetComposer = () => {
    composerText.value = ''
    composerType.value = 'text'
    composerFeeling.value = ''
    composerEvent.value = { title: '', date: '', location: '' }
    composerMedia.value = null
    composerOpen.value = false
}

const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isSelf.value) return
    try {
        const dataUrl = await compressImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            quality: 0.82,
            mimeType: 'image/jpeg',
            maxBytes: 800 * 1024,
            asFile: false,
        })
        composerMedia.value = {
            url: dataUrl,
            name: file.name || 'photo.jpg',
            kind: 'image',
        }
        composerType.value = 'photo'
        composerOpen.value = true
    } catch (err) {
        Swal.fire('Upload failed', 'Could not process the photo.', 'error')
    } finally {
        e.target.value = ''
    }
}

const removeComposerMedia = () => {
    composerMedia.value = null
}

const submitPost = async () => {
    if (!canSubmitPost.value || composerSubmitting.value) return
    composerSubmitting.value = true
    try {
        const metadata = {}
        if (composerMedia.value) {
            metadata.media = [composerMedia.value]
        }
        if (composerType.value === 'feeling' && composerFeeling.value) {
            metadata.feeling = composerFeeling.value
        }
        if (composerType.value === 'event') {
            const event = {
                title: String(composerEvent.value.title || '').trim(),
                date: String(composerEvent.value.date || '').trim(),
                location: String(composerEvent.value.location || '').trim(),
            }
            if (event.title || event.date || event.location) metadata.event = event
        }

        await postStore.create({
            content: String(composerText.value || '').trim(),
            post_type: composerType.value,
            metadata,
        })
        resetComposer()
    } catch (err) {
        Swal.fire('Post failed', postStore.error || 'Could not create post', 'error')
    } finally {
        composerSubmitting.value = false
    }
}

const reactToPost = async (postId, type = 'like') => {
    try {
        await postStore.react(postId, type)
    } catch (err) {
        Swal.fire('Oops', postStore.error || 'Could not update reaction', 'error')
    }
}

const sendComment = async (postId, targetId = null) => {
    const isReply = !!targetId
    const key = isReply ? draftKeyFor(postId, targetId) : postId
    const draft = isReply ? replyDrafts.value?.[key] : commentDrafts.value?.[postId]
    let text = String(draft || '').trim()
    if (!text) return
    const isActiveReply = isReply && isReplyingTo(postId, targetId)
    const mentionName = isActiveReply ? activeReply.value?.mentionName : ''
    const mentionUserId = isActiveReply ? activeReply.value?.mentionUserId : null
    const parentId = isActiveReply ? activeReply.value?.parentId : targetId
    if (mentionName) {
        text = stripLeadingMention(text, mentionName).trim()
    }
    if (!text) return
    try {
        await postStore.comment(postId, text, {
            parentId,
            mentionName,
            mentionUserId,
        })
        if (isReply) {
            replyDrafts.value = { ...replyDrafts.value, [key]: '' }
            if (isActiveReply) activeReply.value = null
        } else {
            commentDrafts.value = { ...commentDrafts.value, [postId]: '' }
        }
    } catch (err) {
        Swal.fire('Oops', postStore.error || 'Could not add comment', 'error')
    }
}

const sharePreviewPost = computed(() => shareTargetPost.value?.preview || null)

const openShareModal = (post) => {
    if (!post) return
    const originalId = post.sharedPostId || post.sharedPost?.id || post.id
    const preview = post.sharedPost || (post.sharedPostId ? null : post)
    shareTargetPost.value = {
        sourceId: post.id,
        originalId,
        preview,
    }
    shareDraft.value = ''
    shareModalOpen.value = true
}

const closeShareModal = () => {
    shareModalOpen.value = false
    shareTargetPost.value = null
    shareDraft.value = ''
}

const submitShare = async () => {
    if (!shareTargetPost.value || shareSubmitting.value) return
    shareSubmitting.value = true
    try {
        const shouldInsert = activeTimelineFilter.value !== 'profile'
        await postStore.share(shareTargetPost.value.originalId, shareDraft.value.trim(), {
            insert: shouldInsert,
        })
        closeShareModal()
    } catch (err) {
        Swal.fire('Oops', postStore.error || 'Could not share post', 'error')
    } finally {
        shareSubmitting.value = false
    }
}

const sharePost = (postId) => {
    const post = feedPosts.value.find((item) => String(item.id) === String(postId))
    if (!post) return
    openShareModal(post)
}

/* Open club in new tab */
const openClub = (clubId) => {
    if (!clubId) return
    window.open(`/#/club/${clubId}`, '_self')
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Loading guard -->
            <div v-if="pageLoading || !storeUser" class="rounded-2xl border bg-white p-6 text-sm text-gray-500">
                Loading profile...
            </div>
            <template v-else>
                <!-- Cover + Avatar -->
                <div class="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
                    <!-- Cover -->
                    <div
                        class="relative h-48 sm:h-80 md:h-[360px] w-full bg-gray-100 group overflow-hidden rounded-t-2xl">
                        <img v-if="coverUrl" :src="coverUrl" alt="Cover" class="h-full w-full object-cover"
                            loading="lazy" />
                        <div v-else
                            class="flex h-full w-full items-center justify-center bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-500">
                            <span class="text-sm">No cover photo</span>
                        </div>

                        <!-- Full-area invisible picker (disabled when viewing others) -->
                        <input ref="coverInput" type="file" accept="image/*"
                            class="absolute inset-0 opacity-0 cursor-pointer" :disabled="uploadingCover || !isSelf"
                            @change="handleCoverChange" />

                        <!-- Visual helper button -->
                        <button type="button"
                            class="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs shadow hover:bg-white z-10 disabled:opacity-60"
                            :disabled="uploadingCover || !isSelf" @click="coverInput?.click()">
                            <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                <path :d="mdiCameraPlus" />
                            </svg>
                            <span>{{ uploadingCover ? 'Uploading...' : (isSelf ? 'Change cover' : 'Cover') }}</span>
                        </button>

                        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </div>

                    <!-- Avatar, Name, Username -->
                    <div class="relative px-4 sm:px-6 pb-4 sm:pb-6">
                        <div class="-mt-10 sm:-mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                            <!-- Avatar -->
                            <div
                                class="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow">
                                <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover"
                                    loading="lazy" />
                                <div v-else
                                    class="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 font-semibold">
                                    {{ initials(fullName) }}
                                </div>
                                <button type="button"
                                    class="absolute right-0 bottom-0 m-1 rounded-full bg-white p-1 shadow hover:bg-gray-50 disabled:opacity-60"
                                    :title="uploadingAvatar ? 'Uploading...' : (isSelf ? 'Change photo' : 'View only')"
                                    :disabled="uploadingAvatar || !isSelf" @click="onPickAvatar">
                                    <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                        <path :d="mdiPencil" />
                                    </svg>
                                </button>
                                <input ref="avatarInput" type="file" accept="image/*" class="hidden"
                                    @change="handleAvatarChange" />
                            </div>

                            <!-- Names & Bio (bio from store) -->
                            <div class="mt-2 sm:mt-11">
                                <div class="text-xl font-semibold text-gray-900">{{ fullName }}</div>
                                <div class="text-sm text-gray-500">@{{ storeUser.username || 'username' }}</div>
                                <div v-if="displayedBio"
                                    class="mt-2 max-w-2xl text-sm text-gray-700 whitespace-pre-line">
                                    {{ displayedBio }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Facebook-like grid -->
                <div class="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <!-- Left column -->
                    <div class="lg:col-span-4">
                        <div class="space-y-6 lg:sticky lg:top-6">
                            <div class="rounded-2xl border bg-white shadow-sm">
                                <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                                    <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                        <i class="mdi mdi-account text-indigo-600 text-lg"></i>
                                        Personal Details
                                    </h3>
                                    <span class="text-[11px] text-gray-500">Private</span>
                                </div>
                                <div class="px-4 sm:px-6 py-4 space-y-4 text-sm">
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                                            <i class="mdi mdi-cake-variant"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-xs uppercase tracking-wide text-gray-500">Birthday</div>
                                            <div class="text-gray-800">{{ formatDate(personalMeta.birthday) }}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="h-9 w-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                                            <i class="mdi mdi-account-heart-outline"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-xs uppercase tracking-wide text-gray-500">Sex</div>
                                            <div class="text-gray-800">{{ personalMeta.sex || '-' }}</div>
                                        </div>
                                    </div>
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                                            <i class="mdi mdi-map-marker-outline"></i>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-xs uppercase tracking-wide text-gray-500">Place lived</div>
                                            <div class="text-gray-800">{{ personalMeta.place_lived || '-' }}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="rounded-2xl border bg-white shadow-sm">
                                <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                                    <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                        <i class="mdi mdi-account-group text-emerald-600 text-lg"></i>
                                        Clubs Affiliated
                                    </h3>
                                    <span class="text-[11px] text-gray-500">
                                        {{ loadingClubs ? 'Loading...' : `${clubsForUser.length} club(s)` }}
                                    </span>
                                </div>
                                <div class="p-4 sm:p-6">
                                    <div v-if="loadingClubs" class="space-y-3">
                                        <div v-for="i in 3" :key="i" class="flex items-center gap-3 animate-pulse">
                                            <div class="h-10 w-10 rounded-lg bg-gray-200"></div>
                                            <div class="flex-1">
                                                <div class="h-3 w-2/3 bg-gray-200 rounded"></div>
                                                <div class="h-3 w-1/3 bg-gray-100 rounded mt-2"></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div v-else-if="!clubsForUser.length" class="text-sm text-gray-500">
                                        No club affiliations yet.
                                    </div>
                                    <div v-else class="space-y-3">
                                        <button v-for="c in clubsForUser" :key="c.id"
                                            class="w-full flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2.5 hover:bg-gray-50 transition"
                                            @click="openClub(c.id)">
                                            <div
                                                class="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                                                <img v-if="c.logo" :src="c.logo" alt=""
                                                    class="h-full w-full object-cover" />
                                                <span v-else>{{ initials(c.name || c.code) }}</span>
                                            </div>
                                            <div class="min-w-0 flex-1 text-left">
                                                <div class="truncate text-sm font-medium text-gray-900">{{ c.name }}
                                                </div>
                                                <div class="truncate text-xs text-gray-500">@{{ c.code }}</div>
                                            </div>
                                            <span class="text-[11px] text-gray-500 capitalize">{{ c.role }}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Right column -->
                    <div class="lg:col-span-8 space-y-6">
                        <div v-if="isSelf" class="flex items-center gap-3 text-xs font-semibold text-gray-500 px-1">
                            <button type="button" class="transition"
                                :class="timelineFilter === 'all' ? 'text-indigo-600' : 'hover:text-gray-700'"
                                @click="timelineFilter = 'all'">
                                All Roadmaps
                            </button>
                            <span class="text-gray-300">|</span>
                            <button type="button" class="transition"
                                :class="timelineFilter === 'mine' ? 'text-indigo-600' : 'hover:text-gray-700'"
                                @click="timelineFilter = 'mine'">
                                My Roadmap
                            </button>
                        </div>
                        <div v-if="isSelf" class="rounded-2xl border bg-white shadow-sm">
                            <div class="px-4 sm:px-6 py-4 flex items-start gap-3">
                                <div
                                    class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                    <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                        class="h-full w-full object-cover" />
                                    <span v-else class="text-xs font-semibold text-gray-600">{{ initials(fullName)
                                    }}</span>
                                </div>
                                <div class="flex-1">
                                    <textarea v-model="composerText" rows="2" placeholder="What's on your mind?"
                                        class="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                        @focus="composerOpen = true"></textarea>

                                    <div v-if="composerOpen" class="mt-3 space-y-3">
                                        <div class="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                                            <span>Posting as</span>
                                            <span class="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">{{ fullName
                                                || 'Student' }}</span>
                                            <span v-if="composerType === 'feeling' && composerFeeling"
                                                class="rounded-full bg-amber-50 px-2 py-0.5 text-amber-600">
                                                Feeling {{ composerFeeling }}
                                            </span>
                                        </div>

                                        <div v-if="composerType === 'feeling'"
                                            class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                                            <button type="button"
                                                class="rounded-lg border border-amber-100 bg-amber-50 px-2 py-2 text-amber-700 hover:bg-amber-100"
                                                @click="composerFeeling = 'Happy'">Happy</button>
                                            <button type="button"
                                                class="rounded-lg border border-rose-100 bg-rose-50 px-2 py-2 text-rose-700 hover:bg-rose-100"
                                                @click="composerFeeling = 'Loved'">Loved</button>
                                            <button type="button"
                                                class="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-2 text-indigo-700 hover:bg-indigo-100"
                                                @click="composerFeeling = 'Excited'">Excited</button>
                                            <button type="button"
                                                class="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-2 text-emerald-700 hover:bg-emerald-100"
                                                @click="composerFeeling = 'Grateful'">Grateful</button>
                                            <button type="button"
                                                class="rounded-lg border border-sky-100 bg-sky-50 px-2 py-2 text-sky-700 hover:bg-sky-100"
                                                @click="composerFeeling = 'Motivated'">Motivated</button>
                                            <button type="button"
                                                class="rounded-lg border border-gray-100 bg-gray-50 px-2 py-2 text-gray-700 hover:bg-gray-100"
                                                @click="composerFeeling = 'Focused'">Focused</button>
                                        </div>

                                        <div v-if="composerType === 'event'"
                                            class="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <input v-model="composerEvent.title" type="text" placeholder="Event title"
                                                class="rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                                            <input v-model="composerEvent.date" type="date"
                                                class="rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                                            <input v-model="composerEvent.location" type="text" placeholder="Location"
                                                class="rounded-lg border border-gray-200 bg-white px-3 py-2 focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-100" />
                                        </div>

                                        <div v-if="composerMedia"
                                            class="rounded-xl border bg-gray-50 p-3 flex items-start gap-3">
                                            <img :src="composerMedia.url" alt="photo"
                                                class="h-16 w-16 rounded-lg object-cover" />
                                            <div class="flex-1 text-xs text-gray-600">
                                                <div class="font-semibold text-gray-800">{{ composerMedia.name }}</div>
                                                <div class="text-[11px] text-gray-500">Photo ready to post</div>
                                            </div>
                                            <button type="button" class="text-xs text-gray-500 hover:text-gray-700"
                                                @click="removeComposerMedia">Remove</button>
                                        </div>

                                        <div class="flex items-center justify-end gap-2">
                                            <button type="button"
                                                class="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                                                @click="resetComposer">Cancel</button>
                                            <button type="button"
                                                class="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs text-white shadow hover:bg-indigo-500 disabled:opacity-60"
                                                :disabled="!canSubmitPost || composerSubmitting" @click="submitPost">
                                                {{ composerSubmitting ? 'Posting...' : 'Post' }}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="border-t px-4 sm:px-6 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                                <button
                                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-100 py-2 hover:bg-gray-50"
                                    :class="composerType === 'photo' ? 'bg-emerald-50 text-emerald-700' : 'bg-white'"
                                    @click="openComposer('photo')">
                                    <i class="mdi mdi-image-outline text-emerald-600"></i>
                                    Photo
                                </button>
                                <button
                                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-100 py-2 hover:bg-gray-50"
                                    :class="composerType === 'feeling' ? 'bg-amber-50 text-amber-700' : 'bg-white'"
                                    @click="openComposer('feeling')">
                                    <i class="mdi mdi-emoticon-outline text-amber-500"></i>
                                    Feeling
                                </button>
                                <button
                                    class="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-100 py-2 hover:bg-gray-50"
                                    :class="composerType === 'event' ? 'bg-indigo-50 text-indigo-700' : 'bg-white'"
                                    @click="openComposer('event')">
                                    <i class="mdi mdi-calendar-outline text-indigo-500"></i>
                                    Event
                                </button>
                            </div>
                            <input ref="photoInput" type="file" accept="image/*" class="hidden"
                                @change="handlePhotoChange" />
                        </div>
                        <div v-else
                            class="rounded-2xl border bg-white shadow-sm px-4 sm:px-6 py-4 text-sm text-gray-600">
                            Timeline updates from {{ fullName || 'this user' }}.
                        </div>

                        <div class="space-y-4">
                            <template v-if="postStore.isLoading && !feedPosts.length">
                                <div class="rounded-2xl border bg-white px-4 sm:px-6 py-6 text-sm text-gray-500">
                                    Loading posts...
                                </div>
                            </template>
                            <template v-else-if="!feedPosts.length">
                                <div class="rounded-2xl border bg-white px-4 sm:px-6 py-6 text-sm text-gray-500">
                                    No posts yet.
                                </div>
                            </template>
                            <template v-else>
                                <div v-for="post in feedPosts" :key="post.id"
                                    class="rounded-2xl border bg-white shadow-sm">
                                    <div class="px-4 sm:px-6 py-4 flex items-start justify-between gap-3">
                                        <div class="flex items-start gap-3">
                                            <div
                                                class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                                <img v-if="post.authorAvatar" :src="post.authorAvatar" alt="avatar"
                                                    class="h-full w-full object-cover" />
                                                <span v-else class="text-xs font-semibold text-gray-600">{{
                                                    initials(post.authorName) }}</span>
                                            </div>
                                            <div class="min-w-0">
                                                <div class="text-sm font-semibold text-gray-900 truncate">{{
                                                    post.authorName }}</div>
                                                <div class="text-xs text-gray-500">
                                                    {{ post.handle }} | {{ post.time }}
                                                    <span v-if="post.post_type === 'feeling' && post.feeling"> · feeling
                                                        {{ post.feeling }}</span>
                                                    <span v-else-if="post.post_type === 'event' && post.event?.title"> ·
                                                        event</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button class="text-gray-400 hover:text-gray-600">
                                            <i class="mdi mdi-dots-horizontal text-lg"></i>
                                        </button>
                                    </div>

                                    <div class="px-4 sm:px-6 pb-4 text-sm text-gray-800 space-y-3">
                                        <p v-if="post.text" class="leading-relaxed">{{ post.text }}</p>

                                        <div v-if="post.sharedPost" class="rounded-xl border bg-gray-50">
                                            <button type="button"
                                                class="w-full text-left hover:bg-gray-50/80 transition"
                                                @click="openSharedPost(post.sharedPost)">
                                                <div class="flex items-start gap-3 border-b px-4 py-3">
                                                    <div
                                                        class="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                        <img v-if="post.sharedPost.authorAvatar"
                                                            :src="post.sharedPost.authorAvatar" alt="avatar"
                                                            class="h-full w-full object-cover" />
                                                        <span v-else>{{ initials(post.sharedPost.authorName) }}</span>
                                                    </div>
                                                    <div class="min-w-0">
                                                        <div class="text-xs font-semibold text-gray-900 truncate">
                                                            {{ post.sharedPost.authorName }}
                                                        </div>
                                                        <div class="text-[11px] text-gray-500">
                                                            {{ post.sharedPost.handle }} | {{ post.sharedPost.time }}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="px-4 py-3 space-y-2 text-xs text-gray-700">
                                                    <p v-if="post.sharedPost.text" class="text-sm text-gray-800">
                                                        {{ post.sharedPost.text }}
                                                    </p>
                                                    <div v-if="post.sharedPost.post_type === 'feeling' && post.sharedPost.feeling"
                                                        class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                                                        <i class="mdi mdi-emoticon-outline"></i>
                                                        Feeling {{ post.sharedPost.feeling }}
                                                    </div>
                                                    <div v-if="post.sharedPost.post_type === 'event' && post.sharedPost.event"
                                                        class="rounded-lg border bg-indigo-50/70 px-3 py-2 text-[11px] text-gray-700">
                                                        <div
                                                            class="text-[10px] uppercase tracking-wide text-indigo-500">
                                                            Event</div>
                                                        <div class="mt-1 text-xs font-semibold text-gray-900">
                                                            {{ post.sharedPost.event.title || 'Campus Event' }}
                                                        </div>
                                                        <div
                                                            class="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                                                            <span v-if="post.sharedPost.event.date"><i
                                                                    class="mdi mdi-calendar-outline mr-1"></i>{{
                                                                        post.sharedPost.event.date }}</span>
                                                            <span v-if="post.sharedPost.event.location"><i
                                                                    class="mdi mdi-map-marker-outline mr-1"></i>{{
                                                                        post.sharedPost.event.location }}</span>
                                                        </div>
                                                    </div>
                                                    <div v-if="post.sharedPost.media && post.sharedPost.media.length"
                                                        class="overflow-hidden rounded-lg border bg-white">
                                                        <img :src="post.sharedPost.media[0].url" alt="shared media"
                                                            class="w-full max-h-[320px] object-cover" />
                                                    </div>
                                                </div>
                                            </button>
                                        </div>
                                        <div v-else-if="post.sharedPostId"
                                            class="rounded-xl border bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                            Original post unavailable.
                                        </div>

                                        <div v-if="post.post_type === 'feeling' && post.feeling"
                                            class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-700">
                                            <i class="mdi mdi-emoticon-outline"></i>
                                            Feeling {{ post.feeling }}
                                        </div>

                                        <div v-if="post.post_type === 'event' && post.event"
                                            class="rounded-xl border bg-indigo-50/60 px-4 py-3 text-xs text-gray-700">
                                            <div class="text-[11px] uppercase tracking-wide text-indigo-500">Event</div>
                                            <div class="mt-1 text-sm font-semibold text-gray-900">{{ post.event.title ||
                                                'Campus Event' }}</div>
                                            <div class="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                <span v-if="post.event.date"><i
                                                        class="mdi mdi-calendar-outline mr-1"></i>{{ post.event.date
                                                        }}</span>
                                                <span v-if="post.event.location"><i
                                                        class="mdi mdi-map-marker-outline mr-1"></i>{{
                                                            post.event.location }}</span>
                                            </div>
                                        </div>

                                        <div v-if="post.media && post.media.length"
                                            class="overflow-hidden rounded-xl border bg-gray-50">
                                            <button type="button" class="block w-full" @click="openMediaModal(post)">
                                                <img :src="post.media[0].url" alt="post media"
                                                    class="w-full max-h-[420px] object-cover" />
                                            </button>
                                        </div>
                                    </div>

                                    <div
                                        class="px-4 sm:px-6 py-2 border-t flex items-center justify-between text-xs text-gray-500">
                                        <button type="button" class="flex items-center gap-2 hover:text-gray-700"
                                            @click="openReactionPanel(post)">
                                            <span class="inline-flex items-center -space-x-1">
                                                <span v-for="type in topReactionTypes(post)" :key="type"
                                                    class="h-5 w-5 rounded-full text-white flex items-center justify-center text-[11px] border border-white"
                                                    :class="reactionMeta[type]?.bg || 'bg-gray-400'">
                                                    <i :class="['mdi', reactionMeta[type]?.icon || 'mdi-thumb-up']"></i>
                                                </span>
                                            </span>
                                            <span>{{ reactionSummaryText(post) }}</span>
                                        </button>
                                        <div class="flex items-center gap-3">
                                            <span>{{ post.comments.length }} comments</span>
                                            <span>{{ post.shares }} shares</span>
                                        </div>
                                    </div>

                                    <div class="px-4 sm:px-6 py-2 border-t grid grid-cols-3 text-xs text-gray-600">
                                        <div class="relative flex items-center justify-center"
                                            @mouseenter="showReactionMenu(post.id)" @mouseleave="hideReactionMenu">
                                            <button
                                                class="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 w-full"
                                                :disabled="postStore.isActing(post.id)"
                                                @click="reactToPost(post.id, post.myReactionType || 'like')">
                                                <i class="mdi"
                                                    :class="[post.myReactionType ? (reactionMeta[post.myReactionType]?.icon || 'mdi-thumb-up') : 'mdi-thumb-up-outline',
                                                    post.myReactionType ? reactionMeta[post.myReactionType]?.text : '']"></i>
                                                <span
                                                    :class="post.myReactionType ? reactionMeta[post.myReactionType]?.text : ''">
                                                    {{ reactionMeta[post.myReactionType]?.label || 'Like' }}
                                                </span>
                                            </button>
                                            <div v-show="reactionHoverId === post.id"
                                                class="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full border bg-white px-2 py-1 shadow-lg z-20"
                                                @mouseenter="holdReactionMenu" @mouseleave="hideReactionMenu">
                                                <button v-for="item in reactionPalette" :key="item.type" type="button"
                                                    class="h-8 w-8 rounded-full flex items-center justify-center text-white shadow hover:-translate-y-0.5 transition"
                                                    :class="item.bg" @click.stop="reactToPost(post.id, item.type)">
                                                    <i class="mdi" :class="item.icon"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <button
                                            class="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50"
                                            @click="openCommentPanel(post)">
                                            <i class="mdi mdi-comment-outline"></i>
                                            Comment
                                        </button>
                                        <button
                                            class="flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50"
                                            :disabled="postStore.isActing(post.id)" @click="sharePost(post.id)">
                                            <i class="mdi mdi-share-outline"></i>
                                            Share
                                        </button>
                                    </div>

                                    <div class="px-4 sm:px-6 pb-4 space-y-3">
                                        <div v-if="topCommentForPost(post)" class="flex items-start gap-3">
                                            <div
                                                class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] text-gray-600 font-semibold overflow-hidden">
                                                <img v-if="topCommentForPost(post).avatar"
                                                    :src="topCommentForPost(post).avatar" alt="avatar"
                                                    class="h-full w-full object-cover" />
                                                <span v-else>{{ initials(topCommentForPost(post).name) }}</span>
                                            </div>
                                            <div class="flex-1">
                                                <div class="rounded-2xl bg-gray-50 px-3 py-2">
                                                    <div class="text-xs font-semibold text-gray-800">{{
                                                        topCommentForPost(post).name }}</div>
                                                    <div class="text-xs text-gray-700">{{ topCommentForPost(post).text
                                                    }}</div>
                                                </div>
                                                <div class="text-[11px] text-gray-400 mt-1">
                                                    {{ formatRelativeTime(topCommentForPost(post).created_at ||
                                                        topCommentForPost(post).time) }}
                                                </div>
                                            </div>
                                        </div>

                                        <button v-if="post.comments.length > 1" type="button"
                                            class="text-[11px] text-gray-500 hover:text-gray-700"
                                            @click="openCommentPanel(post)">
                                            View all {{ post.comments.length }} comments
                                        </button>

                                        <div class="flex items-start gap-3">
                                            <div
                                                class="h-8 w-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[11px] text-gray-600 font-semibold">
                                                <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                                    class="h-full w-full object-cover" />
                                                <span v-else>{{ initials(fullName) }}</span>
                                            </div>
                                            <div class="flex-1 flex items-center gap-2">
                                                <input v-model="commentDrafts[post.id]" type="text"
                                                    placeholder="Write a comment..."
                                                    class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                    @keyup.enter="sendComment(post.id)" />
                                                <button type="button"
                                                    class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                    :disabled="!commentDrafts[post.id]" @click="sendComment(post.id)">
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="postStore.isLoading" class="space-y-4">
                                    <div v-for="n in 2" :key="`post-skeleton-${n}`"
                                        class="rounded-2xl border bg-white shadow-sm">
                                        <div
                                            class="px-4 sm:px-6 py-4 flex items-start justify-between gap-3 animate-pulse">
                                            <div class="flex items-start gap-3">
                                                <div class="h-10 w-10 rounded-full bg-gray-200"></div>
                                                <div class="space-y-2">
                                                    <div class="h-3 w-36 rounded bg-gray-200"></div>
                                                    <div class="h-3 w-24 rounded bg-gray-100"></div>
                                                </div>
                                            </div>
                                            <div class="h-4 w-6 rounded bg-gray-100"></div>
                                        </div>
                                        <div class="px-4 sm:px-6 pb-4 space-y-3 animate-pulse">
                                            <div class="h-3 w-full rounded bg-gray-100"></div>
                                            <div class="h-3 w-5/6 rounded bg-gray-100"></div>
                                            <div class="h-3 w-2/3 rounded bg-gray-100"></div>
                                        </div>
                                    </div>
                                </div>
                            </template>

                            <div v-if="hasMorePosts" ref="loadMoreRef" class="flex justify-center pt-2">
                                <button type="button"
                                    class="rounded-full border border-gray-200 bg-white px-5 py-2 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
                                    :disabled="postStore.isLoading" @click="loadMorePosts">
                                    {{ postStore.isLoading ? 'Loading...' : 'Load more' }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
            <div v-if="reactionPanelPost" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                @click.self="closeReactionPanel">
                <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                    <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3">
                        <div class="text-sm font-semibold text-gray-800">Reactions</div>
                        <button type="button" class="text-gray-500 hover:text-gray-700" @click="closeReactionPanel">
                            <i class="mdi mdi-close"></i>
                        </button>
                    </div>
                    <div class="px-4 sm:px-6 pt-3">
                        <div class="flex items-center gap-4 text-xs border-b">
                            <button type="button" class="pb-2"
                                :class="reactionFilter === 'all' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'"
                                @click="reactionFilter = 'all'">
                                All ({{ reactionCountFor(reactionPanelPost, 'all') }})
                            </button>
                            <button v-for="item in reactionPalette" :key="item.type" type="button"
                                class="pb-2 flex items-center gap-1"
                                :class="reactionFilter === item.type ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-500'"
                                @click="reactionFilter = item.type">
                                <span
                                    class="h-5 w-5 rounded-full text-white flex items-center justify-center text-[11px]"
                                    :class="item.bg">
                                    <i class="mdi" :class="item.icon"></i>
                                </span>
                                {{ item.type === 'like' ? 'Likes' : item.label }} ({{
                                    reactionCountFor(reactionPanelPost, item.type)
                                }})
                            </button>
                        </div>
                    </div>
                    <div class="max-h-80 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                        <div v-if="!filteredReactionUsers.length" class="text-sm text-gray-500">
                            No reactions yet.
                        </div>
                        <div v-else v-for="user in filteredReactionUsers" :key="user.id || user.user_id"
                            class="flex items-center justify-between">
                            <div class="flex items-center gap-3">
                                <div
                                    class="h-9 w-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-xs text-gray-600 font-semibold">
                                    <img v-if="user.avatar" :src="user.avatar" alt="avatar"
                                        class="h-full w-full object-cover" />
                                    <span v-else>{{ initials(user.name || user.username) }}</span>
                                </div>
                                <div>
                                    <div class="text-sm font-medium text-gray-900">{{ user.name || user.username }}
                                    </div>
                                    <div class="text-[11px] text-gray-500">{{ formatRelativeTime(user.reacted_at) }}
                                    </div>
                                </div>
                            </div>
                            <span class="inline-flex items-center gap-1 text-xs text-gray-500">
                                <span
                                    class="h-6 w-6 rounded-full text-white flex items-center justify-center text-[11px]"
                                    :class="reactionMeta[user.type]?.bg || 'bg-gray-400'">
                                    <i class="mdi" :class="reactionMeta[user.type]?.icon || 'mdi-thumb-up'"></i>
                                </span>
                                {{ reactionMeta[user.type]?.label || 'Like' }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="commentPanelPost" class="fixed inset-0 z-50 flex items-center justify-center px-4"
                :class="isMediaCommentModal ? 'bg-black/60' : 'bg-black/40'" @click.self="closeCommentPanel">
                <div class="w-full rounded-2xl bg-white shadow-xl overflow-hidden"
                    :class="isMediaCommentModal ? 'max-w-6xl h-[90vh]' : 'max-w-2xl max-h-[85vh]'">
                    <div class="flex flex-col h-full">
                        <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3">
                            <div class="text-sm font-semibold text-gray-800">Comments</div>
                            <button type="button" class="text-gray-500 hover:text-gray-700" @click="closeCommentPanel">
                                <i class="mdi mdi-close"></i>
                            </button>
                        </div>
                        <div class="flex flex-1 min-h-0">
                            <div v-if="isMediaCommentModal"
                                class="hidden md:flex md:w-3/5 bg-black items-center justify-center">
                                <img :src="commentPanelPost.media[0].url" alt="post media"
                                    class="max-h-full w-full object-contain" />
                            </div>
                            <div class="flex-1 flex flex-col min-h-0">
                                <div v-if="isMediaCommentModal" class="md:hidden bg-black">
                                    <img :src="commentPanelPost.media[0].url" alt="post media"
                                        class="w-full max-h-[260px] object-contain" />
                                </div>
                                <div class="px-4 sm:px-6 py-4 border-b">
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                                            <img v-if="commentPanelPost.authorAvatar"
                                                :src="commentPanelPost.authorAvatar" alt="avatar"
                                                class="h-full w-full object-cover" />
                                            <span v-else class="text-xs font-semibold text-gray-600">{{
                                                initials(commentPanelPost.authorName)
                                            }}</span>
                                        </div>
                                        <div class="flex-1">
                                            <div class="text-sm font-semibold text-gray-900">{{
                                                commentPanelPost.authorName }}</div>
                                            <div class="text-xs text-gray-500">{{ commentPanelPost.handle }} | {{
                                                commentPanelPost.time }}</div>
                                            <div v-if="commentPanelPost.text" class="mt-2 text-sm text-gray-800">
                                                {{ commentPanelPost.text }}
                                            </div>
                                            <div v-if="commentPanelPost.sharedPost"
                                                class="mt-3 rounded-xl border bg-gray-50">
                                                <button type="button"
                                                    class="w-full text-left hover:bg-gray-50/80 transition"
                                                    @click="openSharedPost(commentPanelPost.sharedPost)">
                                                    <div class="flex items-start gap-3 border-b px-4 py-3">
                                                        <div
                                                            class="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                            <img v-if="commentPanelPost.sharedPost.authorAvatar"
                                                                :src="commentPanelPost.sharedPost.authorAvatar"
                                                                alt="avatar" class="h-full w-full object-cover" />
                                                            <span v-else>{{
                                                                initials(commentPanelPost.sharedPost.authorName)
                                                            }}</span>
                                                        </div>
                                                        <div class="min-w-0">
                                                            <div class="text-xs font-semibold text-gray-900 truncate">
                                                                {{ commentPanelPost.sharedPost.authorName }}
                                                            </div>
                                                            <div class="text-[11px] text-gray-500">
                                                                {{ commentPanelPost.sharedPost.handle }} | {{
                                                                    commentPanelPost.sharedPost.time }}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div class="px-4 py-3 space-y-2 text-xs text-gray-700">
                                                        <p v-if="commentPanelPost.sharedPost.text"
                                                            class="text-sm text-gray-800">
                                                            {{ commentPanelPost.sharedPost.text }}
                                                        </p>
                                                        <div v-if="commentPanelPost.sharedPost.post_type === 'feeling' && commentPanelPost.sharedPost.feeling"
                                                            class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                                                            <i class="mdi mdi-emoticon-outline"></i>
                                                            Feeling {{ commentPanelPost.sharedPost.feeling }}
                                                        </div>
                                                        <div v-if="commentPanelPost.sharedPost.post_type === 'event' && commentPanelPost.sharedPost.event"
                                                            class="rounded-lg border bg-indigo-50/70 px-3 py-2 text-[11px] text-gray-700">
                                                            <div
                                                                class="text-[10px] uppercase tracking-wide text-indigo-500">
                                                                Event
                                                            </div>
                                                            <div class="mt-1 text-xs font-semibold text-gray-900">
                                                                {{ commentPanelPost.sharedPost.event.title || 'Campus Event' }}
                                                            </div>
                                                            <div
                                                                class="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                                                                <span v-if="commentPanelPost.sharedPost.event.date"><i
                                                                        class="mdi mdi-calendar-outline mr-1"></i>{{
                                                                            commentPanelPost.sharedPost.event.date }}</span>
                                                                <span
                                                                    v-if="commentPanelPost.sharedPost.event.location"><i
                                                                        class="mdi mdi-map-marker-outline mr-1"></i>{{
                                                                            commentPanelPost.sharedPost.event.location }}</span>
                                                            </div>
                                                        </div>
                                                        <div v-if="commentPanelPost.sharedPost.media && commentPanelPost.sharedPost.media.length"
                                                            class="overflow-hidden rounded-lg border bg-white">
                                                            <img :src="commentPanelPost.sharedPost.media[0].url"
                                                                alt="shared media"
                                                                class="w-full max-h-[260px] object-cover" />
                                                        </div>
                                                    </div>
                                                </button>
                                            </div>
                                            <div v-else-if="commentPanelPost.sharedPostId"
                                                class="mt-3 rounded-xl border bg-gray-50 px-4 py-3 text-xs text-gray-500">
                                                Original post unavailable.
                                            </div>
                                            <div v-if="commentPanelPost.post_type === 'event' && commentPanelPost.event"
                                                class="mt-3 rounded-xl border bg-indigo-50/60 px-4 py-3 text-xs text-gray-700">
                                                <div class="text-[11px] uppercase tracking-wide text-indigo-500">Event
                                                </div>
                                                <div class="mt-1 text-sm font-semibold text-gray-900">{{
                                                    commentPanelPost.event.title || 'Campus Event' }}</div>
                                                <div
                                                    class="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                                    <span v-if="commentPanelPost.event.date"><i
                                                            class="mdi mdi-calendar-outline mr-1"></i>{{
                                                                commentPanelPost.event.date }}</span>
                                                    <span v-if="commentPanelPost.event.location"><i
                                                            class="mdi mdi-map-marker-outline mr-1"></i>{{
                                                                commentPanelPost.event.location
                                                            }}</span>
                                                </div>
                                            </div>
                                            <div v-if="commentPanelPost.media && commentPanelPost.media.length && !isMediaCommentModal"
                                                class="mt-3 overflow-hidden rounded-xl border bg-gray-50">
                                                <button type="button" class="block w-full"
                                                    @click="openMediaModal(commentPanelPost)">
                                                    <img :src="commentPanelPost.media[0].url" alt="post media"
                                                        class="w-full max-h-[320px] object-cover" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="px-4 sm:px-6 py-4 space-y-4 overflow-y-auto flex-1">
                                    <div v-if="!commentPanelThreads.length" class="text-sm text-gray-500">
                                        No comments yet.
                                    </div>
                                    <div v-else v-for="thread in commentPanelThreads"
                                        :key="thread.comment.id || thread.comment.created_at" class="space-y-2">
                                        <div class="flex items-start gap-3">
                                            <div
                                                class="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[11px] text-gray-600 font-semibold overflow-hidden">
                                                <img v-if="thread.comment.avatar" :src="thread.comment.avatar"
                                                    alt="avatar" class="h-full w-full object-cover" />
                                                <span v-else>{{ initials(thread.comment.name) }}</span>
                                            </div>
                                            <div class="flex-1">
                                                <div class="rounded-2xl bg-gray-50 px-3 py-2">
                                                    <div class="text-xs font-semibold text-gray-800">{{
                                                        thread.comment.name }}</div>
                                                    <div class="text-xs text-gray-700">{{ thread.comment.text }}</div>
                                                </div>
                                                <div class="mt-1 flex items-center gap-3 text-[11px] text-gray-400">
                                                    <span>{{ formatRelativeTime(thread.comment.created_at ||
                                                        thread.comment.time)
                                                    }}</span>
                                                    <button type="button"
                                                        class="font-medium text-gray-500 hover:text-indigo-600"
                                                        @click="startReply(commentPanelPost.id, thread.comment)">
                                                        Reply
                                                    </button>
                                                </div>
                                                <button v-if="thread.replyCount" type="button"
                                                    class="mt-2 text-[11px] font-medium text-gray-500 hover:text-indigo-600"
                                                    @click="toggleReplies(commentPanelPost.id, thread.comment.id)">
                                                    {{ isRepliesExpanded(commentPanelPost.id, thread.comment.id)
                                                        ? 'Hide replies'
                                                        : `View all ${thread.replyCount} ${thread.replyCount === 1 ? 'reply'
                                                            :
                                                            'replies'}` }}
                                                </button>
                                            </div>
                                        </div>

                                        <div v-if="isReplyingTo(commentPanelPost.id, thread.comment.id)"
                                            class="ml-11 flex items-start gap-3 border-l border-gray-100 pl-4">
                                            <div
                                                class="h-7 w-7 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                                    class="h-full w-full object-cover" />
                                                <span v-else>{{ initials(fullName) }}</span>
                                            </div>
                                            <div class="flex-1">
                                                <div class="mb-1 text-[11px] text-gray-500">
                                                    Replying to <span class="font-semibold text-gray-700">{{ activeReply
                                                        &&
                                                        (activeReply.mentionName || thread.comment.name) }}</span>
                                                </div>
                                                <div class="flex items-center gap-2">
                                                    <input
                                                        v-model="replyDrafts[draftKeyFor(commentPanelPost.id, thread.comment.id)]"
                                                        type="text" placeholder="Write a reply..."
                                                        class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                        @keyup.enter="sendComment(commentPanelPost.id, thread.comment.id)" />
                                                    <button type="button"
                                                        class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                        :disabled="!replyDrafts[draftKeyFor(commentPanelPost.id, thread.comment.id)]"
                                                        @click="sendComment(commentPanelPost.id, thread.comment.id)">
                                                        Send
                                                    </button>
                                                    <button type="button"
                                                        class="text-[11px] text-gray-400 hover:text-gray-600"
                                                        @click="cancelReply">
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div v-if="isRepliesExpanded(commentPanelPost.id, thread.comment.id)"
                                            class="ml-11 space-y-3 border-l border-gray-100 pl-4">
                                            <div v-for="replyThread in thread.replies"
                                                :key="replyThread.comment.id || replyThread.comment.created_at"
                                                class="space-y-2">
                                                <div class="flex items-start gap-3">
                                                    <div
                                                        class="h-7 w-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-semibold overflow-hidden">
                                                        <img v-if="replyThread.comment.avatar"
                                                            :src="replyThread.comment.avatar" alt="avatar"
                                                            class="h-full w-full object-cover" />
                                                        <span v-else>{{ initials(replyThread.comment.name) }}</span>
                                                    </div>
                                                    <div class="flex-1">
                                                        <div class="rounded-2xl bg-gray-50/80 px-3 py-2">
                                                            <div class="text-[11px] font-semibold text-gray-800">{{
                                                                replyThread.comment.name }}
                                                            </div>
                                                            <div class="text-[11px] text-gray-700">
                                                                <span v-if="replyThread.comment.mention_name"
                                                                    class="font-semibold text-indigo-600">
                                                                    {{ replyThread.comment.mention_name }}
                                                                </span>
                                                                <span v-if="replyThread.comment.mention_name"> </span>
                                                                {{ replyDisplayText(replyThread.comment) }}
                                                            </div>
                                                        </div>
                                                        <div
                                                            class="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                                                            <span>{{ formatRelativeTime(replyThread.comment.created_at
                                                                ||
                                                                replyThread.comment.time) }}</span>
                                                            <button type="button"
                                                                class="font-medium text-gray-500 hover:text-indigo-600"
                                                                @click="startReply(commentPanelPost.id, replyThread.comment)">
                                                                Reply
                                                            </button>
                                                        </div>
                                                        <button v-if="replyThread.replyCount" type="button"
                                                            class="mt-2 text-[11px] font-medium text-gray-500 hover:text-indigo-600"
                                                            @click="toggleReplies(commentPanelPost.id, replyThread.comment.id)">
                                                            {{ isRepliesExpanded(commentPanelPost.id,
                                                                replyThread.comment.id)
                                                                ? 'Hide replies'
                                                                : `View all ${replyThread.replyCount}
                                                            ${replyThread.replyCount === 1 ?
                                                                    'reply' :
                                                                    'replies'}` }}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div v-if="isReplyingTo(commentPanelPost.id, replyThread.comment.id)"
                                                    class="ml-9 flex items-start gap-3 border-l border-gray-100 pl-4">
                                                    <div
                                                        class="h-7 w-7 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                        <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                                            class="h-full w-full object-cover" />
                                                        <span v-else>{{ initials(fullName) }}</span>
                                                    </div>
                                                    <div class="flex-1">
                                                        <div class="mb-1 text-[11px] text-gray-500">
                                                            Replying to <span class="font-semibold text-gray-700">{{
                                                                activeReply &&
                                                                (activeReply.mentionName || replyThread.comment.name)
                                                            }}</span>
                                                        </div>
                                                        <div class="flex items-center gap-2">
                                                            <input
                                                                v-model="replyDrafts[draftKeyFor(commentPanelPost.id, replyThread.comment.id)]"
                                                                type="text" placeholder="Write a reply..."
                                                                class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                                @keyup.enter="sendComment(commentPanelPost.id, replyThread.comment.id)" />
                                                            <button type="button"
                                                                class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                                :disabled="!replyDrafts[draftKeyFor(commentPanelPost.id, replyThread.comment.id)]"
                                                                @click="sendComment(commentPanelPost.id, replyThread.comment.id)">
                                                                Send
                                                            </button>
                                                            <button type="button"
                                                                class="text-[11px] text-gray-400 hover:text-gray-600"
                                                                @click="cancelReply">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div v-if="replyThread.replyCount && isRepliesExpanded(commentPanelPost.id, replyThread.comment.id)"
                                                    class="ml-9 space-y-2 border-l border-gray-100 pl-4">
                                                    <div v-for="depth2Thread in replyThread.threads"
                                                        :key="depth2Thread.comment.id || depth2Thread.comment.created_at"
                                                        class="space-y-2">
                                                        <div class="flex items-start gap-3">
                                                            <div
                                                                class="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-semibold overflow-hidden">
                                                                <img v-if="depth2Thread.comment.avatar"
                                                                    :src="depth2Thread.comment.avatar" alt="avatar"
                                                                    class="h-full w-full object-cover" />
                                                                <span v-else>{{ initials(depth2Thread.comment.name)
                                                                }}</span>
                                                            </div>
                                                            <div class="flex-1">
                                                                <div class="rounded-2xl bg-gray-50/80 px-3 py-2">
                                                                    <div
                                                                        class="text-[11px] font-semibold text-gray-800">
                                                                        {{
                                                                            depth2Thread.comment.name }}</div>
                                                                    <div class="text-[11px] text-gray-700">
                                                                        <span v-if="depth2Thread.comment.mention_name"
                                                                            class="font-semibold text-indigo-600">
                                                                            {{ depth2Thread.comment.mention_name }}
                                                                        </span>
                                                                        <span v-if="depth2Thread.comment.mention_name">
                                                                        </span>
                                                                        {{ replyDisplayText(depth2Thread.comment) }}
                                                                    </div>
                                                                </div>
                                                                <div
                                                                    class="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                                                                    <span>{{
                                                                        formatRelativeTime(depth2Thread.comment.created_at
                                                                            ||
                                                                            depth2Thread.comment.time) }}</span>
                                                                    <button type="button"
                                                                        class="font-medium text-gray-500 hover:text-indigo-600"
                                                                        @click="startReply(commentPanelPost.id, depth2Thread.comment)">
                                                                        Reply
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div v-if="isReplyingTo(commentPanelPost.id, depth2Thread.comment.id)"
                                                            class="mt-2 flex items-start gap-3 border-l border-gray-100 pl-4">
                                                            <div
                                                                class="h-6 w-6 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                                <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                                                    class="h-full w-full object-cover" />
                                                                <span v-else>{{ initials(fullName) }}</span>
                                                            </div>
                                                            <div class="flex-1">
                                                                <div class="mb-1 text-[11px] text-gray-500">
                                                                    Replying to <span
                                                                        class="font-semibold text-gray-700">{{
                                                                            activeReply &&
                                                                            (activeReply.mentionName ||
                                                                                depth2Thread.comment.name)
                                                                        }}</span>
                                                                </div>
                                                                <div class="flex items-center gap-2">
                                                                    <input
                                                                        v-model="replyDrafts[draftKeyFor(commentPanelPost.id, depth2Thread.comment.id)]"
                                                                        type="text" placeholder="Write a reply..."
                                                                        class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                                        @keyup.enter="sendComment(commentPanelPost.id, depth2Thread.comment.id)" />
                                                                    <button type="button"
                                                                        class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                                        :disabled="!replyDrafts[draftKeyFor(commentPanelPost.id, depth2Thread.comment.id)]"
                                                                        @click="sendComment(commentPanelPost.id, depth2Thread.comment.id)">
                                                                        Send
                                                                    </button>
                                                                    <button type="button"
                                                                        class="text-[11px] text-gray-400 hover:text-gray-600"
                                                                        @click="cancelReply">
                                                                        Cancel
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div v-if="depth2Thread.replies.length" class="mt-2 space-y-2">
                                                            <div v-for="reply in depth2Thread.replies"
                                                                :key="reply.id || reply.created_at" class="space-y-2">
                                                                <div class="flex items-start gap-3">
                                                                    <div
                                                                        class="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-semibold overflow-hidden">
                                                                        <img v-if="reply.avatar" :src="reply.avatar"
                                                                            alt="avatar"
                                                                            class="h-full w-full object-cover" />
                                                                        <span v-else>{{ initials(reply.name) }}</span>
                                                                    </div>
                                                                    <div class="flex-1">
                                                                        <div
                                                                            class="rounded-2xl bg-gray-50/80 px-3 py-2">
                                                                            <div
                                                                                class="text-[11px] font-semibold text-gray-800">
                                                                                {{
                                                                                    reply.name
                                                                                }}</div>
                                                                            <div class="text-[11px] text-gray-700">
                                                                                <span v-if="reply.mention_name"
                                                                                    class="font-semibold text-indigo-600">
                                                                                    {{ reply.mention_name }}
                                                                                </span>
                                                                                <span v-if="reply.mention_name"> </span>
                                                                                {{ replyDisplayText(reply) }}
                                                                            </div>
                                                                        </div>
                                                                        <div
                                                                            class="mt-1 flex items-center gap-3 text-[10px] text-gray-400">
                                                                            <span>{{ formatRelativeTime(reply.created_at
                                                                                ||
                                                                                reply.time)
                                                                            }}</span>
                                                                            <button type="button"
                                                                                class="font-medium text-gray-500 hover:text-indigo-600"
                                                                                @click="startReply(commentPanelPost.id, reply)">
                                                                                Reply
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div v-if="isReplyingTo(commentPanelPost.id, reply.id)"
                                                                    class="flex items-start gap-3 border-l border-gray-100 pl-4">
                                                                    <div
                                                                        class="h-6 w-6 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                                                        <img v-if="avatarUrl" :src="avatarUrl"
                                                                            alt="avatar"
                                                                            class="h-full w-full object-cover" />
                                                                        <span v-else>{{ initials(fullName) }}</span>
                                                                    </div>
                                                                    <div class="flex-1">
                                                                        <div class="mb-1 text-[11px] text-gray-500">
                                                                            Replying to <span
                                                                                class="font-semibold text-gray-700">{{
                                                                                    activeReply
                                                                                    && (activeReply.mentionName ||
                                                                                        reply.name) }}</span>
                                                                        </div>
                                                                        <div class="flex items-center gap-2">
                                                                            <input
                                                                                v-model="replyDrafts[draftKeyFor(commentPanelPost.id, reply.id)]"
                                                                                type="text"
                                                                                placeholder="Write a reply..."
                                                                                class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                                                @keyup.enter="sendComment(commentPanelPost.id, reply.id)" />
                                                                            <button type="button"
                                                                                class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                                                :disabled="!replyDrafts[draftKeyFor(commentPanelPost.id, reply.id)]"
                                                                                @click="sendComment(commentPanelPost.id, reply.id)">
                                                                                Send
                                                                            </button>
                                                                            <button type="button"
                                                                                class="text-[11px] text-gray-400 hover:text-gray-600"
                                                                                @click="cancelReply">
                                                                                Cancel
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="border-t px-4 sm:px-6 py-4">
                                    <div class="flex items-start gap-3">
                                        <div
                                            class="h-9 w-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[11px] text-gray-600 font-semibold">
                                            <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                                class="h-full w-full object-cover" />
                                            <span v-else>{{ initials(fullName) }}</span>
                                        </div>
                                        <div class="flex-1 flex items-center gap-2">
                                            <input v-model="commentDrafts[commentPanelPost.id]" type="text"
                                                placeholder="Write a comment..."
                                                class="flex-1 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-xs focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"
                                                @keyup.enter="sendComment(commentPanelPost.id)" />
                                            <button type="button"
                                                class="rounded-full bg-indigo-600 px-3 py-2 text-[11px] text-white hover:bg-indigo-500 disabled:opacity-60"
                                                :disabled="!commentDrafts[commentPanelPost.id]"
                                                @click="sendComment(commentPanelPost.id)">
                                                Send
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="shareModalOpen && shareTargetPost"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                @click.self="closeShareModal">
                    <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl">
                        <div class="flex items-center justify-between border-b px-4 sm:px-6 py-3">
                            <div class="text-sm font-semibold text-gray-800">Share post</div>
                            <button type="button" class="text-gray-500 hover:text-gray-700" @click="closeShareModal">
                                <i class="mdi mdi-close"></i>
                            </button>
                        </div>
                        <div class="px-4 sm:px-6 py-4 space-y-4">
                            <div class="flex items-start gap-3">
                                <div
                                    class="h-9 w-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center text-[11px] text-gray-600 font-semibold">
                                    <img v-if="avatarUrl" :src="avatarUrl" alt="avatar"
                                        class="h-full w-full object-cover" />
                                    <span v-else>{{ initials(fullName) }}</span>
                                </div>
                                <textarea v-model="shareDraft" rows="3" placeholder="Say something about this..."
                                    class="flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs text-gray-700 focus:border-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-100"></textarea>
                            </div>

                            <div v-if="sharePreviewPost" class="rounded-xl border bg-gray-50">
                                <button type="button" class="w-full text-left hover:bg-gray-50/80 transition"
                                    @click="openSharedPost(sharePreviewPost)">
                                    <div class="flex items-start gap-3 border-b px-4 py-3">
                                        <div
                                            class="h-8 w-8 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center text-[10px] text-gray-600 font-semibold">
                                            <img v-if="sharePreviewPost.authorAvatar"
                                                :src="sharePreviewPost.authorAvatar" alt="avatar"
                                                class="h-full w-full object-cover" />
                                            <span v-else>{{ initials(sharePreviewPost.authorName) }}</span>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="text-xs font-semibold text-gray-900 truncate">
                                                {{ sharePreviewPost.authorName }}
                                            </div>
                                            <div class="text-[11px] text-gray-500">
                                                {{ sharePreviewPost.handle }} | {{ sharePreviewPost.time }}
                                            </div>
                                        </div>
                                    </div>
                                    <div class="px-4 py-3 space-y-2 text-xs text-gray-700">
                                        <p v-if="sharePreviewPost.text" class="text-sm text-gray-800">
                                            {{ sharePreviewPost.text }}
                                        </p>
                                        <div v-if="sharePreviewPost.post_type === 'feeling' && sharePreviewPost.feeling"
                                            class="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[11px] text-amber-700">
                                            <i class="mdi mdi-emoticon-outline"></i>
                                            Feeling {{ sharePreviewPost.feeling }}
                                        </div>
                                        <div v-if="sharePreviewPost.post_type === 'event' && sharePreviewPost.event"
                                            class="rounded-lg border bg-indigo-50/70 px-3 py-2 text-[11px] text-gray-700">
                                            <div class="text-[10px] uppercase tracking-wide text-indigo-500">Event</div>
                                            <div class="mt-1 text-xs font-semibold text-gray-900">
                                                {{ sharePreviewPost.event.title || 'Campus Event' }}
                                            </div>
                                            <div
                                                class="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
                                                <span v-if="sharePreviewPost.event.date"><i
                                                        class="mdi mdi-calendar-outline mr-1"></i>{{
                                                            sharePreviewPost.event.date }}</span>
                                                <span v-if="sharePreviewPost.event.location"><i
                                                        class="mdi mdi-map-marker-outline mr-1"></i>{{
                                                            sharePreviewPost.event.location }}</span>
                                            </div>
                                        </div>
                                        <div v-if="sharePreviewPost.media && sharePreviewPost.media.length"
                                            class="overflow-hidden rounded-lg border bg-white">
                                            <img :src="sharePreviewPost.media[0].url" alt="shared media"
                                                class="w-full max-h-[260px] object-cover" />
                                        </div>
                                    </div>
                                </button>
                            </div>
                        </div>
                        <div class="border-t px-4 sm:px-6 py-3 flex items-center justify-end gap-2">
                            <button type="button"
                                class="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs text-gray-600 hover:bg-gray-50"
                                @click="closeShareModal">
                                Cancel
                            </button>
                            <button type="button"
                                class="rounded-full bg-indigo-600 px-5 py-2 text-xs text-white hover:bg-indigo-500 disabled:opacity-60"
                                :disabled="shareSubmitting" @click="submitShare">
                                {{ shareSubmitting ? 'Sharing...' : 'Share now' }}
                            </button>
                        </div>
                    </div>
                </div>
        </SectionMain>
    </LayoutAuthenticated>
</template>

    <style scoped>
    /* small niceties */
</style>
