<template>
    <div class="card mb-4">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">Entire Ranked Discography</h5>
            <div class="d-flex align-items-center gap-2">
                <button v-if="!isEditing" class="btn btn-sm btn-outline-secondary" @click="toggleExpanded">
                    {{ isExpanded ? '-' : '+' }}
                </button>
                <button v-if="isOwner && !isEditing && isExpanded" class="btn btn-sm btn-primary" @click="startEditing">
                    I'm Ready to Rank
                </button>
                <button v-if="isEditing" class="btn btn-sm btn-success" @click="finishEditing">
                    Done Ranking
                </button>
            </div>
        </div>

        <div v-if="isExpanded" class="card-body">
            <table class="table table-bordered text-center">
                <thead>
                    <tr>
                        <th>Rank</th>
                        <th>Song Title</th>
                        <th>Album</th>
                        <th v-if="isEditing">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <!-- Placeholder for now -->
                    <tr>
                        <td colspan="4" class="text-muted">No songs yet</td>
                    </tr>
                </tbody>
            </table>

            <!-- Album Highlights Section -->
            <div v-if="isEditing && isOwner" class="mt-4">
                <div v-for="album in albums" :key="album.id" class="mb-4 p-3 border rounded">
                    <h6 class="mb-3">{{ album.title }}</h6>
                    <transition-group name="fade" tag="div" class="d-flex flex-column gap-2">
                        <div v-for="(song, index) in album.songs.slice(0, 4)" :key="song.id"
                            class="d-flex justify-content-between align-items-center px-3 py-2 rounded" :class="{
                    'bg-light border': index < 3,
                    'text-muted bg-secondary-subtle': index === 3
                }" style="transition: opacity 0.5s ease;">
                            <span>#{{ index + 1 }} - {{ song.title }}</span>
                            <button v-if="index < 3" class="btn btn-sm btn-outline-success">
                                +
                            </button>
                        </div>
                    </transition-group>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
    isOwner: Boolean,
    albums: []
// expects each album to have { id, title, songs: [{ id, title }] }
})

const isExpanded = ref(false)
const isEditing = ref(false)
const toggleExpanded = () => {
    isExpanded.value = !isExpanded.value
}

const startEditing = () => {
    isEditing.value = true
}

const finishEditing = () => {
    isEditing.value = false
}
</script>

<style scoped>
.card-header {
    background-color: #f8f9fa;
    font-weight: 600;
}

button.btn {
    min-width: 40px;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.4s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>