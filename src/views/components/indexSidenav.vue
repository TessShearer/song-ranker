<script setup>
import { computed } from 'vue'
import { useStore } from 'vuex'
import SidenavList from './SidenavList.vue'
import tess from '@/assets/img/tess.jpg'

const store = useStore()

const isRTL = computed(() => store.state.isRTL)
const layout = computed(() => store.state.layout)
const sidebarType = computed(() => store.state.sidebarType)

// Pull from Vuex store
const member = computed(() => store.state.member)

// Determine whether the user has a member profile
const userExists = computed(() => !!member.value)
</script>

<template>

  <div v-show="layout === 'default'" class="min-height-300 position-absolute w-100" />

  <aside class="my-3 overflow-auto border-0 sidenav navbar navbar-vertical navbar-expand-xs border-radius-xl" :class="`${isRTL ? 'me-3 rotate-caret fixed-end' : 'fixed-start ms-3'}    
      ${layout === 'landing' ? 'bg-transparent shadow-none' : ' '
    } ${sidebarType}`" id="sidenav-main">

    <div class="m-0 navbar-brand flex d-flex">
      <img :src="tess" alt="Tess" class="rounded-circle" style="min-width: 8vh; min-height: 8vh; object-fit: cover;" />
      <p class="px-3 mb-0 text-wrap logo-text text-one">Hi! I'm Tess and I made this.</p>
    </div>

    <hr class="mt-0 horizontal dark" />
    <template v-if="userExists">
      <sidenav-list />
    </template>
    <template v-else>
      <div class="px-3 text-muted">Welcome! Set up your member profile to get started.</div>
    </template>


  </aside>
</template>
