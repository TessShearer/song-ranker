<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import MasterCard from "@/examples/Cards/MasterCard.vue"

const user = ref(null)
const error = ref(null)
const member = ref([])
const router = useRouter()

onMounted(async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    router.push('/signin')
    return
  }

  const { data: userData, error: userError } = await supabase.auth.getUser()

  if (userError) {
    error.value = userError.message
  } else {
    user.value = userData.user

    if (user.value?.id) {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('member_id', user.value.id)

      if (memberError) {
        error.value = memberError.message
      } else {
        member.value = memberData
      }
    }
  }
})

</script>

<template>
  <div class="py-4 container-fluid">

    <!-- If no member exists, show MasterCard only -->
    <div v-if="user && member.length === 0">
      <MasterCard />
    </div>

    <!-- If member exists, show full dashboard -->
    <div v-else-if="user && member.length > 0">
      <h5>Member Info:</h5>
      <ul class="list-group mb-4">
        <li v-for="(value, key) in member[0]" :key="key" class="list-group-item">
          {{ key }}: {{ value }}
        </li>
      </ul>

      <div class="row">
        <div class="col-lg-12">
          <h2 class="mb-4">Dashboard</h2>

          <p><strong>Email:</strong> {{ user.email }}</p>
          <p><strong>Name:</strong> {{ user.user_metadata?.full_name || 'N/A' }}</p>
          <p><strong>All:</strong> {{ user || 'N/A' }}</p>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error">
      <p class="text-danger">{{ error }}</p>
    </div>

    <!-- Loading -->
    <div v-else>
      <p>Loading user info...</p>
    </div>
  </div>
</template>
