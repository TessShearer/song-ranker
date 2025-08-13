import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";
import "./assets/css/nucleo-icons.css";
import "./assets/css/nucleo-svg.css";
import "./assets/css/main.css";
import ArgonDashboard from "./argon-dashboard";
import { supabase } from "@/supabaseClient";

async function handleSupabaseRecoveryRedirectOnce() {
  const rawHash = window.location.hash?.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  const params = new URLSearchParams(rawHash || "");

  // Only act on real recovery links, and only once
  if (params.get("type") === "recovery" && !sessionStorage.getItem("recoveryHandled")) {
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    // Set session explicitly (helps with edge cases)
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }

    // Mark as handled so we don’t loop on future navigations
    sessionStorage.setItem("recoveryHandled", "1");

    // Clean the URL (remove the long hash) before navigating
    history.replaceState(null, "", window.location.pathname + window.location.search);

    // Only push to /resetpassword if not already there
    if (!location.pathname.endsWith("/resetpassword")) {
      await router.replace("/resetpassword");
    }
  }
}

// ✅ Top-level await works in Vite ESM builds
await handleSupabaseRecoveryRedirectOnce();

const appInstance = createApp(App);
appInstance.use(store);
appInstance.use(router);
appInstance.use(ArgonDashboard);
appInstance.mount("#app");
