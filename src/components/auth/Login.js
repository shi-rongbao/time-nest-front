import React, { useState } from 'react';
import '../../assets/styles/LoginRegister.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useHistory } from 'react-router-dom';

const Login = () => {
    const [userAccount, setUserAccount] = useState('');
    const [password, setPassword] = useState('');
    const history = useHistory();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = '/user/login';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAccount,
                    password
                }),
            });

            const data = await response.json();

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