<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabaseClient'
import { computed } from "vue";
import { useStore } from "vuex";
import SidenavList from "./SidenavList.vue";
import tess from "@/assets/img/tess.png";

const user = ref(null)
const error = ref(null)
const member = ref([])
const store = useStore();
const isRTL = computed(() => store.state.isRTL);
const layout = computed(() => store.state.layout);
const sidebarType = computed(() => store.state.sidebarType);
const darkMode = computed(() => store.state.darkMode);

let userExists = false

onMounted(async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !sessionData.session) {
    userExists = false
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
        if (memberData.length > 0) {
          userExists = true
        }
        else {
          userExists = false
        }
      }
    }
  }
})
</script>
<template>

  <div v-show="layout === 'default'" class="min-height-300 position-absolute w-100"
    :class="`${darkMode ? 'bg-transparent' : 'bg-success'}`" />

  <aside class="my-3 overflow-auto border-0 sidenav navbar navbar-vertical navbar-expand-xs border-radius-xl" :class="`${isRTL ? 'me-3 rotate-caret fixed-end' : 'fixed-start ms-3'}    
      ${layout === 'landing' ? 'bg-transparent shadow-none' : ' '
      } ${sidebarType}`" id="sidenav-main">

    <div class="m-0 navbar-brand flex d-flex">
      <img :src="tess" alt="Tess" class="rounded-circle" style="min-width: 8vh; min-height: 8vh; object-fit: cover;" />
      <p class="px-3 mb-0 text-wrap logo-text text-one">Hi! I'm Tess and I made this.</p>
    </div>

    <hr class="mt-0 horizontal dark" />
    <div v-if="!userExists">

    </div>
    <div v-else>
      <sidenav-list />
    </div>
  </aside>
</template>
