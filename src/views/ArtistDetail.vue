<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/supabaseClient'
import draggable from 'vuedraggable'

const route = useRoute()
const artistId = route.params.id

const artist = ref(null)
const member = ref(null)
const albums = ref([])
const newAlbumName = ref('')
const error = ref(null)
const showAlbumInput = ref(false)

// Load artist and albums
onMounted(async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    error.value = 'Failed to retrieve user.';
    return;
  }

  const user = userData.user;

  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single();

  if (artistError) {
    error.value = artistError.message;
    return;
  }

  artist.value = artistData;
  await loadAlbums();

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', user.id)
    .single();

  if (memberError) {
    error.value = memberError.message;
    return;
  }

  member.value = memberData;
});


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
    <!-- Page header -->
    <div class="card mb-4"
      :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5', color: member?.themes?.dark_one || '#333' }">
      <div class="card-body">
        <h3>{{ artist?.name }}</h3>

        <!-- Add album input toggle -->
        <div class="mt-3">
          <button v-if="!showAlbumInput" class="btn"
            :style="{ backgroundColor: member?.themes?.dark_two, color: member?.themes?.light_one }"
            @click="showAlbumInput = true">
            + Add Album
          </button>

          <div v-else class="d-flex gap-2">
            <input v-model="newAlbumName" type="text" class="form-control" placeholder="New album name"
              :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }" />
            <button class="btn" :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.light_one }"
              @click="addAlbum">
              Add
            </button>
            <button class="btn btn-secondary" @click="showAlbumInput = false">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Main content row: albums on left, rankings on right -->
    <div class="row">
      <!-- Albums and Songs -->
      <div class="col-lg-8">
        <div v-if="albums.length > 0" class="row">
          <div v-for="album in albums" :key="album.id" class="col-md-6 mb-4">
            <div class="card shadow"
              :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
              <div class="card-body">
                <h5 class="card-title">{{ album.title }}</h5>

                <!-- Songs List (Draggable) -->
                <draggable v-model="album.songs" item-key="id" :group="{ name: 'songs-' + album.id }"
                  @end="updateSongOrder(album)" tag="ul" class="list-group list-group-flush mb-3">
                  <template #item="{ element, index }">
                    <li class="list-group-item d-flex justify-content-between align-items-center"
                      :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                      <span>#{{ index + 1 }} - {{ element.title }}</span>
                      <i class="fas fa-grip-lines text-muted"></i>
                    </li>
                  </template>
                </draggable>

                <div v-if="album.songs.length === 0" class="text-muted mb-2">No songs yet</div>

                <!-- Add Song Toggle/Input -->
                <div>
                  <button class="btn btn-outline-primary btn-sm mb-2" @click="album.addingSong = !album.addingSong">
                    {{ album.addingSong ? 'Cancel' : '+ Add Song' }}
                  </button>

                  <div v-if="album.addingSong" class="d-flex">
                    <input v-model="album.newSongName" placeholder="New song title"
                      class="form-control form-control-sm me-2"
                      :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }"
                      @keyup.enter="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false" />
                    <button class="btn btn-sm"
                      :style="{ backgroundColor: member?.themes?.dark_two, color: member?.themes?.light_one }"
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

      <!-- Album Ranking (Side Card) -->
      <div class="col-lg-4">
        <div class="card" :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
          <div class="card-body">
            <h5 class="card-title">Album Ranking</h5>

            <draggable v-model="albums" item-key="id" @end="updateAlbumOrder" tag="ul" class="list-group">
              <template #item="{ element, index }">
                <li class="list-group-item d-flex justify-content-between align-items-center"
                  :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                  <span>#{{ index + 1 }} - {{ element.title }}</span>
                  <i class="fas fa-grip-lines text-muted"></i>
                </li>
              </template>
            </draggable>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Message -->
    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
  </div>
</template>


<style scoped>
.list-group-item {
  cursor: grab;
}
</style>
