<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import ArtistAddCard from '../../examples/Cards/ArtistAddCard.vue'

const artists = ref([])
const error = ref(null)
const showArtistModal = ref(false)
const memberMusicId = ref(null)

onMounted(async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError || !userData.user) {
    error.value = 'User not found.'
    return
  }

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('music_id')
    .eq('member_id', userData.user.id)
    .single()

  if (memberError || !memberData) {
    error.value = 'Member not found.'
    return
  }

  memberMusicId.value = memberData.music_id
  fetchArtists()
})

const fetchArtists = async () => {
  const { data: artistData, error: artistError } = await supabase
    .from('artists')
    .select(`
      *,
      albums:albums(count),
      songs:songs(count)
    `)
    .eq('member_id', memberMusicId.value)

  if (artistError) {
    error.value = artistError.message
  } else {
    artists.value = artistData.map(artist => ({
      id: artist.id,
      name: artist.name,
      albumCount: artist.albums[0]?.count || 0,
      songCount: artist.songs[0]?.count || 0,
    }))
  }
}

const handleArtistAdded = () => {
  showArtistModal.value = false
  fetchArtists()
}
</script>

<template>
  <div class="card mb-3">
    <div class="card-body px-3 py-2">
      <h6>You can add artists whose songs you want to rank here.</h6>
    </div>
  </div>

  <div class="mb-3">
    <button class="btn btn-large btn-success font-large" @click="showArtistModal = true">+ &nbsp; Add Artist</button>
  </div>

  <ArtistAddCard v-if="showArtistModal" :memberMusicId="memberMusicId" @cancel="showArtistModal = false"
    @added="handleArtistAdded" />

  <div class="card">
    <div class="card-body px-0 pt-0 pb-2">
      <div class="table-responsive p-0">
        <table class="table align-items-center mb-0">
          <thead>
            <tr>
              <th>Artist</th>
              <th>Albums</th>
              <th>Songs</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="artist in artists" :key="artist.id" @click="$router.push(`/artists/${artist.id}`)"
              style="cursor: pointer;" class="table-row-hover">
              <td>{{ artist.name }}</td>
              <td>{{ artist.albumCount }} Album{{ artist.albumCount !== 1 ? 's' : '' }}</td>
              <td>{{ artist.songCount }} Song{{ artist.songCount !== 1 ? 's' : '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-row-hover:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
