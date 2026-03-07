import request from '../utils/request'

export function getUserList(params: any) {
  return request({
    url: '/users',
    method: 'get',
    params
  })
}

export function getUserDetail(id: number) {
  return request({
    url: `/users/${id}`,
    method: 'get'
  })
}

export function createUser(data: any) {
  return request({
    url: '/users',
    method: 'post',
    data
  })
}

export function updateUser(id: number, data: any) {
  return request({
    url: `/users/${id}`,
    method: 'put',
    data
  })
}

export function deleteUser(id: number) {
  return request({
    url: `/users/${id}`,
    method: 'delete'
  })
}

export function getMe() {
  return request({
    url: '/users/me',
    method: 'get'
  })
}
