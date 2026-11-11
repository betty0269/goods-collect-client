
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  FaBoxOpen,
  FaThLarge,
  FaPlus,
  FaChartPie,
  FaSignInAlt,
  FaUserPlus,
  FaSignOutAlt,
} from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';

// 헤더 전체
const HeaderContainer = styled.header`
  background: linear-gradient(135deg, #315d46 0%, #478367 100%);
  color: #ffffff;
  padding: 20px 24px;
`;

// 헤더 내부
const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

// 사이트 제목
const Title = styled.h1`
  margin: 0 0 20px;
  text-align: center;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.5px;

  @media (max-width: 768px) {
    font-size: 23px;
  }
`;

// 메뉴와 사용자 정보
const NavContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
`;

// 메뉴
const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

// 사용자 영역
const UserSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

// 메뉴 링크
const NavLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border-radius: 12px;
  color: #ffffff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.18);
    color: #ffffff;
  }

  &.active {
    background: rgba(255, 255, 255, 0.25);
  }
`;

// 사용자 이름
const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  font-size: 14px;
`;

// 사용자 프로필 이미지
const UserAvatar = styled.img`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  object-fit: cover;
`;

// 로그아웃 버튼
const LogoutButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 15px;
  border: none;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.25);
  }
`;

function Header() {
  const location = useLocation();

  // 기존 인증 기능 그대로 사용
  const {
    user,
    isAuthenticated,
    logout,
    loading,
  } = useAuth();

  // 현재 페이지 활성화 표시
  const isActive = (path) => {
    if (location.pathname === path) {
      return 'active';
    }

    return '';
  };

  // 기존 로그아웃 기능 유지
  const handleLogout = async () => {
    await logout();
  };

  return (
    <HeaderContainer>
      <HeaderContent>
        {/* 사이트 제목 */}
        <Title>
          <FaBoxOpen
            style={{
              marginRight: 10,
              verticalAlign: 'middle',
            }}
          />
          Goods COLLECT
        </Title>

        <NavContainer>
          {/* Goods COLLECT 메뉴 */}
          <Nav>
            {/* 내 컬렉션 */}
            <NavLink
              to="/collection"
              className={isActive('/collection')}
            >
              <FaThLarge />
              내 컬렉션
            </NavLink>

            {/* 굿즈 등록 */}
            {isAuthenticated && (
              <NavLink
                to="/add-goods"
                className={isActive('/add-goods')}
              >
                <FaPlus />
                굿즈 등록
              </NavLink>
            )}

            {/* 컬렉션 통계 */}
            {isAuthenticated && (
              <NavLink
                to="/stats"
                className={isActive('/stats')}
              >
                <FaChartPie />
                컬렉션 통계
              </NavLink>
            )}
          </Nav>

          {/* 로그인 상태 표시 */}
          <UserSection>
            {loading ? (
              <span>로그인 확인 중...</span>
            ) : isAuthenticated ? (
              <>
                {/* 사용자 이름 */}
                {user && (
                  <UserInfo>
                    {user.avatar && (
                      <UserAvatar
                        src={user.avatar}
                        alt="프로필"
                      />
                    )}

                    <span>
                      {user.name || user.email || '사용자'}님
                    </span>
                  </UserInfo>
                )}

                {/* 로그아웃 */}
                <LogoutButton onClick={handleLogout}>
                  <FaSignOutAlt />
                  로그아웃
                </LogoutButton>
              </>
            ) : (
              <>
                {/* 로그인 */}
                <NavLink
                  to="/login"
                  className={isActive('/login')}
                >
                  <FaSignInAlt />
                  로그인
                </NavLink>

                {/* 회원가입 */}
                <NavLink
                  to="/register"
                  className={isActive('/register')}
                >
                  <FaUserPlus />
                  회원가입
                </NavLink>
              </>
            )}
          </UserSection>
        </NavContainer>
      </HeaderContent>
    </HeaderContainer>
  );
}

export default Header;
