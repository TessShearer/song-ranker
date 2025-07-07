<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useStore } from "vuex";
import { supabase } from "@/supabaseClient";
import SidenavItem from "./SidenavItem.vue";

// State
const store = useStore();
const isRTL = computed(() => store.state.isRTL);
const members = ref([]);
const error = ref(null);
const user = ref(null);

const getRoute = () => {
  const route = useRoute();
  const routeArr = route.path.split("/");
  return routeArr[1];
};

onMounted(async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    error.value = "Could not retrieve user.";
    return;
  }
  user.value = userData.user;

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


  if (memberError) {
    error.value = memberError.message;
  } else {
    members.value = memberData;
  }
});
</script>

<template>
  <div class="collapse navbar-collapse w-auto h-auto h-100" id="sidenav-collapse-main">
    <ul class="navbar-nav">
      <li class="nav-item" v-for="member in members" :key="member.member_id">
        <sidenav-item :to="`/members/${member.member_id}/tables`" :navText="member.member_name"
          :path="member.themes?.image" :background="member.themes?.light_one" :text="member.themes?.dark_one"
          :class="getRoute() === `members/${member.member_id}/tables` ? 'active' : ''" />
      </li>

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
