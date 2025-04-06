<script setup>
import { ref } from 'vue';

const emits = defineEmits(['select', 'close']);

const emojis = [
  '😊', '😂', '🥰', '😎', '🤔', '😴', '🥳', '🧙‍♂️', '✨', '🌟', 
  '⭐', '🔮', '🎭', '🎪', '🎨', '🎯', '🎲', '🎮', '🎼', '🎵'
];

const selectEmoji = (emoji) => {
  emits('select', emoji);
};
</script>

<template>
  <div class="fixed bottom-20 left-4 bg-white rounded-lg shadow-lg p-4 border-2 border-purple-200">
    <div class="flex justify-between items-center mb-2">
      <h3 class="font-wizard text-purple-800">Select Emoji</h3>
      <button 
        @click="$emit('close')" 
        class="text-gray-500 hover:text-gray-700"
      >
        ×
      </button>
    </div>
    <div class="grid grid-cols-5 gap-2">
      <button
        v-for="emoji in emojis"
        :key="emoji"
        @click="selectEmoji(emoji)"
        class="text-2xl p-2 hover:bg-purple-50 rounded-lg transition-colors"
      >
        {{ emoji }}
      </button>
    </div>
  </div>
</template>