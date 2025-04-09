<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { format, getHours } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

const currentTime = ref('');
const sunPosition = ref(0);
const timeOfDay = ref('day');
const sunOpacity = ref(0);
const shineEffect = ref(false);

const updateTime = () => {
  const alexandriaTime = zonedTimeToUtc(new Date(), 'Africa/Cairo');
  const hours = getHours(alexandriaTime);
  currentTime.value = format(alexandriaTime, 'HH:mm:ss');

  const adjustedHour = (hours - 5 + 24) % 24;
  if (adjustedHour >= 0 && adjustedHour <= 14) {
    sunPosition.value = (adjustedHour / 14) * 180;
    sunOpacity.value = Math.min(1, Math.sin((adjustedHour / 14) * Math.PI) * 1.2);
  } else {
    sunPosition.value = 0;
    sunOpacity.value = 0;
  }

  if (hours >= 5 && hours < 10) timeOfDay.value = 'morning';
  else if (hours >= 10 && hours < 16) timeOfDay.value = 'day';
  else if (hours >= 16 && hours < 19) timeOfDay.value = 'evening';
  else timeOfDay.value = 'night';

  shineEffect.value = !shineEffect.value;
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
  <div class="sun-container relative h-40 overflow-hidden rounded-t-xl shadow-2xl">
    <div
      class="absolute inset-0 transition-all duration-1000 ease-in-out nav-background"
      :class="{
        'bg-gradient-to-b from-orange-200 via-blue-300 to-blue-400': timeOfDay === 'morning',
        'bg-gradient-to-b from-blue-400 via-blue-300 to-blue-200': timeOfDay === 'day',
        'bg-gradient-to-b from-orange-400 via-purple-400 to-blue-600': timeOfDay === 'evening',
        'bg-gradient-to-b from-blue-900 via-purple-900 to-indigo-900': timeOfDay === 'night'
      }"
    >
      <!-- Sun -->
      <div
        class="absolute left-1/2 bottom-0 transform transition-transform duration-1000 ease-in-out"
        :style="{
          transform: `translate(-50%, 50%) rotate(${sunPosition}deg) translateY(-120px) rotate(-${sunPosition}deg)`,
          opacity: sunOpacity
        }"
      >
        <div class="ball">
          <div class="absolute inset-0 rounded-full sun-glow" :class="{ 'animate-shine': shineEffect }"></div>
        </div>
      </div>

      <!-- Clouds -->
      <div v-if="timeOfDay !== 'night'" class="absolute inset-0">
        <div
          v-for="i in 4"
          :key="i"
          class="absolute bg-white rounded-full opacity-25 animate-cloud"
          :style="{
            width: `${60 + Math.random() * 40}px`,
            height: `${30 + Math.random() * 20}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 40}%`,
            animationDelay: `${i * 3}s`
          }"
        />
      </div>

      <!-- Stars for Night -->
      <div v-if="timeOfDay === 'night'" class="absolute inset-0 overflow-hidden">
        <div
          v-for="i in 25"
          :key="i"
          class="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
          :style="{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`
          }"
        />
      </div>
    </div>

    <div
      class="absolute bottom-3 right-3 text-sm backdrop-blur bg-black/30 px-3 py-1 rounded-full shadow-lg text-white"
    >
      {{ currentTime }} (Alexandria)
    </div>
  </div>
</template>
<style scoped>
.animate-cloud {
  animation: float 25s infinite ease-in-out alternate;
}

@keyframes float {
  0% { transform: translateX(-20px) translateY(0); }
  25% { transform: translateX(-10px) translateY(-5px); }
  50% { transform: translateX(0) translateY(0); }
  75% { transform: translateX(10px) translateY(5px); }
  100% { transform: translateX(20px) translateY(0); }
}

.animate-twinkle {
  animation: twinkle 3s infinite alternate;
}

@keyframes twinkle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

.ball {
  margin: 50px auto;
  border-radius: 50%;
  width: 70px;
  height: 70px;
  background-color: #ffbf91; /* More orange */
  box-shadow: 0 0 35px 5px #f59e0b, 0 0 25px 10px #f59e0b inset; /* Adjusted to a deeper orange */
  position: relative;
}

.sun-glow {
  background: radial-gradient(circle, rgba(255,165,0,0.3) 0%, rgba(255,140,0,0) 70%);
  filter: blur(10px);
  opacity: 0.7;
  z-index: -1;
  transition: opacity 0.5s ease-in-out;
}

.animate-shine {
  animation: shinePulse 1s infinite alternate;
}

@keyframes shinePulse {
  from { opacity: 0.6; transform: scale(1); }
  to { opacity: 1; transform: scale(1.1); }
}

:global(body) {
  background-color: rgba(28, 40, 51, 1) !important;
}

.nav-background {
  background-color: rgba(28, 40, 51, 1) !important;
}
</style>