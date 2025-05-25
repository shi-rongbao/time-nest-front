import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../../assets/styles/LoginRegister.css';
import '../../assets/styles/UserProfile.css';
import api from '../../services/api';
import { useHistory } from 'react-router-dom';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { getCachedAvatar, cacheAvatar, clearAvatarCache } from '../../utils/cacheUtils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';

const UserProfile = () => {
    const [userInfo, setUserInfo] = useState({
        userAccount: '',
        nickName: '',
        phone: null,
        email: '',
        avatarUrl: getCachedAvatar() || '',
        introduce: null,
        createdAt: ''
    });

    const [editableInfo, setEditableInfo] = useState({
        nickName: '',
        phone: '',
        avatarUrl: '',
        introduce: '',
        password: ''
    });

    // const [selectedFile, setSelectedFile] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const history = useHistory();
    const apiCacheRef = useRef({});

    // 实现带缓存的API调用
    const cachedFetch = useCallback(async (url, options = {}, cacheTime = 60000) => {
        const cacheKey = url + JSON.stringify(options);
        const cachedData = apiCacheRef.current[cacheKey];
        
        // 如果有缓存且未过期，直接返回缓存数据
        if (cachedData && Date.now() - cachedData.timestamp < cacheTime) {
            console.log('UserProfile从缓存获取数据:', url);
            return cachedData.data;
        }
        
        // 记录API请求
        console.log('UserProfile发起API请求:', url);
        
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

    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const cachedAvatar = getCachedAvatar();
                if (cachedAvatar) {
                    setUserInfo(prev => ({
                        ...prev,
                        avatarUrl: cachedAvatar
                    }));
                }
                
                const response = await cachedFetch('/user/getUserInfo', {}, 120000); // 2分钟缓存
                if (response?.success && response.data) {
                    const avatarUrl = (response.data.avatarUrl || '').trim().replace(/`/g, '');
                    
                    if (avatarUrl && avatarUrl !== getCachedAvatar()) {
                        cacheAvatar(avatarUrl);
                    }
                    
                    setUserInfo({
                        ...response.data,
                        avatarUrl: avatarUrl || getCachedAvatar() || ''
                    });
                    
                    setEditableInfo({
                        nickName: response.data.nickName || '',
                        phone: response.data.phone || '',
                        avatarUrl: avatarUrl,
                        introduce: response.data.introduce || '',
                        password: ''
                    });
                } else {
                    toast.error('获取用户信息失败');
                }
            } catch (error) {
                toast.error('获取用户信息出错，请稍后重试');
            }
        };

        fetchUserInfo();
    }, [cachedFetch]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setEditableInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        // setSelectedFile(file);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // 上传头像不缓存
            const response = await cachedFetch('/user/uploadAvatar', {
                method: 'POST',
                body: formData
            }, 0);

            if (response?.success && response.code === 200 && response.data) {
                const avatarUrl = response.data.trim().replace(/`/g, '');
                
                cacheAvatar(avatarUrl);
                
                toast.success('头像上传成功');
                setUserInfo(prev => ({ ...prev, avatarUrl }));
                setEditableInfo(prev => ({ ...prev, avatarUrl }));
            } else {
                toast.error('头像上传失败');
            }
        } catch (error) {
            toast.error('上传失败，请稍后再试');
        }
    };

    const handleSave = async () => {
        const requestData = {
            password: editableInfo.password,
            nickName: editableInfo.nickName,
            phone: editableInfo.phone,
            introduce: editableInfo.introduce
        };

        const filteredData = Object.fromEntries(
            Object.entries(requestData).filter(([_, value]) => value !== '')
        );

        try {
            // 更新信息不缓存
            const response = await cachedFetch('/user/updateUserInfo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(filteredData)
            }, 0);

            if (response?.success) {
                toast.success('信息更新成功');
                setUserInfo(prev => ({ ...prev, ...editableInfo }));
                
                // 清除getUserInfo的缓存，以便下次获取到最新数据
                const cacheKey = '/user/getUserInfo' + JSON.stringify({});
                delete apiCacheRef.current[cacheKey];
            } else {
                toast.error('信息更新失败');
            }
        } catch (error) {
            toast.error('更新信息出错，请稍后重试');
        }
    };

    const handleLogout = async () => {
        try {
            // 退出登录不缓存
            const response = await cachedFetch('/user/logout', {
                method: 'GET'
            }, 0);
            
            if (response?.success) {
                clearAvatarCache();
                localStorage.removeItem('satoken');
                toast.success('退出登录成功');
                setTimeout(() => history.push('/login'), 1500);
            } else {
                toast.error('退出登录失败');
            }
        } catch (error) {
            toast.error('退出登录出错，请稍后重试');
        }
    };

    const handleDeleteAccount = () => {
        setShowModal(true);
    };

    const handleGoBack = () => {
        history.goBack();
    };

    const EditableText = ({ value = '', onChange, name }) => {
        const [isEditing, setIsEditing] = useState(false);
        const editableRef = useRef(null);

        const handleEdit = () => {
            setIsEditing(true);
            setTimeout(() => editableRef.current?.focus(), 0);
        };

        const handleBlur = () => {
            setIsEditing(false);
            const newValue = editableRef.current?.innerText.trim() || '';
            onChange({ target: { name, value: newValue } });
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                editableRef.current?.blur();
            }
        };

        return (
            <div className="editable-text">
                {isEditing ? (
                    <div
                        ref={editableRef}
                        contentEditable
                        className="content-editable"
                        onBlur={handleBlur}
                        onKeyDown={handleKeyDown}
                        suppressContentEditableWarning
                    >
                        {value}
                    </div>
                ) : (
                    <div onClick={handleEdit} className="editable-view">
                        {value || (name === 'password' ? '修改密码' : '点击编辑')}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="user-profile-container">
            <ToastContainer position="top-center" autoClose={2000} />
            <div className="profile-header">
                <button className="back-button" onClick={handleGoBack}>
                    <FontAwesomeIcon icon={faArrowLeft} className="back-icon" />
                    <span style={{ marginLeft: '8px' }}>返回</span>
                </button>
                <h2>用户信息</h2>
            </div>

            <div className="avatar-upload">
                <div className="avatar-preview">
                    <img
                        src={userInfo.avatarUrl}
                        alt="用户头像"
                        onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = 'https://via.placeholder.com/150';
                        }}
                    />
                </div>
                <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="avatar-upload"
                />
                <label htmlFor="avatar-upload" className="upload-button">上传头像</label>
            </div>

            <div className="profile-info">
                <div className="info-item">
                    <label>用户名:</label>
                    <p>{userInfo.userAccount}</p>
                </div>
                <div className="info-item">
                    <label>昵称:</label>
                    <EditableText value={editableInfo.nickName} onChange={handleInputChange} name="nickName" />
                </div>
                <div className="info-item">
                    <label>手机号:</label>
                    <EditableText value={editableInfo.phone} onChange={handleInputChange} name="phone" />
                </div>
                <div className="info-item">
                    <label>邮箱:</label>
                    <p>{userInfo.email}</p>
                </div>
                <div className="info-item">
                    <label>密码:</label>
                    <EditableText value={editableInfo.password} onChange={handleInputChange} name="password" />
                </div>
                <div className="info-item">
                    <label>个人简介:</label>
                    <EditableText value={editableInfo.introduce} onChange={handleInputChange} name="introduce" />
                </div>
            </div>

            <div className="action-buttons">
                <button className="save-button" onClick={handleSave}>保存信息</button>
                <button className="logout-button" onClick={handleLogout}>退出登录</button>
                <button className="delete-button" onClick={handleDeleteAccount}>注销账号</button>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h3>确认注销？</h3>
                        <p>您确定要注销账号吗？此操作不可撤销。</p>
                        <div className="modal-actions">
                            <button className="confirm-button" onClick={async () => {
                                try {
                                    const response = await api.fetchWithToken('/user/deactivateRequest', {
                                        method: 'GET'
                                    });
                                    if (response?.success) {
                                        localStorage.removeItem('satoken');
                                        toast.success('账号注销请求已提交');
                                        history.push('/login');
                                    } else {
                                        toast.error('账号注销请求提交失败');
                                    }
                                } catch (error) {
                                    toast.error('提交注销请求出错，请稍后重试');
                                } finally {
                                    setShowModal(false);
                                }
                            }}>确认</button>
                            <button className="cancel-button" onClick={() => setShowModal(false)}>取消</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
