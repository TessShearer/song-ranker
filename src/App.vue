<!--
=========================================================
* Vue Argon Dashboard 2 - v4.0.0
=========================================================

* Product Page: https://creative-tim.com/product/vue-argon-dashboard
* Copyright 2024 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
-->
<script setup>
import { computed } from "vue";
import { useStore } from "vuex";
import Sidenav from "./examples/Sidenav/indexSidenav.vue";
import Navbar from "@/examples/Navbars/NavbarNavbar.vue";
import AppFooter from "@/examples/FooterExample.vue";
import { supabase } from '@/supabaseClient';
import { onMounted } from 'vue';

const store = useStore();
const isNavFixed = computed(() => store.state.isNavFixed);
const darkMode = computed(() => store.state.darkMode);
const isAbsolute = computed(() => store.state.isAbsolute);
const showSidenav = computed(() => store.state.showSidenav);
const layout = computed(() => store.state.layout);
const showNavbar = computed(() => store.state.showNavbar);
const showFooter = computed(() => store.state.showFooter);
import { useRoute } from 'vue-router'

const route = useRoute()

const navClasses = computed(() => {
  return {
    "position-sticky bg-white left-auto top-2 z-index-sticky":
      isNavFixed.value && !darkMode.value,
    "position-sticky bg-default left-auto top-2 z-index-sticky":
      isNavFixed.value && darkMode.value,
    "position-absolute px-4 mx-0 w-100 z-index-2": isAbsolute.value,
    "px-0 mx-4": !isAbsolute.value,
  };
});

onMounted(async () => {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData?.user) return

  const { data: memberData } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', userData.user.id)
    .single()

  if (memberData?.themes?.dark_one) {
    document.body.style.backgroundColor = memberData.themes.dark_one
  }
})
</script>
<template>
  <div v-show="layout === 'landing'" class="landing-bg h-100 bg-gradient-primary position-fixed w-100"></div>

  <sidenav v-if="showSidenav" />

  <main class="main-content position-relative max-height-vh-100 h-100 border-radius-lg">
    <!-- nav -->

    <navbar :class="[navClasses]" v-if="showNavbar && !route.meta.hideNavbar" />


    <router-view />

    <app-footer v-show="showFooter" />

  </main>
</template>
