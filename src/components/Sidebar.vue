<script setup>
import { ref, computed, onMounted } from 'vue';
import { 
  HomeIcon, 
  ChatBubbleLeftIcon, 
  UserGroupIcon, 
  CogIcon,
  UserCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  PaintBrushIcon,
  PhotoIcon,
  ShieldCheckIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/vue/24/outline';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const emit = defineEmits(['themeChange', 'uploadAvatar']);
const activeItem = ref('Home');
const showSettings = ref(false);
const showAdminPanel = ref(false);
const selectedTheme = ref('dark-blue');
const rooms = ref([]);
const fileInput = ref(null);
const currentUser = ref(null);
const isAdmin = ref(false);
const userStats = ref({
  totalUsers: 0,
  activeUsers: 0,
  totalMessages: 0
});

const themes = {
  'dark-blue': {
    primary: 'from-blue-900 to-indigo-900',
    secondary: 'blue',
    accent: 'indigo',
    highlight: 'blue-400'
  },
  cosmic: {
    primary: 'from-indigo-900 via-purple-900 to-pink-900',
    secondary: 'indigo',
    accent: 'pink',
    highlight: 'indigo-400'
  }
};

const loadRooms = async () => {
  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    rooms.value = data;
  } catch (error) {
    console.error('Error loading rooms:', error);
  }
};

const loadUserStats = async () => {
  if (!isAdmin.value) return;

  try {
    const [usersResponse, messagesResponse] = await Promise.all([
      supabase.from('chat_users').select('count'),
      supabase.from('messages').select('count')
    ]);

    const activeUsersResponse = await supabase
      .from('chat_users')
      .select('count')
      .gt('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    userStats.value = {
      totalUsers: usersResponse.count,
      activeUsers: activeUsersResponse.count,
      totalMessages: messagesResponse.count
    };
  } catch (error) {
    console.error('Error loading stats:', error);
  }
};

const publicRooms = computed(() => {
  return rooms.value.filter(room => !room.is_private);
});

const privateRooms = computed(() => {
  return rooms.value.filter(room => room.is_private);
});

const handleThemeChange = (theme) => {
  selectedTheme.value = theme;
  emit('themeChange', themes[theme]);
};

const handleFileUpload = async (event) => {
  if (!currentUser.value) {
    console.warn('Cannot upload file: User not authenticated');
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    await supabase
      .from('chat_users')
      .update({ avatar_url: publicUrl })
      .eq('id', currentUser.value.id);

    currentUser.value.avatar_url = publicUrl;
    emit('uploadAvatar', publicUrl);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const triggerFileInput = () => {
  if (!currentUser.value) {
    console.warn('Cannot upload file: User not authenticated');
    return;
  }
  fileInput.value.click();
};

const refreshRooms = async () => {
  await loadRooms();
};

const initializeUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('chat_users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (data) {
      currentUser.value = data;
      isAdmin.value = data.is_admin;
      if (isAdmin.value) {
        await loadUserStats();
      }
    }
  }
};

onMounted(() => {
  loadRooms();
  initializeUser();
});
</script>

<template>
  <div 
    :class="[
      'h-screen w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white flex flex-col relative overflow-hidden shadow-2xl',
      'transition-all duration-300 ease-in-out'
    ]"
  >
    <!-- Profile Section -->
    <div class="p-6 border-b border-white/10 backdrop-blur-sm bg-black/10 relative">
      <div class="flex items-center space-x-4">
        <div class="relative group cursor-pointer" @click="triggerFileInput">
          <div class="relative">
            <img 
              :src="currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.username}`"
              class="h-12 w-12 rounded-full object-cover border-2 border-white/20 shadow-lg transform transition-transform group-hover:scale-105"
              :alt="currentUser?.username"
            />
            <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-full transition-all duration-300"></div>
            <SparklesIcon class="h-5 w-5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <PhotoIcon class="h-5 w-5 absolute bottom-0 right-0 text-white/70 transform translate-x-1 translate-y-1" />
        </div>
        <div>
          <h3 class="font-cormorant text-lg text-white font-bold tracking-wide">
            {{ currentUser?.username || 'Made by abdokhater<3' }}<span class="text-yellow-300 animate-twinkle">✨</span>
          </h3>
          <p class="text-sm text-white/70 font-cormorant">
            {{ isAdmin ? 'Archmage' : 'Apprentice' }}
          </p>
        </div>
      </div>
      
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-4">
      <!-- Main Navigation -->
      <div class="space-y-2">
        <button 
          v-for="(item, index) in ['Home', 'Messages', 'Members']"
          :key="index"
          @click="activeItem = item"
          :class="[
            'flex items-center space-x-2 w-full px-4 py-3 rounded-lg transition-all duration-300 font-cormorant',
            activeItem === item 
              ? 'bg-white/20 shadow-lg backdrop-blur-sm'
              : 'hover:bg-white/10'
          ]"
        >
          <component :is="index === 0 ? HomeIcon : index === 1 ? ChatBubbleLeftIcon : UsersIcon" 
            class="h-5 w-5" 
          />
          <span>{{ item }}</span>
        </button>
      </div>

      <!-- Admin Panel -->
      <div v-if="isAdmin" class="pt-4 border-t border-white/10">
        <button
          @click="showAdminPanel = !showAdminPanel"
          class="flex items-center space-x-2 w-full px-4 py-3 rounded-lg transition-all duration-300 font-cormorant hover:bg-white/10"
        >
          <ShieldCheckIcon class="h-5 w-5" />
          <span>Admin Dashboard</span>
        </button>

        <div v-if="showAdminPanel" class="mt-2 space-y-2 pl-4">
          <div class="bg-white/5 rounded-lg p-4 space-y-3">
            <h4 class="font-cormorant text-sm text-white/80">Statistics</h4>
            <div class="space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-sm">Total Users</span>
                <span class="text-sm font-bold">{{ userStats.totalUsers }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm">Active Users</span>
                <span class="text-sm font-bold">{{ userStats.activeUsers }}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-sm">Messages</span>
                <span class="text-sm font-bold">{{ userStats.totalMessages }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings -->
      <div class="pt-4 border-t border-white/10">
        <button
          @click="showSettings = !showSettings"
          class="flex items-center space-x-2 w-full px-4 py-3 rounded-lg transition-all duration-300 font-cormorant hover:bg-white/10"
        >
          <CogIcon class="h-5 w-5" />
          <span>Settings</span>
        </button>

        <div v-if="showSettings" class="mt-2 space-y-2 pl-4">
          <div class="bg-white/5 rounded-lg p-4">
            <h4 class="font-cormorant text-sm text-white/80 mb-2">Theme</h4>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="(theme, name) in themes"
                :key="name"
                @click="handleThemeChange(name)"
                :class="[
                  'px-3 py-2 rounded-lg transition-all duration-300 text-sm font-cormorant',
                  selectedTheme === name
                    ? 'bg-white/20 shadow-lg backdrop-blur-sm'
                    : 'bg-white/5 hover:bg-white/10'
                ]"
              >
                {{ name }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  </div>
</template>

<style scoped>
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shine {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-shine {
  animation: shine 2s linear infinite;
}

.animate-twinkle {
  animation: twinkle 1.5s ease-in-out infinite;
}
</style>