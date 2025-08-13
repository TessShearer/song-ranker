import { createApp } from "vue";
import App from "./App.vue";
import store from "./store";
import router from "./router";
import "./assets/css/nucleo-icons.css";
import "./assets/css/nucleo-svg.css";
import "./assets/css/main.css";
import ArgonDashboard from "./argon-dashboard";
import { supabase } from '@/supabaseClient'

async function handleSupabaseRecoveryRedirect() {

    const hash = window.location.hash.startsWith('#')
      ? window.location.hash.slice(1)
      : window.location.hash
    const params = new URLSearchParams(hash)
  
    // Only act on recovery links
    if (params.get('type') === 'recovery') {
      const access_token = params.get('access_token')
      const refresh_token = params.get('refresh_token')
  
      // Ensure the session is set 
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token })
      }
  
      // Clean the hash
      history.replaceState(null, '', window.location.pathname + window.location.search)
  
      router.replace('/resetpassword')
    }
  }

  handleSupabaseRecoveryRedirect()
    .finally(() => {
        const appInstance = createApp(App);
        appInstance.use(store);
        appInstance.use(router);
        appInstance.use(ArgonDashboard);
        appInstance.mount("#app");
    })