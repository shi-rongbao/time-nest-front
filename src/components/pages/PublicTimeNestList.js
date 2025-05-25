import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faArrowUp, faSpinner } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestList.css';
import '../../assets/styles/TimeNestGrid.css';
import TimeNestCard from '../TimeNestCard';
import LikeIcon from "../../assets/images/like-icon.png";
import FriendIcon from "../../assets/images/friend-icon.png";
import MessageIcon from "../../assets/images/message-icon.png";
import { getCachedAvatar, cacheAvatar } from "../../utils/cacheUtils";

function PublicTimeNestList() {
    const [timeNests, setTimeNests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [showBackToTop, setShowBackToTop] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "");
    const [hasUnread, setHasUnread] = useState(false);
    const pageSize = 10;
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
        fetchUnreadStatus();
    }, [fetchPublicTimeNests, fetchUserInfo, fetchUnreadStatus]);

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
        if (loading || !hasMore) return;
        
        const nextPage = page + 1;
        setPage(nextPage);
        fetchPublicTimeNests(nextPage, true);
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

    const handleViewDetail = (id) => {
        history.push(`/time-nest-detail/${id}`);
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
                        className="nav-tab"
                        onClick={() => history.push('/my-time-nest-list')}
                    >
                        我发布的拾光纪条目
                    </button>
                    <button
                        className="nav-tab active"
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
                {/* 卡片式瀑布流 */}
                <div className="time-nest-grid-container">
                    {loading && timeNests.length === 0 ? (
                        <div className="loading-indicator">
                            <div className="loading-spinner"></div>
                            <span>加载中...</span>
                        </div>
                    ) : error ? (
                        <div className="error-container">{error}</div>
                    ) : timeNests.length === 0 ? (
                        <div className="empty-list">暂无公开拾光纪条目</div>
                    ) : (
                        <div className="time-nest-grid">
                            {timeNests.map((item) => (
                                <TimeNestCard 
                                    key={item.id} 
                                    data={item} 
                                    onClick={handleViewDetail}
                                />
                            ))}
                            
                            {/* 加载更多指示器 */}
                            {loading && (
                                <div className="loading-indicator">
                                    <FontAwesomeIcon icon={faSpinner} spin /> 加载更多...
                                </div>
                            )}
                            
                            {/* 没有更多数据提示 */}
                            {!hasMore && timeNests.length > 0 && (
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
        </div>
    );
}

export default PublicTimeNestList; 