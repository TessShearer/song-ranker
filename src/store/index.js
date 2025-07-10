import { createStore } from "vuex";
import { supabase } from "@/supabaseClient";

export default createStore({
  state: {
    // Layout-related
    hideConfigButton: false,
    isPinned: false,
    showConfig: false,
    sidebarType: "bg-white",
    isRTL: false,
    mcolor: "",
    darkMode: false,
    isNavFixed: false,
    isAbsolute: false,
    showNavs: true,
    showSidenav: true,
    showNavbar: true,
    showFooter: true,
    showMain: true,
    layout: "default",

    // Auth/session-related
    user: null,
    member: null,
    theme: null,
    themeSource: 'self',
  },

  mutations: {
    // Layout
    toggleConfigurator(state) {
      state.showConfig = !state.showConfig;
    },
    sidebarMinimize(state) {
      const sidenavShow = document.querySelector("#app");
      if (state.isPinned) {
        sidenavShow.classList.add("g-sidenav-hidden");
        sidenavShow.classList.remove("g-sidenav-pinned");
        state.isPinned = false;
      } else {
        sidenavShow.classList.add("g-sidenav-pinned");
        sidenavShow.classList.remove("g-sidenav-hidden");
        state.isPinned = true;
      }
    },
    sidebarType(state, payload) {
      state.sidebarType = payload;
    },
    navbarFixed(state) {
      state.isNavFixed = !state.isNavFixed;
    },
    setTheme(state, theme) {
      state.theme = theme;
    },
    setThemeSource(state, source) {
      state.themeSource = source; // 'self' or 'viewed'
    },

    // Auth
    setUser(state, user) {
      state.user = user;
    },
    setMember(state, member) {
      state.member = member;
      state.theme = member?.themes || null;
    },
    clearAuth(state) {
      state.user = null;
      state.member = null;
      state.theme = null;
      state.themeSource = 'self'
    },
  },

  actions: {
    toggleSidebarColor({ commit }, payload) {
      commit("sidebarType", payload);
    },

    // Fetch user + member info from Supabase and commit to store
    async fetchUser({ commit }) {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!userError && userData?.user) {
        commit("setUser", userData.user);

        const { data: memberData, error: memberError } = await supabase
          .from("members")
          .select("*, themes(*)")
          .eq("member_id", userData.user.id)
          .single();

        if (!memberError && memberData) {
          commit("setMember", memberData);
        }
      }
    },

    // Logout and clear auth state
    async logout({ commit }) {
      await supabase.auth.signOut();
      commit("clearAuth");
    },
  },

  getters: {
    isLoggedIn: (state) => !!state.user,
  },
});
