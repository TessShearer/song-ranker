import { createRouter, createWebHistory } from "vue-router";
import store from '@/store'
import { supabase } from '@/supabaseClient'


import Tables from "../views/TablesView.vue";
import Profile from "../views/ProfileView.vue";
import Signup from "../views/SignUp.vue";
import Signin from "../views/SignIn.vue";
import ResetPassword from "../views/ResetPassword.vue";
import ArtistDetail from "../views/ArtistDetail.vue";
import ForbiddenView from "../views/ForbiddenView.vue";
import MemberAddCard from "../examples/Cards/MemberAddCard.vue";

const routes = [
  {
    path: '/',
    name: 'RootRedirect',
    beforeEnter: async (to, from, next) => {
      const member = store.state.member
      const user = store.state.user

      if (member?.music_id) {
        next(`/members/${member.music_id}/tables`)
      } else if (user?.id) {
        const { data } = await supabase
          .from('members')
          .select('music_id')
          .eq('member_id', user.id)
          .single()

        if (data?.music_id) {
          store.commit('setMember', data)
          next(`/members/${data.music_id}/tables`)
        } else {
          next('/create-member')
        }
      } else {
          next('/signin')
      }
    }
  },

  {
    path: "/create-member",
    name: "MemberAddCard",
    component: MemberAddCard,
  },
  {
    path: '/members/:memberId/tables',
    name: "Tables",
    component: Tables,
  },
  {
    path: "/profile",
    name: "Profile",
    component: Profile,
  },
  {
    path: "/signin",
    name: "Signin",
    component: Signin,
    meta: { hideNavbar: true }
  },
  {
    path: "/signup",
    name: "Signup",
    component: Signup,
  },
  {
    path: "/resetpassword",
    name: "ResetPassword",
    component: ResetPassword,
  },
  {
    path: '/artists/:memberId/:artistId',
    name: "ArtistDetail",
    component: ArtistDetail,
    props: true
  },
  {
    path: '/forbidden',
    name: "ForbiddenView",
    component: ForbiddenView,
  },
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
  linkActiveClass: "active",
});

export default router;
