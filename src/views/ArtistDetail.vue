<script setup>
import { ref, onMounted, computed } from 'vue'
import { useStore } from 'vuex'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import draggable from 'vuedraggable'
import ArtistRankingCard from './components/ArtistRankingCard.vue'
import trash from '@/assets/img/icons/trash.png'
import note from '@/assets/img/icons/note.png'
import menu from '@/assets/img/icons/menu.png'

const store = useStore()
const route = useRoute()
const router = useRouter()
const memberId = route.params.memberId
const artistId = route.params.artistId
const showModal = ref(false)
const modalMessage = ref('')
const modalAction = ref(null)

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
const toastMessage = ref('')
const showToast = ref(false)

function showToastMessage(message, timeout = 3000) {
  toastMessage.value = message
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
    toastMessage.value = ''
  }, timeout)
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

function showConfirmModal(message, action) {
  modalMessage.value = message
  modalAction.value = () => {
    action()
    closeModal()
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  modalMessage.value = ''
  modalAction.value = null
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

const deleteArtist = () => {
  showConfirmModal(
    'Are you sure you want to delete this artist? This will permanently delete all albums and songs associated with them.',
    async () => {
      await deleteArtistConfirmed()
    }
  )
}

const deleteArtistConfirmed = async () => {
  const { error: songError } = await supabase
    .from('songs')
    .delete()
    .eq('artist_id', artistId)

  if (songError) {
    error.value = 'Error deleting songs: ' + songError.message
    return
  }

  const { error: albumError } = await supabase
    .from('albums')
    .delete()
    .eq('artist_id', artistId)

  if (albumError) {
    error.value = 'Error deleting albums: ' + albumError.message
    return
  }

  const { error: artistError } = await supabase
    .from('artists')
    .delete()
    .eq('id', artistId)

  if (artistError) {
    error.value = 'Error deleting artist: ' + artistError.message
    return
  }

  showToastMessage('Artist deleted successfully.')
  router.push(`/`)
}


const deleteAlbum = (albumId) => {
  showConfirmModal('Are you sure you want to delete this album? This will permanently delete the album and all its songs.', async () => {
    await deleteAlbumConfirmed(albumId)
    showToastMessage('Album deleted successfully.')
  })
}

async function deleteAlbumConfirmed(albumId) {
  const { error: songError } = await supabase
    .from('songs')
    .delete()
    .eq('album_id', albumId)

  if (songError) {
    error.value = 'Error deleting songs: ' + songError.message
    return
  }

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
            <div class="row align-items-center">
              <div class="col-12 col-md-6">
                <h5 class="card-title mb-2 mb-md-0">Album Ranking</h5>
              </div>

              <div class="col-12 col-md-6 text-md-end">
                <!-- Add album button -->
                <div v-if="isOwner && !showAlbumInput">
                  <button class="btn ombre-overlay"
                    :style="{ backgroundColor: member?.themes?.dark_two, color: member?.themes?.light_one }"
                    @click="showAlbumInput = true">
                    + Add Album
                  </button>
                </div>

                <!-- Album input form -->
                <div v-else-if="isOwner" class="mt-2 mt-md-0">
                  <input v-model="newAlbumName" type="text" class="form-control mb-2" placeholder="New album name"
                    :style="{ backgroundColor: member?.themes?.light_two + 'CC', color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }" />
                  <div class="d-flex justify-content-end gap-2">
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
            </div>


            <!-- Draggable or read-only list -->
            <draggable v-if="isOwner" v-model="albums" item-key="id" @end="updateAlbumOrder" tag="ul"
              class="list-group">
              <template #item="{ element, index }">
                <li class="list-group-item d-flex justify-content-between align-items-center"
                  :style="{ backgroundColor: member?.themes?.light_one, color: member?.themes?.dark_one }">
                  <span>#{{ index + 1 }} - {{ element.title }}</span>
                  <img :src="menu" alt="move" class="img-fluid" style="max-height: 12px;" />
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
                  <img :src="trash" alt="Delete" class="img-fluid" style="max-height: 18px;" />
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
                          <img :src="trash" alt="trash" class="img-fluid" style="max-height: 12px; min-height: 12px; max-width: 12px; min-width: 12px" />
                        </button>
                        <span>#{{ index + 1 }} - {{ element.title }}</span>
                      </div>

                      <!-- Note/Drag icon (right side) -->
                      <div class="d-flex align-items-center gap-2">
                        <button class="btn btn-sm btn-link text-muted p-0 mx-2 my-auto" @click="openNoteModal(element)"
                          v-if="isOwner">
                          <span v-if="!element.note" class="me-1">+</span>
                          <img :src="note" alt="note" class="img-fluid" style="max-height: 18px;" />
                        </button>
                        <img :src="menu" alt="move" class="img-fluid" style="max-height: 12px;" />
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
                      <img :src="note" alt="note" class="img-fluid" style="max-height: 18px;" />
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

                  <div v-if="album.addingSong">
                    <!-- Input field on top -->
                    <input v-model="album.newSongName" placeholder="New song title"
                      class="form-control form-control-sm mb-2"
                      :style="{ backgroundColor: 'white', color: member?.themes?.dark_one, border: 'solid 1px' + member?.themes?.dark_one }"
                      @keyup.enter="addSong(album.id, album.newSongName); album.newSongName = ''; album.addingSong = false" />

                    <!-- Button group below -->
                    <div class="d-flex justify-content-start gap-2">
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

  <div v-if="showToast" class="toast-message">
    {{ toastMessage }}
  </div>


  <div v-if="showModal" class="modal-overlay">
    <div class="modal-card">
      <h5>Are you sure?</h5>
      <p>{{ modalMessage }}</p>
      <div class="text-end">
        <button class="btn btn-secondary me-2" @click="closeModal">Cancel</button>
        <button class="btn btn-danger" @click="modalAction">Confirm</button>
      </div>
    </div>
  </div>

</template>

<style scoped>
.list-group-item {
  cursor: grab;
}
</style>
