<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import ArtistAddCard from '../../examples/Cards/ArtistAddCard.vue'
import { supabase } from "@/supabaseClient";

const props = defineProps({
  memberMusicId: String,
  theme: Object,
  isOwner: Boolean
})

const artists = ref([])
const error = ref(null)
const loading = ref(false)
const showArtistModal = ref(false)

// Computed theme styles
const buttonStyle = computed(() => ({
  backgroundColor: props.theme?.dark_two || '#198754',
  color: props.theme?.light_one || '#fff'
}))
const tableTextColor = computed(() => props.theme?.dark_one || '#000')
const tableBackground = computed(() => props.theme?.light_one || '#fff')

onMounted(() => {
  if (props.memberMusicId) fetchArtists()
})

watch(() => props.memberMusicId, (newId) => {
  if (newId) fetchArtists()
})

const fetchArtists = async () => {
  loading.value = true
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
  loading.value = false
}

const handleArtistAdded = () => {
  showArtistModal.value = false
  fetchArtists()
}
</script>

<template>
  <div>
    <div class="mb-3" v-if="isOwner">
      <button class="btn btn-large font-large ombre-overlay mt-n8" @click="showArtistModal = true" :style="buttonStyle">
        + &nbsp; Add Artist
      </button>
    </div>

    <ArtistAddCard
      v-if="showArtistModal"
      :memberMusicId="memberMusicId"
      @cancel="showArtistModal = false"
      @added="handleArtistAdded"
    />

    <div class="card mt-n6" :style="{ backgroundColor: tableBackground }">
      <div class="card-body px-0 pt-0 pb-2">
        <div class="table-responsive p-0">
          <table class="table align-items-center mb-0">
            <thead>
              <tr>
                <th :style="{ color: tableTextColor }">Artist</th>
                <th :style="{ color: tableTextColor }">Albums</th>
                <th :style="{ color: tableTextColor }">Songs</th>
                <th>Rankings</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-if="loading"
                class="text-center"
              >
                <td colspan="4" class="py-4">
                  <em>Loading artists...</em>
                </td>
              </tr>

              <tr
                v-for="artist in artists"
                :key="artist.id"
                style="cursor: pointer;"
                class="table-row-hover"
                :style="{ backgroundColor: tableBackground, color: props.theme?.dark_one, }"
              >
                <td>{{ artist.name }}</td>
                <td>{{ artist.albumCount }} Album{{ artist.albumCount !== 1 ? 's' : '' }}</td>
                <td>{{ artist.songCount }} Song{{ artist.songCount !== 1 ? 's' : '' }}</td>
                <td>
                  <button
                    class="btn ombre-overlay"
                    @click="$router.push(`/artists/${memberMusicId}/${artist.id}`)"
                    :style="{ backgroundColor: props.theme?.dark_two, color: props.theme?.light_one }"
                  >
                    {{ isOwner ? 'Rank' : 'View Rankings' }}
                  </button>
                </td>
              </tr>

              <tr v-if="!loading && artists.length === 0">
                <td colspan="4" class="text-center py-3 text-muted">
                  No artists found.
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
