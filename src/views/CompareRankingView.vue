<script setup>
import { ref, shallowRef, triggerRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import {
  replay,
  applyEvent,
  getQuestion,
  canSkip,
  isComplete,
  finalRanking,
  estimateRemaining,
  provisionalRanking,
  createState,
} from '@/ranking/comparisonEngine'
import {
  newSession,
  syncSongs,
  undoLast,
  hasUndo,
  loadSession,
  saveLocal,
  saveRemote,
  deleteSession,
  saveFinalRanking,
} from '@/ranking/rankingSession'

const store = useStore()
const route = useRoute()
const router = useRouter()
const memberId = route.params.memberId
const artistId = route.params.artistId

const user = computed(() => store.state.user)
const member = ref(null)
const theme = computed(() => member.value?.themes || {})
const artist = ref(null)
const songs = ref([])
const error = ref(null)
const saveWarning = ref(null)

// 'loading' | 'start' | 'comparing' | 'paused' | 'done'
const phase = ref('loading')
const session = ref(null)
const engine = shallowRef(null)
const showConfirmStartOver = ref(false)
const savingFinal = ref(false)

const songsById = computed(() => new Map(songs.value.map((song) => [String(song.id), song])))
const songFor = (id) => songsById.value.get(String(id)) || { title: 'Unknown song', albums: null }

const question = computed(() => (engine.value ? getQuestion(engine.value) : null))
const skipAllowed = computed(() => !!engine.value && canSkip(engine.value))
const undoAllowed = computed(() => !!engine.value && !!session.value && hasUndo(session.value))
const picksMade = computed(() => engine.value?.picks ?? 0)
const picksLeft = computed(() => (engine.value ? estimateRemaining(engine.value) : 0))
const percent = computed(() => {
  if (!engine.value) return 0
  if (isComplete(engine.value)) return 100
  const total = picksMade.value + picksLeft.value
  return total ? Math.floor((picksMade.value / total) * 100) : 0
})

const currentList = computed(() => {
  if (!engine.value) return []
  const ids = isComplete(engine.value) ? finalRanking(engine.value) : provisionalRanking(engine.value)
  return ids.map(songFor)
})

const verifyAlbumTitle = computed(() =>
  question.value?.type === 'verify' ? songFor(question.value.left).albums?.title : null
)

const startEstimates = computed(() => ({
  albums: estimateRemaining(createState(newSession('albums', songs.value).groups)),
  scratch: estimateRemaining(createState(songs.value.map((song) => [song.id]))),
}))

// Saving: localStorage on every change, Supabase shortly after.
let remoteTimer = null

const flushRemote = async () => {
  clearTimeout(remoteTimer)
  remoteTimer = null
  if (!session.value || !engine.value) return
  const status = isComplete(engine.value) ? 'complete' : 'in_progress'
  const remoteError = await saveRemote(artistId, user.value?.id, session.value, status)
  saveWarning.value = remoteError
    ? 'Progress is only being saved on this device right now (' + remoteError + ').'
    : null
}

const persist = () => {
  saveLocal(artistId, session.value)
  clearTimeout(remoteTimer)
  remoteTimer = setTimeout(flushRemote, 1000)
}

const record = (event) => {
  session.value.events.push(event)
  applyEvent(engine.value, event)
  triggerRef(engine)
  persist()
}

const choose = async (songId) => {
  if (phase.value !== 'comparing' || !question.value) return
  record({ t: 'pick', w: songId })
  if (isComplete(engine.value)) await finish()
}

const skip = () => {
  if (skipAllowed.value) record({ t: 'skip' })
}

const undo = () => {
  if (!undoLast(session.value)) return
  engine.value = replay(session.value)
  persist()
}

const pause = async () => {
  phase.value = 'paused'
  await flushRemote()
}

const resume = () => {
  phase.value = isComplete(engine.value) ? 'done' : 'comparing'
}

const begin = async (mode) => {
  session.value = newSession(mode, songs.value)
  engine.value = replay(session.value)
  phase.value = 'comparing'
  persist()
  if (isComplete(engine.value)) await finish()
}

const finish = async () => {
  savingFinal.value = true
  const rankingError = await saveFinalRanking(finalRanking(engine.value))
  savingFinal.value = false
  if (rankingError) error.value = 'Could not save your final ranking: ' + rankingError
  await flushRemote()
  phase.value = 'done'
}

const startOver = async () => {
  showConfirmStartOver.value = false
  clearTimeout(remoteTimer)
  await deleteSession(artistId)
  session.value = null
  engine.value = null
  phase.value = 'start'
}

const onKeydown = (e) => {
  if (phase.value !== 'comparing' || !question.value || e.target.closest?.('input, textarea')) return
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault()
    choose(question.value.left)
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    e.preventDefault()
    choose(question.value.right)
  } else if (e.key === 's' || e.key === 'S') {
    skip()
  }
}

