<script setup>
import { computed, ref, onMounted } from "vue"
import { useStore } from "vuex"
import { supabase } from "@/supabaseClient"
import { useRouter } from 'vue-router'

const router = useRouter()
const store = useStore()
const isRTL = computed(() => store.state.isRTL)

const userName = ref(null)
const member = ref(null)

onMounted(async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (!userError && userData.user) {
    userName.value = userData.user.user_metadata?.full_name || userData.user.email

    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .select('*, themes(*)')
      .eq('member_id', userData.user.id)
      .single()

    if (!memberError && memberData) {
      member.value = memberData
    }
  }
})

// Logout handler
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/signin')
}
</script>

<template>
  <nav
    class="navbar navbar-main navbar-expand-lg px-0 m-4 shadow border-radius-xl"
    :class="[
      isRTL ? 'top-0 position-sticky z-index-sticky' : '',
      'position-sticky w-100'
    ]"
    :style="{
      backgroundColor: member?.themes?.light_one || '#ffffff',
      zIndex: 1050 // Bootstrap modal z-index is 1050, ensure we're above most content
    }"
    id="navbarBlur"
    data-scroll="true"
  >
    <div class="px-3 py-1 container-fluid d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">Welcome, {{ userName || 'Guest' }}</h6>
      </div>
      <div>
        <button
          class="btn btn-outline-info btn-sm my-1 mx-4"
          :style="{
            borderColor: member?.themes?.dark_two || '#17a2b8',
            color: member?.themes?.dark_two || '#17a2b8'
          }"
          @click="handleLogout"
        >
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
