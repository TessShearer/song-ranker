<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'

const user = ref(null)
const username = ref('')
const themes = ref([])
const selectedThemeId = ref(null)
const isPrivate = ref(false) // New privacy toggle
const error = ref('')
const success = ref('')

onMounted(async () => {
  // Get current user
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    error.value = 'User not found.'
    return
  }

  user.value = userData.user
  username.value = user.value.user_metadata?.full_name || ''

  // Load themes from Supabase
  const { data: themesData, error: themesError } = await supabase.from('themes').select('*')

  if (themesError) {
    error.value = 'Failed to load themes.'
  } else {
    themes.value = themesData
  }
})

// Submit member to Supabase
const submitMember = async () => {
  error.value = ''
  success.value = ''

  if (!selectedThemeId.value || !username.value.trim()) {
    error.value = 'Please choose a theme and enter a username.'
    return
  }

  const { error: insertError } = await supabase.from('members').insert([
    {
      member_id: user.value.id,
      member_name: username.value,
      theme_id: selectedThemeId.value,
      is_private: isPrivate.value // Send privacy value
    }
  ])

  if (insertError) {
    error.value = insertError.message
  } else {
    success.value = 'Member profile created successfully!'
    window.location.reload()
  }
}
</script>

<template>
  <div class="card bg-transparent shadow-xl p-4">
    <h4 class="mb-3">Before we get started please create your profile - these settings can be changed at any time.</h4>

    <div class="mb-3">
      <label class="form-label">Username</label>
      <input v-model="username" type="text" class="form-control" placeholder="Enter a username" />
    </div>

    <div class="form-check form-switch mb-3">
      <input class="form-check-input" type="checkbox" id="privacySwitch" v-model="isPrivate" />
      <label class="form-check-label" for="privacySwitch">
        Make my profile private - If you choose this option your rankings will not be visible to others
      </label>
    </div>


    <div class="mb-3">
      <label class="form-label">Choose a Theme</label>
      <div v-if="themes.length > 0">
        <div v-for="theme in themes" :key="theme.id" class="form-check">
          <input class="form-check-input" type="radio" :id="`theme-${theme.id}`" :value="theme.id"
            v-model="selectedThemeId" />
          <label class="form-check-label" :for="`theme-${theme.id}`">
            {{ theme.title }}
          </label>
        </div>
      </div>
      <div v-else class="text-muted">Loading themes...</div>
    </div>

    <div class="text-end">
      <button class="btn btn-primary" @click="submitMember">Okay</button>
    </div>

    <div v-if="error" class="text-danger mt-3">{{ error }}</div>
    <div v-if="success" class="text-success mt-3">{{ success }}</div>
  </div>
</template>
