<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { format, getHours } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const currentTime = ref('');
const sunPosition = ref(0);
const timeOfDay = ref('day');

const updateTime = () => {
  const alexandriaTime = zonedTimeToUtc(new Date(), 'Africa/Cairo');
  const hours = getHours(alexandriaTime);
  currentTime.value = format(alexandriaTime, 'HH:mm:ss');
  
  // Calculate sun position (0-180 degrees)
  sunPosition.value = ((hours % 12) / 12) * 180;
  
  // Determine time of day
  if (hours >= 6 && hours < 12) timeOfDay.value = 'morning';
  else if (hours >= 12 && hours < 17) timeOfDay.value = 'day';
  else if (hours >= 17 && hours < 20) timeOfDay.value = 'evening';
  else timeOfDay.value = 'night';
};

let interval;

onMounted(() => {
  updateTime();
  interval = setInterval(updateTime, 1000);
});

onUnmounted(() => {
  clearInterval(interval);
});
</script>

<template>
  <div class="sun-container relative h-32 overflow-hidden rounded-t-lg shadow-2xl">
    <div 
      class="absolute w-full h-full transition-colors duration-1000"
      :class="{
        'bg-gradient-to-b from-orange-200 via-blue-300 to-blue-400': timeOfDay === 'morning',
        'bg-gradient-to-b from-blue-600 via-blue-400 to-blue-300': timeOfDay === 'day',
        'bg-gradient-to-b from-orange-500 via-purple-600 to-blue-900': timeOfDay === 'evening',
        'bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900': timeOfDay === 'night'
      }"
    >
      <!-- Stars for night time -->
      <div 
        v-if="timeOfDay === 'night'"
        class="absolute inset-0 overflow-hidden"
      >
        <div v-for="i in 20" :key="i"
          class="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`
          }"
        ></div>
      </div>

      <!-- Clouds -->
      <div 
        class="absolute w-full h-full pointer-events-none"
        :class="{ 'opacity-0': timeOfDay === 'night' }"
      >
        <div 
          v-for="i in 3" 
          :key="i"
          class="absolute bg-white rounded-full opacity-20 animate-float"
          :style="{
            width: `${50 + Math.random() * 50}px`,
            height: `${30 + Math.random() * 20}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            animationDelay: `${i * 2}s`
          }"
        ></div>
      </div>

      <!-- Sun/Moon -->
      <div 
        class="celestial-body absolute w-16 h-16 rounded-full transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000"
        :class="{
          'bg-yellow-300 shadow-sun': timeOfDay === 'day',
          'bg-orange-400 shadow-sunrise': timeOfDay === 'morning',
          'bg-orange-500 shadow-sunset': timeOfDay === 'evening',
          'bg-gray-200 shadow-moon': timeOfDay === 'night'
        }"
        :style="{
          left: '50%',
          top: '100%',
          transform: `rotate(${sunPosition}deg) translateY(-80px) rotate(-${sunPosition}deg)`
        }"
      ></div>
    </div>
    <div class="absolute bottom-3 right-3 text-white text-sm font-wizard backdrop-blur-sm bg-black/20 px-3 py-1 rounded-full shadow-lg">
      {{ currentTime }} (Alexandria)
    </div>
  </div>
</template>

<style scoped>
.celestial-body {
  transition: all 1s cubic-bezier(0.4, 0, 0.2, 1);
}

.shadow-sun {
  box-shadow: 0 0 60px rgba(252, 211, 77, 0.6);
}

.shadow-sunrise {
  box-shadow: 0 0 60px rgba(251, 146, 60, 0.6);
}

.shadow-sunset {
  box-shadow: 0 0 60px rgba(249, 115, 22, 0.6);
}

.shadow-moon {
  box-shadow: 0 0 40px rgba(226, 232, 240, 0.3);
}

@keyframes float {
  0%, 100% { transform: translateX(0) translateY(0); }
  50% { transform: translateX(20px) translateY(-10px); }
}

@keyframes twinkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.8); }
}

.animate-float {
  animation: float 20s ease-in-out infinite;
}

.animate-twinkle {
  animation: twinkle 2s ease-in-out infinite;
}
</style>