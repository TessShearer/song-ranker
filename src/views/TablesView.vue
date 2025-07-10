<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { supabase } from '@/supabaseClient'
import ArtistsTable from './components/ArtistsTable.vue'
import { useRouter } from 'vue-router'


const route = useRoute()
const store = useStore()
const router = useRouter()

const loggedInUser = computed(() => store.state.user)
const musicId = computed(() => route.params.memberId)

const member = ref(null)
const isOwner = ref(false)

const loadMember = async (userId) => {
  const { data: memberData, error } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('music_id', musicId.value)
    .or(`is_private.eq.false,member_id.eq.${userId}`)
    .single()

  if (!error && memberData) {
    member.value = memberData
    isOwner.value = userId === memberData.member_id
    store.commit('setTheme', memberData.themes)
    store.commit('setThemeSource', isOwner.value ? 'self' : 'viewed')
  } else {
    // Redirect to /forbidden if user can't view the member
    router.push('/forbidden')
  }
}

// Watch for user becoming available after a refresh
watch(loggedInUser, async (user) => {
  if (user?.id) {
    await loadMember(user.id)
  }
}, { immediate: true })

// Watch for route changing
watch(musicId, async () => {
  if (loggedInUser.value?.id) {
    await loadMember(loggedInUser.value.id)
  }
})

// Optional fallback if store.user is null after reload
onMounted(async () => {
  if (!loggedInUser.value) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      store.commit('setUser', userData.user)
      await loadMember(userData.user.id)
    }
  }
})
</script>



<template>
  <div v-if="member" class="container-fluid">
    <div class="page-header min-height-200" :style="{
    backgroundImage: member?.themes?.header ? `url(${member.themes.header})` : '',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    marginRight: '-24px',
    marginLeft: '-34%',
    marginTop: '-5%',
    position: 'relative'
  }">
      <span class="mask" :style="{
    backgroundColor: member?.themes?.dark_one || '#000',
    opacity: 0.3,
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  }"></span>
    </div>
    <div class="row">
      <div class="col-12">
        <artists-table :memberMusicId="member?.music_id" :theme="member?.themes" :isOwner="isOwner" />
      </div>
    </div>
  </div>
</template>
