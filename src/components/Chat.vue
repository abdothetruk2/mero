<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
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
const isAdmin = ref(false);
const showUserList = ref(false);
const users = ref([]);

const filteredMessages = computed(() => {
  return messages.value.filter(msg => {
    if (selectedRoom.value) {
      return msg.room_id === selectedRoom.value.id;
    }
    return !msg.room_id && (
      !msg.is_private || 
      msg.user_id === currentUser.value?.id || 
      msg.recipient_id === currentUser.value?.id
    );
  });
});

const scrollToBottom = () => {
  if (messageContainer.value) {
    messageContainer.value.scrollTop = messageContainer.value.scrollHeight;
  }
};

const loadUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('chat_users')
      .select('*')
      .order('username');

    if (error) throw error;
    users.value = data;
  } catch (error) {
    console.error('Error loading users:', error);
  }
};

const loadMessages = async () => {
  try {
    let query = supabase
      .from('messages')
      .select(`
        *,
        user:chat_users!messages_sender_fkey(username, avatar_url),
        message_reactions(
          id,
          emoji,
          user_id,
          reactor:chat_users!message_reactions_user_id_fkey_reactor(username)
        )
      `)
      .order('created_at', { ascending: true });

    if (selectedRoom.value) {
      query = query.eq('room_id', selectedRoom.value.id);
    } else {
      query = query.or(`is_private.eq.false,and(is_private.eq.true,or(user_id.eq.${currentUser.value?.id},recipient_id.eq.${currentUser.value?.id}))`);
    }

    const { data, error } = await query;
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
  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

const addReaction = async (messageId, emoji) => {
  try {
    const { error } = await supabase
      .from('message_reactions')
      .insert({
        message_id: messageId,
        user_id: currentUser.value.id,
        emoji
      });

    if (error) throw error;
    await loadMessages();
  } catch (error) {
    console.error('Error adding reaction:', error);
  }
};

const createRoom = async () => {
  if (!newRoomName.value.trim() || !isAdmin.value) return;

  try {
    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: newRoomName.value,
        description: newRoomDescription.value,
        created_by: currentUser.value.id
      })
      .select()
      .single();

    if (error) throw error;

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
    selectedRoom.value = data;
    await loadMessages();
  } catch (error) {
    console.error('Error creating room:', error);
  }
};

const sendMessage = async () => {
  if (!newMessage.value.trim() || !currentUser.value) return;

  try {
    const messageData = {
      content: newMessage.value,
      user_id: currentUser.value.id,
      room_id: selectedRoom.value?.id,
      is_private: !!privateMessageTo.value,
      recipient_id: privateMessageTo.value?.id
    };

    const { error } = await supabase
      .from('messages')
      .insert(messageData);

    if (error) throw error;

    newMessage.value = '';
    isTyping.value = false;
    privateMessageTo.value = null;
    await loadMessages();
  } catch (error) {
    console.error('Error sending message:', error);
  }
};

const handleTyping = () => {
  isTyping.value = true;
  setTimeout(() => {
    isTyping.value = false;
  }, 2000);
};

const startPrivateMessage = (user) => {
  if (user.id === currentUser.value.id) return;
  privateMessageTo.value = user;
  showUserList.value = false;
};

const joinChat = async () => {
  if (!username.value.trim()) return;
  
  try {
    currentUser.value = await getOrCreateUser(username.value);
    isAdmin.value = await checkAdminStatus(currentUser.value.id);
    connectSocket(currentUser.value.username);
    showUsernameForm.value = false;
    await Promise.all([
      loadMessages(),
      loadRooms(),
      loadUsers()
    ]);
  } catch (error) {
    console.error('Error joining chat:', error);
  }
};