const onBeforeUnload = () => {
  if (session.value) saveLocal(artistId, session.value)
}

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('beforeunload', onBeforeUnload)

  if (!user.value) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) store.commit('setUser', userData.user)
  }

  const { data: memberData } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('music_id', memberId)
    .single()

  // Only the owner can rank; everyone else goes back to the artist page.
  if (!memberData || !user.value || memberData.member_id !== user.value.id) {
    router.replace(`/artists/${memberId}/${artistId}`)
    return
  }
  member.value = memberData

  const [{ data: artistData }, { data: songData, error: songError }] = await Promise.all([
    supabase.from('artists').select('*').eq('id', artistId).single(),
    supabase
      .from('songs')
      .select('id, title, album_id, album_ranking, albums!inner(id, title, album_ranking)')
      .eq('artist_id', artistId),
  ])
  artist.value = artistData

  if (songError) {
    error.value = songError.message
    return
  }
  songs.value = songData

  const { session: saved, remoteError } = await loadSession(artistId)
  if (remoteError) saveWarning.value = 'Progress is only being saved on this device right now (' + remoteError + ').'

  if (!saved) {
    phase.value = 'start'
    return
  }

  session.value = saved
  if (syncSongs(saved, songs.value)) persist()
  engine.value = replay(saved)
  phase.value = isComplete(engine.value) ? 'done' : 'comparing'
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('beforeunload', onBeforeUnload)
  if (remoteTimer) flushRemote()
})
</script>

