"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import "../../assets/styles/Home.css"
import LikeIcon from "../../assets/images/like-icon.png"
import FriendIcon from "../../assets/images/friend-icon.png"
import MessageIcon from "../../assets/images/message-icon.png"
import LockIcon from "../../assets/images/lock-icon.png"
import api from "../../services/api"
import { useHistory } from 'react-router-dom'
import { getCachedAvatar, cacheAvatar } from "../../utils/cacheUtils"
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarAlt, faClock, faFeatherAlt, faEnvelope, faLock, faImage, faGlobe, faLockOpen, faPencilAlt, faMagic, faCheckCircle, faTimesCircle, faInfoCircle, faExclamationTriangle, faUpload, faUsers, faUserLock, faSpinner } from '@fortawesome/free-solid-svg-icons'
import TimeNestCard from "../TimeNestCard"

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

const Home = () => {
  // 移除日志
  // console.log('[Home组件] 开始渲染/重新渲染', new Date().toLocaleTimeString());
  
  const [activeTab, setActiveTab] = useState("capsule")
  const [isPublic, setIsPublic] = useState(false)
  const [capsuleType, setCapsuleType] = useState("capsule")
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [unlockDate, setUnlockDate] = useState("")
  const [avatarUrl, setAvatarUrl] = useState(getCachedAvatar() || "")
  const [upcomingCapsules, setUpcomingCapsules] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' })
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    capsuleId: null
  })
  const [hasUnread, setHasUnread] = useState(false);
  const [unreadList, setUnreadList] = useState([]);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const pollingRef = useRef(null);
  const [msgLoadingId, setMsgLoadingId] = useState(null);
  const [enablePolling, setEnablePolling] = useState(true);
  
  const [emailAddress, setEmailAddress] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadLoading, setUploadLoading] = useState(false);
  const [friendList, setFriendList] = useState([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState([]);
  const [selectedUnlockFriendIds, setSelectedUnlockFriendIds] = useState([]);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [friendSelectorType, setFriendSelectorType] = useState('share');
  const fileInputRef = useRef(null);
  
  // 添加API请求控制和缓存
  const isFetchingUnreadRef = useRef(false);
  const isFetchingFriendListRef = useRef(false);
  const apiCacheRef = useRef({});
  const lastRequestTimeRef = useRef(Date.now());
  
  const history = useHistory()

  // 缓存控制 - 避免不必要的请求干扰通知轮询
  const pendingRequests = useRef({});
  const requestCounter = useRef(0);

  // 可取消的fetch函数封装
  const cancellableFetch = useCallback(async (url, options = {}) => {
    const requestId = requestCounter.current++;
    const controller = new AbortController();
    const { signal } = controller;
    
    // 将当前请求添加到待处理列表
    pendingRequests.current[requestId] = controller;
    
    try {
      const response = await fetch(url, { ...options, signal });
      const data = await response.json();
      
      // 请求完成后从待处理列表中移除
      delete pendingRequests.current[requestId];
      
      return data;
    } catch (error) {
      // 请求出错或被中断
      delete pendingRequests.current[requestId];
      throw error;
    }
  }, []);
  
  // 取消所有待处理的请求
  const cancelAllRequests = useCallback(() => {
    Object.values(pendingRequests.current).forEach(controller => {
      controller.abort();
    });
    pendingRequests.current = {};
  }, []);
  
  // 组件卸载时取消所有请求
  useEffect(() => {
    return () => {
      cancelAllRequests();
    };
  }, [cancelAllRequests]);

  // 显示通知的函数
  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
  };

  // 关闭通知的函数
  const closeToast = () => {
    setToast({ ...toast, show: false });
  };

  // 实现带缓存的API调用 - 移除调试日志
  const cachedFetch = useCallback(async (url, options = {}, cacheTime = 30000) => {
    const cacheKey = url + JSON.stringify(options);
    const cachedData = apiCacheRef.current[cacheKey];
    
    // 如果有缓存且未过期，直接返回缓存数据
    if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
      // 移除日志
      // console.log('从缓存获取数据:', url, '缓存时间:', Math.round((Date.now() - cachedData.timestamp)/1000) + '秒前');
      return cachedData.data;
    }
    
    // 记录API请求 - 简化日志
    // 移除时间记录
    // const startTime = Date.now();
    console.log('发起API请求:', url, '缓存时间:', cacheTime, 'ms');
    
    // 创建一个AbortController用于超时控制
    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时
    
    try {
      // 合并signal到options
      const fetchOptions = { ...options, signal };
      
      // 发起请求
      const data = await api.fetchWithToken(url, fetchOptions);
      // 移除时间日志
      // const elapsed = Date.now() - startTime;
      // console.log('API请求完成:', url, '耗时:', elapsed, 'ms');
      
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
  
  // 获取即将解锁的胶囊列表 - 获取最多6条，不再分页
  const fetchUpcomingCapsules = useCallback(async () => {
    console.log(`[API调用] 获取即将解锁的胶囊列表 (最多6条)`, new Date().toLocaleTimeString());
    try {
      setLoading(true);
      setUpcomingCapsules([]); 
      // API不再需要分页参数，后端应返回最多6条
      const response = await cachedFetch(`/timeNest/queryMyUnlockingNestList`, {}, 60000); 
      
      if (response?.success && response.data) {
        // 假设后端直接返回数组，或包含list的结构，取前6条
        const capsules = response.data.list || response.data;
        setUpcomingCapsules(Array.isArray(capsules) ? capsules.slice(0, 6) : []);
      } else {
        setUpcomingCapsules([]);
        showToast("获取解锁列表失败", "error");
      }
    } catch (error) {
      console.error("获取即将解锁的胶囊列表出错:", error);
      setUpcomingCapsules([]);
      showToast("获取解锁列表失败，请稍后再试", "error");
    } finally {
      setLoading(false);
    }
  }, [cachedFetch]);

  // 获取用户信息 - 移除为调试添加的代码
  const fetchUserInfo = useCallback(async () => {
    // 移除日志
    // console.log('[API调用] 开始获取用户信息', new Date().toLocaleTimeString());
    
    try {
      // 首先使用缓存的头像
      const cachedAvatar = getCachedAvatar();
      if (cachedAvatar) {
        setAvatarUrl(cachedAvatar);
      }
      
      // 然后请求最新的用户信息，使用缓存
      const response = await cachedFetch("/user/getUserInfo", {}, 120000); // 2分钟缓存
      // 移除日志
      // console.log('[API调用] 获取用户信息完成', new Date().toLocaleTimeString(), '缓存命中:', response._fromCache ? '是' : '否');
      
      if (response?.success && response.data) {
        const newAvatarUrl = response.data.avatarUrl;
        
        // 如果新头像与缓存不同，更新缓存和显示
        if (newAvatarUrl && newAvatarUrl !== cachedAvatar) {
          cacheAvatar(newAvatarUrl);
          setAvatarUrl(newAvatarUrl);
        }
      }
    } catch (error) {
      console.error("获取用户信息出错:", error)
      showToast("获取用户信息失败", "error")
    }
  }, [cachedFetch]);

  // 获取未读消息 - 可靠的实现
  const fetchUnread = useCallback(async () => {
    // 如果已经在获取中，直接返回避免重复请求
    if (isFetchingUnreadRef.current) return;
    
    // 设置获取状态标志
    isFetchingUnreadRef.current = true;
    
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
    } finally {
      // 清除获取状态标志
      isFetchingUnreadRef.current = false;
    }
  }, []);

  // 轮询通知 - 使用精确的定时器模式
  useEffect(() => {
    // 声明一个用于创建精确5秒轮询的函数
    const createExactTimer = () => {
      // 创建定时器函数
      const scheduleNextFetch = () => {
        console.log(`[通知系统] 安排下一次轮询: ${new Date().toLocaleTimeString()}`);
        
        pollingRef.current = setTimeout(() => {
          const now = Date.now();
          const elapsed = now - lastRequestTimeRef.current;
          console.log(`[通知系统] 轮询触发，实际间隔: ${elapsed}ms, 时间: ${new Date().toLocaleTimeString()}`);
          
          // 更新最后请求时间
          lastRequestTimeRef.current = now;
          
          // 执行请求
          fetchUnread();
          
          // 调度下一次请求
          scheduleNextFetch();
        }, 5000);
      };
      
      return scheduleNextFetch;
    };
    
    // 首次加载立即获取一次
    console.log(`[通知系统] 初始化获取通知: ${new Date().toLocaleTimeString()}`);
    lastRequestTimeRef.current = Date.now();
    fetchUnread();
    
    // 默认开启5秒轮询
    if (enablePolling) {
      console.log(`[通知系统] 启动精确定时轮询，间隔: 5000ms, 时间: ${new Date().toLocaleTimeString()}`);
      
      // 确保清理之前的定时器
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
      }
      
      // 启动精确的轮询定时器
      const scheduleNextFetch = createExactTimer();
      scheduleNextFetch();
    }
    
    // 组件卸载时清理
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
        pollingRef.current = null;
        console.log(`[通知系统] 停止轮询: ${new Date().toLocaleTimeString()}`);
      }
    };
  }, [fetchUnread, enablePolling]);

  // 添加页面可见性变化处理 - 使用新的精确定时器
  useEffect(() => {
    // 当页面变为可见时恢复轮询
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log(`[通知系统] 页面恢复可见，立即获取通知: ${new Date().toLocaleTimeString()}`);
        
        // 立即获取一次
        lastRequestTimeRef.current = Date.now();
        fetchUnread(); 
        
        // 重新启动轮询（如果已关闭）
        if (!pollingRef.current && enablePolling) {
          console.log(`[通知系统] 恢复轮询: ${new Date().toLocaleTimeString()}`);
          
          // 清理旧的计时器
          if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
          }
          
          // 5秒后再次请求
          pollingRef.current = setTimeout(() => {
            if (pollingRef.current) {
              clearTimeout(pollingRef.current);
              pollingRef.current = null;
            }
            
            // 恢复轮询
            pollingRef.current = setTimeout(function poll() {
              lastRequestTimeRef.current = Date.now();
              fetchUnread();
              pollingRef.current = setTimeout(poll, 5000);
            }, 5000);
          }, 5000);
        }
      } else if (document.visibilityState === 'hidden') {
        // 页面不可见时停止轮询以节省资源
        console.log(`[通知系统] 页面隐藏，暂停轮询: ${new Date().toLocaleTimeString()}`);
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
  }, [fetchUnread, enablePolling]);

  // 获取好友列表
  const fetchFriendList = useCallback(async () => {
    // 如果已经在获取中，直接返回避免重复请求
    if (isFetchingFriendListRef.current) return;
    
    try {
      isFetchingFriendListRef.current = true;
      
      // 使用带缓存的API调用，缓存时间为60秒
      const response = await cachedFetch("/user/getFriendList", {}, 60000);
      
      if (response?.success && response.data) {
        setFriendList(response.data);
      }
    } catch (error) {
      console.error("获取好友列表出错:", error);
      showToast("获取好友列表失败", "error");
    } finally {
      isFetchingFriendListRef.current = false;
    }
  }, [cachedFetch]);

  // 恢复原始的组件挂载逻辑
  useEffect(() => {
    // 移除调试日志
    // console.log('[Home组件] 初始化API调用', new Date().toLocaleTimeString(), 
    //          '路径:', window.location.pathname,
    //          'history状态:', history.length);
    
    fetchUserInfo();
    fetchUpcomingCapsules(); // 初始加载
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // fetchUpcomingCapsules 已被 useCallback 包裹，其依赖已在 useCallback 中声明

  // 处理胶囊类型变更
  const handleCapsuleTypeChange = (type) => {
    setCapsuleType(type);
    // 如果切换到非图片类型，清空图片URL
    if (type !== "image") {
      setImageUrl("");
    }
    // 如果切换到非邮件类型，清空邮箱地址
    if (type !== "email") {
      setEmailAddress("");
    }
  };

  // 处理图片上传
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 验证文件类型
    const fileType = file.type;
    if (!fileType.startsWith('image/')) {
      showToast("请上传图片文件", "error");
      return;
    }

    // 验证文件大小（限制为5MB）
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      showToast("图片大小不能超过5MB", "error");
      return;
    }

    try {
      setUploadLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.fetchWithToken("/timeNest/uploadImageNest", {
        method: "POST",
        body: formData
      });

      if (response.success && response.data) {
        setImageUrl(response.data);
        showToast("图片上传成功", "success");
      } else {
        showToast("图片上传失败: " + (response.message || "未知错误"), "error");
      }
    } catch (error) {
      console.error("图片上传出错:", error);
      showToast("图片上传请求失败", "error");
    } finally {
      setUploadLoading(false);
    }
  };

  // 只在打开好友选择器时才加载好友列表
  const openFriendSelector = useCallback((type) => {
    setFriendSelectorType(type);
    setShowFriendSelector(true);
    
    // 加载好友列表
    fetchFriendList();
  }, [fetchFriendList]);

  // 关闭好友选择器
  const closeFriendSelector = useCallback(() => {
    setShowFriendSelector(false);
  }, []);

  // 处理好友选择
  const handleFriendSelect = useCallback((friendId) => {
    if (friendSelectorType === 'share') {
      setSelectedFriendIds(prev => 
        prev.includes(friendId) 
          ? prev.filter(id => id !== friendId) 
          : [...prev, friendId]
      );
    } else {
      setSelectedUnlockFriendIds(prev => 
        prev.includes(friendId) 
          ? prev.filter(id => id !== friendId) 
          : [...prev, friendId]
      );
    }
  }, [friendSelectorType]);

  // 确认好友选择
  const confirmFriendSelection = useCallback(() => {
    closeFriendSelector();
  }, [closeFriendSelector]);

  // 表单重置
  const resetForm = () => {
    setTitle("");
    setContent("");
    setUnlockDate("");
    setCapsuleType("capsule");
    setIsPublic(false);
    setEmailAddress("");
    setImageUrl("");
    setSelectedFriendIds([]);
    setSelectedUnlockFriendIds([]);
  };

  const [isPublishing, setIsPublishing] = useState(false); // New state for publish button loading

  const handlePublishCapsule = async () => {
    if (isPublishing) return; // Prevent multiple submissions

    // 表单验证
    if (!title.trim()) {
      showToast("请输入标题", "error");
      return;
    }
    
    if (!unlockDate) {
      showToast("请选择解锁日期", "error");
      return;
    }

    // 验证邮箱（如果选择了邮件类型）
    if (capsuleType === "email" && !emailAddress.trim()) {
      showToast("请输入邮箱地址", "error");
      return;
    }

    // 验证图片URL（如果选择了图片类型）
    if (capsuleType === "image" && !imageUrl) {
      showToast("请上传图片", "error");
      return;
    }

    setIsPublishing(true); // Set loading state for publish button

    // 构建请求参数
    const nestTypeMap = {
      "capsule": "1",
      "email": "2",
      "image": "3"
    };

    const requestData = {
      nestType: nestTypeMap[capsuleType],
      nestTitle: title,
      nestContent: content,
      publicStatus: isPublic ? 1 : 2,
      unlockTime: unlockDate,
      friendIdList: selectedFriendIds,
      unlockToUserIdList: selectedUnlockFriendIds
    };

    // 根据类型添加特定参数
    if (capsuleType === "email") {
      requestData.toEmail = emailAddress;
    }

    if (capsuleType === "image") {
      requestData.imageUrl = imageUrl;
    }
    
    try {
      const response = await api.fetchWithToken("/timeNest/createTimeNest", {
        method: "POST",
        body: JSON.stringify(requestData)
      });
      
      if (response.success) {
        showToast("拾光纪条目创建成功！", "success");
        resetForm();
        fetchUpcomingCapsules();
      } else {
        showToast("创建失败: " + (response.message || "未知错误"), "error");
      }
    } catch (error) {
      console.error("创建拾光纪条目出错:", error);
      showToast("创建请求失败，请稍后再试", "error");
    } finally {
      setIsPublishing(false); // Reset loading state for publish button
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
  }

  const handleAvatarClick = () => {
    history.push('/user-profile')
  }

  // 根据胶囊类型返回对应的图标
  const getCapsuleTypeIcon = (type) => {
    switch(type) {
      case 2:
      case 'email':
        return faEnvelope;
      case 3:
      case 'image':
        return faImage;
      case 1:
      default:
        return faFeatherAlt;
    }
  }

  // 处理提前解锁胶囊
  const handleUnlockCapsule = (id) => {
    setConfirmModal({
      isOpen: true,
      title: "提前解锁",
      message: "确认提前解锁拾光纪吗？",
      capsuleId: id
    });
  };

  // 确认解锁胶囊
  const confirmUnlockCapsule = async () => {
    const id = confirmModal.capsuleId;
    
    try {
      const response = await cachedFetch("/timeNest/unlockNest", {
        method: "POST",
        body: JSON.stringify({
          id: id
        })
      }, 0);
      
      if (response.success) {
        showToast("胶囊解锁成功！", "success");
        // 刷新即将解锁的胶囊列表
        fetchUpcomingCapsules();
      } else {
        showToast("解锁失败：" + response.message, "error");
      }
    } catch (error) {
      console.error("解锁胶囊出错:", error);
      showToast("解锁请求失败，请稍后再试", "error");
    } finally {
      // 关闭确认对话框
      setConfirmModal({...confirmModal, isOpen: false});
    }
  };

  // 取消解锁胶囊
  const cancelUnlockCapsule = () => {
    setConfirmModal({...confirmModal, isOpen: false});
  };

  const handleFriendListClick = () => {
    history.push('/friend-list');
  };

  const handleMsgClick = () => {
    setShowMsgModal(true);
  };
  const handleCloseMsgModal = () => {
    setShowMsgModal(false);
  };
  
  // 处理拾光纪解锁通知
  const handleTimeNestNotice = useCallback(async (item, viewAction = false) => {
    setMsgLoadingId(item.id);
    try {
      // 标记通知为已读
      const res = await cachedFetch(`/user/markAsRead?noticeId=${item.id}`, {}, 0); // 不缓存此请求
      
      if (!res.success) throw new Error(res.message || '标记已读失败');
      
      // 刷新未读消息
      await fetchUnread();
      
      if (viewAction) {
        // 跳转到拾光纪详情页面，使用noticeId作为查询参数
        history.push({
          pathname: `/time-nest-detail`,
          state: { id: item.noticeId }
        });
      }
      
    } catch (e) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setMsgLoadingId(null);
    }
  }, [cachedFetch, fetchUnread, history]);
  
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
      await fetchUnread();
      
      // 接受好友请求后刷新好友列表
      if (result === 1) {
        // 清除好友列表缓存
        const cacheKey = "/user/getFriendList" + JSON.stringify({});
        delete apiCacheRef.current[cacheKey];
        // 获取最新好友列表
        await fetchFriendList();
      }
      
      showToast('操作成功', 'success');
    } catch (e) {
      showToast(e.message || '操作失败', 'error');
    } finally {
      setMsgLoadingId(null);
    }
  }, [cachedFetch, fetchUnread, fetchFriendList]);

  return (
    <div className="home-container">
      {/* Toast 通知 */}
      {toast.show && (
        <Toast 
          message={toast.message}
          type={toast.type}
          onClose={closeToast}
        />
      )}
      
      {/* 确认对话框 */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmUnlockCapsule}
        onCancel={cancelUnlockCapsule}
      />
      
      {/* Top Navigation Bar */}
      <div className="nav-bar">
        <div className="nav-tabs">
          <button
            className={`nav-tab ${activeTab === "capsule" ? "active" : ""}`}
            onClick={() => setActiveTab("capsule")}
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
            className={`nav-tab ${activeTab === "public-capsule" ? "active" : ""}`}
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

      {/* Main Content Area - now two columns */}
      <div className="main-content-grid"> {/* New wrapper for two columns */}
        {/* 左侧：新建拾光纪条目 (40%) */}
        <div className="create-section content-section">
          <h2 className="section-title">
            <FontAwesomeIcon icon={faFeatherAlt} style={{ marginRight: '0.75rem', opacity: 0.8 }} />
            新建拾光纪条目
          </h2>
          <div className="scrollable-area"> {/* Keep scrollable area for form content */}
            <div className="toggle-container">
              <span className="toggle-label">公开</span>
              <label className="toggle-switch">
                <input type="checkbox" checked={isPublic} onChange={() => setIsPublic(!isPublic)} />
                <span className="toggle-slider"></span>
              </label>
              <span style={{ marginLeft: '0.75rem', fontSize: '0.85rem', color: 'var(--gray-600)' }}>
                {isPublic ? <FontAwesomeIcon icon={faGlobe} style={{ marginRight: '0.3rem' }} /> : <FontAwesomeIcon icon={faLock} style={{ marginRight: '0.3rem' }} />}
                {isPublic ? "所有人可见" : "仅自己可见"}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faFeatherAlt} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                标题
              </label>
              <input
                type="text"
                className="form-control title-input"
                placeholder="给你的拾光纪条目起个名字..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">类型</label>
              <div className="type-buttons">
                <button
                  type="button"
                  className={`type-button ${capsuleType === "capsule" ? "active" : ""}`}
                  onClick={() => handleCapsuleTypeChange("capsule")}
                >
                  <FontAwesomeIcon icon={faFeatherAlt} style={{ marginRight: '0.5rem' }} />
                  胶囊
                </button>
                <button
                  type="button"
                  className={`type-button ${capsuleType === "email" ? "active" : ""}`}
                  onClick={() => handleCapsuleTypeChange("email")}
                >
                  <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '0.5rem' }} />
                  邮件
                </button>
                <button
                  type="button"
                  className={`type-button ${capsuleType === "image" ? "active" : ""}`}
                  onClick={() => handleCapsuleTypeChange("image")}
                >
                  <FontAwesomeIcon icon={faImage} style={{ marginRight: '0.5rem' }} />
                  图片
                </button>
              </div>
            </div>

            {capsuleType === "email" && (
              <div className="form-group">
                <label className="form-label">
                  <FontAwesomeIcon icon={faEnvelope} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                  邮箱地址
                </label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="请输入邮箱地址..."
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
            )}

            {capsuleType === "image" && (
              <div className="form-group">
                <label className="form-label">
                  <FontAwesomeIcon icon={faImage} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                  上传图片
                </label>
                <div className="image-upload-container">
                  {imageUrl ? (
                    <div className="uploaded-image-preview">
                      <img
                        src={imageUrl}
                        alt="已上传的图片"
                        className="image-preview"
                      />
                      <button
                        type="button"
                        className="change-image-button"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        更换图片
                      </button>
                    </div>
                  ) : (
                    <div 
                      className="upload-button-container"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {uploadLoading ? (
                        <div className="upload-loading">上传中...</div>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faUpload} size="2x" />
                          <span>点击上传图片</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faPencilAlt} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                内容
              </label>
              <textarea
                className="form-control"
                placeholder="在这里记录你想对未来说的话，支持 markdown 格式..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              ></textarea>
            </div>

            <button type="button" className="ai-button">
              <span className="ai-icon">
                <FontAwesomeIcon icon={faMagic} />
              </span>
              AI 一键总结
            </button>
            
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                与你一同创建拾光纪条目
              </label>
              <button
                type="button"
                className="friend-select-button"
                onClick={() => openFriendSelector('share')}
              >
                <FontAwesomeIcon icon={faUsers} style={{ marginRight: '0.5rem' }} />
                选择好友 ({selectedFriendIds.length})
              </button>
            </div>
            
            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faUserLock} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                邀你一起解锁查看
              </label>
              <button
                type="button"
                className="friend-select-button"
                onClick={() => openFriendSelector('unlock')}
              >
                <FontAwesomeIcon icon={faUserLock} style={{ marginRight: '0.5rem' }} />
                选择好友 ({selectedUnlockFriendIds.length})
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">
                <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.5rem', color: 'var(--primary-color)' }} />
                解锁日期
              </label>
              <div className="date-selector">
                <div className="date-input-container">
                  <input
                    type="date"
                    className="form-control"
                    value={unlockDate}
                    onChange={(e) => setUnlockDate(e.target.value)}
                  />
                </div>
                <div className="date-preview-container">
                  {unlockDate && (
                    <div className="date-preview">
                      <FontAwesomeIcon icon={faClock} />
                      {formatDate(unlockDate)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <button 
            type="button" 
            className="publish-button" 
            onClick={handlePublishCapsule}
            disabled={isPublishing}
          >
            {isPublishing ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin style={{ marginRight: '0.5rem' }} />
                发布中...
              </>
            ) : (
              "发布拾光纪条目"
            )}
          </button>
        </div>

        {/* 右侧：即将解锁的拾光纪 (60%) */}
        <div className="upcoming-section content-section"> 
          <h2 className="section-title">
            <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.75rem', opacity: 0.8 }} />
            即将解锁的拾光纪
          </h2>
          <div className="capsule-list-grid-wrapper"> {/* New wrapper for grid if needed, or apply grid to upcoming-section directly */} 
            {loading && upcomingCapsules.length === 0 ? (
              <div className="loading-message">
                <FontAwesomeIcon icon={faSpinner} spin size="2x" style={{ marginBottom: '1rem', color: 'var(--primary-color)' }} />
                <span>加载中...</span>
              </div>
            ) : upcomingCapsules.length > 0 ? (
              <div className="time-nest-grid"> {/* This will use existing grid styles from TimeNestGrid.css */} 
                {upcomingCapsules.map(capsule => (
                  <TimeNestCard
                    key={capsule.id + '-' + capsule.nestTitle}
                    data={{
                      id: capsule.id,
                      nestType: capsule.nestType,
                      nestTitle: capsule.nestTitle,
                      nestContent: capsule.nestContent,
                      createdAt: capsule.createdAt,
                      unlockedStatus: 0, 
                      publicStatus: capsule.publicStatus,
                      coverImage: capsule.coverImage || null,
                      unlockTime: capsule.unlockTime // 传递unlockTime给TimeNestCard用于显示
                    }}
                    onClick={() => handleUnlockCapsule(capsule.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-message">
                <FontAwesomeIcon icon={faFeatherAlt} size="3x" style={{ marginBottom: '1rem', opacity: 0.6, color: 'var(--gray-400)' }}/>
                <span>目前没有未解锁的拾光纪</span>
                <span style={{fontSize: '0.9rem', color: 'var(--gray-500)', marginTop: '0.5rem'}}>快去创建一个吧！</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 消息弹窗 */}
      {showMsgModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, width: '95%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2' }}>通知中心</h3>
            {unreadList.length === 0 ? (
              <div style={{ color: '#888', padding: '2rem 0', textAlign: 'center' }}>暂无新通知</div>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {unreadList.map(item => {
                  // 拾光纪解锁通知
                  if (item.noticeType === 0) {
                    return (
                      <li key={item.id} style={{ marginBottom: '1.2rem', borderBottom: '1px solid #eee', paddingBottom: '1rem' }}>
                        <div style={{ fontWeight: 500, marginBottom: 12 }}>
                          <span style={{ display: 'block', marginBottom: 6 }}>
                            「{item.timeNestTitle}」在刚刚解锁啦！快去查看吧！
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#777' }}>
                            {item.createdAt}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button className="confirm-button" style={{ minWidth: 80 }}
                            disabled={msgLoadingId === item.id}
                            onClick={() => handleTimeNestNotice(item, true)}
                          >去查看</button>
                          <button className="cancel-button" style={{ minWidth: 80 }}
                            disabled={msgLoadingId === item.id}
                            onClick={() => handleTimeNestNotice(item, false)}
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
                            {item.createdAt}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button className="confirm-button" style={{ minWidth: 70 }}
                            disabled={msgLoadingId === item.id}
                            onClick={() => handleProcessRequest(item, 1)}
                          >接受</button>
                          <button className="cancel-button" style={{ minWidth: 70 }}
                            disabled={msgLoadingId === item.id}
                            onClick={() => handleProcessRequest(item, 0)}
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
                            新通知 (类型: {item.noticeType})
                          </span>
                          <span style={{ fontSize: '0.8rem', color: '#777' }}>
                            {item.createdAt}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                          <button className="cancel-button" style={{ minWidth: 80 }}
                            disabled={msgLoadingId === item.id}
                            onClick={() => handleTimeNestNotice(item, false)}
                          >我知道了</button>
                        </div>
                      </li>
                    );
                  }
                })}
              </ul>
            )}
            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="cancel-button" onClick={handleCloseMsgModal}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* 好友选择器模态框 */}
      {showFriendSelector && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 500, width: '95%' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#1976d2' }}>
              {friendSelectorType === 'share' ? '选择通知的好友' : '选择一起查看的好友'}
            </h3>
            
            {friendList.length === 0 ? (
              <div style={{ color: '#888', padding: '2rem 0' }}>暂无好友</div>
            ) : (
              <div className="friend-selector-list">
                {friendList.map(friend => (
                  <div 
                    key={friend.id} 
                    className={`friend-selector-item ${
                      friendSelectorType === 'share' 
                        ? (selectedFriendIds.includes(friend.id) ? 'selected' : '')
                        : (selectedUnlockFriendIds.includes(friend.id) ? 'selected' : '')
                    }`}
                    onClick={() => handleFriendSelect(friend.id)}
                  >
                    <img 
                      src={friend.avatarUrl || "https://via.placeholder.com/40"} 
                      alt={friend.nickName || friend.userAccount} 
                      className="friend-avatar"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://via.placeholder.com/40";
                      }}
                    />
                    <div className="friend-info">
                      <div className="friend-name">{friend.nickName || friend.userAccount}</div>
                      <div className="friend-account">{friend.userAccount}</div>
                    </div>
                    <div className="friend-select-indicator">
                      {(friendSelectorType === 'share' 
                        ? selectedFriendIds.includes(friend.id)
                        : selectedUnlockFriendIds.includes(friend.id)) && (
                        <FontAwesomeIcon icon={faCheckCircle} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="modal-actions" style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="cancel-button" onClick={closeFriendSelector}>取消</button>
              <button className="confirm-button" onClick={confirmFriendSelection}>确定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
