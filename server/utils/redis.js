const redis = require('redis');
const config = require('../config/app.config');
const logger = require('./logger');

const client = redis.createClient({
  url: `redis://${config.redis.host}:${config.redis.port}`
});

client.on('error', (err) => logger.error('Redis Client Error: ' + err.message));
client.on('connect', () => logger.info('Redis 连接成功'));

// 初始化连接
const initRedis = async () => {
  try {
    if (!client.isOpen) {
      await client.connect();
    }
  } catch (error) {
    logger.error('Redis Init Error: ' + error.message);
    // 不抛出错误，允许应用降级运行 (例如 token 存储在内存或跳过 redis)
    // 但如果业务强依赖 redis，这里应该抛出或重试
  }
};

/**
 * 存储 Token
 * @param {string} userId 用户ID
 * @param {string} token JWT Token
 * @param {number} expireTime 过期时间 (秒)
 */
const setToken = async (userId, token, expireTime) => {
  try {
    await initRedis();
    const key = `auth:token:${userId}`;
    await client.set(key, token, {
      EX: expireTime
    });
  } catch (error) {
    logger.error('Redis SetToken Error: ' + error.message);
  }
};

/**
 * 获取 Token
 * @param {string} userId 用户ID
 */
const getToken = async (userId) => {
  try {
    await initRedis();
    const key = `auth:token:${userId}`;
    return await client.get(key);
  } catch (error) {
    logger.error('Redis GetToken Error: ' + error.message);
    return null;
  }
};

/**
 * 移除 Token (退出登录)
 * @param {string} userId 用户ID
 */
const removeToken = async (userId) => {
  try {
    await initRedis();
    const key = `auth:token:${userId}`;
    await client.del(key);
  } catch (error) {
    logger.error('Redis RemoveToken Error: ' + error.message);
  }
};

module.exports = {
  client,
  initRedis,
  setToken,
  getToken,
  removeToken
};
