import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 10000
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    // 如果返回 code 为 0 或 200 表示成功 (根据不同后端规范)
    if (res.code !== 0 && res.code !== 200 && res.code !== 201) {
      ElMessage.error(res.message || 'Error')
      if (res.code === 401) {
        localStorage.removeItem('token')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message || 'Error'))
    }
    return res.data
  },
  (error) => {
    // 处理 HTTP 状态码错误 (如 403, 404, 500)
    let message = error.message || '网络连接错误'
    if (error.response && error.response.data) {
      message = error.response.data.message || message
    }
    ElMessage.error(message)
    return Promise.reject(error)
  }
)

export default service
