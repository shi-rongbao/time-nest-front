import React, { useState, useEffect, useRef } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faLock, faUnlock, faClock, faUser, faEnvelope, faTag, faInfoCircle, faCheckCircle, faTimesCircle, faImage } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestDetail.css';
import '../../assets/styles/TimeNestList.css';

// Toast 通知组件
const Toast = ({ message, type, onClose }) => {
  const toastRef = useRef(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      // 添加淡出动画
      if (toastRef.current) {
        toastRef.current.classList.add('toast-fade-out');
      }
      // 再等待一会儿后完全关闭
      setTimeout(onClose, 300);
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const getIcon = () => {
    switch(type) {
      case 'success':
        return <FontAwesomeIcon icon={faCheckCircle} />;
      case 'error':
        return <FontAwesomeIcon icon={faTimesCircle} />;
      default:
        return <FontAwesomeIcon icon={faInfoCircle} />;
    }
  };
  
  return (
    <div ref={toastRef} className={`toast-notification toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
};

const TimeNestDetail = () => {
  const { id } = useParams();
  const history = useHistory();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [nestData, setNestData] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // 从location state中获取id，如果URL中没有id参数
  const nestId = id || (location.state && location.state.id);

  useEffect(() => {
    const fetchTimeNestDetail = async () => {
      if (!nestId) {
        setError('未找到拾光纪ID');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.fetchWithToken("/timeNest/queryTimeNest", {
          method: 'POST',
          body: JSON.stringify({ id: Number(nestId) })
        });

        if (response.success) {
          setNestData(response.data);
        } else {
          setError(response.message || '获取拾光纪详情失败');
        }
      } catch (error) {
        console.error('获取拾光纪详情出错:', error);
        setError('获取拾光纪详情时发生错误');
      } finally {
        setLoading(false);
      }
    };

    fetchTimeNestDetail();
  }, [nestId]);

  const goBack = () => {
    history.goBack();
  };

  // 显示通知的函数
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // 关闭通知的函数
  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return dateString;
  };

  // 获取拾光纪类型文本
  const getNestTypeText = (type) => {
    switch (type) {
      case 1: return '个人拾光纪';
      case 2: return '共同拾光纪';
      default: return '未知类型';
    }
  };

  // 获取拾光纪状态文本和颜色
  const getStatusInfo = (unlockedStatus) => {
    if (unlockedStatus === 1) {
      return { text: '已解锁', color: 'green', icon: faUnlock };
    } else {
      return { text: '未解锁', color: 'red', icon: faLock };
    }
  };

  if (loading) {
    return (
      <div className="time-nest-detail-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="time-nest-detail-error">
        <div className="error-card">
          <div className="error-content">
            <h4 className="error-title">{error}</h4>
            <button className="btn-primary" onClick={goBack}>返回</button>
          </div>
        </div>
      </div>
    );
  }

  if (!nestData) {
    return null;
  }

  const statusInfo = getStatusInfo(nestData.unlockedStatus);

  return (
    <div className="time-nest-detail-container">
      {/* Toast 通知 */}
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
      
      <div className="header-section">
        <div className="back-button-container">
          <button className="public-nest-back-button" onClick={goBack}>
            <span>返回</span>
          </button>
        </div>
        
        <h1 className="page-title">{nestData.nestTitle}</h1>
      </div>

      <div className="time-nest-detail-card">
        <div className="time-nest-content">
          <h4 className="content-title">内容</h4>
          <p className="content-text">{nestData.nestContent}</p>
        </div>

        {/* 图片显示区域 */}
        {nestData.imageUrl && (
          <div className="time-nest-images">
            <h4 className="content-title">
              <FontAwesomeIcon icon={faImage} style={{ marginRight: '8px' }} />
              图片
            </h4>
            <div className="image-container">
              <img 
                src={nestData.imageUrl} 
                alt="拾光纪图片" 
                className="nest-image"
                onClick={() => window.open(nestData.imageUrl, '_blank')}
              />
            </div>
          </div>
        )}
        
        {/* 邮件信息显示 */}
        {nestData.toEmail && (
          <div className="time-nest-email">
            <h4 className="content-title">
              <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px' }} />
              邮件接收
            </h4>
            <p className="email-text">
              <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '8px' }} />
              {nestData.toEmail}
            </p>
          </div>
        )}

        {/* 显示创建者信息，不论拾光纪类型 */}
        {nestData.togetherUsers && nestData.togetherUsers.length > 0 && (
          <>
            <div className="divider"></div>
            <div className="time-nest-users">
              <h4 className="users-title">拾光纪创建者</h4>
              {nestData.togetherUsers.map((user, index) => (
                <div key={index} className="user-card">
                  <div className="user-info">
                    <div className="user-avatar">
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.nickName} 
                          className="avatar-image"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "https://via.placeholder.com/40";
                          }}
                        />
                      ) : (
                        <FontAwesomeIcon icon={faUser} />
                      )}
                    </div>
                    <div className="user-details">
                      <strong className="user-name">{user.nickName}</strong>
                      <div className="user-account">{user.userAccount}</div>
                      {user.introduce && (
                        <div className="user-intro">
                          <span className="intro-text">{user.introduce}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TimeNestDetail; 