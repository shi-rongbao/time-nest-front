import React, { useState, useRef, useEffect } from 'react';
import '../../assets/styles/LoginRegister.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useHistory } from 'react-router-dom';

const Register = () => {
    const [userAccount, setUserAccount] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [countdown, setCountdown] = useState(0);
    const history = useHistory();
    const timerRef = useRef(null);

    // 确保在组件卸载时清理定时器
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const url = '/user/register';
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userAccount,
                    password,
                    email,
                    verifyCode
                }),
            });

            const data = await response.json();
            console.log('注册请求返回数据:', data);

            // 根据后端返回的 success 字段判断注册是否成功
            if (!data.success) {
                console.error(`请求失败，错误信息: ${data.message || '未知错误'}`);
                toast.error(data.message || '未知错误');
                return;
            }

            toast.success('注册成功！即将为您跳转到登录页！');
            console.log('注册成功');
            setTimeout(() => {
                history.push('/login');
            }, 1500); 
        } catch (error) {
            console.error('网络请求出错:', error);
            toast.error('网络请求出错，请稍后重试');
        }
    };

    const sendEmailCode = async () => {
        if (!email) {
            toast.error('请输入邮箱地址');
            return;
        }

        try {
            const response = await fetch('/user/sendEmailCode?email=' + email, {
                method: 'GET'
            });

            const data = await response.json();
            if (response.ok) {
                toast.success(data.message);
                setCountdown(60);
                timerRef.current = setInterval(() => {
                    setCountdown(prev => {
                        if (prev > 1) {
                            return prev - 1;
                        } else {
                            clearInterval(timerRef.current);
                            return 0;
                        }
                    });
                }, 1000);
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            console.error('发送验证码出错:', error);
            toast.error('发送验证码出错，请稍后重试');
        }
    };

    return (
        <div className="login-register-container">
            <h2>注册</h2>
            <p className="register-tip">注册成功后，您可以使用新账户登录。</p>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="以字母开头，字母+数字组合，5-18位字符"
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
                <input
                    type="email"
                    placeholder="邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        placeholder="验证码"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value)}
                        required
                    />
                    <button
                        type="button"
                        className="action-button small-action-button"
                        onClick={sendEmailCode}
                        disabled={countdown > 0}
                    >
                        {countdown > 0 ? `${countdown} 秒后重试` : '发送验证码'}
                    </button>
                </div>
                <button type="submit" className="action-button">
                    注册
                </button>
            </form>
            <ToastContainer /> 
        </div>
    );
};

export default Register; 