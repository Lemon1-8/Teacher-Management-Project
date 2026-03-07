import request from '../utils/request'

export function getDashboardData() {
  return request({
    url: '/statistics/dashboard',
    method: 'get'
  })
}

export function getMyHours() {
  return request({
    url: '/statistics/my-hours',
    method: 'get'
  })
}
