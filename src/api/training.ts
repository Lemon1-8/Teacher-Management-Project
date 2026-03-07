import request from '../utils/request'

export function getTrainingList(params: any) {
  return request({
    url: '/trainings',
    method: 'get',
    params
  })
}

export function getTrainingDetail(id: string) {
  return request({
    url: `/trainings/${id}`,
    method: 'get'
  })
}

export function enrollTraining(id: string) {
  return request({
    url: `/trainings/${id}/enroll`,
    method: 'post'
  })
}

export function cancelEnroll(id: string) {
  return request({
    url: `/trainings/${id}/cancel`,
    method: 'delete'
  })
}

export function getTrainingTypes() {
  return request({
    url: '/training-types',
    method: 'get'
  })
}

export function createTraining(data: any) {
  return request({
    url: '/trainings',
    method: 'post',
    data
  })
}

export function updateTraining(id: number, data: any) {
  return request({
    url: `/trainings/${id}`,
    method: 'put',
    data
  })
}

export function deleteTraining(id: number) {
  return request({
    url: `/trainings/${id}`,
    method: 'delete'
  })
}

export function getMyEnrollments(params: any) {
  return request({
    url: '/enrollments/my',
    method: 'get',
    params
  })
}

export function getAllEnrollments(params: any) {
  return request({
    url: '/enrollments',
    method: 'get',
    params
  })
}

export function auditEnrollment(id: number, status: 'approved' | 'rejected') {
  return request({
    url: `/enrollments/${id}/audit`,
    method: 'post',
    data: { status }
  })
}

export function attendance(enrollmentId: number) {
  return request({
    url: `/enrollments/${enrollmentId}/attendance`,
    method: 'post'
  })
}

export function getCertificate(enrollmentId: number) {
  return request({
    url: `/enrollments/${enrollmentId}/certificate`,
    method: 'get'
  })
}
