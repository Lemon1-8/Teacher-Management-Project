/**
 * 统一响应格式工具
 */

class Response {
  /**
   * 成功响应
   * @param {Object} res Express res 对象
   * @param {any} data 返回的数据
   * @param {string} message 成功消息
   * @param {number} code 状态码，默认为 200
   */
  static success(res, data = {}, message = 'success', code = 200) {
    return res.status(code).json({
      code,
      message,
      data
    });
  }

  /**
   * 错误响应
   * @param {Object} res Express res 对象
   * @param {string} message 错误信息
   * @param {number} code 状态码，默认为 400
   * @param {any} error 详细错误(可选)
   */
  static error(res, message = 'error', code = 400, error = null) {
    const response = {
      code,
      message
    };
    if (error) {
      response.error = error;
    }
    return res.status(code).json(response);
  }
}

module.exports = Response;
