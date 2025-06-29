import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowUp, faSpinner, faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestList.css';
import '../../assets/styles/TimeNestGrid.css';
import TimeNestCard from '../TimeNestCard';
import LikeIcon from "../../assets/images/like-icon.png";
import FriendIcon from "../../assets/images/friend-icon.png";
import MessageIcon from "../../assets/images/message-icon.png";
import { getCachedAvatar, cacheAvatar } from "../../utils/cacheUtils";
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
const MessageModal = ({ isOpen, onClose, unreadList, onProcessRequest, onTimeNestNotice, msgLoadingId }) => {
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
              // 预留其他类型通知的扩展空间
              else {
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
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                      <button className="cancel-button" style={{ minWidth: 80 }}
                        disabled={msgLoadingId === item.id}
                        onClick={() => onTimeNestNotice(item, false)}
                      >我知道了</button>
                    </div>
                  </li>
                );
              }
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

function PublicTimeNestList() {
    const [timeNests, setTimeNests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "");
    const [hasUnread, setHasUnread] = useState(false);
    const [unreadList, setUnreadList] = useState([]);
    const [showMsgModal, setShowMsgModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    const [msgLoadingId, setMsgLoadingId] = useState(null);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    
    const pageSize = 10;
    const history = useHistory();
    const pollingRef = useRef(null);
    const enablePolling = useRef(true);
    const observer = useRef();
    
    // 使用apiCache进行缓存控制
    const apiCacheRef = useRef({});

    // 最后一个元素的引用，用于无限滚动
    const lastTimeNestElementRef = useCallback(node => {
        if (loading || isFetchingMore || !hasMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                loadMore();
            }
        });
        if (node) observer.current.observe(node);
    }, [loading, isFetchingMore, hasMore]);

    // 显示通知的函数
    const showToast = (message, type = 'info') => {
        setToast({ show: true, message, type });
    };

    // 关闭通知的函数
    const closeToast = () => {
        setToast({ ...toast, show: false });
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
        console.log('PublicTimeNestList发起API请求:', url);
        
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

    // 获取未读消息状态
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

    // 设置轮询获取未读消息
    useEffect(() => {
        // 初始加载
        fetchUnreadStatus();
        
        // 设置轮询
        const setupPolling = () => {
            pollingRef.current = setInterval(() => {
                if (enablePolling.current) {
                    fetchUnreadStatus();
                }
            }, 5000); // 每5秒轮询一次
        };
        
        setupPolling();
        
        // 页面可见性变化处理
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                enablePolling.current = true;
                fetchUnreadStatus(); // 页面变为可见时立即获取一次
                if (!pollingRef.current) {
                    setupPolling();
                }
            } else {
                enablePolling.current = false;
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

    // 使用useCallback包装API请求函数，避免依赖循环
    const fetchPublicTimeNests = useCallback(async (currentPage = 1, isLoadMore = false) => {
        try {
            setLoading(true);
            const response = await api.queryPublicTimeNestList(currentPage, pageSize);
            
            if (response.success) {
                // 如果是加载更多，则追加数据，否则替换数据
                if (isLoadMore) {
                    setTimeNests(prev => [...prev, ...response.data.records]);
                } else {
                    setTimeNests(response.data.records);
                }
                
                // 判断是否还有更多数据
                if (currentPage >= response.data.pages) {
                    setHasMore(false);
                } else {
                    setHasMore(true);
                }
                
                setError(null);
            } else {
                setError(response.message || '获取公开拾光纪列表失败');
            }
        } catch (err) {
            setError('获取公开拾光纪列表时发生错误');
            console.error('获取公开拾光纪列表错误:', err);
        } finally {
            setLoading(false);
        }
    }, [pageSize]);

    // 初始加载
    useEffect(() => {
        fetchPublicTimeNests(1, false);
        fetchUserInfo();
    }, [fetchPublicTimeNests, fetchUserInfo]);

    // 检查是否需要自动加载更多内容
    useEffect(() => {
        // 如果内容不足以撑满页面且有更多数据可加载，自动加载更多
        const checkContentHeight = () => {
            if (
                !loading && 
                hasMore && 
                document.documentElement.offsetHeight <= window.innerHeight &&
                timeNests.length > 0
            ) {
                loadMore();
            }
        };
        
        // 在内容加载后检查
        checkContentHeight();
        
        // 窗口大小变化时也检查
        window.addEventListener('resize', checkContentHeight);
        return () => window.removeEventListener('resize', checkContentHeight);
    }, [timeNests, loading, hasMore]);

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

    // 加载更多数据
    const loadMore = () => {
        if (loading || isFetchingMore || !hasMore) return;
        
        setIsFetchingMore(true);
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPublicTimeNests(nextPage, true)
            .finally(() => {
                setIsFetchingMore(false);
            });
    };
    
    // 返回顶部
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    // 处理好友列表点击
    const handleFriendListClick = () => {
        history.push('/friend-list');
    };

    // 处理消息点击 - 在当前页面显示弹窗
    const handleMsgClick = () => {
        setShowMsgModal(true);
    };
    
    // 关闭消息弹窗
    const handleCloseMsgModal = () => {
        setShowMsgModal(false);
    };

    // 处理头像点击
    const handleAvatarClick = () => {
        history.push('/user-profile');
    };

    // 处理点赞列表点击
    const handleLikedListClick = () => {
        history.push('/my-liked-nests');
    };
    
    // 处理拾光纪解锁通知
    const handleTimeNestNotice = useCallback(async (item, viewAction = false) => {
        setMsgLoadingId(item.id);
        try {
            // 标记通知为已读
            const res = await cachedFetch(`/user/markAsRead?noticeId=${item.id}`, {}, 0); // 不缓存此请求
            
            if (!res.success) throw new Error(res.message || '标记已读失败');
            
            // 刷新未读消息
            await fetchUnreadStatus();
            
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
    }, [cachedFetch, fetchUnreadStatus, history]);
    
    // 处理好友申请
    const handleProcessRequest = useCallback(async (item, result) => {
        setMsgLoadingId(item.id);
        try {
            // 1. 处理好友请求
            const res1 = await cachedFetch('/user/processingFriendRequest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ friendRequestId: item.friendRequestsId, processingResult: result })
            }, 0); // 不缓存POST请求
            
            if (!res1.success) throw new Error(res1.message || '操作失败');
            
            // 2. 标记消息已读
            const res2 = await cachedFetch(`/user/markAsRead?noticeId=${item.id}`, {}, 0); // 不缓存此请求
            
            if (!res2.success) throw new Error(res2.message || '标记已读失败');
            
            // 3. 刷新未读消息
            await fetchUnreadStatus();
            
            showToast('操作成功', 'success');
        } catch (e) {
            showToast(e.message || '操作失败', 'error');
        } finally {
            setMsgLoadingId(null);
        }
    }, [cachedFetch, fetchUnreadStatus]);

    const handleViewDetail = (id) => {
        history.push(`/time-nest-detail/${id}`);
    };

    return (
        <div className="time-nest-list">
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
                onTimeNestNotice={handleTimeNestNotice}
                msgLoadingId={msgLoadingId}
            />
            
            <div className="page-header">
                <h1>公开的拾光纪</h1>
            </div>

            <div className="time-nest-content">
                {/* 卡片式瀑布流 */}
                <div className="time-nest-grid-container">
                    {loading && page === 1 ? (
                        <div className="loading-container">
                            <FontAwesomeIcon icon={faSpinner} spin className="loading-icon" />
                            <p>加载中...</p>
                        </div>
                    ) : error ? (
                        <div className="error-container">
                            <p>{error}</p>
                        </div>
                    ) : timeNests.length === 0 ? (
                        <div className="empty-container">
                            <p>暂无公开的拾光纪</p>
                        </div>
                    ) : (
                        <div className="time-nest-grid">
                            {timeNests.map((nest, index) => (
                                <div 
                                    key={nest.id} 
                                    ref={index === timeNests.length - 1 ? lastTimeNestElementRef : null}
                                    className="time-nest-card-wrapper"
                                >
                                    <TimeNestCard 
                                        data={{
                                            ...nest,
                                            isLike: nest.isLike || 0 // 确保有 isLike 字段，默认为 0
                                        }}
                                        onClick={() => handleViewDetail(nest.id)}
                                    />
                                </div>
                            ))}
                            {isFetchingMore && (
                                <div className="loading-more">
                                    <FontAwesomeIcon icon={faSpinner} spin />
                                    <span>加载更多...</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {showBackToTop && (
                <button className="back-to-top" onClick={scrollToTop}>
                    <FontAwesomeIcon icon={faArrowUp} />
                </button>
            )}
        </div>
    );
}

export default PublicTimeNestList; 