import { supabase } from '@/supabaseClient'

// Saved comparison-ranking progress, one per user per artist. Kept in Supabase
// (see supabase/ranking_sessions.sql) with a localStorage copy as a fallback.
//
// Session shape: { version, mode, groups, events, savedAt }
//   groups - starting runs of song ids (one per album, or one per song)
//   events - everything the user did, replayed by comparisonEngine.js

const TABLE = 'ranking_sessions'
const localKey = (artistId) => `song-ranker:ranking-session:${artistId}`

export function newSession(mode, songs) {
  let groups
  if (mode === 'albums') {
    const albums = new Map()
    for (const song of songs) {
      if (!albums.has(song.album_id)) albums.set(song.album_id, { album: song.albums, songs: [] })
      albums.get(song.album_id).songs.push(song)
    }
    groups = [...albums.values()]
      .sort((a, b) => (a.album?.album_ranking ?? 999) - (b.album?.album_ranking ?? 999))
      .map((entry) =>
        entry.songs
          .sort((a, b) => (a.album_ranking ?? 999) - (b.album_ranking ?? 999))
          .map((song) => song.id)
      )
  } else {
    groups = shuffle(songs.map((song) => song.id)).map((id) => [id])
  }
  return { version: 1, mode, groups, events: [], savedAt: Date.now() }
}

// Adds events for songs created or deleted since the session started.
export function syncSongs(session, songs) {
  const tracked = new Set(session.groups.flat().map(String))
  for (const event of session.events) {
    if (event.t === 'add') event.ids.forEach((id) => tracked.add(String(id)))
    if (event.t === 'remove') event.ids.forEach((id) => tracked.delete(String(id)))
  }
  const current = new Set(songs.map((song) => String(song.id)))
  const added = songs.filter((song) => !tracked.has(String(song.id))).map((song) => song.id)
  const removed = [...tracked].filter((id) => !current.has(id))

  if (removed.length) session.events.push({ t: 'remove', ids: removed })
  if (added.length) session.events.push({ t: 'add', ids: added })
  return added.length > 0 || removed.length > 0
}

// Removes the most recent pick or skip. Returns false if there is nothing to undo.
export function undoLast(session) {
  for (let i = session.events.length - 1; i >= 0; i--) {
    const { t } = session.events[i]
    if (t === 'pick' || t === 'skip') {
      session.events.splice(i, 1)
      return true
    }
  }
  return false
}

export const hasUndo = (session) => session.events.some((e) => e.t === 'pick' || e.t === 'skip')

export async function loadSession(artistId) {
  const local = readLocal(artistId)
  const { data, error } = await supabase
    .from(TABLE)
    .select('data')
    .eq('artist_id', String(artistId))
    .maybeSingle()

  if (error) return { session: local, remoteError: error.message }

  const remote = data?.data ?? null
  const session = local && (!remote || (local.savedAt ?? 0) > (remote.savedAt ?? 0)) ? local : remote
  return { session, remoteError: null }
}

export function saveLocal(artistId, session) {
  session.savedAt = Date.now()
  try {
    localStorage.setItem(localKey(artistId), JSON.stringify(session))
  } catch {
    // Storage full or blocked; Supabase still has it.
  }
}

export async function saveRemote(artistId, userId, session, status) {
  const { error } = await supabase.from(TABLE).upsert(
    {
      user_id: userId,
      artist_id: String(artistId),
      data: session,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,artist_id' }
  )
  return error?.message ?? null
}

export async function deleteSession(artistId) {
  try {
    localStorage.removeItem(localKey(artistId))
  } catch {
    // ignore
  }
  await supabase.from(TABLE).delete().eq('artist_id', String(artistId))
}

// Writes the finished order to songs.artist_ranking (shown on the artist page).
export async function saveFinalRanking(rankedIds) {
  const chunkSize = 20
  for (let start = 0; start < rankedIds.length; start += chunkSize) {
    const chunk = rankedIds.slice(start, start + chunkSize)
    const results = await Promise.all(
      chunk.map((id, i) =>
        supabase.from('songs').update({ artist_ranking: start + i + 1 }).eq('id', id)
      )
    )
    const failed = results.find((result) => result.error)
    if (failed) return failed.error.message
  }
  return null
}

function readLocal(artistId) {
  try {
    const raw = localStorage.getItem(localKey(artistId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function shuffle(list) {
  const result = [...list]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}
