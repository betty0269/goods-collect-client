
import React, { useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';

import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './App.css';
import { testConnection } from './utils/connectionTest';

// 로그인 상태 관리
import { AuthProvider } from './contexts/AuthContext';

// 로그인 및 회원가입
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Goods COLLECT 페이지
import CollectionPage from './pages/CollectionPage';
import GoodsRegisterPage from './pages/GoodsRegisterPage';
import GoodsDetailPage from './pages/GoodsDetailPage';
import GoodsStatsPage from './pages/GoodsStatsPage';

// 공통 컴포넌트
import Header from './components/Header';
import NotFound from './components/NotFound';
import ProtectedRoute from './components/ProtectedRoute';
import AuthCallbackHandler from './components/AuthCallbackHandler';

// 전역 스타일
import GlobalStyles from './styles/GlobalStyles';

// React Query 설정
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function App() {
  // 앱 시작 시 서버 연결 확인
  useEffect(() => {
    testConnection();
  }, []);

  // 기존 Google / 네이버 OAuth 콜백 처리 유지
  if (window.location.pathname === '/auth/callback') {
    return <AuthCallbackHandler />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <GlobalStyles />

          <div className="app">
            {/* Goods COLLECT 상단 메뉴 */}
            <Header />

            <main className="main-content">
              <Routes>
                {/* 첫 접속 시 내 컬렉션으로 이동 */}
                <Route
                  path="/"
                  element={
                    <Navigate
                      to="/collection"
                      replace
                    />
                  }
                />

                {/* 로그인 */}
                <Route
                  path="/login"
                  element={<LoginPage />}
                />

                {/* 회원가입 */}
                <Route
                  path="/register"
                  element={<RegisterPage />}
                />

                {/* 내 컬렉션 */}
                <Route
                  path="/collection"
                  element={
                    <ProtectedRoute>
                      <CollectionPage />
                    </ProtectedRoute>
                  }
                />

                {/* 새 굿즈 등록 */}
                <Route
                  path="/add-goods"
                  element={
                    <ProtectedRoute>
                      <GoodsRegisterPage />
                    </ProtectedRoute>
                  }
                />

                {/* 굿즈 상세 보기 / 수정 / 삭제 */}
                <Route
                  path="/goods/:id"
                  element={
                    <ProtectedRoute>
                      <GoodsDetailPage />
                    </ProtectedRoute>
                  }
                />

                {/* 컬렉션 통계 */}
                <Route
                  path="/stats"
                  element={
                    <ProtectedRoute>
                      <GoodsStatsPage />
                    </ProtectedRoute>
                  }
                />

                {/* 이전 대시보드 주소 호환 */}
                <Route
                  path="/dashboard"
                  element={
                    <Navigate
                      to="/collection"
                      replace
                    />
                  }
                />

                {/* 존재하지 않는 페이지 */}
                <Route
                  path="*"
                  element={<NotFound />}
                />
              </Routes>
            </main>

            {/* Goods COLLECT 하단 푸터 */}
            <footer className="footer">
              <p>Goods COLLECT · My Collection</p>
            </footer>
          </div>

          {/* 알림 메시지 */}
          <ToastContainer
            position="bottom-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="light"
          />
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
