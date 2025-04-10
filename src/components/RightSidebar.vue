<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { UserCircleIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { supabase } from '../lib/supabase';
import { socket } from '../lib/socket';

const joinedUsers = ref([]);
const emit = defineEmits(['close']);

const onlineUsers = computed(() => {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return joinedUsers.value.filter(user => {
    const lastSeen = new Date(user.last_seen);
    return lastSeen > fiveMinutesAgo;
  });
});

const loadJoinedUsers = async () => {
  try {
    const { data, error } = await supabase.from('chat_users').select('*');
    if (error) {
      console.error('Error loading users:', error);
      return;
    }
    joinedUsers.value = data || [];
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const removeUser = async (userId) => {
  // Since we're now using the server for all operations,
  // user removal should be implemented through socket.io
  // For now, we'll just remove from the local state
  joinedUsers.value = joinedUsers.value.filter(user => user.id !== userId);
};

const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

onMounted(async () => {
  await loadJoinedUsers();

  socket.on('user_joined', (user) => {
    const existingUserIndex = joinedUsers.value.findIndex(u => u.id === user.id);
    if (existingUserIndex !== -1) {
      joinedUsers.value[existingUserIndex] = user;
    } else {
      joinedUsers.value.push(user);
    }
  });

  socket.on('user_left', ({ userId }) => {
    const user = joinedUsers.value.find(u => u.id === userId);
    if (user) {
      user.last_seen = new Date().toISOString();
    }
  });
});

onUnmounted(() => {
  socket.off('user_joined');
  socket.off('user_left');
});
</script>

<template>
  <div class="h-screen w-72 bg-gray-50 border-l flex flex-col">
    <!-- Header -->
    <div class="p-4 bg-white border-b flex justify-between items-center shadow-sm">
      <div>
        <h3 class="font-semibold text-gray-800">Online Users</h3>
        <p class="text-sm text-gray-500">{{ onlineUsers.length }} active now</p>
      </div>
      <button 
        @click="$emit('close')"
        class="p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <XMarkIcon class="h-5 w-5 text-gray-500" />
      </button>
    </div>

    <!-- Users List -->
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <!-- Online Users -->
      <div v-if="onlineUsers.length > 0" class="space-y-2">
        <div 
          v-for="user in onlineUsers" 
          :key="user.id"
          class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        >
          <div class="flex items-center space-x-3">
            <div class="relative">
              <UserCircleIcon class="h-10 w-10 text-gray-700" />
              <div class="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div>
              <span class="font-medium text-gray-900">{{ user.username }}</span>
              <p class="text-xs text-green-600">Online</p>
            </div>
          </div>
          <button
            @click="removeUser(user.id)"
            class="p-1.5 rounded-full hover:bg-red-50 group transition-colors"
          >
            <XMarkIcon class="h-5 w-5 text-gray-400 group-hover:text-red-500" />
          </button>
        </div>
      </div>

      <!-- Offline Users -->
      <div v-if="joinedUsers.length > onlineUsers.length" class="mt-6">
        <h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Offline</h4>
        <div class="space-y-2">
          <div 
            v-for="user in joinedUsers.filter(u => !onlineUsers.includes(u))" 
            :key="user.id"
            class="flex items-center justify-between p-3 bg-white/50 rounded-lg"
          >
            <div class="flex items-center space-x-3">
              <div class="relative">
                <UserCircleIcon class="h-10 w-10 text-gray-400" />
                <div class="absolute bottom-0 right-0 h-3 w-3 bg-gray-300 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <span class="font-medium text-gray-600">{{ user.username }}</span>
                <p class="text-xs text-gray-400">Last seen {{ getTimeAgo(user.last_seen) }}</p>
              </div>
            </div>
            <button
              @click="removeUser(user.id)"
              class="p-1.5 rounded-full hover:bg-red-50 group transition-colors"
            >
              <XMarkIcon class="h-5 w-5 text-gray-300 group-hover:text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>