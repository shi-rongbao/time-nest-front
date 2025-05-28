// 导入配置
import config from '../config';

// 添加请求计数器用于调试
let requestCounter = 0;
const activeRequests = {};

// 获取API基础URL
const API_BASE_URL = config.api.getBaseUrl();

// 如果需要手动指定API服务器地址，可以取消下面注释并设置具体的URL
// const API_BASE_URL = 'http://your-api-server-url';

const api = {
    fetchWithToken: async (url, options = {}) => {
        // 记录请求ID和URL
        const requestId = ++requestCounter;
        const startTime = Date.now();
        const fullUrl = `${API_BASE_URL}${url}`;
        activeRequests[requestId] = { url: fullUrl, startTime };
        
        console.log(`[API请求 #${requestId}] 开始请求: ${fullUrl}`);
        
        const token = localStorage.getItem('satoken');

        const headers = {
            ...options.headers
        };

        // ✅ 只有在不是 FormData 的情况下才手动加 Content-Type
        const isFormData = options.body instanceof FormData;
        if (!isFormData) {
            headers['Content-Type'] = 'application/json';
        }

        // ✅ 正确加上 token
        if (token) {
            headers['satoken'] = token;
        }

        const newOptions = {
            ...options,
            headers
        };

        try {
            const response = await fetch(fullUrl, newOptions);
            const data = await response.json();
            
            // 计算请求耗时
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`[API请求 #${requestId}] 完成: ${fullUrl}, 耗时: ${duration}ms`);
            
            // 清理请求记录
            delete activeRequests[requestId];
            
            return data;
        } catch (error) {
            console.error(`[API请求 #${requestId}] 错误:`, fullUrl, error);
            
            // 清理请求记录
            delete activeRequests[requestId];
            
            throw error;
        }
    },
    
    // 获取当前活跃请求的统计信息
    getActiveRequestsStats: () => {
        const activeCount = Object.keys(activeRequests).length;
        const urls = Object.values(activeRequests).map(req => req.url);
        
        return {
            activeCount,
            urls,
            totalRequests: requestCounter
        };
    },

    // 查询公开的拾光纪条目
    queryPublicTimeNestList: async (pageNum, pageSize) => {
        return api.fetchWithToken('/timeNest/queryPublicTimeNestList', {
            method: 'POST',
            body: JSON.stringify({
                pageNum,
                pageSize
            })
        });
    }
};

export default api; 