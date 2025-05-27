import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFeatherAlt, faEnvelope, faImage, faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';
import '../assets/styles/TimeNestGrid.css';
import capsuleImage from '../assets/images/capsule.avif';
import mailImage from '../assets/images/mail.avif';
import imagePhoto from '../assets/images/image.avif';
import likesIcon from '../assets/images/likes-icon.png';
import unlikesIcon from '../assets/images/unlikes-icon.png';
import { message } from 'antd'; // 引入 antd 的 message 组件用于提示

// 默认封面图
const DEFAULT_COVERS = {
  1: capsuleImage, // 时光胶囊
  2: mailImage,    // 邮件胶囊
  3: imagePhoto    // 图片胶囊
};

const TimeNestCard = ({ data = {}, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  const [isLiked, setIsLiked] = useState(data && data.isLike === 1); // 确保 data 存在且 isLike 为 1
  
  // 图片懒加载
  useEffect(() => {
    const currentImageRef = imageRef.current;
    if (!currentImageRef) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 图片进入可视区域，开始加载
          const img = currentImageRef; // 使用保存的 ref 值
          if (img.dataset.src) {
            img.src = img.dataset.src;
            observer.unobserve(img);
          }
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(currentImageRef);
    
    return () => {
      if (currentImageRef) {
        observer.unobserve(currentImageRef);
      }
    };
  }, [imageRef]); // 将 imageRef 加入依赖项
  
  // 获取拾光纪类型图标
  const getNestTypeIcon = (typeNum) => {
    switch(typeNum) {
      case 1:
        return faFeatherAlt;
      case 2:
        return faEnvelope;
      case 3:
        return faImage;
      default:
        return faFeatherAlt;
    }
  };
  
  // 获取拾光纪类型文本
  const getNestTypeText = (typeNum) => {
    switch(typeNum) {
      case 1:
        return "时光胶囊";
      case 2:
        return "邮件胶囊";
      case 3:
        return "图片胶囊";
      default:
        return "时光胶囊";
    }
  };
  
  // 格式化日期
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  
  // 获取默认封面
  const getDefaultCover = (nestType) => {
    return DEFAULT_COVERS[nestType] || DEFAULT_COVERS[1];
  };
  
  // 获取封面图片（如果有）或使用默认封面
  const getCoverImage = () => {
    // 确保每种类型都有默认封面
    if (!data.coverImage) {
      return getDefaultCover(data.nestType || 1);
    }
    return data.coverImage;
  };

  // 处理点赞/取消点赞逻辑
  const handleLikeClick = async (e) => {
    e.stopPropagation(); // 阻止事件冒泡到卡片点击事件
    const newLikeStatus = !isLiked;
    const likeType = newLikeStatus ? 1 : 0;

    try {
      const token = localStorage.getItem('satoken'); // 改为 'satoken'
      if (!token) {
        message.error('请先登录');
        return;
      }

      const response = await fetch('/timeNest/likeTimeNest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'satoken': token // 改为 'satoken'，并移除 'Bearer '
        },
        body: JSON.stringify({
          id: data.id,
          likeType: likeType
        })
      });

      const result = await response.json();

      if (result.success) {
        setIsLiked(newLikeStatus);
        message.success(newLikeStatus ? '点赞成功' : '取消点赞成功');
      } else {
        message.error(result.message || (newLikeStatus ? '点赞失败' : '取消点赞失败'));
      }
    } catch (error) {
      console.error('点赞/取消点赞失败:', error);
      message.error('操作失败，请稍后再试');
    }
  };

  return (
    <div 
      className={`time-nest-card type-${data.nestType || 1}`}
      onClick={() => onClick && onClick(data.id)}
    >
      <div className="card-cover">
        <img
          ref={imageRef}
          data-src={getCoverImage()}
          alt={data.nestTitle || '拾光纪'}
          className={`card-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="card-type-badge">
          <FontAwesomeIcon icon={getNestTypeIcon(data.nestType)} /> {getNestTypeText(data.nestType)}
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{data.nestTitle || '无标题'}</h3>
        <p className="card-preview">
          {data.nestContent && data.nestContent.length > 100 
            ? `${data.nestContent.substring(0, 100)}...` 
            : (data.nestContent || '无内容')}
        </p>
      </div>
      
      <div className="card-footer">
        <button onClick={handleLikeClick} className="like-button">
          <img src={isLiked ? likesIcon : unlikesIcon} alt="like" className="like-icon" />
        </button>
        <span className={`card-unlock-status ${(data.unlockedStatus === 1) ? 'status-unlocked' : 'status-locked'}`}>
          <FontAwesomeIcon icon={(data.unlockedStatus === 1) ? faUnlock : faLock} />
          {(data.unlockedStatus === 1) ? '已解锁' : '未解锁'}
        </span>
      </div>
    </div>
  );
};

export default TimeNestCard; 