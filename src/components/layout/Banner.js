import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { getCachedAvatar } from "../../utils/cacheUtils";
import LikeIcon from "../../assets/images/like-icon.png";
import FriendIcon from "../../assets/images/friend-icon.png";
import MessageIcon from "../../assets/images/message-icon.png";
import '../../assets/styles/Banner.css';

const Banner = ({ hasUnread, onMessageClick }) => {
  const history = useHistory();
  const location = useLocation();
  const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "");
  
  // 获取当前路径以确定哪个按钮处于活动状态
  const currentPath = location.pathname;
  
  const handleHomeClick = () => {
    history.push('/home');
  };
  
  const handleMyTimeNestClick = () => {
    history.push('/my-time-nest-list');
  };
  
  const handlePublicTimeNestClick = () => {
    history.push('/public-time-nest-list');
  };
  
  const handleLikedListClick = () => {
    history.push('/my-liked-nests');
  };
  
  const handleFriendListClick = () => {
    history.push('/friend-list');
  };
  
  const handleMsgClick = () => {
    // 调用父组件传入的消息点击处理函数
    if (typeof onMessageClick === 'function') {
      onMessageClick();
    }
  };
  
  const handleAvatarClick = () => {
    history.push('/user-profile');
  };

  return (
    <div className="banner-container">
      <div className="banner-nav-buttons">
        <button 
          className={`banner-nav-button ${currentPath === '/home' ? 'active' : ''}`} 
          onClick={handleHomeClick}
        >
          首页
        </button>
        <button 
          className={`banner-nav-button ${currentPath === '/my-time-nest-list' ? 'active' : ''}`} 
          onClick={handleMyTimeNestClick}
        >
          我发布的拾光纪
        </button>
        <button 
          className={`banner-nav-button ${currentPath === '/public-time-nest-list' ? 'active' : ''}`} 
          onClick={handlePublicTimeNestClick}
        >
          公开的拾光纪
        </button>
      </div>
      
      <div className="banner-icon-buttons">
        {/* 点赞图标 - 在我点赞的拾光纪页面显示高亮 */}
        <div className={`banner-icon-button ${currentPath === '/my-liked-nests' ? 'active' : ''}`} onClick={handleLikedListClick}>
          <img src={LikeIcon} alt="我点赞的" className="banner-icon" />
        </div>
        
        {/* 好友图标 - 在好友列表页面显示高亮 */}
        <div className={`banner-icon-button ${currentPath === '/friend-list' ? 'active' : ''}`} onClick={handleFriendListClick}>
          <img src={FriendIcon} alt="好友列表" className="banner-icon" />
        </div>
        
        <div className="banner-icon-button message-icon-container" onClick={handleMsgClick}>
          <img src={MessageIcon} alt="消息通知" className="banner-icon" />
          {hasUnread && <div className="unread-indicator"></div>}
        </div>
        
        <div className="banner-icon-button" onClick={handleAvatarClick}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="头像" className="banner-avatar" />
          ) : (
            <div className="banner-avatar-placeholder">
              {/* 可以添加默认头像或用户首字母 */}
              用户
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Banner; 