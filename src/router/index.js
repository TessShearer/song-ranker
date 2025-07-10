import { createRouter, createWebHistory } from "vue-router";
import Dashboard from "../views/DashboardView.vue";
import Tables from "../views/TablesView.vue";
import Profile from "../views/ProfileView.vue";
import Signup from "../views/SignUp.vue";
import Signin from "../views/SignIn.vue";
import ResetPassword from "../views/ResetPassword.vue";
import ArtistDetail from "../views/ArtistDetail.vue";
import ForbiddenView from "../views/ForbiddenView.vue";

const routes = [
  {
    path: "/",
    name: "/",
    redirect: "/dashboard-default",
  },
  {
    path: "/dashboard-default",
    name: "Dashboard",
    component: Dashboard,
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
