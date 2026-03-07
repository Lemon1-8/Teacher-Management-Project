import request from '../utils/request'

export function getMyNotifications(params: any) {
  return request({
    url: '/notifications/my',
    method: 'get',
    params
  })
}

export function markAsRead(id: number | 'all') {
  return request({
    url: `/notifications/${id}/read`,
    method: 'put'
  })
}
