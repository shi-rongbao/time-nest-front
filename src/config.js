/**
 * 应用全局配置
 */

// API配置
const apiConfig = {
  // 生产环境API基础URL
  // 添加/api前缀，将通过Nginx代理转发到后端
  productionBaseUrl: '/api',
  
  // 开发环境API基础URL
  // 开发环境通常依赖package.json中的proxy配置
  developmentBaseUrl: '',
  
  // 获取当前环境的API基础URL
  getBaseUrl: () => {
    // 如果需要手动覆盖环境配置，可以取消下面注释并设置具体的URL
    // return 'http://your-api-server-url';
    
    return process.env.NODE_ENV === 'production'
      ? apiConfig.productionBaseUrl
      : apiConfig.developmentBaseUrl;
  }
};

// 导出配置
export default {
  api: apiConfig,
}; 