<script setup>
import { useStore } from 'vuex'
import { supabase } from '@/supabaseClient'
import { ref, onMounted, computed } from 'vue'

const store = useStore()

const user = computed(() => store.state.user)
const signedInMember = computed(() => store.state.member)
const error = ref(null)

onMounted(async () => {
  // Restore user and member if not already in store
  if (!user.value) {
    const { data: userData } = await supabase.auth.getUser()
    if (userData?.user) {
      store.commit('setUser', userData.user)
    }
  }

  if (!signedInMember.value) {
    const { data: currentMemberData, error: memberError } = await supabase
      .from('members')
      .select('*')
      .eq('member_id', user.value?.id)
      .single()

    if (currentMemberData) {
      store.commit('setMember', currentMemberData)
    } else if (memberError) {
      error.value = memberError.message
    }
  }

})
</script>
<template>
  <footer class="py-3 footer">
    <div class="container-fluid">
      <div class="row align-items-center justify-content-lg-between">
        <div class="mb-4 col-lg-6 mb-lg-0">
        </div>
        <div class="col-lg-6">
          <ul
            class="nav nav-footer justify-content-center justify-content-lg-end"
          >
            <li class="nav-item">
              <a
                href="www.github.com/TessShearer"
                class="nav-link text-muted"
                target="_blank"
                :style="{ color: member?.themes?.light_one || '#f5f5f5' }"
                >Tess Shearer - Github</a
              >
            </li>
          </ul>
        </div>
      </div>
    </div>
  </footer>
</template>
