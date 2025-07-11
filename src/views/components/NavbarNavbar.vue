<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { supabase } from '@/supabaseClient'
import menu from '@/assets/img/icons/menu.png'

const store = useStore()
const router = useRouter()

const isRTL = computed(() => store.state.isRTL)
const user = computed(() => store.state.user)
const error = ref(null);
const members = ref([]);
const theme = computed(() => store.state.theme)
const showDropdown = ref(false)

const userName = computed(() => user.value?.user_metadata?.full_name || user.value?.email || 'Guest')

// Refs for detecting outside click
const dropdownRef = ref(null)

watch(user, async (newUser) => {
  if (!newUser?.id) return

  const { data: memberData, error: memberError } = await supabase
    .from("members")
    .select(`
      *,
      themes (
        image,
        light_one,
        dark_one
      )
    `)
    .or(`is_private.eq.false,member_id.eq.${newUser.id}`);

  if (memberError) {
    error.value = memberError.message;
  } else {
    members.value = memberData;
  }
}, { immediate: true })

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    showDropdown.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  store.commit('clearAuth')
  router.push('/signin')
}
</script>



<template>
  <nav class="navbar navbar-main navbar-expand-lg px-0 m-4 shadow border-radius-xl" :class="[
      isRTL ? 'top-0 position-sticky z-index-sticky' : '',
      'position-sticky w-90'
    ]" :style="{ backgroundColor: theme?.light_one || '#ffffff', zIndex: 1050 }" id="navbarBlur" data-scroll="true">
    <div class="px-3 py-1 container-fluid d-flex justify-content-between align-items-center">

      <!-- Mobile-only dropdown toggle -->
      <div class="d-xl-none position-relative" ref="dropdownRef">
        <button class="btn btn-outline my-auto" @click="toggleDropdown">
          <img :src="menu" alt="Menu" class="img-fluid" style="max-height: 18px;" />
        </button>

        <ul v-if="showDropdown" class="position-absolute mt-2 shadow rounded dropdown-menu d-block"
          style="left: 0; z-index: 2000; min-width: 200px"
          :style="{ backgroundColor: theme?.light_one || '#fff', color: theme?.dark_one }">
          <li class="m-2 p-1 rounded" v-for="member in members" :key="member.music_id"
            :style="{ backgroundColor: member?.themes?.light_one || '#fff', color: member?.themes?.dark_one }">
            <router-link class="dropdown-item d-flex align-items-center gap-2"
              :to="`/members/${member.music_id}/tables`">
              <img :src="member?.themes?.image" alt="Theme Artist" class="rounded-circle"
                style="width: 32px; height: 32px; object-fit: cover;" />
              <span :style="{ color: member?.themes?.dark_one }">
                {{ member.member_id === user?.id ? `${member.member_name} (You)` : member.member_name }}
              </span>
            </router-link>

          </li>
          <li>
            <hr class="dropdown-divider" />
          </li>
          <li class="m-2 p-1 rounded"><router-link class="dropdown-item d-flex align-items-center gap-2" to="/profile">
              <div class="icon icon-shape icon-sm text-center d-flex align-items-center justify-content-center">
                <img src="/themes/settings.jpg" alt="Settings" class="rounded-circle"
                  style="min-width: 4vh; min-height: 4vh; object-fit: cover;" />
              </div>
              <span :style="{ color: theme?.dark_one }"> Profile</span>
            </router-link></li>

        </ul>
      </div>

      <!-- Optionally hide on mobile, keep on desktop -->
      <div class="d-none d-xl-block">
        <h6 class="mb-0">Welcome, {{ userName }}</h6>
      </div>

      <div>
        <button class="btn btn-outline-info btn-sm my-1 mx-4"
          :style="{ borderColor: theme?.dark_two || '#17a2b8', color: theme?.dark_two || '#17a2b8' }"
          @click="handleLogout">
          Logout
        </button>
      </div>
    </div>
  </nav>
</template>
