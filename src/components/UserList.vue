<script setup>
import { ref, computed } from 'vue';
import { UserCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline';

const props = defineProps({
  users: {
    type: Array,
    required: true
  }
});

const emit = defineEmits(['close']);

const activeUsers = computed(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return props.users.map(user => ({
    ...user,
    isActive: new Date(user.last_seen) > fiveMinutesAgo
  }));
});
</script>

<template>
  <div class="h-full flex flex-col bg-white border-l">
    <div class="p-4 border-b flex justify-between items-center">
      <h3 class="text-lg font-semibold">Online Users</h3>
      <button 
        @click="$emit('close')"
        class="p-2 rounded-lg hover:bg-gray-100 lg:hidden"
      >
        <XMarkIcon class="h-6 w-6" />
      </button>
    </div>
    <div class="flex-1 overflow-y-auto p-2">
      <div v-for="user in activeUsers" :key="user.id" 
        class="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
        <UserCircleIcon class="h-8 w-8 text-gray-400" />
        <div>
          <p class="font-medium">{{ user.username }}</p>
          <p class="text-xs" :class="user.isActive ? 'text-green-500' : 'text-gray-500'">
            {{ user.isActive ? 'Online' : 'Offline' }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>