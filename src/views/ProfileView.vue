<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/supabaseClient';
import ArgonInput from '@/components/ArgonInput.vue';
import { useRouter } from 'vue-router'

const store = useStore();
const router = useRouter()

const user = computed(() => store.state.user);
const member = computed(() => store.state.member);

const themes = ref([]);
const selectedThemeId = ref(null);
const updatedName = ref('');
const success = ref('');
const error = ref('');
const isPrivate = ref(false);

// Wait for member to load, then populate fields
watch(member, (newMember) => {
  if (newMember) {
    updatedName.value = newMember.member_name;
    selectedThemeId.value = newMember.theme_id;
  }
}, { immediate: true });

onMounted(async () => {
  store.state.isAbsolute = true;
  store.state.imageLayout = 'profile-overview';
  store.state.showFooter = true;
  store.state.hideConfigButton = true;
  document.body.classList.add('profile-overview');

  // If store data is lost after refresh, restore it
  if (!member.value || !user.value) {
    const { data: userData } = await supabase.auth.getUser();
    if (userData?.user) {
      store.commit('setUser', userData.user);

      const { data: memberData } = await supabase
        .from('members')
        .select('*, themes(*)')
        .eq('member_id', userData.user.id)
        .single();

      if (memberData) {
        store.commit('setMember', memberData);
      }
    }
  }

  // Load all themes for dropdown
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

  const { error: updateError, data: updatedData } = await supabase
    .from('members')
    .update({
      member_name: updatedName.value,
      theme_id: selectedThemeId.value,
      is_private: isPrivate.value,
    })
    .eq('member_id', user.value.id)
    .select('*, themes(*)')
    .single();

  if (updateError) {
    error.value = updateError.message;
  } else {
    store.commit('setMember', updatedData);
    success.value = 'Profile updated!';
  }
};

const deleteUserAndData = async () => {
  const confirmed = confirm("Are you sure? This will delete all your music data permanently.")

  if (!confirmed) return

  const userId = user.value?.id

  // Step 1: Find the member tied to this user
  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('*')
    .eq('member_id', userId)
    .single()

  if (memberError || !memberData) {
    console.error('Member not found:', memberError)
    return
  }

  const musicId = memberData.music_id

  // Step 2: Find all artists for this member
  const { data: artists } = await supabase
    .from('artists')
    .select('id')
    .eq('member_id', musicId)

  const artistIds = artists.map(a => a.id)

  // Step 3: Find all albums for these artists
  const { data: albums } = await supabase
    .from('albums')
    .select('id')
    .in('artist_id', artistIds)

  const albumIds = albums.map(a => a.id)

  // Step 4: Delete songs first
  await supabase
    .from('songs')
    .delete()
    .in('album_id', albumIds)

  // Step 5: Delete albums
  await supabase
    .from('albums')
    .delete()
    .in('id', albumIds)

  // Step 6: Delete artists
  await supabase
    .from('artists')
    .delete()
    .in('id', artistIds)

  // Step 7: Delete member
  await supabase
    .from('members')
    .delete()
    .eq('member_id', userId)

  // Step 8: Delete auth user (optional and powerful)
  await supabase.auth.admin.deleteUser(userId)

  alert("All data deleted. You may login with your email at any time to create a new profile.")

  await supabase.auth.signOut()
  store.commit('clearAuth')
  router.push('/signin')
}

watch(member, (newMember) => {
  if (newMember) {
    updatedName.value = newMember.member_name;
    selectedThemeId.value = newMember.theme_id;
    isPrivate.value = newMember.is_private || false;
  }
}, { immediate: true });

</script>



<template>
  <main>
    <div class="container-fluid">
      <div class="page-header min-height-250" :style="{
        backgroundImage: member?.themes?.header ? `url(${member.themes.header})` : '',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        marginRight: '-24px',
        marginLeft: '-34%',
        marginTop: '-5%',
        position: 'relative',
      }">
      </div>

      <div class="card shadow-lg mt-n8" :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5' }">
        <div class="card-body p-3 d-inline-flex justify-content-between">
          <div class="h-100 px-4">
            <h5 class="mb-1">{{ member?.member_name || '...' }}</h5>
            <p class="mb-0 font-weight-bold text-sm">Customize your profile and theme</p>
          </div>
          <div>
            <button class="btn"
              :style="{ backgroundColor: member?.themes?.dark_two || '#f5f5f5', color: member?.themes?.light_one }"
              @click="deleteUserAndData">
              Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="py-4 container-fluid">
      <div class="card" :style="{ backgroundColor: member?.themes?.light_one || '#f5f5f5' }">
        <div class="card-body">
          <p class="text-uppercase text-sm">Information</p>

          <div class="row">
            <div class="col-md-6">
              <label class="form-control-label">Username</label>
              <argon-input v-model="updatedName" type="text" />
            </div>
          </div>

          <hr class="horizontal dark" />

          <div class="col-md-6 mt-3">
            <label class="form-control-label">Private Profile</label>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="privateSwitch" v-model="isPrivate" />
              <label class="form-check-label" for="privateSwitch">
                {{ isPrivate ? 'Your profile is hidden from others' : 'Your profile is visible to others' }}
              </label>
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
            <button class="btn ombre-overlay"
              :style="{ backgroundColor: member?.themes?.dark_two || '#f5f5f5', color: member?.themes?.light_one }"
              @click="submitChanges">Update Profile</button>
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