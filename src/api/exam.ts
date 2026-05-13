import request from '../utils/request'

export function getExamList(params: any) {
  return request({
    url: '/exams',
    method: 'get',
    params
  })
}

export function getExamDetail(id: number) {
  return request({
    url: `/exams/${id}`,
    method: 'get'
  })
}

export function startExam(id: number) {
  return request({
    url: `/exams/${id}/start`,
    method: 'post'
  })
}

export function submitExam(resultId: number, data: any) {
  return request({
    url: `/exams/results/${resultId}/submit`,
    method: 'post',
    data
  })
}

export function createExam(data: any) {
  return request({
    url: '/exams',
    method: 'post',
    data
  })
}

export function updateExam(id: number, data: any) {
  return request({
    url: `/exams/${id}`,
    method: 'put',
    data
  })
}

export function deleteExam(id: number) {
  return request({
    url: `/exams/${id}`,
    method: 'delete'
  })
}

export function getExamResults(examId: number, params: any) {
  return request({
    url: `/exams/${examId}/results`,
    method: 'get',
    params
  })
}

// --- 题目管理 ---

export function getExamQuestions(examId: number) {
  return request({
    url: `/exams/${examId}/questions`,
    method: 'get'
  })
}

export function saveExamQuestions(examId: number, questions: any[]) {
  return request({
    url: `/exams/${examId}/questions`,
    method: 'post',
    data: { questions }
  })
}

export function generateQuestions(examId: number, params: any, file?: File) {
  if (file) {
    const formData = new FormData()
    formData.append('file', file)
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        formData.append(key, String(params[key]))
      }
    })
    return request({
      url: `/exams/${examId}/generate-questions`,
      method: 'post',
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000
    })
  }
  return request({
    url: `/exams/${examId}/generate-questions`,
    method: 'post',
    data: params,
    timeout: 120000
  })
}

export function importQuestions(examId: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  
  return request({
    url: `/exams/${examId}/import`,
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
