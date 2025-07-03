<script setup>
import { computed } from "vue";
import { useStore } from "vuex";

const store = useStore();
const isRTL = computed(() => store.state.isRTL);
const sidebarMinimize = () => store.commit("sidebarMinimize");

const minimizeSidebar = () => {
  if (window.innerWidth < 1200) {
    sidebarMinimize();
  }
};

defineProps({
  to: {
    type: String,
    required: true,
  },
  navText: {
    type: String,
    required: true,
  },
  path: {
    type: String,
    required: true,
  },
  background: {
    type: String,
    required: true,
  },
  text: {
    type: String,
    required: true,
  }
});
</script>
<template>
  <router-link :to="to" class="nav-link my-2 rounded" :style="{ backgroundColor: background, color: text }" @click="minimizeSidebar">

    <div class="icon icon-shape icon-sm text-center d-flex align-items-center justify-content-center">
      <img :src="path" alt="Theme Image" class="rounded-circle"
        style="min-width: 4vh; min-height: 4vh; object-fit: cover;" />
    </div>
    <span class="nav-link-text" :class="isRTL ? ' me-1' : 'ms-1'">{{
    navText
      }}</span>
  </router-link>
</template>
