<script setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import { useStore } from 'vuex'

import ArgonInput from "@/components/ArgonInput.vue"
import ArgonButton from "@/components/ArgonButton.vue"

const store = useStore()
const router = useRouter()

// Form state
const name = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// Hide layout elements while on auth page
onBeforeMount(() => {
  store.state.layout = 'auth'
  store.state.showNavbar = false
})

onBeforeUnmount(() => {
  store.state.layout = 'default'
  store.state.showNavbar = true
})

// Redirect if already logged in
onMounted(async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (!sessionError && sessionData.session) {
    await store.dispatch('fetchUser')
    router.push('/dashboard-default')
  }
})

// Sign up handler
const signUp = async () => {
  errorMessage.value = ''
  successMessage.value = ''

  const { data, error } = await supabase.auth.signUp({
    email: email.value,
    password: password.value,
    options: {
      data: {
        full_name: name.value
      }
    }
  })

  if (error) {
    errorMessage.value = error.message
  } else {
    const { user } = data
    if (!user) {
      errorMessage.value = "Signup successful. Please confirm your email before logging in."
      return
    }

    successMessage.value = 'Signup successful! Please check your email to confirm your account.'
    console.log('User signed up:', user)
  }
}
</script>

<template>
  <main class="mt-0 main-content">
    <section>
      <div class="page-header min-vh-100">
        <div class="container">
          <div class="row">
            <div class="mx-auto col-xl-4 col-lg-5 col-md-7 d-flex flex-column mx-lg-0">
              <div class="card card-plain">
                <div class="pb-0 card-header text-start">
                  <h4 class="font-weight-bolder">Sign Up</h4>
                  <p class="mb-0">Create your account below</p>
                </div>
                <div class="card-body">
                  <form role="form">
                    <argon-input
                      v-model="name"
                      id="name"
                      type="text"
                      placeholder="Name"
                      aria-label="Name"
                    />
                    <argon-input
                      v-model="email"
                      id="email"
                      type="email"
                      placeholder="Email"
                      aria-label="Email"
                    />
                    <argon-input
                      v-model="password"
                      id="password"
                      type="password"
                      placeholder="Password"
                      aria-label="Password"
                    />
                    <div class="text-center">
                      <argon-button
                        fullWidth
                        class="my-4 mb-2 custom-signup-btn"
                        @click.prevent="signUp"
                      >
                        Sign up
                      </argon-button>
                    </div>

                    <p v-if="errorMessage" class="text-danger text-sm text-center">{{ errorMessage }}</p>
                    <p v-if="successMessage" class="text-success text-sm text-center">{{ successMessage }}</p>

                    <p class="text-sm mt-3 mb-0">
                      Already have an account?
                      <router-link to="/signin" class="text-primary fw-bold">Sign In!</router-link>
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.custom-signup-btn {
  background: linear-gradient(135deg, #aa28c1, #6834c9);
  color: white;
  border: none;
}
.custom-signup-btn:hover {
  opacity: 0.95;
}
</style>
