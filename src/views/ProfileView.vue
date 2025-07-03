<script setup>
import { ref, onMounted } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/supabaseClient';
import ArgonInput from '@/components/ArgonInput.vue';

const store = useStore();
const user = ref(null);
const member = ref(null);
const themes = ref([]);
const selectedThemeId = ref(null);
const updatedName = ref('');
const success = ref('');
const error = ref('');

onMounted(async () => {
  store.state.isAbsolute = true;
  store.state.imageLayout = 'profile-overview';
  store.state.showFooter = true;
  store.state.hideConfigButton = true;
  document.body.classList.add('profile-overview');

  // Get user and member
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    error.value = 'Failed to retrieve user.';
    return;
  }
  user.value = userData.user;

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*, themes(*)')
    .eq('member_id', user.value.id)
    .single();

  if (memberError) {
    error.value = memberError.message;
    return;
  }

  member.value = memberData;
  updatedName.value = memberData.member_name;
  selectedThemeId.value = memberData.theme_id;

  const { data: themesData, error: themesError } = await supabase.from('themes').select('*');
  if (!themesError) {
    themes.value = themesData;
  }
});

const submitChanges = async () => {
  error.value = '';
  success.value = '';
  if (!updatedName.value.trim() || !selectedThemeId.value) {
    error.value = 'Username and theme are required.';
    return;
  }
  const { error: updateError } = await supabase
    .from('members')
    .update({ member_name: updatedName.value, theme_id: selectedThemeId.value })
    .eq('member_id', user.value.id);

  if (updateError) {
    error.value = updateError.message;
  } else {
    success.value = 'Profile updated!';
    window.location.reload();
  }
};
</script>

<template>
  <main>
    <div class="container-fluid">
      <div class="page-header min-height-200" style="margin-right: -24px; margin-left: -34%;">
        <span class="mask" :style="{ backgroundColor: member?.themes?.dark_one || '#ccc', opacity: 0.6 }"></span>
      </div>

      <div class="card shadow-lg mt-n6" :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5'}">
        <div class="card-body p-3">
          <div class="h-100 px-4">
            <h5 class="mb-1">{{ member?.member_name || '...' }}</h5>
            <p class="mb-0 font-weight-bold text-sm">Customize your profile and theme below</p>
          </div>
        </div>
      </div>
    </div>

    <div class="py-4 container-fluid">
      <div class="card" :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5'}">
        <div class="card-body" >
          <p class="text-uppercase text-sm">Information</p>

          <div class="row">
            <div class="col-md-6">
              <label class="form-control-label">Username</label>
              <argon-input v-model="updatedName" type="text" />
            </div>
          </div>

          <hr class="horizontal dark" />

          <div>
            <p class="text-uppercase text-sm">Choose Your Theme</p>
            <div class="row">
              <div v-for="theme in themes" :key="theme.id" class="col-md-3 text-center mb-4">
                <div :class="['theme-circle', selectedThemeId === theme.id ? 'border border-dark border-3' : '']"
                  style="cursor: pointer" @click="selectedThemeId = theme.id">
                  <img :src="theme.image" class="img-fluid rounded-circle"
                    style="width: 70px; height: 70px; object-fit: cover" :alt="theme.title" />
                </div>
                <small class="d-block mt-2">{{ theme.title }}</small>
              </div>
            </div>
          </div>

          <div class="text-end">
            <button class="btn" :style="{ backgroundColor: member?.themes?.dark_two || '#f5f5f5', color: member?.themes?.light_one}" @click="submitChanges">Update Profile</button>
          </div>
          <div v-if="error" class="text-danger mt-3">{{ error }}</div>
          <div v-if="success" class="text-success mt-3">{{ success }}</div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.theme-circle {
  display: inline-block;
  border-radius: 50%;
  padding: 4px;
  transition: border 0.2s ease-in-out;
}
</style>