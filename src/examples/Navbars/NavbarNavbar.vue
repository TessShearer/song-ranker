<script setup>
import { computed, ref, onMounted } from "vue"
import { useStore } from "vuex"
import { supabase } from "@/supabaseClient"
import { useRouter } from 'vue-router'
const router = useRouter()

const store = useStore()
const isRTL = computed(() => store.state.isRTL)

const userName = ref(null)

onMounted(async () => {
  const { data, error } = await supabase.auth.getUser()

  if (!error && data.user) {
    userName.value = data.user.user_metadata?.full_name || data.user.email
  }
})

// Logout handler
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/signin')
}
</script>

<template>
  <nav class="navbar navbar-main navbar-light navbar-expand-lg px-0 m-4 shadow-none border-radius-xl"
    :class="isRTL ? 'top-0 position-sticky z-index-sticky' : ''" v-bind="$attrs" id="navbarBlur" data-scroll="true">
    <div class="px-3 py-1 container-fluid d-flex justify-content-between align-items-center">
      <div>
        <h6 class="mb-0">Welcome, {{ userName || 'Guest' }}</h6>
      </div>
      <div>
        <button class="btn btn-outline-info btn-sm" @click="handleLogout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
