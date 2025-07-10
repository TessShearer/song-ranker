<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import draggable from 'vuedraggable'
import ArtistRankingCard from './components/ArtistRankingCard.vue'

const store = useStore()
const route = useRoute()
const router = useRouter()
const memberId = route.params.memberId
const artistId = route.params.artistId

const user = computed(() => store.state.user)
const signedInMember = computed(() => store.state.member)
const isLoggedIn = computed(() => !!user.value)
const isOwner = computed(() =>
  isLoggedIn.value &&
  signedInMember.value &&
  signedInMember.value.music_id == memberId
)

const artist = ref(null)
const member = ref(null)
const albums = ref([])
const newAlbumName = ref('')
const error = ref(null)
const showAlbumInput = ref(false)
const showNoteModal = ref(false)
const currentNoteSong = ref(null)
const noteText = ref('')

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
      addingSong: false,
      songs: [...(album.songs || [])].sort((a, b) => (a.album_ranking ?? 999) - (b.album_ranking ?? 999))
    }))

    sortAlbumsByRank()
  }
}

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
    await supabase
      .from('albums')
      .update({ album_ranking: i + 1 })
      .eq('id', album.id)
  }
  await loadAlbums()
}

const addAlbum = async () => {
  if (!newAlbumName.value.trim()) return

  const currentMaxRank = Math.max(...albums.value.map(a => a.album_ranking || 0), 0)

  const { error: insertError } = await supabase.from('albums').insert([{
    title: newAlbumName.value,
    artist_id: artistId,
    member_id: memberId,
    album_ranking: currentMaxRank + 1,
  }])

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

  const existingRanks = album.songs.map(song => song.album_ranking || 0)
  const maxRank = Math.max(...existingRanks, 0)

  const { error: insertError } = await supabase.from('songs').insert([{
    title: songName,
    album_id: albumId,
    artist_id: artistId,
    member_id: memberId,
    album_ranking: maxRank + 1,
  }])

  if (!insertError) {
    await loadAlbums()
  } else {
    error.value = insertError.message
  }
}

onMounted(async () => {
  // Restore user and member if not already in store
  if (!user.value) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      store.commit('setUser', userData.user)
    }
  }

  if (!signedInMember.value) {
    const { data: currentMemberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('member_id', user.value?.id)
      .single()

    if (currentMemberData) {
      store.commit('setMember', currentMemberData)
    } else if (memberError) {
      error.value = memberError.message
    }
  }

  // Get artist
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select('*')
    .eq('id', artistId)
    .single()

  if (artistError || !artistData) {
    error.value = artistError?.message || 'Artist not found.'
    return
  }
  artist.value = artistData

  // Get member (for theme)
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('music_id', memberId)
    .or(`is_private.eq.false,member_id.eq.${user.value?.id}`)
    .single()

  if (memberError || !memberData) {
    router.push('/forbidden')
    return
  }

  member.value = memberData

  const isOwnerValue = user.value?.id === memberData.member_id
  store.commit('setTheme', memberData.themes)
  store.commit('setThemeSource', isOwnerValue ? 'self' : 'viewed')

  await loadAlbums()
})

const deleteArtist = async () => {
  const confirmDelete = confirm(
    'Are you sure you want to delete this artist? This will permanently delete all albums and songs associated with them.'
  )
  if (!confirmDelete) return

  // First delete all songs by artist
  const { error: songError } = await supabase
    .from('songs')
    .delete()
    .eq('artist_id', artistId)

  if (songError) {
    error.value = 'Error deleting songs: ' + songError.message
    return
  }

  // Then delete all albums by artist
  const { error: albumError } = await supabase
    .from('albums')
    .delete()
    .eq('artist_id', artistId)

  if (albumError) {
    error.value = 'Error deleting albums: ' + albumError.message
    return
  }

  // Finally delete the artist
  const { error: artistError } = await supabase
    .from('artists')
    .delete()
    .eq('id', artistId)

  if (artistError) {
    error.value = 'Error deleting artist: ' + artistError.message
    return
  }

  // Redirect to dashboard
  router.push(`/`)
}