const checkAdminStatus = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('chat_users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) throw error;
    return data?.is_admin || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

onMounted(() => {
  socket.on('new_message', async () => {
    await loadMessages();
  });

  socket.on('user_joined', async () => {
    await loadUsers();
  });
});

onUnmounted(() => {
  disconnectSocket();
});

watch(selectedRoom, async () => {
  await loadMessages();
});
</script>

<template>
  <div class="flex flex-col h-full bg-gray-50">
    <SunAnimation />
    
    <!-- Username Form -->
    <div v-if="showUsernameForm" class="flex items-center justify-center h-full animate-fade-in">
      <div class="bg-white p-8 rounded-lg shadow-lg w-96 border-2 border-primary-300 animate-scale-in">
        <h2 class="text-2xl font-cormorant text-primary-800 mb-6 text-center">Enter the Realm</h2>
        <form @submit.prevent="joinChat" class="space-y-4">
          <div>
            <label for="username" class="block text-sm font-cormorant text-primary-600 mb-1">
              Choose your wizard name
            </label>
            <input
              id="username"
              v-model="username"
              type="text"
              required
              placeholder="Enter your mystical name"
              class="w-full px-4 py-2 border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-cormorant"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-cormorant text-primary-600">
              Profile Picture
            </label>
            <input
              type="file"
              accept="image/*"
              @change="handleFileUpload"
              class="w-full text-sm text-primary-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-cormorant file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-smooth"
            />
          </div>
          <button
            type="submit"
            class="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-cormorant transition-all duration-300 transform hover:scale-105 hover:shadow-glow"
          >
            Join the Magic Circle
          </button>
        </form>
      </div>
    </div>

    <!-- Chat Interface -->
    <div v-else class="flex h-full animate-fade-in">
      <!-- Rooms Sidebar -->
      <div class="w-64 bg-white border-r p-4 shadow-lg">
        <h3 class="font-cormorant text-lg mb-4 text-primary-800">Magic Chambers</h3>
        <div class="space-y-2">
          <button
            v-for="room in rooms"
            :key="room.id"
            @click="selectedRoom = room"
            class="w-full p-2 text-left rounded-lg hover:bg-primary-50 transition-smooth animate-slide-in"
            :class="{ 'bg-primary-100 shadow-glow': selectedRoom?.id === room.id }"
          >
            {{ room.name }}
          </button>
        </div>
        <button
          
          @click="showCreateRoomModal = true"
          class="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-cormorant transition-smooth hover:shadow-glow"
        >
          Create Chamber
        </button>
        <button
          @click="showUserList = true"
          class="mt-2 w-full px-4 py-2 bg-primary-100 text-primary-700 rounded-lg hover:bg-primary-200 font-cormorant transition-smooth"
        >
          Private Message
        </button>
      </div>

      <!-- Messages Container -->
      <div class="flex-1 flex flex-col">
        <div class="bg-primary-700 text-white p-4 shadow-lg">
          <h2 class="text-xl font-cormorant">
            {{ selectedRoom ? selectedRoom.name : privateMessageTo ? `Private Chat with ${privateMessageTo.username}` : 'Main Hall' }}
          </h2>
          <p class="text-sm text-primary-200 font-spectral">
            {{ selectedRoom ? selectedRoom.description : privateMessageTo ? 'Private conversation' : 'Welcome to the main discussion area' }}
          </p>
        </div>

        <div 
          ref="messageContainer"
          class="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-primary-50 to-blue-50"
        >
          <div 
            v-for="message in filteredMessages" 
            :key="message.id"
            class="flex items-start space-x-2 animate-fade-in"
            :class="{ 'justify-end': message.user?.username === currentUser.username }"
          >
            <div class="flex flex-col items-start space-y-1">
              <div 
                class="bg-white p-3 rounded-lg shadow-lg max-w-[80%] transition-smooth hover:shadow-glow"
                :class="{
                  'bg-primary-50': message.user?.username === currentUser.username,
                  'hover:shadow-glow-lg': message.user?.username === currentUser.username
                }"
              >
                <div class="flex items-center space-x-2 mb-1">
                  <img 
                    :src="message.user?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user?.username}`" 
                    class="w-8 h-8 rounded-full shadow-md transition-smooth hover:scale-110"
                    :alt="message.user?.username"
                  />
                  <p class="text-sm font-cormorant text-primary-800">
                    {{ message.user?.username || 'Unknown Wizard' }}
                    <span v-if="message.is_private" class="text-xs text-primary-500">(private)</span>
                  </p>
                </div>
                <p class="text-gray-800 font-spectral">{{ message.content }}</p>
                <p class="text-xs text-gray-500 mt-1 font-cormorant">
                  {{ new Date(message.created_at).toLocaleTimeString() }}
                </p>
              </div>
              <!-- Reactions -->
              <div class="flex space-x-1">
                <div 
                  v-for="reaction in message.message_reactions" 
                  :key="reaction.id"
                  class="bg-white px-2 py-1 rounded-full text-sm shadow-md hover:shadow-glow transition-smooth"
                >
                  {{ reaction.emoji }}
                  <span class="text-xs text-gray-500">{{ reaction.reactor?.username }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Message Input -->
        <div class="border-t bg-white p-4 shadow-lg">
          <div class="flex items-center space-x-2 mb-2">
            <button
              @click="showEmojiPicker = !showEmojiPicker"
              class="p-2 rounded-lg hover:bg-primary-50 transition-smooth"
            >
              😊
            </button>
            <div v-if="privateMessageTo" class="flex items-center space-x-2 bg-primary-50 px-3 py-1 rounded-full animate-fade-in">
              <span class="text-sm text-primary-700">To: {{ privateMessageTo.username }}</span>
              <button @click="privateMessageTo = null" class="text-primary-500 hover:text-primary-700">×</button>
            </div>
          </div>
          <form @submit.prevent="sendMessage" class="flex space-x-2">
            <input
              v-model="newMessage"
              type="text"
              placeholder="Cast your message..."
              class="flex-1 px-4 py-2 border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 font-cormorant transition-smooth"
              @input="handleTyping"
            />
            <button
              type="submit"
              class="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 font-cormorant transition-all duration-300 transform hover:scale-105 hover:shadow-glow"
            >
              Send ✨
            </button>
          </form>
          <div v-if="isTyping" class="text-sm text-primary-600 mt-1 font-cormorant animate-pulse">
            Casting spell...
          </div>
        </div>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateRoomModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fade-in">
      <div class="bg-white p-6 rounded-lg shadow-xl w-96 animate-scale-in">
        <h3 class="text-xl font-cormorant text-primary-800 mb-4">Create New Chamber</h3>
        <form @submit.prevent="createRoom" class="space-y-4">
          <div>
            <label class="block text-sm font-cormorant text-primary-600 mb-1">Chamber Name</label>
            <input
              v-model="newRoomName"
              type="text"
              required
              placeholder="Enter chamber name"
              class="w-full px-4 py-2 border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-smooth"
            />
          </div>
          <div>
            <label class="block text-sm font-cormorant text-primary-600 mb-1">Description</label>
            <textarea
              v-model="newRoomDescription"
              placeholder="Enter chamber description"
              class="w-full px-4 py-2 border-2 border-primary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 transition-smooth"
            ></textarea>
          </div>
          <div class="flex justify-end space-x-2">
            <button
              type="button"
              @click="showCreateRoomModal = false"
              class="px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg font-cormorant transition-smooth"
            >
              Cancel
            </button>
            <button
              type="submit"
              class="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-cormorant transition-smooth hover:shadow-glow"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- User List Modal for Private Messages -->
    <div v-if="showUserList" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center animate-fade-in">
      <div class="bg-white p-6 rounded-lg shadow-xl w-96 animate-scale-in">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-cormorant text-primary-800">Select User for Private Message</h3>
          <button
            @click="showUserList = false"
            class="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        <div class="max-h-96 overflow-y-auto">
          <button
            v-for="user in users"
            :key="user.id"
            @click="startPrivateMessage(user)"
            class="w-full p-3 text-left hover:bg-primary-50 rounded-lg mb-2 transition-smooth flex items-center space-x-3"
            :class="{ 'opacity-50 cursor-not-allowed': user.id === currentUser.id }"
          >
            <img 
              :src="user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`"
              class="w-8 h-8 rounded-full"
              :alt="user.username"
            />
            <span class="font-cormorant">{{ user.username }}</span>
          </button>
        </div>
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
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>