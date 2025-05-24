// 添加请求计数器用于调试
let requestCounter = 0;
const activeRequests = {};

const api = {
    fetchWithToken: async (url, options = {}) => {
        // 记录请求ID和URL
        const requestId = ++requestCounter;
        const startTime = Date.now();
        activeRequests[requestId] = { url, startTime };
        
        console.log(`[API请求 #${requestId}] 开始请求: ${url}`);
        
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
            const response = await fetch(url, newOptions);
            const data = await response.json();
            
            // 计算请求耗时
            const endTime = Date.now();
            const duration = endTime - startTime;
            
            console.log(`[API请求 #${requestId}] 完成: ${url}, 耗时: ${duration}ms`);
            
            // 清理请求记录
            delete activeRequests[requestId];
            
            return data;
        } catch (error) {
            console.error(`[API请求 #${requestId}] 错误:`, url, error);
            
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