const deleteAlbum = async (albumId) => {
  const confirmDelete = confirm(
    'Are you sure you want to delete this album? This will permanently delete the album and all its songs.'
  )
  if (!confirmDelete) return

  // Delete songs for the album
  const { error: songError } = await supabase
    .from('songs')
    .delete()
    .eq('album_id', albumId)

  if (songError) {
    error.value = 'Error deleting songs: ' + songError.message
    return
  }

  // Delete the album
  const { error: albumError } = await supabase
    .from('albums')
    .delete()
    .eq('id', albumId)

  if (albumError) {
    error.value = 'Error deleting album: ' + albumError.message
    return
  }

  await loadAlbums()
}

const deleteSong = async (songId) => {
  const confirmDelete = confirm('Are you sure you want to delete this song?')
  if (!confirmDelete) return

  const { error: songError } = await supabase
    .from('songs')
    .delete()
    .eq('id', songId)

  if (songError) {
    error.value = 'Error deleting song: ' + songError.message
    return
  }

  await loadAlbums()
}

const openNoteModal = (song) => {
  currentNoteSong.value = song
  noteText.value = song.note || ''
  showNoteModal.value = true
}

const saveNote = async () => {
  const { error } = await supabase
    .from('songs')
    .update({ note: noteText.value })
    .eq('id', currentNoteSong.value.id)

  if (!error) {
    currentNoteSong.value.note = noteText.value
    showNoteModal.value = false
  } else {
    console.error(error.message)
  }
}

</script>

