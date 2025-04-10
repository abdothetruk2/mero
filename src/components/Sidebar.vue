<script setup>
import { ref, computed } from 'vue';
import { 
  HomeIcon, 
  ChatBubbleLeftIcon, 
  UserGroupIcon, 
  CogIcon,
  UserCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  PaintBrushIcon,
  PhotoIcon
} from '@heroicons/vue/24/outline';
import axios from 'axios';
import { supabase } from '../lib/supabase';

const emit = defineEmits(['themeChange', 'uploadAvatar']);
const activeItem = ref('Home');
const showSettings = ref(false);
const selectedTheme = ref('purple');
const rooms = ref([]);
const fileInput = ref(null);

const themes = {
  purple: {
    primary: 'from-emerald-900 to-teal-900',
    secondary: 'emerald',
    accent: 'teal',
    highlight: 'emerald-400'
  },
  emerald: {
    primary: 'from-emerald-900 to-teal-900',
    secondary: 'emerald',
    accent: 'teal',
    highlight: 'emerald-400'
  },
  amber: {
    primary: 'from-amber-900 to-orange-900',
    secondary: 'amber',
    accent: 'orange',
    highlight: 'amber-400'
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
  const file = event.target.files[0];
  if (!file) return;

  try {
    const publicUrl = 'URL_TO_UPLOADED_FILE'; // Replace with actual URL after upload
    emit('uploadAvatar', publicUrl);
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const triggerFileInput = () => {
  fileInput.value.click();
};

const refreshRooms = async () => {
  await loadRooms();
};

loadRooms();
</script>

<template>
  <div 
    :class="['h-screen w-64 bg-gradient-to-b', themes[selectedTheme].primary, 'text-white flex flex-col relative overflow-hidden shadow-2xl']"
  >
    <!-- Animated Background Effects -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="animate-float absolute top-0 left-0 w-full h-full opacity-10">
        <div class="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-white blur-3xl"></div>
        <div class="absolute top-3/4 right-1/4 w-24 h-24 rounded-full bg-white blur-2xl"></div>
      </div>
    </div>

    <!-- Profile Section -->
    <div class="p-6 border-b border-white/10 backdrop-blur-sm bg-black/10 relative">
      <div class="flex items-center space-x-4">
        <div class="relative group cursor-pointer" @click="triggerFileInput">
          <div class="relative">
            <UserCircleIcon class="h-12 w-12 text-white opacity-90 transform transition-transform group-hover:scale-105" />
            <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 rounded-full transition-all duration-300"></div>
            <SparklesIcon class="h-5 w-5 text-yellow-300 absolute -top-1 -right-1 animate-pulse" />
          </div>
          <div class="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 animate-shine"></div>
          <PhotoIcon class="h-5 w-5 absolute bottom-0 right-0 text-white/70 transform translate-x-1 translate-y-1" />
        </div>
        <div>
          <h3 class="font-[Cinzel] text-lg text-white font-bold tracking-wide">
            Merwan<span class="text-yellow-300 animate-twinkle">✨</span>
          </h3>
          <p class="text-sm text-white/70 font-[Cinzel]">Archmage</p>
        </div>
      </div>
      
      <!-- Hidden File Input -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="handleFileUpload"
      />
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4 space-y-2">
      <!-- Home Button with Refresh -->
      <div class="flex items-center justify-between mb-6">
        <button 
          @click="activeItem = 'Home'; refreshRooms()"
          :class="[
            'flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 font-[Cinzel] flex-grow',
            activeItem === 'Home' 
              ? `bg-gradient-to-r from-${themes[selectedTheme].secondary}-600 to-${themes[selectedTheme].accent}-600 shadow-lg shadow-${themes[selectedTheme].secondary}-500/20`
              : 'text-white/80 hover:bg-white/10 hover:shadow-lg hover:shadow-white/10'
          ]"
        >
          <HomeIcon class="h-5 w-5" />
          <span class="font-semibold">Home</span>
        </button>
        <button 
          @click="refreshRooms"
          class="p-2 rounded-lg hover:bg-white/10 transition-all duration-300 ml-2"
        >
          <ArrowPathIcon class="h-5 w-5" />
        </button>
      </div>

      <!-- Theme Selector -->
      <div class="space-y-2">
        <h4 class="font-[Cinzel] text-sm text-white/70 px-2 mb-2">Theme</h4>
        <div class="grid grid-cols-2 gap-2">
          <button
            v-for="(theme, name) in themes"
            :key="name"
            @click="handleThemeChange(name)"
            :class="[
              'px-3 py-2 rounded-lg transition-all duration-300 text-sm font-[Cinzel]',
              selectedTheme === name
                ? `bg-gradient-to-r from-${theme.secondary}-600 to-${theme.accent}-600 shadow-lg shadow-${theme.secondary}-500/20`
                : 'bg-white/5 hover:bg-white/10'
            ]"
          >
            {{ name }}
          </button>
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

.blur-3xl {
  --tw-blur: blur(64px);
  filter: var(--tw-blur);
}

.blur-2xl {
  --tw-blur: blur(40px);
  filter: var(--tw-blur);
}
</style>