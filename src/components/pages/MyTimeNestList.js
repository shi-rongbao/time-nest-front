import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFeatherAlt, faEnvelope, faImage, faCalendarAlt, faGlobe, faLock, faArrowLeft, faClock, faFilter, faTag, faExclamationTriangle, faCheckCircle, faTimesCircle, faInfoCircle, faArrowUp, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestList.css';
import '../../assets/styles/TimeNestGrid.css';
import LockIcon from '../../assets/images/lock-icon.png';
import TimeNestCard from '../TimeNestCard';
import LikeIcon from "../../assets/images/like-icon.png";
import FriendIcon from "../../assets/images/friend-icon.png";
import MessageIcon from "../../assets/images/message-icon.png";
import { getCachedAvatar, cacheAvatar } from "../../utils/cacheUtils";

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

// 确认对话框组件
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel }) => {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="confirm-modal">
        <div className="confirm-header">
          <FontAwesomeIcon icon={faExclamationTriangle} className="confirm-icon" />
          <h3>{title}</h3>
        </div>
        <div className="confirm-body">
          <p>{message}</p>
        </div>
        <div className="confirm-footer">
          <button className="btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-confirm" onClick={onConfirm}>确认</button>
        </div>
      </div>
    </div>
  );
};

const MyTimeNestList = () => {
  const [nestList, setNestList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    nestType: 0, // 0-全部；1-胶囊；2-邮件；3-图片
    unlockedStatus: 2 // 2-全部；1-已解锁；0-未解锁
  });
  
  // 添加状态变量
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    nestId: null
  });
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "");
  const [hasUnread, setHasUnread] = useState(false);
  
  const history = useHistory();

  // 使用apiCache进行缓存控制
  const apiCacheRef = useRef({});

  // 实现带缓存的API调用
  const cachedFetch = useCallback(async (url, options = {}, cacheTime = 30000) => {
    const cacheKey = url + JSON.stringify(options);
    const cachedData = apiCacheRef.current[cacheKey];
    
    // 如果有缓存且未过期，直接返回缓存数据
    if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
      return cachedData.data;
    }
    
    // 记录API请求
    console.log('MyTimeNestList发起API请求:', url);
    
    try {
      // 发起请求
      const data = await api.fetchWithToken(url, options);
      
      // 存入缓存
      apiCacheRef.current[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (error) {
      console.error('请求出错:', error);
      throw error;
    }
  }, []);

  // 获取我发布的拾光纪条目列表
  const fetchMyTimeNestList = useCallback(async (currentPage = 1, isLoadMore = false) => {
    try {
      setLoading(true);
      
      // 构建请求参数，当选择"全部"时不传递相应参数
      const requestParams = {
        pageNum: currentPage,
        pageSize: pageSize
      };
      
      // 只有当不是"全部"选项时，才添加筛选条件
      if (filters.nestType !== 0) {
        requestParams.nestType = filters.nestType;
      }
      
      if (filters.unlockedStatus !== 2) {
        requestParams.unlockedStatus = filters.unlockedStatus;
      }
      
      const response = await cachedFetch("/timeNest/queryMyTimeNestList", {
        method: 'POST',
        body: JSON.stringify(requestParams)
      }, 20000); // 使用20秒缓存
      
      if (response?.success && response.data) {
        // 如果是加载更多，则追加数据，否则替换数据
        if (isLoadMore) {
          setNestList(prev => [...prev, ...response.data.records]);
        } else {
          setNestList(response.data.records);
        }
        
        // 判断是否还有更多数据
        if (currentPage >= response.data.pages) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (error) {
      console.error("获取拾光纪条目列表出错:", error);
    } finally {
      setLoading(false);
    }
  }, [pageSize, filters, cachedFetch]);

  // 获取未读消息状态
  const fetchUnreadStatus = useCallback(async () => {
    try {
      const response = await cachedFetch("/user/getUnreadNoticeList", {}, 30000);
      if (response?.success) {
        setHasUnread(response.data && response.data.length > 0);
      }
    } catch (error) {
      console.error("获取未读消息状态出错:", error);
    }
  }, [cachedFetch]);

  // 获取用户信息
  const fetchUserInfo = useCallback(async () => {
    try {
      const response = await cachedFetch("/user/getUserInfo", {}, 60000);
      if (response?.success && response.data) {
        if (response.data.avatarUrl) {
          setAvatarUrl(response.data.avatarUrl);
          cacheAvatar(response.data.avatarUrl);
        }
      }
    } catch (error) {
      console.error("获取用户信息出错:", error);
    }
  }, [cachedFetch]);

  // 初始加载
  useEffect(() => {
    fetchUserInfo();
    fetchUnreadStatus();
  }, [fetchUserInfo, fetchUnreadStatus]);

  // 初始加载和筛选条件变化时重新获取数据
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchMyTimeNestList(1, false);
  }, [filters, fetchMyTimeNestList]);

  // 检查是否需要自动加载更多内容
  useEffect(() => {
    // 如果内容不足以撑满页面且有更多数据可加载，自动加载更多
    const checkContentHeight = () => {
      if (
        !loading && 
        hasMore && 
        document.documentElement.offsetHeight <= window.innerHeight &&
        nestList.length > 0
      ) {
        loadMore();
      }
    };
    
    // 在内容加载后检查
    checkContentHeight();
    
    // 窗口大小变化时也检查
    window.addEventListener('resize', checkContentHeight);
    return () => window.removeEventListener('resize', checkContentHeight);
  }, [nestList, loading, hasMore]);
  
  // 监听滚动事件，实现无限滚动和返回顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      // 显示/隐藏返回顶部按钮
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
      
      // 无限滚动加载
      if (
        window.innerHeight + document.documentElement.scrollTop >=
        document.documentElement.offsetHeight - 300 &&
        hasMore &&
        !loading
      ) {
        loadMore();
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading]);

  // 显示通知的函数
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // 关闭通知的函数
  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  // 处理返回首页
  const handleBackToHome = () => {
    history.push('/home');
  };

  // 处理好友列表点击
  const handleFriendListClick = () => {
    history.push('/friend-list');
  };

  // 处理消息点击
  const handleMsgClick = () => {
    // 跳转回首页并显示消息弹窗
    history.push({
      pathname: '/home',
      state: { showMsgModal: true }
    });
  };

  // 处理头像点击
  const handleAvatarClick = () => {
    history.push('/user-profile');
  };

  // 处理筛选条件变更
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 加载更多数据
  const loadMore = () => {
    if (loading || !hasMore) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    fetchMyTimeNestList(nextPage, true);
  };
  
  // 返回顶部
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 查看拾光纪详情
  const handleViewTimeNestDetail = (id) => {
    history.push({
      pathname: `/time-nest-detail`,
      state: { id }
    });
  };
  
  // 处理提前解锁
  const handleUnlockNest = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "提前解锁",
      message: "确认提前解锁此拾光纪条目吗？",
      nestId: id
    });
  };
  
  // 确认解锁
  const confirmUnlockNest = async () => {
    try {
      setLoading(true);
      
      const response = await api.fetchWithToken("/timeNest/unlockTimeNest", {
        method: 'POST',
        body: JSON.stringify({
          nestId: confirmModal.nestId
        })
      });
      
      if (response?.success) {
        // 更新列表中的对应项
        setNestList(prevList => 
          prevList.map(item => 
            item.id === confirmModal.nestId 
              ? { ...item, unlockedStatus: 1 } 
              : item
          )
        );
        
        showToast("拾光纪条目解锁成功！", "success");
      } else {
        showToast(response?.message || "解锁失败，请稍后重试", "error");
      }
    } catch (error) {
      console.error("解锁拾光纪条目出错:", error);
      showToast("解锁出错，请稍后重试", "error");
    } finally {
      setLoading(false);
      // 关闭确认对话框
      setConfirmModal({
        isOpen: false,
        title: '',
        message: '',
        nestId: null
      });
    }
  };
  
  // 取消解锁
  const cancelUnlockNest = () => {
    setConfirmModal({
      isOpen: false,
      title: '',
      message: '',
      nestId: null
    });
  };

  return (
    <div className="time-nest-list-container">
      {/* Top Navigation Bar */}
      <div className="nav-bar">
        <div className="nav-tabs">
          <button
            className="nav-tab"
            onClick={() => history.push('/home')}
          >
            首页
          </button>
          <button
            className="nav-tab active"
          >
            我发布的拾光纪条目
          </button>
            <button 
            className="nav-tab"
            onClick={() => history.push('/public-time-nest-list')}
            >
            公开的拾光纪条目
            </button>
          </div>
          
        <div className="user-actions">
          <div className="action-icon-wrapper">
            <img src={LikeIcon || "/placeholder.svg"} alt="点赞过的内容" title="点赞过的内容" className="action-icon" />
          </div>
          <div className="action-icon-wrapper">
            <img src={FriendIcon || "/placeholder.svg"} alt="好友列表" title="好友列表" className="action-icon" onClick={handleFriendListClick} style={{ cursor: 'pointer' }} />
          </div>
          <div className="action-icon-wrapper">
            <img src={MessageIcon || "/placeholder.svg"} alt="我的消息" title="我的消息" className="action-icon" onClick={handleMsgClick} style={{ cursor: 'pointer' }} />
            {hasUnread && <span className="msg-dot"></span>}
          </div>
          <div className="action-icon-wrapper">
            <img
              src={avatarUrl || "https://via.placeholder.com/40"}
              alt="个人中心"
              title="个人中心"
              className="action-icon"
              onClick={handleAvatarClick}
              style={{ cursor: 'pointer' }}
              onError={(e) => {
                e.target.onerror = null
                e.target.src = "https://via.placeholder.com/40"
              }}
            />
          </div>
        </div>
      </div>

      {/* Slogan */}
      <div style={{ width: '100%', textAlign: 'center', margin: '10px 0 18px 0', color: '#888', fontSize: '0.98rem', letterSpacing: '0.5px' }}>
        封存此刻，寄往未来  <span style={{ fontSize: '0.92rem', marginLeft: '0.5em' }}>Save the moment. Send it to the future.</span>
        </div>
        
      <div className="time-nest-content">
        {/* 筛选区域 */}
        <div className="filters-section">
          <div className="filter-group">
            <label>类型筛选:</label>
            <select 
              value={filters.nestType} 
              onChange={(e) => handleFilterChange('nestType', parseInt(e.target.value))}
            >
              <option value={0}>全部类型</option>
              <option value={1}>时光胶囊</option>
              <option value={2}>邮件胶囊</option>
              <option value={3}>图片胶囊</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>状态筛选:</label>
            <select 
              value={filters.unlockedStatus} 
              onChange={(e) => handleFilterChange('unlockedStatus', parseInt(e.target.value))}
            >
              <option value={2}>全部状态</option>
              <option value={1}>已解锁</option>
              <option value={0}>未解锁</option>
            </select>
          </div>
        </div>
        
        {/* 卡片式瀑布流 */}
        <div className="time-nest-grid-container">
          {loading && nestList.length === 0 ? (
            <div className="loading-indicator">
              <div className="loading-spinner"></div>
              <span>加载中...</span>
            </div>
          ) : nestList.length === 0 ? (
            <div className="empty-list">暂无拾光纪条目，快去创建一个吧！</div>
          ) : (
            <div className="time-nest-grid">
              {nestList.map((item) => (
                <TimeNestCard 
                  key={item.id} 
                  data={item} 
                  onClick={handleViewTimeNestDetail}
                />
              ))}
              
              {/* 加载更多指示器 */}
              {loading && (
                <div className="loading-indicator">
                  <FontAwesomeIcon icon={faSpinner} spin /> 加载更多...
                </div>
              )}
              
              {/* 没有更多数据提示 */}
              {!hasMore && nestList.length > 0 && (
                <div className="no-more-data">
                  没有更多拾光纪了~
                </div>
              )}
              
              {/* 手动加载更多按钮 */}
              {hasMore && !loading && (
                <div className="load-more-container">
                  <button className="load-more-button" onClick={loadMore}>
                    加载更多
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* 返回顶部按钮 */}
        {showBackToTop && (
          <div 
            className={`back-to-top ${showBackToTop ? 'visible' : ''}`}
            onClick={scrollToTop}
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </div>
        )}
        
        {/* 底部留白 */}
        <div className="footer-spacer"></div>
      </div>
      
      {/* 确认对话框 */}
      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmUnlockNest}
        onCancel={cancelUnlockNest}
      />
      
      {/* Toast通知 */}
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
    </div>
  );
};

export default MyTimeNestList; 