<template>
  <div class="container-fluid py-4">
    <!-- Header -->
    <div class="card mb-3" :style="{ backgroundColor: theme.light_one || '#f5f5f5', color: theme.dark_one || '#333' }">
      <div class="card-body d-flex flex-wrap align-items-center justify-content-between gap-2">
        <h3 class="mb-0">{{ artist?.name }}<span class="d-none d-md-inline"> &middot; Rank by Comparing</span></h3>
        <button class="btn btn-outline my-auto" @click="router.push(`/artists/${memberId}/${artistId}`)"
          :style="{ border: 'solid 1px' + theme.dark_one, color: theme.dark_one }">
          &lt; <span class="d-none d-md-inline">Back to Artist</span>
        </button>
      </div>
    </div>

    <div class="card" :style="{ backgroundColor: theme.light_two || '#fff', color: theme.dark_one || '#333' }">
      <div class="card-body">

        <p v-if="phase === 'loading' && !error" class="text-center my-4">Loading&hellip;</p>

        <!-- Start screen -->
        <div v-else-if="phase === 'start'">
          <p v-if="songs.length < 2" class="text-center my-4">
            Add at least two songs to this artist before ranking.
          </p>
          <template v-else>
            <p class="mb-4">
              You'll see two songs at a time. Pick your favorite, and over time every one of your
              {{ songs.length }} songs will find its place. You can pause any time and pick up where you left off.
            </p>
            <div class="d-flex flex-column flex-md-row gap-3">
              <button class="btn start-option flex-fill text-start p-4 ombre-overlay"
                :style="{ backgroundColor: theme.light_one, color: theme.dark_one, border: 'solid 1px' + theme.dark_one }"
                @click="begin('albums')">
                <strong class="d-block mb-1">Start from my album rankings</strong>
                <span class="d-block small text-wrap">
                  Each album's order is used as a head start. You'll double-check each pair of neighboring
                  songs first, so you can change your mind.
                </span>
                <span class="d-block small mt-2 opacity-75">Up to ~{{ startEstimates.albums }} picks</span>
              </button>
              <button class="btn start-option flex-fill text-start p-4 ombre-overlay"
                :style="{ backgroundColor: theme.light_one, color: theme.dark_one, border: 'solid 1px' + theme.dark_one }"
                @click="begin('scratch')">
                <strong class="d-block mb-1">Start from scratch</strong>
                <span class="d-block small text-wrap">Ignore album rankings and compare everything fresh.</span>
                <span class="d-block small mt-2 opacity-75">Up to ~{{ startEstimates.scratch }} picks</span>
              </button>
            </div>
          </template>
        </div>

        <template v-else-if="phase !== 'loading'">
          <!-- Progress -->
          <div class="mb-4">
            <div class="d-flex justify-content-between small mb-1">
              <span>{{ picksMade }} picks made</span>
              <span v-if="phase === 'done'">Complete</span>
              <span v-else>{{ percent }}% &middot; up to {{ picksLeft }} left</span>
            </div>
            <div class="progress" style="height: 10px;" role="progressbar" :aria-valuenow="percent" aria-valuemin="0"
              aria-valuemax="100">
              <div class="progress-bar" :style="{ width: percent + '%', backgroundColor: theme.dark_two }"></div>
            </div>
          </div>

          <!-- Comparing -->
          <div v-if="phase === 'comparing' && question">
            <p class="text-center mb-3">
              <template v-if="verifyAlbumTitle">
                Double-checking your <strong>{{ verifyAlbumTitle }}</strong> ranking. Still feel this way?
              </template>
              <template v-else>Which song do you like more?</template>
            </p>

            <div class="d-flex flex-column flex-md-row align-items-stretch gap-3">
              <button class="btn song-choice flex-fill ombre-overlay" @click="choose(question.left)"
                :style="{ backgroundColor: theme.light_one, color: theme.dark_one, border: 'solid 2px' + theme.dark_one }">
                <span class="song-title">{{ songFor(question.left).title }}</span>
                <span class="d-block small mt-1 opacity-75">{{ songFor(question.left).albums?.title }}</span>
                <span v-if="verifyAlbumTitle" class="d-block small mt-2">(ranked higher on the album)</span>
              </button>
              <div class="align-self-center fw-bold">vs</div>
              <button class="btn song-choice flex-fill ombre-overlay" @click="choose(question.right)"
                :style="{ backgroundColor: theme.light_one, color: theme.dark_one, border: 'solid 2px' + theme.dark_one }">
                <span class="song-title">{{ songFor(question.right).title }}</span>
                <span class="d-block small mt-1 opacity-75">{{ songFor(question.right).albums?.title }}</span>
              </button>
            </div>

            <div class="d-flex flex-wrap justify-content-center gap-2 mt-4">
              <button class="btn btn-sm btn-outline" :disabled="!undoAllowed" @click="undo"
                :style="{ border: 'solid 1px' + theme.dark_one, color: theme.dark_one }">
                Undo
              </button>
              <button class="btn btn-sm btn-outline" :disabled="!skipAllowed" @click="skip"
                :title="skipAllowed ? 'Come back to this one later' : 'This is the only choice left right now'"
                :style="{ border: 'solid 1px' + theme.dark_one, color: theme.dark_one }">
                Skip for now
              </button>
              <button class="btn btn-sm" @click="pause"
                :style="{ backgroundColor: theme.dark_two, color: theme.light_two }">
                Pause &amp; see list
              </button>
            </div>
            <p class="text-center small mt-3 mb-0 opacity-75 d-none d-md-block">
              Tip: use &larr; / &rarr; to pick, S to skip.
            </p>
          </div>

          <p v-else-if="savingFinal" class="text-center my-4">Saving your ranking&hellip;</p>

          <!-- Paused / done: the list as it stands -->
          <div v-if="phase === 'paused' || phase === 'done'">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
              <div>
                <h5 class="mb-0">{{ phase === 'done' ? 'Your Ranking' : 'Your Ranking So Far' }}</h5>
                <p v-if="phase === 'paused'" class="small mb-0 opacity-75">
                  Provisional: songs you haven't compared yet are placed by estimate.
                </p>
                <p v-else class="small mb-0 opacity-75">Saved to your artist page.</p>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-sm btn-outline" @click="showConfirmStartOver = true"
                  :style="{ border: 'solid 1px' + theme.dark_one, color: theme.dark_one }">
                  Start Over
                </button>
                <button v-if="phase === 'paused'" class="btn btn-sm" @click="resume"
                  :style="{ backgroundColor: theme.dark_two, color: theme.light_two }">
                  Resume
                </button>
              </div>
            </div>

            <table class="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th class="d-none d-sm-table-cell">Album</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(song, index) in currentList" :key="song.id ?? index">
                  <td>{{ index + 1 }}</td>
                  <td>
                    {{ song.title }}
                    <div class="small opacity-75 d-sm-none">{{ song.albums?.title }}</div>
                  </td>
                  <td class="d-none d-sm-table-cell">{{ song.albums?.title }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>

        <p v-if="saveWarning" class="small text-warning mt-3 mb-0">{{ saveWarning }}</p>
        <p v-if="error" class="text-danger mt-3 mb-0">{{ error }}</p>
      </div>
    </div>

    <div v-if="showConfirmStartOver" class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
      <div class="modal-dialog">
        <div class="modal-content" :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
          <div class="modal-header">
            <h5 class="modal-title">Start Over?</h5>
            <button type="button" class="btn-close" @click="showConfirmStartOver = false"></button>
          </div>
          <div class="modal-body">
            <p>This erases all of your picks for this artist. Your last finished ranking stays on the artist page
              until you finish a new one.</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showConfirmStartOver = false">Cancel</button>
            <button class="btn btn-danger" @click="startOver">Start Over</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.song-choice {
  min-height: 140px;
  white-space: normal;
  text-transform: none;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  flex-basis: 0;
}

@media (min-width: 768px) {
  .song-choice {
    min-height: 220px;
  }
}

.song-title {
  font-size: 1.35rem;
  font-weight: 600;
}

.start-option {
  white-space: normal;
  text-transform: none;
  flex-basis: 0;
}

.modal {
  z-index: 1055;
}
</style>
