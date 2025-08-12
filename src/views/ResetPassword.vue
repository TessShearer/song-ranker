<script setup>
import { ref, onBeforeMount, onBeforeUnmount, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()

const password = ref('')
const errorMessage = ref('')

// Hide navbar/footer/etc while on auth page
onBeforeMount(() => {
  store.state.layout = 'auth'
  store.state.showNavbar = false
})
onBeforeUnmount(() => {
  store.state.layout = 'default'
  store.state.showNavbar = true
})

onMounted(async () => {
  // If no session, try to set it from the hash
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const access_token = hash.get('access_token')
    const refresh_token = hash.get('refresh_token')

    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token })
      if (error) {
        errorMessage.value = error.message
      }
    } else {
      errorMessage.value = 'This password reset link is invalid or has expired.'
    }
  }
})

const resetPassword = async () => {
  errorMessage.value = ''

  const { error } = await supabase.auth.updateUser({ password: password.value })

  if (error) {
    errorMessage.value = error.message
    return
  }

  await router.push('/signin')
}
</script>
