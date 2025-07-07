<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useStore } from 'vuex'
import { supabase } from '@/supabaseClient'
import ArtistsTable from './components/ArtistsTable.vue'

const route = useRoute()
const store = useStore()

const memberId = route.params.memberId
const loggedInUser = computed(() => store.state.user)

const member = ref(null)
const isOwner = ref(false)

onMounted(async () => {
  // Don't fetch unless we know the user is logged in
  if (!loggedInUser.value?.id) return

  // Fetch member data for the viewed profile
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', memberId)
    .single()

  if (!memberError && memberData) {
    member.value = memberData
    isOwner.value = loggedInUser.value.id === memberData.member_id
  }
})
</script>

<template>
  <div class="container-fluid">
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
        opacity: 0.6,
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      }"></span>
    </div>

    <div class="row">
      <div class="col-12">
        <artists-table
          :memberMusicId="member?.music_id"
          :theme="member?.themes"
          :isOwner="isOwner"
        />
      </div>
    </div>
  </div>
</template>
