<script setup>
import { ref } from 'vue'
import { supabase } from '@/supabaseClient'
const emit = defineEmits(['cancel', 'added'])

const props = defineProps({
  memberMusicId: {
    type: Number,
    required: true
  }
})

const artistName = ref('')
const error = ref('')
const success = ref('')

const submitArtist = async () => {
  error.value = ''
  success.value = ''

  if (!artistName.value.trim()) {
    error.value = 'Please enter an artist name.'
    return
  }

  const { error: insertError } = await supabase.from('artists').insert([
    {
      name: artistName.value.trim(),
      member_id: props.memberMusicId
    }
  ])

  if (insertError) {
    error.value = insertError.message
  } else {
    success.value = 'Artist added successfully!'
    emit('added')  // let parent refresh and close modal
  }
}
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background: rgba(0,0,0,0.5);">
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content p-4">
        <h4 class="mb-3">Add New Artist</h4>

        <div class="mb-3">
          <label class="form-label">Artist Name:</label>
          <input v-model="artistName" type="text" class="form-control" placeholder="e.g. Taylor Swift" />
        </div>

        <div class="d-flex justify-content-between">
          <button class="btn btn-outline-secondary" @click="$emit('cancel')">Cancel</button>
          <button class="btn btn-primary" @click="submitArtist">Add Artist</button>
        </div>

        <div v-if="error" class="text-danger mt-3">{{ error }}</div>
        <div v-if="success" class="text-success mt-3">{{ success }}</div>
      </div>
    </div>
  </div>
</template>
