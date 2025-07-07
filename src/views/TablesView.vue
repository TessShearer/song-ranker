<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRoute } from 'vue-router'
import ArtistsTable from './components/ArtistsTable.vue'

const route = useRoute()
const memberId = route.params.memberId

const member = ref(null)
const loggedInUserId = ref(null)
const isOwner = ref(false)

onMounted(async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData?.user) return

  loggedInUserId.value = userData.user.id

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', memberId)
    .single()

  if (!memberError && memberData) {
    member.value = memberData
    isOwner.value = loggedInUserId.value === memberData.member_id
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
