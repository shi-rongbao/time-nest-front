import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFeatherAlt, faEnvelope, faImage, faCalendarAlt, faGlobe, faLock, faArrowLeft, faClock, faFilter, faTag, faExclamationTriangle, faCheckCircle, faTimesCircle, faInfoCircle } from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import '../../assets/styles/TimeNestList.css';
import LockIcon from '../../assets/images/lock-icon.png';

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
  const [pagination, setPagination] = useState({
    current: 1,
    size: 5, // 默认分页大小改为5
    total: 0,
    pages: 0
  });
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

  // 获取我发布的拾光纪条目列表 - 使用useCallback包装避免依赖循环
  const fetchMyTimeNestList = useCallback(async (page = 1) => {
    try {
      setLoading(true);
      
      // 构建请求参数，当选择"全部"时不传递相应参数
      const requestParams = {
        pageNum: page,
        pageSize: pagination.size
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
        setNestList(response.data.records);
        setPagination({
          current: response.data.current,
          size: response.data.size,
          total: response.data.total,
          pages: response.data.pages
        });
      }
    } catch (error) {
      console.error("获取拾光纪条目列表出错:", error);
    } finally {
      setLoading(false);
    }
  }, [pagination.size, filters, cachedFetch]);

  // 只在filters变化时重新获取数据
  useEffect(() => {
    fetchMyTimeNestList();
  }, [filters, fetchMyTimeNestList]);

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

  // 处理筛选条件变更
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 处理分页
  const handlePageChange = (page) => {
    fetchMyTimeNestList(page);
  };

  // 格式化日期展示
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  // 根据类型获取对应图标
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

  // 根据类型数字返回对应文本
  const mapNestType = (typeNum) => {
    switch (typeNum) {
      case 1:
        return "胶囊";
      case 2:
        return "邮件";
      case 3:
        return "图片";
      default:
        return "胶囊";
    }
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
    const id = confirmModal.nestId;
    
    try {
      const response = await cachedFetch("/timeNest/unlockNest", {
        method: "POST",
        body: JSON.stringify({
          id: id
        })
      }, 0); // 不缓存解锁操作
      
      if (response.success) {
        showToast("拾光纪条目解锁成功！", "success");
        // 刷新列表
        fetchMyTimeNestList(pagination.current);
      } else {
        showToast("解锁失败：" + (response.message || "未知错误"), "error");
      }
    } catch (error) {
      console.error("解锁拾光纪条目出错:", error);
      showToast("解锁请求失败，请稍后再试", "error");
    } finally {
      // 关闭确认对话框
      setConfirmModal({...confirmModal, isOpen: false});
    }
  };

  // 取消解锁
  const cancelUnlockNest = () => {
    setConfirmModal({...confirmModal, isOpen: false});
  };

  return (
    <div className="time-nest-list-container">
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
        onConfirm={confirmUnlockNest}
        onCancel={cancelUnlockNest}
      />
      
      <div className="time-nest-content">
        <div className="header-section">
          <div className="back-button-container">
            <button 
              className="public-nest-back-button"
              onClick={handleBackToHome}
            >
              返回首页
            </button>
          </div>
          
          <h1 className="page-title">我发布的拾光纪条目</h1>
        </div>

        <div className="filters-section">
          <div className="filter-group">
            <label><FontAwesomeIcon icon={faTag} style={{ marginRight: '8px' }} />类型:</label>
            <select 
              value={filters.nestType} 
              onChange={(e) => handleFilterChange('nestType', parseInt(e.target.value))}
            >
              <option value={0}>全部</option>
              <option value={1}>胶囊</option>
              <option value={2}>邮件</option>
              <option value={3}>图片</option>
            </select>
          </div>
          <div className="filter-group">
            <label><FontAwesomeIcon icon={faFilter} style={{ marginRight: '8px' }} />状态:</label>
            <select 
              value={filters.unlockedStatus} 
              onChange={(e) => handleFilterChange('unlockedStatus', parseInt(e.target.value))}
            >
              <option value={2}>全部</option>
              <option value={0}>未解锁</option>
              <option value={1}>已解锁</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">加载中...</div>
        ) : nestList.length > 0 ? (
          <div className="time-nest-list">
            {nestList.map(nest => (
              <div 
                key={nest.id} 
                className="time-nest-item"
                onClick={() => handleViewTimeNestDetail(nest.id)}
              >
                <div className="time-nest-header">
                  <h3 className="time-nest-title">
                    <FontAwesomeIcon 
                      icon={getNestTypeIcon(nest.nestType)} 
                      style={{ marginRight: '0.5rem', opacity: 0.8 }} 
                    />
                    {nest.nestTitle}
                  </h3>
                  <span className="time-nest-type">
                    {nest.unlockedStatus === 1 ? "已解锁" : (
                      <span style={{ display: 'flex', alignItems: 'center' }}>
                        {nest.unlockedStatus === 0 && (
                          <img 
                            src={LockIcon} 
                            alt="未解锁" 
                            style={{ width: '16px', height: '16px', marginRight: '5px', cursor: 'pointer' }}
                            onClick={(e) => {
                              e.stopPropagation(); // 阻止事件冒泡
                              handleUnlockNest(nest.id);
                            }}
                            title="点击提前解锁"
                          />
                        )}
                        未解锁
                      </span>
                    )}
                  </span>
                </div>
                
                <div className="time-nest-content-preview">
                  {nest.nestContent.length > 100 
                    ? `${nest.nestContent.substring(0, 100)}...` 
                    : nest.nestContent}
                </div>
                
                <div className="time-nest-footer">
                  <span className="time-nest-date">
                    <FontAwesomeIcon icon={faCalendarAlt} style={{ marginRight: '0.3rem' }} />
                    创建于: {formatDate(nest.createdAt)}
                  </span>
                  <span className="time-nest-unlock-time">
                    <FontAwesomeIcon icon={faClock} style={{ marginRight: '0.3rem' }} />
                    解锁时间: {formatDate(nest.unlockTime)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-list">暂无拾光纪条目，快去创建一个吧！</div>
        )}

        {/* 分页控件 */}
        {nestList.length > 0 && pagination.pages > 1 && (
          <div className="pagination">
            <button 
              className="pagination-btn"
              disabled={pagination.current <= 1}
              onClick={() => handlePageChange(pagination.current - 1)}
            >
              上一页
            </button>
            <span className="pagination-info">
              第 {pagination.current} 页 / 共 {pagination.pages} 页 (总计 {pagination.total} 条)
            </span>
            <button 
              className="pagination-btn"
              disabled={pagination.current >= pagination.pages}
              onClick={() => handlePageChange(pagination.current + 1)}
            >
              下一页
            </button>
          </div>
        )}
        
        {/* 底部留白 */}
        <div className="footer-spacer"></div>
      </div>
    </div>
  );
};

export default MyTimeNestList; 