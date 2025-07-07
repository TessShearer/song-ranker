<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'

const store = useStore()
const router = useRouter()

// Pull from Vuex store
const isRTL = computed(() => store.state.isRTL)
const user = computed(() => store.state.user)
const member = computed(() => store.state.member)
const userName = computed(() => user.value?.user_metadata?.full_name || user.value?.email || 'Guest')

// Handle logout and clear Vuex state
const handleLogout = async () => {
  await supabase.auth.signOut()
  store.commit('clearAuth')
  router.push('/signin')
}

</script>

<template>
  <nav class="navbar navbar-main navbar-expand-lg px-0 m-4 shadow border-radius-xl" :class="[
      isRTL ? 'top-0 position-sticky z-index-sticky' : '',
      'position-sticky w-100'
    ]" :style="{
      backgroundColor: member?.themes?.light_one || '#ffffff',
      zIndex: 1050
    }" id="navbarBlur" data-scroll="true">
    <div class="px-3 py-1 container-fluid d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">Welcome, {{ userName }}</h6>
      </div>
      <div>
        <button class="btn btn-outline-info btn-sm my-1 mx-4" :style="{
      borderColor: member?.themes?.dark_two || '#17a2b8',
      color: member?.themes?.dark_two || '#17a2b8'
    }" @click="handleLogout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
