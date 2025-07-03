<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabaseClient'
import draggable from 'vuedraggable'

const route = useRoute()
const artistId = route.params.id

const artist = ref(null)
const albums = ref([])
const newAlbumName = ref('')
const error = ref(null)
const showAlbumInput = ref(false)

// Load artist and albums
onMounted(async () => {
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single()

  if (artistError) {
    error.value = artistError.message
    return
  }

  artist.value = artistData
  await loadAlbums()
})

const sortAlbumsByRank = () => {
  albums.value.sort((a, b) => (a.album_ranking ?? 999) - (b.album_ranking ?? 999))
}

const updateSongOrder = async (album) => {
  for (let i = 0; i < album.songs.length; i++) {
    const song = album.songs[i]
    await supabase
      .from('songs')
      .update({ album_ranking: i + 1 })
      .eq('id', song.id)
  }
  await loadAlbums()
}


const updateAlbumOrder = async () => {
  for (let i = 0; i < albums.value.length; i++) {
    const album = albums.value[i]
    await supabase.from('albums').update({ album_ranking: i + 1 }).eq('id', album.id)
  }
  await loadAlbums()
}

const loadAlbums = async () => {
  const { data, error: albumError } = await supabase
    .from('albums')
    .select('*, songs(*)')
    .eq('artist_id', artistId)

  if (albumError) {
    error.value = albumError.message
  } else {
    albums.value = data.map(album => ({
      ...album,
      newSongName: '',
      addingSong: false
    }))
    sortAlbumsByRank()
  }
}

const addAlbum = async () => {
  if (!newAlbumName.value.trim()) return

  const currentMaxRank = Math.max(...albums.value.map(a => a.album_ranking || 0), 0)

  const { error: insertError } = await supabase.from('albums').insert([
    {
      title: newAlbumName.value,
      artist_id: artistId,
      member_id: artist.value.member_id,
      album_ranking: currentMaxRank + 1,
    }
  ])

  if (!insertError) {
    newAlbumName.value = ''
    showAlbumInput.value = false
    await loadAlbums()
  } else {
    error.value = insertError.message
  }
}

const addSong = async (albumId, songName) => {
  if (!songName.trim()) return

  const album = albums.value.find(a => a.id === albumId)
  if (!album) return

  const existingRankings = album.songs.map(song => song.album_ranking || 0)
  const maxRanking = Math.max(...existingRankings, 0)
  const nextRanking = maxRanking + 1

  const { error: insertError } = await supabase.from('songs').insert([
    {
      name: songName,
      album_id: albumId,
      artist_id: artistId,
      member_id: artist.value.member_id,
      album_ranking: nextRanking,
    }
  ])

  if (!insertError) {
    await loadAlbums()
  } else {
    error.value = insertError.message
  }
}
</script>

<template>
  <div class="container-fluid py-4">
    <div class="card mb-4">
      <div class="card-body">
        <h3>{{ artist?.name }}</h3>

        <div class="mt-3">
          <button v-if="!showAlbumInput" class="btn btn-success" @click="showAlbumInput = true">
            + Add Album
          </button>

          <div v-else class="d-flex gap-2 mt-2">
            <input v-model="newAlbumName" type="text" class="form-control" placeholder="New album name" />
            <button class="btn btn-success" @click="addAlbum">Add</button>
            <button class="btn btn-secondary" @click="showAlbumInput = false">Cancel</button>
          </div>
        </div>
      </div>
    </div>

    <div class="row">
      <!-- Album Cards Column -->
      <div class="col-lg-8">
        <div v-if="albums.length > 0" class="row">
          <div v-for="album in albums" :key="album.id" class="col-md-6 mb-4">
            <div class="card shadow">
              <div class="card-body">
                <h5 class="card-title">{{ album.title }}</h5>

                <draggable v-model="album.songs" :item-key="'id'" @end="updateSongOrder(album)" tag="ul"
                  class="list-group list-group-flush mb-3">
                  <template #item="{ element }">
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                      <span>#{{ element.album_ranking ?? '–' }}</span>
                      <span>{{ element.title }}</span>
                      <i class="fas fa-grip-lines text-muted ms-2"></i>
                    </li>
                  </template>
                </draggable>


                <div>
                  <button class="btn btn-outline-primary btn-sm mb-2" @click="album.addingSong = !album.addingSong">
                    {{ album.addingSong ? 'Cancel' : '+ Add Song' }}
                  </button>

                  <div v-if="album.addingSong" class="d-flex">
                    <input v-model="album.newSongName" placeholder="New song title"
                      class="form-control form-control-sm me-2"
                      @keyup.enter="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false" />
                    <button class="btn btn-sm btn-success"
                      @click="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false">
                      Add
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Album Ranking Sidebar -->
      <div class="col-lg-4">
        <div class="card shadow border-start border-4 border-primary">
          <div class="card-body">
            <h5 class="card-title">Album Ranking</h5>
            <draggable v-model="albums" item-key="id" @end="updateAlbumOrder" tag="ul" class="list-group">
              <template #item="{ element, index }">
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <span>#{{ index + 1 }} - {{ element.title }}</span>
                  <i class="fas fa-grip-lines text-muted"></i>
                </li>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </div>

    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
  </div>
</template>

<style scoped>
.list-group-item {
  cursor: grab;
}
</style>
