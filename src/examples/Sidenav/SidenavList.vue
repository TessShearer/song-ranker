<script setup>
import { computed } from "vue"
import { useRoute } from "vue-router"
import { useStore } from "vuex"
import SidenavItem from "./SidenavItem.vue"

const store = useStore()

const isRTL = computed(() => store.state.isRTL)
const members = computed(() => store.state.members || [])

const getRoute = () => {
  const route = useRoute()
  const routeArr = route.path.split("/")
  return routeArr[1] + (routeArr[2] ? `/${routeArr[2]}` : "")
}
</script>


<template>
  <div class="collapse navbar-collapse w-auto h-auto h-100" id="sidenav-collapse-main">
    <ul class="navbar-nav">

      <!-- Dynamic member links -->
      <li class="nav-item" v-for="member in members" :key="member.member_id">
        <sidenav-item :to="`/members/${member.member_id}/tables`" :navText="member.member_name"
          :path="member.themes?.image" :background="member.themes?.light_one" :text="member.themes?.dark_one"
          :class="getRoute() === `members/${member.member_id}/tables` ? 'active' : ''" />
      </li>

      <!-- Settings link -->
      <li class="nav-item">
        <sidenav-item to="/profile" color="white" :path="'/themes/settings.jpg'" :text="'black'"
          :class="getRoute() === 'profile' ? 'active' : ''" :navText="isRTL ? 'حساب تعريفي' : 'Edit Settings'">
          <template #icon>
            <i class="ni ni-single-02 text-dark text-sm opacity-10"></i>
          </template>
        </sidenav-item>
      </li>

    </ul>
  </div>
</template>
