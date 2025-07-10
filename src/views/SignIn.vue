<script setup>
import { ref, onMounted, onBeforeMount, onBeforeUnmount } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'
import { useStore } from "vuex"

import ArgonInput from "@/components/ArgonInput.vue"
import ArgonSwitch from "@/components/ArgonSwitch.vue"
import ArgonButton from "@/components/ArgonButton.vue"

const store = useStore()
const router = useRouter()

const email = ref('')
const premail = ref('')
const password = ref('')
const errorMessage = ref('')
const passwordResetRequest = ref(false)

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
  // Check if store already has user
  if (store.state.user) {
    router.push('/')
    return
  }

  // Otherwise check Supabase
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (!sessionError && sessionData.session) {
    await store.dispatch('fetchUser') // populate store.user + store.member
    router.push('/')
  }
})

const signIn = async () => {
  errorMessage.value = ''

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value
  })

  if (error) {
    errorMessage.value = error.message
    return
  }

  const user = data.user

  // Commit user to store
  store.commit('setUser', user)

  // Fetch member data
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', user.id)
    .single()

  if (!memberError && memberData) {
    store.commit('setMember', memberData)
  }

  await router.push('/')
}

const resetPassword = async () => {
  errorMessage.value = ''

  const { error } = await supabase.auth.resetPasswordForEmail(premail.value, {  redirectTo: 'http://localhost:8080/resetpassword'})

  if (error) {
    errorMessage.value = error.message
  } else {
    passwordResetRequest.value = false
    alert("Check your email for a reset link.")
  }
}


</script>

<template>
  <main class="mt-0 main-content">
    <section>
      <div class="page-header min-vh-100">
        <div class="container">
          <div class="row">

            <div v-if="!passwordResetRequest" class="mx-auto col-xl-4 col-lg-5 col-md-7 d-flex flex-column mx-lg-0">
              <div class="card card-plain">
                <div class="pb-0 card-header text-start">
                  <h4 class="font-weight-bolder">Sign In</h4>
                  <p class="mb-0">Enter your email and password to sign in</p>
                </div>
                <div class="card-body">
                  <form role="form" @submit.prevent="signIn">
                    <div class="mb-3">
                      <argon-input v-model="email" id="email" type="email" placeholder="email" name="email" size="lg" />
                    </div>
                    <div class="mb-3">
                      <argon-input v-model="password" id="password" type="password" placeholder="Password"
                        name="password" size="lg" />
                    </div>
                    <argon-switch id="rememberMe" name="remember-me">Remember me</argon-switch>

                    <div class="text-center">
                      <argon-button class="custom-login-btn mt-4" fullWidth size="lg">Sign in</argon-button>
                    </div>

                    <div v-if="errorMessage" class="text-danger mt-2 text-sm">
                      {{ errorMessage }}
                    </div>

                    <div class="pt-3">
                      <p>
                        Don't have an account?
                        <router-link @click="resetPassword" to="/signup" class="text-primary fw-bold">Sign
                          Up!</router-link>
                      </p>
                    </div>

                    <div>
                      <p>
                        Forgot Password?
                        <span @click="passwordResetRequest = true" class="text-primary fw-bold pointer">Reset</span>
                      </p>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            <div v-else-if="passwordResetRequest" class="mx-auto col-xl-4 col-lg-5 col-md-7 d-flex flex-column mx-lg-0">
              <div class="card card-plain">
                <div class="pb-0 card-header text-start">
                  <h4 class="font-weight-bolder">Password Reset</h4>
                  <p class="mb-0">Enter your email to receive a password reset link</p>
                </div>
                <div class="card-body">
                  <form role="form" @submit.prevent="resetPassword">
                    <div class="mb-3">
                      <argon-input v-model="premail" id="premail" type="premail" placeholder="email" name="premail" size="lg" />
                    </div>

                    <div class="text-center">
                      <argon-button class="custom-login-btn mt-4" fullWidth size="lg">Send Password Reset Email</argon-button>
                    </div>

                    <div v-if="errorMessage" class="text-danger mt-2 text-sm">
                      {{ errorMessage }}
                    </div>

                    <div class="mt-4">
                      <p>
                        <span @click="passwordResetRequest = false" class="text-primary fw-bold pointer">Back</span>
                      </p>
                    </div>

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
.custom-login-btn {
  background: linear-gradient(135deg, #aa28c1, #6834c9);
  color: white;
  border: none;
}

.custom-login-btn:hover {
  opacity: 0.95;
}

.pointer {
  cursor: pointer;
}
</style>