<template>
  <div v-if="member" class="container-fluid py-4">




    <!-- Page header -->
    <div class="card mb-1"
      :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5', color: member?.themes?.dark_one || '#333' }">
      <div class="card-body d-flex flex-wrap align-items-center justify-content-between">
        <h3 class="mb-0">{{ artist?.name }}</h3>
        <button class="btn btn-outline my-auto" @click="router.push(`/members/${memberId}/tables`)" :style="{
    border: 'solid 1px' + member?.themes?.dark_one,
    color: member?.themes?.dark_one
  }">
          &lt; <span class="d-none d-md-inline">Back to Artists</span>
        </button>
      </div>
    </div>

    <!-- Album Ranking on Top -->
    <div class="row mb-4">
      <div class="col-12">
        <artist-ranking-card :theme="member?.themes" :albums="albums" :isOwner="isOwner" />

        <div class="card" :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center">
              <h5 class="card-title">Album Ranking</h5>
              <!-- Add album button -->
              <div v-if="isOwner && !showAlbumInput">
                <button class="btn ombre-overlay"
                  :style="{ backgroundColor: member?.themes?.dark_two, color: member?.themes?.light_one }"
                  @click="showAlbumInput = true">
                  + Add Album
                </button>
              </div>

              <!-- Album input form -->
              <div v-else-if="isOwner" class="gap-2 mt-2 w-50">
                <input v-model="newAlbumName" type="text" class="form-control" placeholder="New album name"
                  :style="{ backgroundColor: member?.themes?.light_two + 'CC', color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }" />
                <div class="d-flex justify-content-end gap-2 mt-2">
                  <button class="btn btn-outline"
                    :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }"
                    @click="addAlbum">
                    Add
                  </button>
                  <button class="btn btn-outline"
                    :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }"
                    @click="showAlbumInput = false">
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <!-- Draggable or read-only list -->
            <draggable v-if="isOwner" v-model="albums" item-key="id" @end="updateAlbumOrder" tag="ul"
              class="list-group">
              <template #item="{ element, index }">
                <li class="list-group-item d-flex justify-content-between align-items-center"
                  :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                  <span>#{{ index + 1 }} - {{ element.title }}</span>
                  <i class="fas fa-grip-lines text-muted"></i>
                </li>
              </template>
            </draggable>

            <ul v-else class="list-group">
              <li v-for="(album, index) in albums" :key="album.id"
                class="list-group-item d-flex justify-content-between align-items-center"
                :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                <span>#{{ index + 1 }} - {{ album.title }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- Album Cards Grid -->
    <div class="row">
      <div v-if="albums.length > 0" class="col-12">
        <div class="row">
          <div v-for="album in albums" :key="album.id" class="col-md-6 mb-4">
            <div class="card shadow"
              :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
              <div class="card-body position-relative">
                <h5 class="card-title">{{ album.title }}</h5>

                <!-- Delete album button (top right) -->
                <button v-if="isOwner" @click="deleteAlbum(album.id)"
                  class="btn btn-sm btn-outline-danger position-absolute" style="top: 10px; right: 10px;"
                  title="Delete Album">
                  <i class="fas fa-trash"></i>
                </button>


                <!-- Songs List (Draggable if owner, plain list if not) -->
                <draggable v-if="isOwner" v-model="album.songs" item-key="id" :group="{ name: 'songs-' + album.id }"
                  @end="updateSongOrder(album)" tag="ul" class="list-group list-group-flush mb-3">
                  <template #item="{ element, index }">
                    <li class="list-group-item d-flex justify-content-between align-items-center"
                      :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">

                      <!-- Delete button (left side) -->
                      <div class="d-flex align-items-center">
                        <button v-if="isOwner" class="btn btn-sm btn-link text-danger my-auto px-1 me-2"
                          @click="deleteSong(element.id)" title="Delete Song">
                          <i class="fas fa-times"></i>
                        </button>
                        <span>#{{ index + 1 }} - {{ element.title }}</span>
                      </div>

                      <!-- Note/Drag icon (right side) -->
                      <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-link text-muted p-0 mx-2 my-auto" @click="openNoteModal(element)"
                          v-if="isOwner">
                          <span v-if="!element.note" class="me-1">+</span>
                          <i class="fas fa-sticky-note"></i>
                        </button>
                        <i class="fas fa-grip-lines text-muted"></i>
                      </div>
                    </li>
                  </template>

                </draggable>

                <ul v-else class="list-group list-group-flush mb-3">
                  <li v-for="(song, index) in album.songs" :key="song.id"
                    class="list-group-item d-flex justify-content-between align-items-center"
                    :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">

                    <span>#{{ index + 1 }} - {{ song.title }}</span>

                    <button class="btn btn-sm btn-link text-muted p-0" @click="openNoteModal(song)"
                      v-if="song.note && !isOwner">
                      <i class="fas fa-sticky-note"></i>
                    </button>
                  </li>

                </ul>

                <div v-if="album.songs.length === 0" class="text-muted mb-2">No songs yet</div>

                <!-- Add Song Section -->
                <div v-if="isOwner">
                  <button class="btn btn-outline btn-sm mb-2"
                    :style="{ border: 'solid 1px' + member?.themes?.dark_one }"
                    @click="album.addingSong = !album.addingSong" v-if="!album.addingSong">
                    + Add Song
                  </button>

                  <div v-if="album.addingSong" class="d-flex align-items-start gap-2">
                    <!-- Input field on the left -->
                    <input v-model="album.newSongName" placeholder="New song title" class="form-control form-control-sm"
                      :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }"
                      @keyup.enter="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false" />

                    <!-- Button group stacked vertically on the right -->
                    <div class="d-flex gap-1">
                      <button class="btn btn-sm btn-outline" :style="{ border: 'solid 1px' + member?.themes?.dark_one }"
                        @click="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false">
                        Add
                      </button>
                      <button class="btn btn-sm btn-outline" :style="{ border: 'solid 1px' + member?.themes?.dark_one }"
                        @click="album.addingSong = false">
                        Cancel
                      </button>
                    </div>
                  </div>

                </div>

              </div>

              <!-- Note Modal -->
              <div v-if="showNoteModal" class="modal fade show d-block" tabindex="-1"
                style="background: rgba(0,0,0,0.5);">
                <div class="modal-dialog">
                  <div class="modal-content"
                    :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                    <div class="modal-header">
                      <h5 class="modal-title">Song Note</h5>
                      <button type="button" class="btn-close" @click="showNoteModal = false"></button>
                    </div>
                    <div class="modal-body">
                      <p><strong>{{ currentNoteSong?.title }}</strong></p>

                      <textarea v-model="noteText" class="form-control" rows="4" :readonly="!isOwner"
                        :style="{ color: member?.themes?.dark_one }" />
                    </div>
                    <div class="modal-footer">
                      <button class="btn btn-secondary" @click="showNoteModal = false">
                        {{ isOwner ? 'Cancel' : 'Done' }}
                      </button>
                      <button v-if="isOwner" class="btn btn-primary" @click="saveNote">
                        Save
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

    <div v-if="isOwner" class="mt-4 text-end">
      <button class="btn btn-danger" @click="deleteArtist">
        Delete Artist & All Data
      </button>
    </div>


    <p v-if="error" class="text-danger mt-3">{{ error }}</p>
  </div>
</template>

<style scoped>
.list-group-item {
  cursor: grab;
}
</style>
