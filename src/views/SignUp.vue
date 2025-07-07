<script setup>
import { ref } from 'vue'
// import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'

import Navbar from "@/examples/PageLayout/NavbarLayout.vue";
import AppFooter from "@/examples/PageLayout/FooterLayout.vue";
import ArgonInput from "@/components/ArgonInput.vue";
import ArgonButton from "@/components/ArgonButton.vue";

// Form state
const name = ref('')
const email = ref('')
const password = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// const router = useRouter()

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
    successMessage.value = 'Signup successful! Please check your email to confirm your account.'
    console.log('User signed up:', data)
    // Optionally redirect after a delay
    // setTimeout(() => router.push('/signin'), 2000)
    const { user } = data

    if (!user) {
      errorMessage.value = "User not available yet, please confirm your email first."
      return
    }

    console.log('Signed up user:', user)


  }
}
</script>

<template>
  <div class="container top-0 position-sticky z-index-sticky">
    <div class="row">
      <div class="col-12">
        <navbar isBtn="bg-gradient-light" />
      </div>
    </div>
  </div>
  <main class="main-content mt-0">
    <div class="container">
          <div class="card z-index-0">
            <div class="card-body">
              <form role="form">
                <argon-input v-model="name" id="name" type="text" placeholder="Name" aria-label="Name" />
                <argon-input v-model="email" id="email" type="email" placeholder="Email" aria-label="Email" />
                <argon-input v-model="password" id="password" type="password" placeholder="Password"
                  aria-label="Password" />
                <div class="text-center">
                  <argon-button fullWidth color="dark" variant="gradient" class="my-4 mb-2" @click.prevent="signUp">
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
  </main>
  <app-footer />
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
</style>
