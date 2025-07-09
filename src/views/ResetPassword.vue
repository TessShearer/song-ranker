<script setup>
import { ref, onBeforeMount, onBeforeUnmount } from 'vue'
import { supabase } from '@/supabaseClient'
import { useRouter } from 'vue-router'
import { useStore } from "vuex"

import ArgonInput from "@/components/ArgonInput.vue"
import ArgonButton from "@/components/ArgonButton.vue"

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

const resetPassword = async () => {
    errorMessage.value = ''

    const { error } = await supabase.auth.updateUser({
        password: password.value
    })

    if (error) {
        errorMessage.value = error.message
        return
    }

    await router.push('/signin')
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
                                    <p class="mb-0">Enter your new password</p>
                                </div>
                                <div class="card-body">
                                    <form role="form" @submit.prevent="resetPassword">
                                        <div class="mb-3">
                                            <argon-input v-model="password" id="password" type="password"
                                                placeholder="Password" name="password" size="lg" />
                                        </div>
                                        <div class="text-center">
                                            <argon-button class="custom-login-btn mt-4" fullWidth size="lg">Reset
                                                Password</argon-button>
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
