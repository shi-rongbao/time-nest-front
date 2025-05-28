import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import TimeNestCard from '../TimeNestCard';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faSpinner, faArrowUp, faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import '../../assets/styles/TimeNestList.css'; // 使用与其他页面相同的主样式
import '../../assets/styles/TimeNestGrid.css'; // 卡片网格样式
import LikeIcon from "../../assets/images/like-icon.png";
import FriendIcon from "../../assets/images/friend-icon.png";
import MessageIcon from "../../assets/images/message-icon.png";
import { getCachedAvatar, cacheAvatar } from "../../utils/cacheUtils";
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

const MyLikedTimeNests = () => {
    const [nests, setNests] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "");
    const [hasUnread, setHasUnread] = useState(false);
    const [unreadList, setUnreadList] = useState([]);
    const [showMsgModal, setShowMsgModal] = useState(false);
    const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
    const [msgLoadingId, setMsgLoadingId] = useState(null);
    
    const observer = useRef();
    const history = useHistory();
    const pollingRef = useRef(null);
    const enablePolling = useRef(true);
    
    // 使用apiCache进行缓存控制
    const apiCacheRef = useRef({});

    // 防抖控制
    const loadingRef = useRef(false);

    // 显示通知的函数
    const showToast = (message, type = 'info') => {
      setToast({ show: true, message, type });
    };

    // 关闭通知的函数
    const closeToast = () => {
      setToast({ ...toast, show: false });
    };

    // 加载更多数据 - 提前定义以避免引用错误
    const loadMoreNests = useCallback(async (currentPage, isLoadMore = false) => {
        if (loading || !hasMore) return;
        setLoading(true);
        setError(null);
        try {
            console.log(`加载点赞列表页面: ${currentPage}, 是否加载更多: ${isLoadMore}`);
            const response = await api.fetchWithToken('/timeNest/queryMyLikeTimeNestList', {
                method: 'POST',
                body: JSON.stringify({
                    pageNum: currentPage,
                    pageSize: PAGE_SIZE,
                }),
            });
            if (response.success && response.data && response.data.records) {
                if (isLoadMore) {
                    setNests(prevNests => [...prevNests, ...response.data.records]);
                } else {
                    setNests(response.data.records);
                }
                setPage(currentPage + 1);
                setHasMore(currentPage < response.data.pages);
            } else {
                throw new Error(response.message || '获取点赞列表失败');
            }
        } catch (err) {
            setError(err.message);
            if (currentPage === 1) setHasMore(false);
        } finally {
            setLoading(false);
        }
    }, []);
    
    // 加载更多数据函数
    const loadMore = useCallback(() => {
        // 使用ref来跟踪加载状态，避免闭包问题
        if (loading || !hasMore || loadingRef.current) return;
        
        // 标记为正在加载
        loadingRef.current = true;
        
        // 使用setTimeout来模拟防抖
        setTimeout(() => {
            loadMoreNests(page, true);
            // 200ms后重置加载状态标记
            setTimeout(() => {
                loadingRef.current = false;
            }, 200);
        }, 0);
    }, [loading, hasMore, page, loadMoreNests]);

    // 实现带缓存的API调用
    const cachedFetch = useCallback(async (url, options = {}, cacheTime = 30000) => {
        const cacheKey = url + JSON.stringify(options);
        const cachedData = apiCacheRef.current[cacheKey];
        
        // 如果有缓存且未过期，直接返回缓存数据
        if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
            return cachedData.data;
        }
        
        // 记录API请求
        console.log('MyLikedTimeNests发起API请求:', url);
        
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

    useEffect(() => {
        // 初始加载第一页
        loadMoreNests(1, false);
        fetchUserInfo();
    }, [loadMoreNests, fetchUserInfo]); 

    // 检查是否需要自动加载更多内容
    useEffect(() => {
        // 如果内容不足以撑满页面且有更多数据可加载，自动加载更多
        const checkContentHeight = () => {
            // 只有当页面首次加载完成后，且内容高度不足以撑满页面时才自动加载更多
            if (
                !loading && 
                hasMore && 
                document.documentElement.offsetHeight <= window.innerHeight &&
                nests.length > 0 && 
                nests.length < PAGE_SIZE * 2 // 限制自动加载的次数，避免无限循环
            ) {
                console.log('内容高度不足，自动加载更多');
                loadMore();
            }
        };
        
        // 在内容加载后检查，使用setTimeout确保DOM已更新
        const timer = setTimeout(checkContentHeight, 300);
        
        // 窗口大小变化时也检查
        const resizeHandler = () => {
            if (timer) clearTimeout(timer);
            setTimeout(checkContentHeight, 300);
        };
        
        window.addEventListener('resize', resizeHandler);
        return () => {
            window.removeEventListener('resize', resizeHandler);
            if (timer) clearTimeout(timer);
        };
    }, [nests, loading, hasMore, loadMore]);

    // 监听滚动事件，实现无限滚动和返回顶部按钮
    useEffect(() => {
        // 添加节流函数，防止频繁触发
        let scrollTimer = null;
        
        const handleScroll = () => {
            // 显示/隐藏返回顶部按钮
            if (window.pageYOffset > 300) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
            
            // 使用节流控制滚动加载的频率
            if (scrollTimer) return;
            
            scrollTimer = setTimeout(() => {
                // 无限滚动加载 - 只有当没有正在加载且还有更多数据时才触发
                if (
                    !loading && 
                    hasMore && 
                    window.innerHeight + document.documentElement.scrollTop >=
                    document.documentElement.offsetHeight - 300
                ) {
                    loadMore();
                }
                scrollTimer = null;
            }, 200); // 200ms的节流时间
        };
        
        window.addEventListener('scroll', handleScroll);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimer) clearTimeout(scrollTimer);
        };
    }, [hasMore, loading, loadMore]);

    // 优化IntersectionObserver的实现
    const lastNestElementRef = useCallback(node => {
        if (loading) return;
        if (observer.current) observer.current.disconnect();
        
        observer.current = new IntersectionObserver(entries => {
            // 只有当元素可见、有更多数据且不在加载中时才触发加载
            if (entries[0].isIntersecting && hasMore && !loading) {
                loadMore();
            }
        }, {
            rootMargin: '0px 0px 300px 0px' // 提前300px触发
        });
        
        if (node) observer.current.observe(node);
    }, [loading, hasMore, loadMore]);
    
    // 返回顶部
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    const handleCardClick = (nestId) => {
        history.push(`/time-nest-detail/${nestId}`);
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
        // 已经在点赞列表页面，可以刷新或者不做任何操作
        loadMoreNests(1, false);
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
                <h1>我点赞的拾光纪</h1>
            </div>

            <div className="time-nest-content">
                <div className="time-nest-grid-container">
                    {loading && nests.length === 0 ? (
                        <div className="loading-indicator">
                            <div className="loading-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : error ? (
                        <div className="error-container">{error}</div>
                    ) : nests.length === 0 ? (
                        <div className="empty-list">
                            <FontAwesomeIcon icon={faHeart} size="3x" />
                            <p>你还没有点赞过任何拾光纪哦</p>
                        </div>
                    ) : (
                        <div className="time-nest-grid">
                            {nests.map((nest, index) => {
                                const cardData = {
                                    id: nest.id,
                                    nestType: nest.nestType,
                                    nestTitle: nest.nestTitle,
                                    nestContent: nest.nestContent,
                                    createdAt: nest.createdAt,
                                    unlockedStatus: nest.unlockedStatus,
                                    publicStatus: nest.publicStatus,
                                    isLike: nest.isLike,
                                    coverImage: nest.imageUrl || nest.coverImage || null,
                                    unlockTime: nest.unlockTime,
                                };
                                
                                if (nests.length === index + 1) {
                                    return (
                                        <div ref={lastNestElementRef} key={nest.id + '-liked'}>
                                            <TimeNestCard data={cardData} onClick={() => handleCardClick(nest.id)} />
                                        </div>
                                    );
                                }
                                return <TimeNestCard key={nest.id + '-liked'} data={cardData} onClick={() => handleCardClick(nest.id)} />;
                            })}
                            
                            {/* 加载更多指示器 */}
                            {loading && nests.length > 0 && (
                                <div className="loading-indicator" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                                    <FontAwesomeIcon icon={faSpinner} spin /> 
                                    <span style={{ marginLeft: '10px' }}>正在加载更多...</span>
                                </div>
                            )}
                            
                            {/* 没有更多数据提示 */}
                            {!loading && !hasMore && nests.length > 0 && (
                                <div className="no-more-data" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0', color: '#888' }}>
                                    没有更多拾光纪了~
                                </div>
                            )}
                            
                            {/* 手动加载更多按钮 - 只在非加载状态且还有更多数据时显示 */}
                            {hasMore && !loading && nests.length > 0 && (
                                <div className="load-more-container" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px 0' }}>
                                    <button 
                                        className="load-more-button" 
                                        onClick={loadMore}
                                        style={{ 
                                            padding: '8px 20px', 
                                            background: '#4a90e2', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
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
        </div>
    );
};

export default MyLikedTimeNests;