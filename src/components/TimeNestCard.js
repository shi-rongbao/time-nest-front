import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFeatherAlt, faEnvelope, faImage, faLock, faUnlock } from '@fortawesome/free-solid-svg-icons';
import '../assets/styles/TimeNestGrid.css';
import capsuleImage from '../assets/images/capsule.avif';
import mailImage from '../assets/images/mail.avif';
import imagePhoto from '../assets/images/image.avif';

// 默认封面图
const DEFAULT_COVERS = {
  1: capsuleImage, // 时光胶囊
  2: mailImage,    // 邮件胶囊
  3: imagePhoto    // 图片胶囊
};

const TimeNestCard = ({ data, onClick }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  
  // 图片懒加载
  useEffect(() => {
    if (!imageRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // 图片进入可视区域，开始加载
          const img = imageRef.current;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            observer.unobserve(img);
          }
        }
      },
      { threshold: 0.1 }
    );
    
    observer.observe(imageRef.current);
    
    return () => {
      if (imageRef.current) {
        observer.unobserve(imageRef.current);
      }
    };
  }, []);
  
  // 获取拾光纪类型图标
  const getNestTypeIcon = (typeNum) => {
    switch (typeNum) {
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
    switch (typeNum) {
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
      return getDefaultCover(data.nestType);
    }
    return data.coverImage;
  };
  
  return (
    <div 
      className={`time-nest-card type-${data.nestType}`}
      onClick={() => onClick && onClick(data.id)}
    >
      <div className="card-cover">
        <img
          ref={imageRef}
          data-src={getCoverImage()}
          alt={data.nestTitle}
          className={`card-image ${imageLoaded ? 'loaded' : ''}`}
          onLoad={() => setImageLoaded(true)}
        />
        <div className="card-type-badge">
          <FontAwesomeIcon icon={getNestTypeIcon(data.nestType)} /> {getNestTypeText(data.nestType)}
        </div>
      </div>
      
      <div className="card-content">
        <h3 className="card-title">{data.nestTitle}</h3>
        <p className="card-preview">
          {data.nestContent && data.nestContent.length > 100 
            ? `${data.nestContent.substring(0, 100)}...` 
            : data.nestContent}
        </p>
      </div>
      
      <div className="card-footer">
        <span className="card-date">创建于: {formatDate(data.createdAt)}</span>
        <span className={`card-unlock-status ${data.unlockedStatus === 1 ? 'status-unlocked' : 'status-locked'}`}>
          <FontAwesomeIcon icon={data.unlockedStatus === 1 ? faUnlock : faLock} /> 
          {data.unlockedStatus === 1 ? '已解锁' : '未解锁'}
        </span>
      </div>
    </div>
  );
};

export default TimeNestCard; 