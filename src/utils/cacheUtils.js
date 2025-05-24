/**
 * 用户头像缓存工具
 */

// 缓存键名
const AVATAR_CACHE_KEY = 'user_avatar_cache';
const AVATAR_CACHE_TIMESTAMP = 'user_avatar_timestamp';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 缓存过期时间：24小时

/**
 * 从缓存中获取用户头像
 * @returns {string|null} 头像URL或null
 */
export const getCachedAvatar = () => {
  try {
    const timestamp = localStorage.getItem(AVATAR_CACHE_TIMESTAMP);
    
    // 检查缓存是否过期
    if (timestamp && Date.now() - parseInt(timestamp) < CACHE_EXPIRY) {
      return localStorage.getItem(AVATAR_CACHE_KEY);
    }
    
    // 如果缓存过期，清除缓存
    localStorage.removeItem(AVATAR_CACHE_KEY);
    localStorage.removeItem(AVATAR_CACHE_TIMESTAMP);
    return null;
  } catch (error) {
    console.error('获取头像缓存出错:', error);
    return null;
  }
};

/**
 * 缓存用户头像
 * @param {string} avatarUrl 头像URL
 */
export const cacheAvatar = (avatarUrl) => {
  if (!avatarUrl) return;
  
  try {
    localStorage.setItem(AVATAR_CACHE_KEY, avatarUrl);
    localStorage.setItem(AVATAR_CACHE_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('缓存头像出错:', error);
  }
};

/**
 * 清除头像缓存
 */
export const clearAvatarCache = () => {
  try {
    localStorage.removeItem(AVATAR_CACHE_KEY);
    localStorage.removeItem(AVATAR_CACHE_TIMESTAMP);
  } catch (error) {
    console.error('清除头像缓存出错:', error);
  }
}; 