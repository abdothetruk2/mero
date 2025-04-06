<script setup>
import Sidebar from './components/Sidebar.vue'
import RightSidebar from './components/RightSidebar.vue'
import Chat from './components/Chat.vue'
import { ref } from 'vue'

const showLeftSidebar = ref(false);
const showRightSidebar = ref(true); // Set to true by default for desktop

const toggleLeftSidebar = () => {
  showLeftSidebar.value = !showLeftSidebar.value;
};

const toggleRightSidebar = () => {
  showRightSidebar.value = !showRightSidebar.value;
};
</script>

<template>
  <div class="flex h-screen bg-gray-50">
    <!-- Left Sidebar Toggle Button -->
    <button 
      @click="toggleLeftSidebar"
      class="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-900 text-white shadow-lg hover:bg-gray-800 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path v-if="showLeftSidebar" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        <path v-else strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>

    <!-- Right Sidebar Toggle Button -->
    <button 
      @click="toggleRightSidebar"
      class="lg:hidden fixed top-4 right-4 z-50 p-2 rounded-lg bg-gray-900 text-white shadow-lg hover:bg-gray-800 transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path v-if="showRightSidebar" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
        <path v-else strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 6l6 6-6 6" />
      </svg>
    </button>

    <!-- Left Sidebar -->
    <div 
      :class="[
        'fixed inset-y-0 left-0 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40',
        showLeftSidebar ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <Sidebar @close-sidebar="showLeftSidebar = false" />
    </div>

    <!-- Main Content -->
    <div class="flex-1 relative">
      <Chat />
    </div>

    <!-- Right Sidebar -->
    <div 
      :class="[
        'fixed inset-y-0 right-0 lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out z-40',
        showRightSidebar ? 'translate-x-0' : 'translate-x-full'
      ]"
    >
      <RightSidebar @close="showRightSidebar = false" />
    </div>
  </div>
</template>