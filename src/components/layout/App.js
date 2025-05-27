import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Switch, Route, Link, useHistory } from 'react-router-dom';
import Login from '../auth/Login';
import Register from '../auth/Register';
import LoginSuccess from '../auth/LoginSuccess';
import Home from '../pages/Home';
import UserProfile from '../pages/UserProfile';
import FriendList from '../pages/FriendList';
import MyTimeNestList from '../pages/MyTimeNestList';
import PublicTimeNestList from '../pages/PublicTimeNestList';
import TimeNestDetail from '../pages/TimeNestDetail';
import '../../assets/styles/App.css';
import '../../assets/styles/LoginRegister.css';
import MyLikedTimeNests from '../pages/MyLikedTimeNests';

// 根路径下的token校验跳转组件
function RootRedirect() {
  const history = useHistory();

  useEffect(() => {
    const token = localStorage.getItem('satoken');
    if (!token) {
      history.replace('/login');
      return;
    }
    fetch('/user/validateToken', {
      method: 'GET',
      headers: { 'satoken': token }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          history.replace('/home');
        } else {
          history.replace('/login');
        }
      })
      .catch(() => {
        history.replace('/login');
      });
  }, [history]);

  // 可加loading
  return <div style={{textAlign:'center',marginTop:'4rem',color:'#888'}}>正在校验登录状态...</div>;
}

function App() {
    return (
        <Router>
            <div className="app-container">
                <Switch>
                <Route path="/my-liked-nests" component={MyLikedTimeNests} />
                    <Route path="/" exact component={RootRedirect} />
                    <Route path="/login">
                        <div className="auth-page">
                            <Login />
                            <div className="toggle-container">
                                <Link to="/register" className="styled-link">切换到注册</Link>
                            </div>
                        </div>
                    </Route>
                    <Route path="/register">
                        <div className="auth-page">
                            <Register />
                            <div className="toggle-container">
                                <Link to="/login" className="styled-link">切换到登录</Link>
                            </div>
                        </div>
                    </Route>
                    <Route path="/login-success" component={LoginSuccess} />
                    <Route path="/home" component={Home} />
                    <Route path="/user-profile" component={UserProfile} />
                    <Route path="/friend-list" component={FriendList} />
                    <Route path="/my-time-nest-list" component={MyTimeNestList} />
                    <Route path="/public-time-nest-list" component={PublicTimeNestList} />
                    <Route path="/time-nest-detail/:id" component={TimeNestDetail} />
                    <Route path="/time-nest-detail" component={TimeNestDetail} />
                </Switch>
            </div>
        </Router>
    );
}

export default App; 