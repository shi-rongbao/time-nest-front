import React, { useState, useEffect } from 'react';
import { useHistory } from 'react-router-dom';
import api from '../../services/api';
import '../../assets/styles/TimeNestList.css';

function PublicTimeNestList() {
    const [timeNests, setTimeNests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const pageSize = 10;
    const history = useHistory();

    useEffect(() => {
        fetchPublicTimeNests();
    }, [currentPage]);

    const fetchPublicTimeNests = async () => {
        try {
            setLoading(true);
            const response = await api.queryPublicTimeNestList(currentPage, pageSize);
            
            if (response.success) {
                setTimeNests(response.data.records);
                setTotalPages(response.data.pages);
                setTotalItems(response.data.total);
            } else {
                setError(response.message || '获取公开拾光纪列表失败');
            }
        } catch (err) {
            setError('获取公开拾光纪列表时发生错误');
            console.error('获取公开拾光纪列表错误:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = (id) => {
        history.push(`/time-nest-detail/${id}`);
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('zh-CN');
    };

    const getNestTypeText = (nestType) => {
        switch (nestType) {
            case 1:
                return '时光胶囊';
            case 2:
                return '邮件胶囊';
            case 3:
                return '图片胶囊';
            default:
                return '时光胶囊';
        }
    };

    const getUnlockedStatusText = (status) => {
        return status === 1 ? '已解锁' : '未解锁';
    };

    return (
        <div className="time-nest-list-container">
            <div className="time-nest-content">
                <div className="header-section">
                    <div className="back-button-container">
                        <button 
                            className="public-nest-back-button"
                            onClick={() => history.push('/home')}
                        >
                            返回首页
                        </button>
                    </div>
                    
                    <h1 className="page-title">公开拾光纪</h1>
                </div>
                
                {loading ? (
                    <div className="loading-container">加载中...</div>
                ) : error ? (
                    <div className="error-container">{error}</div>
                ) : timeNests.length === 0 ? (
                    <div className="empty-list">暂无公开拾光纪条目</div>
                ) : (
                    <div className="time-nest-list">
                        {timeNests.map((timeNest) => (
                            <div 
                                key={timeNest.id} 
                                className="time-nest-item"
                                onClick={() => handleViewDetail(timeNest.id)}
                            >
                                <div className="time-nest-header">
                                    <h3 className="time-nest-title">{timeNest.nestTitle}</h3>
                                    <span className="time-nest-type">{getNestTypeText(timeNest.nestType)}</span>
                                </div>
                                
                                <div className="time-nest-content-preview">
                                    {timeNest.nestContent.length > 100 
                                        ? `${timeNest.nestContent.substring(0, 100)}...` 
                                        : timeNest.nestContent}
                                </div>
                                
                                <div className="time-nest-footer">
                                    <span className="time-nest-date">创建于: {formatDate(timeNest.createdAt)}</span>
                                    <span className="time-nest-unlock-time">
                                        解锁时间: {timeNest.unlockTime}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {timeNests.length > 0 && (
                    <div className="pagination">
                        <button 
                            className="pagination-btn" 
                            onClick={handlePrevPage}
                            disabled={currentPage === 1}
                        >
                            上一页
                        </button>
                        <span className="pagination-info">
                            第 {currentPage} 页 / 共 {totalPages} 页 (总计 {totalItems} 条)
                        </span>
                        <button 
                            className="pagination-btn" 
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
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
}

export default PublicTimeNestList; 