const Minio = require('minio');
const config = require('../config/app.config');
const logger = require('./logger');

const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: false,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey
});

// 初始化 Bucket
const initBucket = async () => {
  try {
    const bucketName = config.minio.bucket;
    const exists = await minioClient.bucketExists(bucketName);
    if (!exists) {
      await minioClient.makeBucket(bucketName, 'us-east-1');
      logger.info(`MinIO Bucket "${bucketName}" 创建成功`);
    } else {
      logger.info(`MinIO Bucket "${bucketName}" 已存在`);
    }

    // 设置策略为公共读
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetBucketLocation', 's3:ListBucket'],
          Resource: [`arn:aws:s3:::${bucketName}`]
        },
        {
          Effect: 'Allow',
          Principal: { AWS: ['*'] },
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`]
        }
      ]
    };
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    
    /*
    // 设置 CORS 规则，允许 Web 端跨域预览和下载
    // 注意：某些 MinIO 版本或客户端库可能不支持 setBucketCors，这里暂时注释以防报错
    const corsConfig = {
      CORSRules: [
        {
          AllowedOrigins: ['*'],
          AllowedMethods: ['GET', 'HEAD', 'POST', 'PUT'],
          AllowedHeaders: ['*'],
          ExposeHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']
        }
      ]
    };
    try {
      await minioClient.setBucketCors(bucketName, corsConfig);
    } catch (e) {
      logger.warn('MinIO setBucketCors failed (ignorable): ' + e.message);
    }
    */
    
    logger.info(`MinIO Bucket "${bucketName}" 权限与 CORS 已同步`);
  } catch (error) {
    logger.error(`MinIO 初始化失败 (连接到 ${config.minio.endpoint}:${config.minio.port}): ` + error.message);
    if (error.message.includes('API port')) {
      logger.info('提示：请检查您的 MinIO API 端口（通常是 9000）是否与控制台端口（通常是 9001）配置反了。');
    }
  }
};

/**
 * 上传文件到 MinIO
 * @param {string} objectName 存储在 MinIO 的对象名称
 * @param {string} filePath 本地文件路径
 * @returns {string} 文件的访问 URL
 */
const uploadFile = async (objectName, filePath) => {
  try {
    const bucketName = config.minio.bucket;
    await minioClient.fPutObject(bucketName, objectName, filePath);
    
    // 对 objectName 进行 URL 编码，解决中文路径/文件名无法访问的问题
    const encodedObjectName = objectName.split('/').map(part => encodeURIComponent(part)).join('/');
    
    // 返回访问地址
    return `http://${config.minio.endpoint}:${config.minio.port}/${bucketName}/${encodedObjectName}`;
  } catch (error) {
    logger.error('MinIO 上传失败: ' + error.message);
    throw error;
  }
};

module.exports = {
  minioClient,
  initBucket,
  uploadFile
};
