import request from '../utils/request'

// 获取联系人列表
export function getContacts() {
  return request({
    url: '/messages/contacts',
    method: 'get'
  })
}

// 获取与某人的聊天记录
export function getMessages(userId: number) {
  return request({
    url: `/messages/${userId}`,
    method: 'get'
  })
}

// 发送消息
export function sendMessage(data: { receiver_id: number; content: string }) {
  return request({
    url: '/messages',
    method: 'post',
    data
  })
}
