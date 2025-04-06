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
  <div class="sun-container relative h-24 overflow-hidden rounded-t-lg">
    <div 
      class="absolute w-full h-full transition-colors duration-1000"
      :class="{
        'bg-gradient-to-b from-orange-200 to-blue-300': timeOfDay === 'morning',
        'bg-gradient-to-b from-blue-400 to-blue-200': timeOfDay === 'day',
        'bg-gradient-to-b from-orange-500 to-purple-700': timeOfDay === 'evening',
        'bg-gradient-to-b from-blue-900 to-purple-900': timeOfDay === 'night'
      }"
    >
      <div 
        class="sun absolute w-12 h-12 rounded-full transform -translate-x-1/2 -translate-y-1/2"
        :class="{
          'bg-yellow-300': timeOfDay === 'day',
          'bg-orange-400': timeOfDay === 'morning' || timeOfDay === 'evening',
          'bg-gray-200': timeOfDay === 'night'
        }"
        :style="{
          left: '50%',
          top: '100%',
          transform: `rotate(${sunPosition}deg) translateY(-60px) rotate(-${sunPosition}deg)`
        }"
      ></div>
    </div>
    <div class="absolute bottom-2 right-2 text-white text-sm font-wizard">
      {{ currentTime }} (Alexandria)
    </div>
  </div>
</template>

<style scoped>
.sun {
  box-shadow: 0 0 20px rgba(255, 255, 255, 0.8);
  transition: all 1s ease;
}

@font-face {
  font-family: 'WizardFont';
  src: url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
}

.font-wizard {
  font-family: 'MedievalSharp', cursive;
}
</style>