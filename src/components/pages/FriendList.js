import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../../assets/styles/FriendList.css';
import api from '../../services/api';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faArrowUp, faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import Banner from "../layout/Banner";

const PAGE_SIZE = 10;

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
const MessageModal = ({ isOpen, onClose, unreadList = [], onProcessRequest, msgLoadingId }) => {
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
              // 好友申请通知
              if (item.noticeType === 1) {
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

// 使用useRef管理缓存以保持组件渲染间的状态
const FriendList = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true); // 用于初始加载
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccount, setAddAccount] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addTip, setAddTip] = useState({ text: '', type: '' });
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadList, setUnreadList] = useState([]);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [msgLoadingId, setMsgLoadingId] = useState(null);
  
  // 无限滚动相关状态
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);

  const isFetchingRef = useRef(false); // 用于初始加载或刷新
  const apiCacheRef = useRef({});
  const pollingRef = useRef(null); // 添加轮询的引用
  const history = useHistory();
  const location = history.location; // 获取当前路径
  const observer = useRef(); // 用于IntersectionObserver

  // 显示通知的函数
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // 关闭通知的函数
  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  // 处理消息点击 - 在当前页面显示弹窗
  const handleMsgClick = () => {
    setShowMsgModal(true);
  };
  
  // 关闭消息弹窗
  const handleCloseMsgModal = () => {
    setShowMsgModal(false);
  };

  // 实现带缓存的API调用
  const cachedFetch = useCallback(async (url, options = {}, cacheTime = 30000) => {
    const cacheKey = url + JSON.stringify(options);
    const cachedData = apiCacheRef.current[cacheKey];
    
    // 如果有缓存且未过期，直接返回缓存数据
    if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
      return cachedData.data;
    }
    
    // 记录API请求
    console.log('FriendList发起API请求:', url);
    
    // 创建一个AbortController用于超时控制
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    try {
      // 合并signal到options
      const fetchOptions = { ...options, signal };
      
      // 发起请求
      const data = await api.fetchWithToken(url, fetchOptions);
      
      // 存入缓存
      apiCacheRef.current[cacheKey] = {
        data,
        timestamp: Date.now()
      };
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('请求超时:', url);
        throw new Error('请求超时');
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  // 将fetchFriends函数存储在ref中，避免依赖循环
  const fetchFriendsRef = useRef();
  
  fetchFriendsRef.current = async (currentPage, isLoadMore = false) => {
    if (isLoadMore) {
      if (isFetchingMore) return;
      setIsFetchingMore(true);
    } else {
      if (loading && isFetchingRef.current) return;
      setLoading(true);
      isFetchingRef.current = true;
      setPage(1);
      setHasMore(true);
    }
    setError('');
    
    try {
      const res = await cachedFetch(
        `/user/getFriendList?pageNum=${currentPage}&pageSize=${PAGE_SIZE}`,
        {},
        0
      );

      // 添加调试日志
      console.log('好友列表API响应:', res);
      
      // 检查API返回的数据结构
      let friendsData = [];
      let totalPages = 1;
      
      // 根据截图中的数据结构进行调整
      if (res.success && res.data) {
        // 直接处理data数组
        if (Array.isArray(res.data)) {
          friendsData = res.data;
          totalPages = 1; // 如果是数组，则只有一页
        } 
        // 处理分页结构
        else if (res.data.records) {
          friendsData = res.data.records;
          totalPages = res.data.pages || 1;
        }
        // 处理其他可能的结构
        else {
          friendsData = [];
        }

        console.log('处理后的好友数据:', friendsData);
        console.log('总页数:', totalPages);

        setFriends(prevFriends => isLoadMore ? [...prevFriends, ...friendsData] : friendsData);
        setHasMore(currentPage < totalPages && friendsData.length > 0);
        
        // 检查设置后的状态
        setTimeout(() => {
          console.log('设置后的friends状态:', friends);
        }, 0);
      } else {
        if (!isLoadMore) setFriends([]);
        setHasMore(false);
        if (res.message && !isLoadMore) setError(res.message || '获取好友列表失败');
      }
    } catch (e) {
      console.error("获取好友列表错误:", e);
      setError('获取好友列表失败，请稍后重试');
      if (!isLoadMore) setFriends([]);
      setHasMore(false);
    } finally {
      if (isLoadMore) {
        setIsFetchingMore(false);
      } else {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  };

  useEffect(() => {
    // 组件挂载时只调用一次
    fetchFriendsRef.current(1, false);
  }, []);

  const lastFriendElementRef = useCallback(node => {
    if (isFetchingMore || loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => {
          const nextPage = prevPage + 1;
          fetchFriendsRef.current(nextPage, true);
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [isFetchingMore, loading, hasMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.pageYOffset > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const handleAddFriend = async () => {
    if (!addAccount.trim()) {
      setAddTip({ text: '请输入对方账号', type: 'error' });
      return;
    }
    setAddLoading(true);
    setAddTip({ text: '', type: '' });
    try {
      const res = await cachedFetch('/user/sendFriendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccount: addAccount.trim(), requestMessage: addMsg.trim() })
      }, 0);
      
      if (res.success) {
        setAddTip({ text: '好友申请已发送！', type: 'success' });
        fetchFriendsRef.current(1, false);
        setTimeout(() => {
          setShowAddModal(false);
          setAddAccount('');
          setAddMsg('');
          setAddTip({ text: '', type: '' });
        }, 1200);
      } else {
        setAddTip({ text: res.message || '申请失败', type: 'error' });
      }
    } catch (e) {
      setAddTip({ text: '网络异常，请稍后重试', type: 'error' });
    } finally {
      setAddLoading(false);
    }
  };

  // 获取未读消息
  const fetchUnreadStatus = useCallback(async () => {
    try {
      console.log(`[通知系统] 发送请求: ${new Date().toLocaleTimeString()}`);
      
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
        const hasNewNotifications = res.data.length > 0 && 
          (unreadList.length !== res.data.length || 
           JSON.stringify(unreadList) !== JSON.stringify(res.data));
          
        if (hasNewNotifications) {
          console.log('收到新通知:', res.data.length);
        }
        
        setUnreadList(res.data);
        setHasUnread(res.data.length > 0);
      } else {
        setUnreadList([]);
        setHasUnread(false);
      }
    } catch (error) {
      // 只记录错误但不中断轮询
      console.error("获取未读消息出错:", error);
    }
  }, []);

  // 设置轮询获取未读消息
  useEffect(() => {
    // 初始加载
    fetchUnreadStatus();
    
    // 设置轮询
    const setupPolling = () => {
      pollingRef.current = setInterval(() => {
        fetchUnreadStatus();
      }, 5000); // 每5秒轮询一次
    };
    
    setupPolling();
    
    // 页面可见性变化处理
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadStatus(); // 页面变为可见时立即获取一次
        if (!pollingRef.current) {
          setupPolling();
        }
      } else {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUnreadStatus]);

  // 处理好友请求回应
  const handleProcessRequest = async (item, result) => {
    setMsgLoadingId(item.id);
    try {
      // 1. 处理好友请求
      const res1 = await cachedFetch('/user/processingFriendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendRequestId: item.friendRequestsId, processingResult: result })
      }, 0);
      
      if (!res1.success) throw new Error(res1.message || '操作失败');
      
      // 2. 标记消息已读
      const res2 = await cachedFetch(`/user/markAsRead?noticeId=${item.id}`, {}, 0);
      
      if (!res2.success) throw new Error(res2.message || '标记已读失败');
      
      // 3. 刷新未读消息
      await fetchUnreadStatus();
      
      // 4. 刷新好友列表
      fetchFriendsRef.current(1, false);
      
      showToast(result === 1 ? '已接受好友请求' : '已拒绝好友请求', 'success');
    } catch (e) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setMsgLoadingId(null);
    }
  };

  return (
    <div className="friend-list-container">
      {/* 使用 Banner 组件 */}
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
        msgLoadingId={msgLoadingId}
      />
      
      <div className="page-header">
        <h1>我的好友</h1>
        <button className="add-friend-button" onClick={() => setShowAddModal(true)}>添加好友</button>
      </div>

      {/* 好友列表内容 */}
      <div className="friend-list-content">
        {loading && friends.length === 0 ? (
          <div className="loading-container">
            <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
            <p>加载中...</p>
          </div>
        ) : error ? (
          <div className="error-container">
            <p>{error}</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="empty-container">
            <p>暂无好友，快去添加吧！</p>
          </div>
        ) : (
          <ul className="friend-list">
            {friends.map((friend, index) => (
              <li 
                key={friend.id || index} 
                className="friend-item"
                ref={index === friends.length - 1 ? lastFriendElementRef : null}
              >
                <div className="friend-avatar">
                  <img 
                    src={friend.avatarUrl || "https://via.placeholder.com/50"} 
                    alt={friend.nickname || friend.account || "好友"} 
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/50";
                    }}
                  />
                </div>
                <div className="friend-info">
                  <h3 className="friend-name">{friend.nickName || friend.userAccount || "未知用户"}</h3>
                  <p className="friend-account">{friend.userAccount || "无账号信息"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        
        {isFetchingMore && (
          <div className="loading-more">
            <FontAwesomeIcon icon={faSpinner} spin />
            <span>加载更多...</span>
          </div>
        )}
      </div>

      {/* 添加好友弹窗 */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="add-friend-modal">
            <h2>添加好友</h2>
            <div className="form-group">
              <label>对方账号</label>
              <input 
                type="text" 
                value={addAccount} 
                onChange={(e) => setAddAccount(e.target.value)} 
                placeholder="请输入对方账号"
              />
            </div>
            <div className="form-group">
              <label>验证消息</label>
              <input 
                type="text" 
                value={addMsg} 
                onChange={(e) => setAddMsg(e.target.value)} 
                placeholder="请输入验证消息"
              />
            </div>
            {addTip.text && (
              <div className={`add-tip ${addTip.type}`}>
                {addTip.text}
              </div>
            )}
            <div className="modal-actions">
              <button 
                className="cancel-button" 
                onClick={() => {
                  setShowAddModal(false);
                  setAddAccount('');
                  setAddMsg('');
                  setAddTip({ text: '', type: '' });
                }}
              >
                取消
              </button>
              <button 
                className="confirm-button" 
                onClick={handleAddFriend}
                disabled={addLoading}
              >
                {addLoading ? <FontAwesomeIcon icon={faSpinner} spin /> : '发送请求'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBackToTop && (
        <button className="back-to-top" onClick={scrollToTop}>
          <FontAwesomeIcon icon={faArrowUp} />
        </button>
      )}
    </div>
  );
};

export default FriendList; 