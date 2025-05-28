import React, { useState } from 'react';
import '../../assets/styles/LoginRegister.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useHistory } from 'react-router-dom';
import api from '../../services/api'; // 导入API服务

const Login = () => {
    const [userAccount, setUserAccount] = useState('');
    const [password, setPassword] = useState('');
    const history = useHistory();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            // 使用API服务发送请求
            const data = await api.fetchWithToken('/user/login', {
                method: 'POST',
                body: JSON.stringify({
                    userAccount,
                    password
                }),
            });

            if (data.code !== 200) {
                console.error(`请求失败，错误信息: ${data.message}`);
                toast.error(data.message);
                return;
            }

            // 存储 token 到 localStorage
            localStorage.setItem('satoken', data.data);

            // 显示登录成功提示
            toast.success('登录成功！');
            console.log('登录成功');

            // 跳转到首页
            history.push('/home');
        } catch (error) {
            console.error('网络请求出错:', error);
            toast.error('网络请求出错，请稍后重试');
        }
    };

    return (
        <div className="login-register-container">
            <h2>登录</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="用户名"
                    value={userAccount}
                    onChange={(e) => setUserAccount(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit" className="action-button">
                    登录
                </button>
            </form>
            <ToastContainer />
        </div>
    );
};

export default Login; 