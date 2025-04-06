<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { supabase, getOrCreateUser } from '../lib/supabase';
import { socket, connectSocket, disconnectSocket } from '../lib/socket';
import SunAnimation from './SunAnimation.vue';
import EmojiPicker from './EmojiPicker.vue';

const messages = ref([]);
const newMessage = ref('');
const messageContainer = ref(null);
const currentUser = ref(null);
const username = ref('');
const showUsernameForm = ref(true);
const isTyping = ref(false);
const selectedRoom = ref(null);
const rooms = ref([]);
const showEmojiPicker = ref(false);
const selectedFile = ref(null);
const privateMessageTo = ref(null);
const showCreateRoomModal = ref(false);
const newRoomName = ref('');
const newRoomDescription = ref('');

const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    // Check if a room is selected
    if (selectedRoom.value) {
      // Return messages that belong to the selected room
      return msg.room_id === selectedRoom.value.id;
    }
    // If no room is selected, return non-room messages that are either:
    // - Not private
    // - Sent by or to the current user
    return !msg.room_id && (!msg.is_private || 
      msg.user_id === currentUser.value?.id || 
      msg.recipient_id === currentUser.value?.id);
  });
});

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

const loadMessages = async () => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        user:chat_users!messages_sender_fkey(username, avatar_url),
        message_reactions(
          id,
          emoji,
          user_id,
          reactor:chat_users!reactions_reactor_fk(username)
        )
      `)
      .order('created_at', { ascending: true });

    if (error) throw error;

    messages.value = data;
    scrollToBottom();
  } catch (error) {
    console.error('Error loading messages:', error);
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

const handleFileUpload = async (event) => {
  if (!currentUser.value) {
    alert('Please enter your username first');
    event.target.value = '';
    return;
  }

  const file = event.target.files[0];
  if (!file) return;

  const fileExt = file.name.split('.').pop();
  const fileName = `${Math.random()}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Error uploading file:', uploadError);
    return;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(filePath);

  await supabase
    .from('chat_users')
    .update({ avatar_url: publicUrl })
    .eq('id', currentUser.value.id);

  currentUser.value.avatar_url = publicUrl;
};

const addReaction = async (messageId, emoji) => {
  const { error } = await supabase
    .from('message_reactions')
    .insert({
      message_id: messageId,
      user_id: currentUser.value.id,
      emoji
    });

  if (error) {
    console.error('Error adding reaction:', error);
    return;
  }

  await loadMessages();
};

const createRoom = async () => {
  if (!newRoomName.value.trim()) return;

  const { data, error } = await supabase
    .from('chat_rooms')
    .insert({
      name: newRoomName.value,
      description: newRoomDescription.value,
      created_by: currentUser.value.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating room:', error);
    return;
  }

  await supabase
    .from('room_members')
    .insert({
      room_id: data.id,
      user_id: currentUser.value.id
    });

  rooms.value.push(data);
  showCreateRoomModal.value = false;
  newRoomName.value = '';
  newRoomDescription.value = '';
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentUser.value) return;

  const messageData = {
    content: newMessage.value,
    user_id: currentUser.value.id,
    room_id: selectedRoom.value?.id,
    is_private: !!privateMessageTo.value,
    recipient_id: privateMessageTo.value?.id
  };

  socket.emit('chat_message', messageData);
  newMessage.value = '';
  isTyping.value = false;
  privateMessageTo.value = null;
};

const handleTyping = () => {
  isTyping.value = true;
  setTimeout(() => {
    isTyping.value = false;
  }, 2000);
};

const joinChat = async () => {
  if (!username.value.trim()) return;
  
  try {
    currentUser.value = await getOrCreateUser(username.value);
    connectSocket(currentUser.value.username);
    showUsernameForm.value = false;
    await loadMessages();
    await loadRooms();
  } catch (error) {
    console.error('Error joining chat:', error);
  }
};

onMounted(() => {
  socket.on('new_message', (message) => {
    messages.value.push(message);
    scrollToBottom();
  });
});

