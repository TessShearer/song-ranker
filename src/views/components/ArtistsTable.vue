<script setup>
import { ref, onMounted, watch } from 'vue'
import ArtistAddCard from '../../examples/Cards/ArtistAddCard.vue'
import { supabase } from "@/supabaseClient";

const props = defineProps({
  memberMusicId: String,
  theme: Object,
  isOwner: Boolean
})

const artists = ref([])
const error = ref(null)
const showArtistModal = ref(false)

onMounted(() => {
  if (props.memberMusicId) fetchArtists()
})

watch(() => props.memberMusicId, (newId) => {
  if (newId) fetchArtists()
})

const fetchArtists = async () => {
  const { data, error: artistError } = await supabase
    .from('artists')
    .select(`
      *,
      albums:albums(count),
      songs:songs(count)
    `)
    .eq('member_id', props.memberMusicId)

  if (artistError) {
    error.value = artistError.message
  } else {
    artists.value = data.map(artist => ({
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
  <div>
    <div class="mb-3" v-if="isOwner">
      <button class="btn btn-large font-large" @click="showArtistModal = true" :style="{
      backgroundColor: theme?.dark_two || '#198754',
      color: theme?.light_one || '#fff'
    }">
        + &nbsp; Add Artist
      </button>
    </div>

    <ArtistAddCard v-if="showArtistModal" :memberMusicId="memberMusicId" @cancel="showArtistModal = false"
      @added="handleArtistAdded" />

    <div class="card" :style="{ backgroundColor: theme?.light_one || '#fff' }">
      <div class="card-body px-0 pt-0 pb-2">
        <div class="table-responsive p-0">
          <table class="table align-items-center mb-0">
            <thead>
              <tr>
                <th :style="{ color: theme?.dark_one || '#000' }">Artist</th>
                <th :style="{ color: theme?.dark_one || '#000' }">Albums</th>
                <th :style="{ color: theme?.dark_one || '#000' }">Songs</th>
                <th>Rankings</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="artist in artists" :key="artist.id" style="cursor: pointer;" class="table-row-hover" :style="{
      backgroundColor: theme?.light_one,
      color: theme?.dark_one
    }">
                <td>{{ artist.name }}</td>
                <td>{{ artist.albumCount }} Album{{ artist.albumCount !== 1 ? 's' : '' }}</td>
                <td>{{ artist.songCount }} Song{{ artist.songCount !== 1 ? 's' : '' }}</td>
                <td>
                  <button class="btn" @click="$router.push(`/artists/${memberMusicId}/${artist.id}`)" :style="{
      backgroundColor: theme?.light_two,
      color: theme?.dark_one
    }">
                    {{ isOwner ? 'Rank' : 'View Rankings' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.table-row-hover:hover {
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
