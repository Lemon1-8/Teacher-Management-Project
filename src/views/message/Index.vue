<template>
  <div class="message-container">
    <div class="contact-list">
      <div class="list-header">
        <span>消息列表</span>
      </div>
      <div class="list-content" v-loading="loadingContacts">
        <div 
          v-for="contact in contacts" 
          :key="contact.id" 
          class="contact-item" 
          :class="{ active: currentContact?.id === contact.id }"
          @click="selectContact(contact)"
        >
          <div class="avatar">
            <el-avatar>{{ contact.username.substring(0, 1) }}</el-avatar>
            <el-badge v-if="contact.unreadCount > 0" :value="contact.unreadCount" class="badge" />
          </div>
          <div class="info">
            <div class="name-row">
              <span class="name">{{ contact.username }}</span>
              <span class="time">{{ formatTime(contact.lastTime) }}</span>
            </div>
            <div class="last-msg">{{ contact.lastMessage }}</div>
          </div>
        </div>
        <el-empty v-if="contacts.length === 0" description="暂无消息" />
      </div>
    </div>

    <div class="chat-area">
      <template v-if="currentContact">
        <div class="chat-header">
          <span>{{ currentContact.username }}</span>
          <span class="role-tag">{{ currentContact.role === 'trainer' ? '讲师' : '用户' }}</span>
        </div>
        
        <div class="chat-content" ref="chatContentRef">
          <div v-for="msg in messages" :key="msg.id" class="message-item" :class="{ self: msg.sender_id === userStore.userInfo?.id }">
            <div class="message-avatar">
              <el-avatar :size="36">{{ msg.sender_id === userStore.userInfo?.id ? '我' : currentContact.username.substring(0, 1) }}</el-avatar>
            </div>
            <div class="message-bubble">
              <div class="text">{{ msg.content }}</div>
              <div class="msg-time">{{ formatTime(msg.created_at) }}</div>
            </div>
          </div>
        </div>

        <div class="chat-input">
          <el-input
            v-model="inputContent"
            type="textarea"
            :rows="3"
            placeholder="输入消息..."
            @keydown.enter.exact.prevent="handleSend"
            @keydown.enter.ctrl="inputContent += '\n'"
          />
          <div class="input-actions">
            <span class="tip">Enter 发送</span>
            <el-button type="primary" @click="handleSend" :loading="sending">发送</el-button>
          </div>
        </div>
      </template>
      <el-empty v-else description="请选择联系人开始聊天" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getContacts, getMessages, sendMessage } from '../../api/message'
import { useUserStore } from '../../stores/user'
import { ElMessage } from 'element-plus'

const route = useRoute()
const userStore = useUserStore()

const loadingContacts = ref(false)
const contacts = ref<any[]>([])
const currentContact = ref<any>(null)
const messages = ref<any[]>([])
const inputContent = ref('')
const sending = ref(false)
const chatContentRef = ref<HTMLElement>()

const formatTime = (time: string) => {
  if (!time) return ''
  const date = new Date(time)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString()
}

const fetchContacts = async () => {
  loadingContacts.value = true
  try {
    const res: any = await getContacts()
    contacts.value = res
    
    // 如果 URL 中有 targetId，尝试选中该联系人
    const targetId = route.query.targetId ? parseInt(route.query.targetId as string) : null
    if (targetId) {
      const target = contacts.value.find(c => c.id === targetId)
      if (target) {
        selectContact(target)
      } else {
        // 如果联系人列表中没有（可能是第一次聊天），需要手动构造一个临时联系人对象
        // 这里暂时简化，假设如果没聊过天，需要先发一条才能出现在列表中
        // 或者调用 getUserInfo 获取对方信息？
        // 简单处理：如果是从详情页跳转过来的，应该携带 targetName
        if (route.query.targetName) {
          const tempContact = {
            id: targetId,
            username: route.query.targetName as string,
            role: 'trainer', // 假设是讲师
            lastMessage: '',
            lastTime: new Date().toISOString(),
            unreadCount: 0
          }
          contacts.value.unshift(tempContact)
          selectContact(tempContact)
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch contacts:', error)
  } finally {
    loadingContacts.value = false
  }
}

const selectContact = async (contact: any) => {
  currentContact.value = contact
  contact.unreadCount = 0 // 清除未读
  await fetchMessages(contact.id)
}

const fetchMessages = async (userId: number) => {
  try {
    const res: any = await getMessages(userId)
    messages.value = res
    scrollToBottom()
  } catch (error) {
    console.error('Failed to fetch messages:', error)
  }
}

const scrollToBottom = () => {
  nextTick(() => {
    if (chatContentRef.value) {
      chatContentRef.value.scrollTop = chatContentRef.value.scrollHeight
    }
  })
}

const handleSend = async () => {
  if (!inputContent.value.trim() || !currentContact.value) return
  
  sending.value = true
  try {
    const res: any = await sendMessage({
      receiver_id: currentContact.value.id,
      content: inputContent.value
    })
    
    // 添加到消息列表
    messages.value.push(res)
    inputContent.value = ''
    scrollToBottom()
    
    // 更新联系人列表的最后一条消息
    const contact = contacts.value.find(c => c.id === currentContact.value.id)
    if (contact) {
      contact.lastMessage = res.content
      contact.lastTime = res.created_at
      // 重新排序
      contacts.value.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime())
    }
  } catch (error) {
    console.error('Send message failed:', error)
  } finally {
    sending.value = false
  }
}

// 轮询新消息 (简单实现)
let pollTimer: any = null
onMounted(() => {
  fetchContacts()
  pollTimer = setInterval(async () => {
    if (currentContact.value) {
      // 仅轮询当前对话的新消息
      // 实际应该轮询所有未读，这里简化
      const res: any = await getMessages(currentContact.value.id)
      if (res.length > messages.value.length) {
        messages.value = res
        scrollToBottom()
      }
    }
  }, 5000)
})

</script>

<style scoped>
.message-container {
  display: flex;
  height: calc(100vh - 100px);
  background: #fff;
  border-radius: 4px;
  border: 1px solid #e6e6e6;
  overflow: hidden;
}

.contact-list {
  width: 280px;
  border-right: 1px solid #e6e6e6;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 15px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: bold;
  color: #333;
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.contact-item {
  display: flex;
  padding: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.contact-item:hover {
  background: #f5f7fa;
}

.contact-item.active {
  background: #ecf5ff;
}

.avatar {
  position: relative;
  margin-right: 12px;
}

.badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.info {
  flex: 1;
  min-width: 0;
}

.name-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.name {
  font-weight: 500;
  color: #333;
}

.time {
  font-size: 12px;
  color: #999;
}

.last-msg {
  font-size: 13px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.chat-header {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  font-weight: bold;
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-tag {
  font-size: 12px;
  background: #f0f9eb;
  color: #67c23a;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: normal;
}

.chat-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background: #f9f9f9;
}

.message-item {
  display: flex;
  margin-bottom: 20px;
}

.message-item.self {
  flex-direction: row-reverse;
}

.message-avatar {
  margin: 0 10px;
}

.message-bubble {
  max-width: 60%;
  background: #fff;
  padding: 10px 15px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  position: relative;
}

.self .message-bubble {
  background: #95ec69;
}

.text {
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.msg-time {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
  text-align: right;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #f0f0f0;
  background: #fff;
}

.input-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 10px;
  gap: 15px;
}

.tip {
  font-size: 12px;
  color: #999;
}
</style>