onUnmounted(() => {
  disconnectSocket();
});
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <SunAnimation />
    
    <!-- Username Form -->
    <div v-if="showUsernameForm" class="flex items-center justify-center h-full">
      <div class="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-purple-300">
        <h2 class="text-2xl font-wizard text-purple-800 mb-6 text-center">Enter the Realm</h2>
        <form @submit.prevent="joinChat" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-wizard text-purple-600 mb-1">
              Choose your wizard name
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              placeholder="Enter your mystical name"
              class="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-wizard"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-wizard text-purple-600">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileUpload"
              class="w-full text-sm text-purple-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-wizard file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
            />
          </div>
          <button
            type="submit"
            class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-wizard transition-all duration-300 transform hover:scale-105"
          >
            Join the Magic Circle
          </button>
        </form>
      </div>
    </div>

    <!-- Chat Interface -->
    <div v-else class="flex h-full">
      <!-- Rooms Sidebar -->
      <div class="w-64 bg-white border-r p-4">
        <h3 class="font-wizard text-lg mb-4">Magic Chambers</h3>
        <div class="space-y-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="selectedRoom = room"
            class="w-full p-2 text-left rounded-lg hover:bg-purple-50 transition-colors"
            :class="{ 'bg-purple-100': selectedRoom?.id === room.id }"
          >
            {{ room.name }}
          </button>
        </div>
        <button
          @click="showCreateRoomModal = true"
          class="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-wizard"
        >
          Create Chamber
        </button>
      </div>

      <!-- Messages Container -->
      <div class="flex-1 flex flex-col">
        <div 
          ref="messageContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-purple-50 to-blue-50"
        >
          <div 
            v-for="message in filteredMessages" 
            :key="message.id"
            class="flex items-start space-x-2"
            :class="{ 'justify-end': message.user?.username === currentUser.username }"
          >
            <div class="flex flex-col items-start space-y-1">
              <div 
                class="bg-white p-3 rounded-lg shadow-sm max-w-[80%] transform transition-all duration-300 hover:scale-102"
                :class="{
                  'bg-purple-100': message.user?.username === currentUser.username,
                  'hover:shadow-purple-200': message.user?.username === currentUser.username,
                  'hover:shadow-blue-200': message.user?.username !== currentUser.username
                }"
              >
                <div class="flex items-center space-x-2 mb-1">
                  <img 
                    :src="message.user?.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + message.user?.username" 
                    class="w-6 h-6 rounded-full"
                    :alt="message.user?.username"
                  />
                  <p class="text-sm font-wizard text-purple-800">
                    {{ message.user?.username || 'Unknown Wizard' }}
                    <span v-if="message.is_private" class="text-xs text-purple-500">(private)</span>
                  </p>
                </div>
                <p class="text-gray-800 font-medieval">{{ message.content.split(",")[0].split(":")[1]?.replaceAll(`"`  , '')}}</p>                <p class="text-xs text-gray-500 mt-1 font-wizard">
                  {{ new Date(message.created_at).toLocaleTimeString() }}
                </p>
              </div>
              <!-- Reactions -->
              <div class="flex space-x-1">
                <div 
                  v-for="reaction in message.message_reactions" 
                  :key="reaction.id"
                  class="bg-white px-2 py-1 rounded-full text-sm shadow-sm"
                >
                  {{ reaction.emoji }}
                  <span class="text-xs text-gray-500">{{ reaction.reactor?.username }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t bg-white p-4">
          <div class="flex items-center space-x-2 mb-2">
            <button
              @click="showEmojiPicker = !showEmojiPicker"
              class="p-2 rounded-lg hover:bg-purple-50"
            >
              😊
            </button>
            <div v-if="privateMessageTo" class="flex items-center space-x-2 bg-purple-50 px-3 py-1 rounded-full">
              <span class="text-sm text-purple-700">To: {{ privateMessageTo.username }}</span>
              <button @click="privateMessageTo = null" class="text-purple-500 hover:text-purple-700">×</button>
            </div>
          </div>
          <form @submit.prevent="sendMessage" class="flex space-x-2">
            <input
              v-model="newMessage"
              type="text"
              placeholder="Cast your message..."
              class="flex-1 px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-wizard"
              @input="handleTyping"
            />
            <button
              type="submit"
              class="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 font-wizard transition-all duration-300 transform hover:scale-105"
            >
              Send ✨
            </button>
          </form>
          <div v-if="isTyping" class="text-sm text-purple-600 mt-1 font-wizard">
            Casting spell...
          </div>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoomModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div class="bg-white p-6 rounded-lg shadow-xl w-96">
        <h3 class="text-xl font-wizard text-purple-800 mb-4">Create New Chamber</h3>
        <form @submit.prevent="createRoom" class="space-y-4">
          <div>
            <label class="block text-sm font-wizard text-purple-600 mb-1">Chamber Name</label>
            <input
              v-model="newRoomName"
              type="text"
              required
              placeholder="Enter chamber name"
              class="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label class="block text-sm font-wizard text-purple-600 mb-1">Description</label>
            <textarea
              v-model="newRoomDescription"
              placeholder="Enter chamber description"
              class="w-full px-4 py-2 border-2 border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateRoomModal = false"
              class="px-4 py-2 text-purple-600 hover:bg-purple-50 rounded-lg font-wizard"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-wizard"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Emoji Picker -->
    <EmojiPicker
      v-if="showEmojiPicker"
      @select="emoji => { 
        if (selectedMessage) {
          addReaction(selectedMessage.id, emoji);
        } else {
          newMessage += emoji;
        }
        showEmojiPicker = false;
      }"
      @close="showEmojiPicker = false"
    />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');

.font-wizard {
  font-family: 'MedievalSharp', cursive;
}

.font-medieval {
  font-family: 'MedievalSharp', cursive;
}

.scale-102 {
  transform: scale(1.02);
}
</style>