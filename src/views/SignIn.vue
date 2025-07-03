<script setup>

import { ref, onMounted  } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonSwitch from "@/components/ArgonSwitch.vue";
import ArgonButton from "@/components/ArgonButton.vue";

const router = useRouter()

// Form state
const email = ref('')
const password = ref('')
const errorMessage = ref('')

// Login function
const signIn = async () => {
  errorMessage.value = ''

  const { data, error } = await supabase.auth.signInWithPassword({
  email: email.value,
  password: password.value
})

  if (error) {
    errorMessage.value = error.message
  } else {
    console.log('Login successful:', data.user)
    await router.push('/dashboard-default')
  }
}

onMounted(async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (!sessionError && sessionData.session) {
    router.push('/dashboard-default')
    return
  }
})

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
                  <h4 class="font-weight-bolder">Sign In</h4>
                  <p class="mb-0">Enter your email and password to sign in</p>
                </div>
                <div class="card-body">
                  <form role="form" @submit.prevent="signIn">
                    <div class="mb-3">
                      <argon-input v-model="email" id="email" type="email" placeholder="email" name="email"
                        size="lg" />
                    </div>
                    <div class="mb-3">
                      <argon-input v-model="password" id="password" type="password" placeholder="Password"
                        name="password" size="lg" />
                    </div>
                    <argon-switch id="rememberMe" name="remember-me">Remember me</argon-switch>

                    <div class="text-center">
                      <argon-button class="mt-4" variant="gradient" color="success" fullWidth size="lg"
                        >Sign in</argon-button>
                    </div>

                    <div v-if="errorMessage" class="text-danger mt-2 text-sm">
                      {{ errorMessage }}
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
