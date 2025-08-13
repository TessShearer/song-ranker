<!-- src/pages/ResetPassword.vue -->
<script setup>
import { ref, onBeforeMount, onBeforeUnmount, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'
import { useStore } from 'vuex'

const store = useStore()
const router = useRouter()

const password = ref('')
const errorMessage = ref('')
const isSubmitting = ref(false)
const sessionReady = ref(false)

// Hide navbar/etc while on auth page
onBeforeMount(() => {
  store.state.layout = 'auth'
  store.state.showNavbar = false
})
onBeforeUnmount(() => {
  store.state.layout = 'default'
  store.state.showNavbar = true
})

onMounted(async () => {
  // If main.js already set the session, this will be present:
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    sessionReady.value = true
    return
  }

  // Fallback: try to recover from hash if this page is loaded directly
  const hash = window.location.hash?.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const params = new URLSearchParams(hash || '')
  const access_token = params.get('access_token')
  const refresh_token = params.get('refresh_token')

  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      errorMessage.value = error.message || 'Could not validate reset link.'
      return
    }
    // Clean URL
    history.replaceState(null, '', window.location.pathname + window.location.search)
    sessionReady.value = true
  } else {
    errorMessage.value = 'This password reset link is invalid or has expired.'
  }
})

const resetPassword = async () => {
  errorMessage.value = ''
  if (!password.value || password.value.length < 6) {
    errorMessage.value = 'Please enter a password of at least 6 characters.'
    return
  }
  isSubmitting.value = true
  const { error } = await supabase.auth.updateUser({ password: password.value })
  isSubmitting.value = false

  if (error) {
    errorMessage.value = error.message
    return
  }

  // Success: send them to Sign In
  router.push('/signin')
}
</script>

<template>
  <main class="mt-0 main-content">
    <section>
      <div class="page-header min-vh-100 d-flex align-items-center">
        <div class="container">
          <div class="row">
            <div class="mx-auto col-xl-4 col-lg-5 col-md-7">
              <div class="card card-plain">
                <div class="card-header text-start pb-0">
                  <h4 class="font-weight-bolder mb-2">Reset Password</h4>
                  <p class="mb-0">Enter a new password for your account</p>
                </div>

                <div class="card-body">
                  <div v-if="!sessionReady && !errorMessage" class="text-muted">
                    Validating your reset link…
                  </div>

                  <form v-else @submit.prevent="resetPassword">
                    <div v-if="errorMessage" class="alert alert-danger py-2">
                      {{ errorMessage }}
                    </div>

                    <div class="mb-3">
                      <input
                        v-model="password"
                        type="password"
                        class="form-control form-control-lg"
                        placeholder="New password"
                        autocomplete="new-password"
                      />
                    </div>

                    <div class="text-center">
                      <button
                        class="btn btn-primary w-100"
                        :disabled="!sessionReady || isSubmitting"
                        type="submit"
                      >
                        {{ isSubmitting ? 'Saving…' : 'Reset Password' }}
                      </button>
                    </div>
                  </form>
                </div>

                <div class="card-footer text-center">
                  <router-link to="/signin">Back to Sign In</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </section>
  </main>
</template>
