import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../../assets/styles/FriendList.css';
import api from '../../services/api';
import { useHistory } from 'react-router-dom';

// 使用useRef管理缓存以保持组件渲染间的状态
const FriendList = () => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addAccount, setAddAccount] = useState('');
  const [addMsg, setAddMsg] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addTip, setAddTip] = useState('');
  const isFetchingRef = useRef(false);
  const apiCacheRef = useRef({});
  const history = useHistory();

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

  useEffect(() => {
    const fetchFriends = async () => {
      // 如果已经在获取中，直接返回避免重复请求
      if (isFetchingRef.current) return;
      
      setLoading(true);
      setError('');
      isFetchingRef.current = true;
      
      try {
        const res = await cachedFetch('/user/getFriendList', {}, 60000); // 增加到60秒缓存
        if (res.success && Array.isArray(res.data)) {
          setFriends(res.data);
        } else {
          setFriends([]);
        }
      } catch (e) {
        console.error("获取好友列表错误:", e);
        setError('获取好友列表失败，请稍后重试');
      } finally {
        setLoading(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchFriends();
    
    // 清理函数
    return () => {
      // 组件卸载时可以执行一些清理操作
    };
  }, [cachedFetch]);

  const handleAddFriend = async () => {
    if (!addAccount.trim()) {
      setAddTip('请输入对方账号');
      return;
    }
    setAddLoading(true);
    setAddTip('');
    try {
      const res = await cachedFetch('/user/sendFriendRequest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAccount: addAccount.trim(), requestMessage: addMsg.trim() })
      }, 0); // 不缓存发送好友请求的操作
      
      if (res.success) {
        setAddTip('好友申请已发送！');
        setTimeout(() => {
          setShowAddModal(false);
          setAddAccount('');
          setAddMsg('');
          setAddTip('');
        }, 1200);
      } else {
        setAddTip(res.message || '申请失败');
      }
    } catch (e) {
      setAddTip('网络异常，请稍后重试');
    } finally {
      setAddLoading(false);
    }
  };

  return (
    <div className="friend-list-container">
      <div className="friend-list-header">
        <button className="back-button" onClick={() => history.push('/home')}>返回首页</button>
        <h2>我的好友列表</h2>
        <button className="add-friend-btn" onClick={() => setShowAddModal(true)}>添加好友</button>
      </div>
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content add-friend-modal">
            <h3>添加好友</h3>
            <input
              className="add-input"
              type="text"
              placeholder="请输入对方账号"
              value={addAccount}
              onChange={e => setAddAccount(e.target.value)}
              disabled={addLoading}
            />
            <textarea
              className="add-input"
              placeholder="请求消息（可选）"
              value={addMsg}
              onChange={e => setAddMsg(e.target.value)}
              disabled={addLoading}
              style={{ minHeight: 60 }}
            />
            {addTip && <div className="add-tip">{addTip}</div>}
            <div className="modal-actions">
              <button className="confirm-button" onClick={handleAddFriend} disabled={addLoading}>发送申请</button>
              <button className="cancel-button" onClick={() => { setShowAddModal(false); setAddTip(''); }} disabled={addLoading}>取消</button>
            </div>
          </div>
        </div>
      )}
      {loading ? (
        <div className="loading-message">加载中...</div>
      ) : error ? (
        <div className="empty-message">{error}</div>
      ) : friends.length === 0 ? (
        <div className="empty-message">暂无好友，快去添加好友吧！</div>
      ) : (
        <ul className="friend-list">
          {friends.map(friend => (
            <li className="friend-item" key={friend.userAccount}>
              <img className="friend-avatar" src={friend.avatarUrl} alt={friend.nickName} onError={e => {e.target.onerror=null;e.target.src='https://via.placeholder.com/60';}} />
              <div className="friend-info">
                <div className="friend-nickname">{friend.nickName}</div>
                <div className="friend-account">账号：{friend.userAccount}</div>
                <div className="friend-intro">{friend.introduce || '这个人很神秘~'}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FriendList; 