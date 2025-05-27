import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useHistory, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faLock, faUnlock, faClock, faUser, faEnvelope, faTag, faInfoCircle, faCheckCircle, faTimesCircle, faImage, faUserPlus, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestDetail.css';
import '../../assets/styles/TimeNestList.css';
import { getCachedAvatar } from "../../utils/cacheUtils";
import Banner from "../layout/Banner";

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

// 消息弹窗组件
const MessageModal = ({ isOpen, onClose, unreadList = [], onProcessRequest, onTimeNestNotice, msgLoadingId }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: 400, width: '95%' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2' }}>通知中心</h3>
        {unreadList.length === 0 ? (
          <div style={{ color: '#888', padding: '2rem 0', textAlign: 'center' }}>暂无新通知</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {unreadList.map(item => {
              // 拾光纪解锁通知
              if (item.noticeType === 0 || item.noticeType === 2) {
                return (
                  <li key={item.id} style={{ marginBottom: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                      <span style={{ display: 'block', marginBottom: 6 }}>
                        「{item.timeNestTitle || '拾光纪'}」在刚刚解锁啦！快去查看吧！
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#777' }}>
                        {new Date(item.createTime).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button className="confirm-button" style={{ minWidth: 80 }}
                        disabled={msgLoadingId === item.id}
                        onClick={() => onTimeNestNotice(item, true)}
                      >去查看</button>
                      <button className="cancel-button" style={{ minWidth: 80 }}
                        disabled={msgLoadingId === item.id}
                        onClick={() => onTimeNestNotice(item, false)}
                      >晚点再看</button>
                    </div>
                  </li>
                );
              }
              // 好友申请通知
              else if (item.noticeType === 1) {
                return (
                  <li key={item.id} style={{ marginBottom: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                    <div style={{ fontWeight: 500, marginBottom: 12 }}>
                      <span style={{ display: 'block', marginBottom: 6 }}>
                        {item.requestUserAccount}想添加你为好友，确认要添加吗？
                      </span>
                      <span style={{ fontSize: '0.8rem', color: '#777' }}>
                        {new Date(item.createTime).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button className="confirm-button" style={{ minWidth: 70 }}
                        disabled={msgLoadingId === item.id}
                        onClick={() => onProcessRequest(item, 1)}
                      >接受</button>
                      <button className="cancel-button" style={{ minWidth: 70 }}
                        disabled={msgLoadingId === item.id}
                        onClick={() => onProcessRequest(item, 2)}
                      >拒绝</button>
                    </div>
                  </li>
                );
              }
              // 其他类型通知
              return (
                <li key={item.id} style={{ marginBottom: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                  <div style={{ fontWeight: 500, marginBottom: 12 }}>
                    <span style={{ display: 'block', marginBottom: 6 }}>
                      {item.title || '新通知'} (类型: {item.noticeType})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#777' }}>
                      {new Date(item.createTime).toLocaleString()}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="modal-actions" style={{ marginTop: 16 }}>
          <button className="cancel-button" onClick={onClose}>关闭</button>
        </div>
      </div>
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
  const [friendRequestLoading, setFriendRequestLoading] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  // 添加未读消息相关状态
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadList, setUnreadList] = useState([]);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgLoadingId, setMsgLoadingId] = useState(null);
  
  // 添加轮询和请求控制相关引用
  const pollingRef = useRef(null);
  const isFetchingUnreadRef = useRef(false);
  const lastRequestTimeRef = useRef(Date.now());

  // 从location state中获取id，如果URL中没有id参数
  const nestId = id || (location.state && location.state.id);

  // 获取当前用户信息
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await api.fetchWithToken("/user/getUserInfo");
      if (response?.success && response.data) {
        setCurrentUser(response.data);
      }
    } catch (error) {
      console.error("获取当前用户信息出错:", error);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // 获取未读消息
  const fetchUnread = useCallback(async () => {
    // 如果已经在获取中，直接返回避免重复请求
    if (isFetchingUnreadRef.current) return;
    
    // 设置获取状态标志
    isFetchingUnreadRef.current = true;
    
    try {
      // 使用专用的请求，避免被缓存或取消，确保每5秒总是尝试获取最新数据
      const response = await fetch('/user/getUnreadNotifications', {
        headers: {
          'satoken': localStorage.getItem('satoken') || '',
          'Content-Type': 'application/json'
        },
        // 添加随机参数避免浏览器缓存
        cache: 'no-cache',
        credentials: 'same-origin'
      });
      
      // 检查响应状态
      if (!response.ok) {
        console.error('通知请求失败:', response.status, response.statusText);
        return;
      }
      
      // 解析数据
      const res = await response.json();
      
      // 更新通知状态
      if (res.success && Array.isArray(res.data)) {
        setUnreadList(res.data);
        setHasUnread(res.data.length > 0);
      } else {
        setUnreadList([]);
        setHasUnread(false);
      }
    } catch (error) {
      // 只记录错误但不中断轮询
      console.error("获取未读消息出错:", error);
    } finally {
      // 清除获取状态标志
      isFetchingUnreadRef.current = false;
    }
  }, []);

  // 轮询通知 - 使用精确的定时器模式
  useEffect(() => {
    // 首次加载立即获取一次
    lastRequestTimeRef.current = Date.now();
    fetchUnread();
    
    // 开启5秒轮询
    const scheduleNextFetch = () => {
      pollingRef.current = setTimeout(() => {
        lastRequestTimeRef.current = Date.now();
        fetchUnread();
        scheduleNextFetch();
      }, 5000);
    };
    
    // 启动轮询
    scheduleNextFetch();
    
    // 组件卸载时清理
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [fetchUnread]);

  // 添加页面可见性变化处理
  useEffect(() => {
    // 当页面变为可见时恢复轮询
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 立即获取一次
        lastRequestTimeRef.current = Date.now();
        fetchUnread(); 
        
        // 重新启动轮询（如果已关闭）
        if (!pollingRef.current) {
          pollingRef.current = setTimeout(function poll() {
            lastRequestTimeRef.current = Date.now();
            fetchUnread();
            pollingRef.current = setTimeout(poll, 5000);
          }, 5000);
        }
      } else if (document.visibilityState === 'hidden') {
        // 页面不可见时停止轮询以节省资源
        if (pollingRef.current) {
          clearTimeout(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };
    
    // 添加页面可见性变化事件监听
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // 清理函数
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnread]);

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

  // 检查用户是否是当前登录用户
  const isCurrentUser = (userAccount) => {
    return currentUser && currentUser.userAccount === userAccount;
  };

  // 发送好友申请
  const handleSendFriendRequest = async (userAccount) => {
    if (friendRequestLoading === userAccount) return; // 防止重复请求
    
    setFriendRequestLoading(userAccount);
    try {
      const res = await api.fetchWithToken('/user/sendFriendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccount: userAccount, requestMessage: '我想添加你为好友' })
      });
      
      if (res.success) {
        showToast('好友申请已发送！', 'success');
      } else {
        // 处理各种错误情况
        if (res.message && res.message.includes('已经是你的好友')) {
          showToast('该用户已经是你的好友', 'info');
        } else {
          showToast(res.message || '申请失败', 'error');
        }
      }
    } catch (e) {
      console.error('发送好友申请出错:', e);
      showToast('网络异常，请稍后重试', 'error');
    } finally {
      setFriendRequestLoading(null);
    }
  };

  // 处理消息点击 - 在当前页面显示弹窗
  const handleMsgClick = () => {
    setShowMsgModal(true);
  };
  
  // 关闭消息弹窗
  const handleCloseMsgModal = () => {
    setShowMsgModal(false);
  };

  // 处理拾光纪解锁通知
  const handleTimeNestNotice = async (item, viewAction = false) => {
    setMsgLoadingId(item.id);
    try {
      // 标记通知为已读
      const res = await api.fetchWithToken(`/user/markAsRead?noticeId=${item.id}`);
      
      if (!res.success) throw new Error(res.message || '标记已读失败');
      
      // 刷新未读消息
      await fetchUnread();
      
      if (viewAction) {
        // 跳转到拾光纪详情页面，使用noticeId作为查询参数
        history.push({
          pathname: `/time-nest-detail`,
          state: { id: item.noticeId }
        });
        setShowMsgModal(false);
      }
      
    } catch (e) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setMsgLoadingId(null);
    }
  };
  
  // 处理好友申请
  const handleProcessRequest = async (item, result) => {
    setMsgLoadingId(item.id);
    try {
      // 1. 处理好友请求
      const res1 = await api.fetchWithToken('/user/processingFriendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendRequestId: item.friendRequestsId, processingResult: result })
      });
      
      if (!res1.success) throw new Error(res1.message || '操作失败');
      
      // 2. 标记消息已读
      const res2 = await api.fetchWithToken(`/user/markAsRead?noticeId=${item.id}`);
      
      if (!res2.success) throw new Error(res2.message || '标记已读失败');
      
      // 3. 刷新未读消息
      await fetchUnread();
      
      showToast('操作成功', 'success');
    } catch (e) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setMsgLoadingId(null);
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
      {/* Banner组件 */}
      <Banner hasUnread={hasUnread} onMessageClick={handleMsgClick} />
      
      {/* Toast 通知 */}
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
      
      {/* 消息弹窗 */}
      <MessageModal 
        isOpen={showMsgModal}
        onClose={handleCloseMsgModal}
        unreadList={unreadList}
        onProcessRequest={handleProcessRequest}
        onTimeNestNotice={handleTimeNestNotice}
        msgLoadingId={msgLoadingId}
      />
      
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
                      {/* 只有当不是当前用户时才显示添加好友按钮 */}
                      {!isCurrentUser(user.userAccount) && (
                        <button 
                          className="add-friend-btn"
                          onClick={() => handleSendFriendRequest(user.userAccount)}
                          disabled={friendRequestLoading === user.userAccount}
                        >
                          {friendRequestLoading === user.userAccount ? (
                            <FontAwesomeIcon icon={faSpinner} spin />
                          ) : (
                            <>
                              <FontAwesomeIcon icon={faUserPlus} style={{ marginRight: '5px' }} />
                              添加好友
                            </>
                          )}
                        </button>
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