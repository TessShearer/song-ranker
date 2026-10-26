<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { replay, isComplete, estimateRemaining } from '@/ranking/comparisonEngine'
import { loadSession, syncSongs } from '@/ranking/rankingSession'

const route = useRoute()
const router = useRouter()
const props = defineProps({
  theme: Object,
  isOwner: Boolean,
})

const memberId = route.params.memberId
const artistId = route.params.artistId
const expanded = ref(false)
const songs = ref([])
const error = ref(null)
const progress = ref(null) // null = never started, otherwise { percent, complete }

const rankedList = computed(() =>
  songs.value
    .filter((song) => song.artist_ranking != null)
    .sort((a, b) => a.artist_ranking - b.artist_ranking)
)

const rankButtonLabel = computed(() => {
  if (!progress.value) return 'Rank by Comparing'
  if (progress.value.complete) return 'Comparison Ranking'
  return `Resume Ranking (${progress.value.percent}%)`
})

const fetchSongs = async () => {
  const { data, error: songErr } = await supabase
    .from('songs')
    .select('*, albums!inner(id, title)')
    .eq('artist_id', artistId)

  if (songErr) {
    error.value = songErr.message
    return
  }
  songs.value = data
}

const loadProgress = async () => {
  const { session } = await loadSession(artistId)
  if (!session) return
  syncSongs(session, songs.value)
  const state = replay(session)
  const total = state.picks + estimateRemaining(state)
  progress.value = {
    complete: isComplete(state),
    percent: total ? Math.floor((state.picks / total) * 100) : 0,
  }
}

onMounted(async () => {
  await fetchSongs()
  if (props.isOwner) await loadProgress()
})

watch(
  () => props.isOwner,
  async (owner) => {
    if (owner && !progress.value) await loadProgress()
  }
)
</script>

<template>
  <div v-if="theme" class="card pb-3 my-4" :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
    <div class="card-header d-flex flex-wrap gap-2 justify-content-between align-items-center"
      :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
      <h5 class="mb-0">Entire Ranked Discography</h5>
      <div class="d-flex gap-2">
        <button v-if="props.isOwner" class="btn btn-sm mb-0"
          :style="{ backgroundColor: theme.dark_two, color: theme.light_two }"
          @click="router.push(`/artists/${memberId}/${artistId}/rank`)">
          {{ rankButtonLabel }}
        </button>
        <button class="btn btn-sm mb-0 ombre-overlay fs-6"
          :style="{ backgroundColor: theme.dark_two, color: theme.light_two }" @click="expanded = !expanded">
          {{ expanded ? '-' : '+' }}
        </button>
      </div>
    </div>

    <div v-if="expanded" class="card-body" :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
      <table class="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Title</th>
            <th class="d-none d-sm-table-cell">Album</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rankedList.length === 0">
            <td colspan="3" class="text-center text-muted py-3">
              No songs ranked yet.
            </td>
          </tr>
          <tr v-for="(song, index) in rankedList" :key="song.id">
            <td>{{ index + 1 }}</td>
            <td>
              {{ song.title }}
              <div class="text-muted small d-sm-none">
                {{ song.albums.title }}
              </div>
            </td>
            <td class="d-none d-sm-table-cell">
              {{ song.albums.title }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-if="error" class="text-danger m-3">{{ error }}</p>
  </div>
</template>
