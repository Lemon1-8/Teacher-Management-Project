import request from '../utils/request'

/**
 * 上传文件
 * @param file 文件对象
 * @param type 业务类型 (如 'covers', 'materials')
 */
export function uploadFile(file: File, type: string = 'others') {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('type', type)
  
  return request({
    url: '/files/upload',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}
