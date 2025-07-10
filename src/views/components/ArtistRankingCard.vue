<script setup>
import { ref, watchEffect, computed } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRoute } from 'vue-router'
import draggable from 'vuedraggable'

const route = useRoute()
const props = defineProps({
    theme: Object,
  isOwner: Boolean,
})

const editing = ref(false)
const expanded = ref(false)
const allSongs = ref([])
const rankedList = ref([])
const albums = ref([])
const error = ref(null)
const artistId = route.params.artistId

const fetchSongsAndAlbums = async () => {
  const { data: songData, error: songErr } = await supabase
    .from('songs')
    .select('*, albums!inner(id, title)')
    .eq('artist_id', artistId)

  if (songErr) {
    error.value = songErr.message
    return
  }

  allSongs.value = songData

  // Extract ranked songs and sort them
  rankedList.value = songData
    .filter(song => song.artist_ranking != null)
    .sort((a, b) => a.artist_ranking - b.artist_ranking)

  // Extract unique albums
  const grouped = {}
  songData.forEach(song => {
    const albumId = song.albums.id
    if (!grouped[albumId]) {
      grouped[albumId] = {
        id: albumId,
        title: song.albums.title,
        songs: [],
      }
    }
    grouped[albumId].songs.push(song)
  })

  albums.value = Object.values(grouped)
}

watchEffect(() => {
  if (expanded.value) {
    fetchSongsAndAlbums()
  }
})

const unrankedTopSongsPerAlbum = computed(() => {
  return albums.value.map(album => {
    const unranked = album.songs
      .filter(song => song.artist_ranking == null)
      .sort((a, b) => a.album_ranking - b.album_ranking)
      .slice(0, 4)

    return {
      ...album,
      topSongs: unranked,
    }
  })
})

const addSongToRanking = async (song) => {
  const maxRank = Math.max(
    0,
    ...rankedList.value.map(s => s.artist_ranking || 0)
  )
  const newRank = maxRank + 1

  const { error: updateError } = await supabase
    .from('songs')
    .update({ artist_ranking: newRank })
    .eq('id', song.id)

  if (!updateError) {
    await fetchSongsAndAlbums()
  } else {
    error.value = updateError.message
  }
}

const updateSongOrder = async () => {
  for (let i = 0; i < rankedList.value.length; i++) {
    const song = rankedList.value[i]
    await supabase
      .from('songs')
      .update({ artist_ranking: i + 1 })
      .eq('id', song.id)
  }
  await fetchSongsAndAlbums()
}
</script>

<template>
    <div v-if="theme" class="card pb-3 my-4" :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
        <div class="card-header d-flex justify-content-between align-items-center" :style="{ backgroundColor: theme.light_two, color: theme.dark_one }">
            <h5 class="mb-0">Entire Ranked Discography</h5>
            <div>
                <button v-if="!editing && props.isOwner && expanded" class="btn btn-sm me-2" :style="{ backgroundColor: theme.dark_two, color: theme.light_two }" @click="editing = true">
                    I'm Ready to Rank
                </button>
                <button v-if="editing && props.isOwner && expanded" class="btn btn-sm" :style="{ backgroundColor: theme.dark_two, color: theme.light_two }" @click="editing = false">
                    Done Ranking
                </button>
                <button v-if="!editing" class="btn btn-sm ombre-overlay fs-6" :style="{ backgroundColor: theme.dark_two, color: theme.light_two }" @click="expanded = !expanded">
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
                        <th>Album</th>
                    </tr>
                </thead>
                <draggable v-if="editing && props.isOwner" v-model="rankedList" item-key="id" tag="tbody"
                    @end="updateSongOrder">
                    <template #item="{ element: song, index }">
                        <tr>
                            <td>{{ index + 1 }}</td>
                            <td>{{ song.title }}</td>
                            <td>{{ song.albums.title }}</td>
                        </tr>
                    </template>

                </draggable>

                <!-- fallback read-only view -->
                <tbody v-else>
                    <tr v-for="(song, index) in rankedList" :key="song.id">
                        <td>{{ index + 1 }}</td>
                        <td>{{ song.title }}</td>
                        <td>{{ song.albums.title }}</td>
                    </tr>
                </tbody>

            </table>

            <!-- Ranking Section -->
            <div v-if="editing && props.isOwner">
                <h6 class="mt-4 mb-2">Top Unranked Songs Per Album</h6>
                <div v-for="album in unrankedTopSongsPerAlbum" :key="album.id" class="mb-3">
                    <strong>{{ album.title }}</strong>
                    <ul class="list-group">
                        <li v-for="(song, index) in album.topSongs" :key="song.id"
                            class="list-group-item d-flex justify-content-between align-items-center"
                            :class="{ 'text-muted': index === 3, 'bg-light': index === 3 }">
                            <span>#{{ song.album_ranking }} - {{ song.title }}</span>
                            <button v-if="index < 3" class="btn btn-sm btn-outline-success"
                                @click="addSongToRanking(song)">
                                +
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>

        <p v-if="error" class="text-danger m-3">{{ error }}</p>
    </div>
</template>

<style scoped>
.bg-light {
    opacity: 0.5;
    transition: opacity 0.3s ease-in;
}

.draggable-fade-enter-active,
.draggable-fade-leave-active {
    transition: opacity 0.2s;
}

.draggable-fade-enter-from,
.draggable-fade-leave-to {
    opacity: 0;
}

tr {
    cursor: grab;
}
</style>
