module.exports = function override(config, env) {
  // 不需要修改webpack配置本身，只需要确保开发服务器配置正确
  return config;
};

// 添加开发服务器配置
module.exports.devServer = function(configFunction) {
  return function(proxy, allowedHost) {
    const config = configFunction(proxy, allowedHost);
    
    // 修复allowedHosts配置
    config.allowedHosts = ['localhost', '.localhost', '127.0.0.1'];
    
    return config;
  };
}; 