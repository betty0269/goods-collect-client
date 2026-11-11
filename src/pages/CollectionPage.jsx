
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { goodsAPI } from '../services/api';
import { requireSupabase } from '../config/supabase';

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: 12,
  border: '1px solid #c9d8ce',
  background: '#ffffff',
  color: '#25352e',
  boxSizing: 'border-box',
  fontSize: 14,
};

const labelStyle = {
  display: 'block',
  marginBottom: 7,
  fontSize: 13,
  fontWeight: 600,
  color: '#52695a',
};

// 등록된 굿즈에서 중복 없는 선택지 생성
function getUniqueOptions(items, field) {
  return [...new Set(
    items
      .map((item) => String(item[field] ?? '').trim())
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'ko'));
}

export default function CollectionPage() {
  const [goods, setGoods] = useState([]);
  const [imageUrls, setImageUrls] = useState({});

  // 검색 및 필터
  const [search, setSearch] = useState('');
  const [selectedWork, setSelectedWork] = useState('');
  const [selectedCharacter, setSelectedCharacter] = useState('');
  const [selectedType, setSelectedType] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 서버에서 내 굿즈 목록 불러오기
  useEffect(() => {
    let active = true;

    async function loadGoods() {
      setLoading(true);
      setError('');

      try {
        const response = await goodsAPI.getGoods();
        const items = response.data ?? [];

        if (!Array.isArray(items)) {
          throw new Error('굿즈 목록 데이터가 올바르지 않습니다.');
        }

        if (!active) return;

        setGoods(items);

        // 이미지 경로가 있는 굿즈만 처리
        const imageItems = items.filter(
          (item) => item.image_url
        );

        if (imageItems.length === 0) return;

        const supabase = requireSupabase();

        // 비공개 Storage 이미지의 임시 접근 URL 발급
        const results = await Promise.all(
          imageItems.map(async (item) => {
            const { data, error: imageError } =
              await supabase.storage
                .from('goods-images')
                .createSignedUrl(item.image_url, 3600);

            if (imageError) {
              console.error(
                `굿즈 ${item.id} 이미지 불러오기 실패:`,
                imageError
              );

              return [item.id, null];
            }

            return [item.id, data.signedUrl];
          })
        );

        if (active) {
          setImageUrls(Object.fromEntries(results));
        }
      } catch (err) {
        if (active) {
          setError(
            err.userMessage ||
            err.message ||
            '굿즈 목록을 불러오지 못했습니다.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadGoods();

    return () => {
      active = false;
    };
  }, []);

  // 작품명 필터 선택지
  const workOptions = useMemo(
    () => getUniqueOptions(goods, 'work_name'),
    [goods]
  );

  // 캐릭터명 필터 선택지
  const characterOptions = useMemo(
    () => getUniqueOptions(goods, 'character_name'),
    [goods]
  );

  // 굿즈 종류 필터 선택지
  const typeOptions = useMemo(
    () => getUniqueOptions(goods, 'goods_type'),
    [goods]
  );

  // 검색 + 작품명 + 캐릭터명 + 종류 조건 동시 적용
  const filteredGoods = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return goods.filter((item) => {
      const workName = String(
        item.work_name ?? ''
      ).trim();

      const characterName = String(
        item.character_name ?? ''
      ).trim();

      const goodsType = String(
        item.goods_type ?? ''
      ).trim();

      // 검색창: 작품명, 캐릭터명, 굿즈 종류 통합 검색
      const matchesSearch = [
        workName,
        characterName,
        goodsType,
      ].some((value) =>
        value.toLowerCase().includes(keyword)
      );

      // 작품명 필터
      const matchesWork =
        !selectedWork || workName === selectedWork;

      // 캐릭터명 필터
      const matchesCharacter =
        !selectedCharacter ||
        characterName === selectedCharacter;

      // 굿즈 종류 필터
      const matchesType =
        !selectedType || goodsType === selectedType;

      return (
        matchesSearch &&
        matchesWork &&
        matchesCharacter &&
        matchesType
      );
    });
  }, [
    goods,
    search,
    selectedWork,
    selectedCharacter,
    selectedType,
  ]);

  // 필터 전체 초기화
  const resetFilters = () => {
    setSearch('');
    setSelectedWork('');
    setSelectedCharacter('');
    setSelectedType('');
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    selectedWork !== '' ||
    selectedCharacter !== '' ||
    selectedType !== '';

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: '0 auto',
        padding: '32px 20px',
        color: '#25352e',
      }}
    >
      <h1 style={{ marginBottom: 6 }}>
        Goods COLLECT
      </h1>

      <h2 style={{ marginBottom: 8 }}>
        내 컬렉션
      </h2>

      <p style={{ color: '#64756b' }}>
        전체 굿즈 {goods.length}개
      </p>

      {/* 검색 및 필터 영역 */}
      <div
        style={{
          background: '#edf5ef',
          padding: 20,
          borderRadius: 18,
          margin: '24px 0',
        }}
      >
        {/* 검색창 */}
        <div style={{ marginBottom: 18 }}>
          <label
            htmlFor="goods-search"
            style={labelStyle}
          >
            굿즈 검색
          </label>

          <input
            id="goods-search"
            type="search"
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            placeholder="작품명, 캐릭터명, 굿즈 종류 검색"
            style={inputStyle}
          />
        </div>

        {/* 자동 생성되는 필터 3개 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
          }}
        >
          {/* 작품명 */}
          <div>
            <label
              htmlFor="work-filter"
              style={labelStyle}
            >
              작품명
            </label>

            <select
              id="work-filter"
              value={selectedWork}
              onChange={(event) =>
                setSelectedWork(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">전체 작품</option>

              {workOptions.map((work) => (
                <option key={work} value={work}>
                  {work}
                </option>
              ))}
            </select>
          </div>

          {/* 캐릭터명 */}
          <div>
            <label
              htmlFor="character-filter"
              style={labelStyle}
            >
              캐릭터명
            </label>

            <select
              id="character-filter"
              value={selectedCharacter}
              onChange={(event) =>
                setSelectedCharacter(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">전체 캐릭터</option>

              {characterOptions.map((character) => (
                <option
                  key={character}
                  value={character}
                >
                  {character}
                </option>
              ))}
            </select>
          </div>

          {/* 굿즈 종류 */}
          <div>
            <label
              htmlFor="type-filter"
              style={labelStyle}
            >
              굿즈 종류
            </label>

            <select
              id="type-filter"
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value)
              }
              style={inputStyle}
            >
              <option value="">전체 종류</option>

              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 검색 결과 수 + 필터 초기화 */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 18,
          }}
        >
          <span
            role="status"
            style={{
              fontSize: 14,
              color: '#52695a',
            }}
          >
            검색 결과: {filteredGoods.length}개
          </span>

          <button
            type="button"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
            style={{
              padding: '9px 14px',
              border: '1px solid #c9d8ce',
              borderRadius: 10,
              background: '#ffffff',
              color: '#315d46',
              cursor: hasActiveFilters
                ? 'pointer'
                : 'not-allowed',
              opacity: hasActiveFilters ? 1 : 0.5,
              fontWeight: 600,
            }}
          >
            필터 초기화
          </button>
        </div>
      </div>

      {/* 로딩 안내 */}
      {loading && (
        <p>컬렉션을 불러오는 중입니다...</p>
      )}

      {/* 오류 안내 */}
      {error && (
        <p role="alert" style={{ color: '#ba3333' }}>
          {error}
        </p>
      )}

      {/* 굿즈가 없을 때 */}
      {!loading && !error && goods.length === 0 && (
        <div
          style={{
            padding: 48,
            textAlign: 'center',
            background: '#edf5ef',
            borderRadius: 20,
          }}
        >
          <h3>아직 등록한 굿즈가 없어요.</h3>

          <p>
            첫 번째 굿즈를 등록해 컬렉션을 시작해 보세요!
          </p>

          <Link
            to="/add-goods"
            style={{
              display: 'inline-block',
              marginTop: 10,
              padding: '12px 18px',
              background: '#397b59',
              color: '#ffffff',
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            굿즈 등록하기
          </Link>
        </div>
      )}

      {/* 필터 검색 결과가 없을 때 */}
      {!loading &&
        !error &&
        goods.length > 0 &&
        filteredGoods.length === 0 && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
              background: '#edf5ef',
              borderRadius: 16,
            }}
          >
            <p>조건에 맞는 굿즈가 없습니다.</p>

            <button
              type="button"
              onClick={resetFilters}
              style={{
                padding: '10px 16px',
                border: 'none',
                borderRadius: 10,
                background: '#397b59',
                color: '#ffffff',
                cursor: 'pointer',
              }}
            >
              전체 굿즈 보기
            </button>
          </div>
        )}

      {/* 굿즈 카드 */}
      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fill, minmax(210px, 1fr))',
            gap: 20,
          }}
        >
          {filteredGoods.map((item) => (
            <article
              key={item.id}
              style={{
                padding: 18,
                borderRadius: 18,
                background: '#edf5ef',
                boxShadow: '0 2px 10px #0000000d',
              }}
            >
              {/* 굿즈 이미지 */}
              <div
                style={{
                  height: 180,
                  display: 'grid',
                  placeItems: 'center',
                  background: '#dbe9df',
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {imageUrls[item.id] ? (
                  <img
                    src={imageUrls[item.id]}
                    alt={`${item.character_name} 굿즈 사진`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                    }}
                  />
                ) : (
                  <span
                    aria-label="등록된 사진 없음"
                    style={{ fontSize: 48 }}
                  >
                    📦
                  </span>
                )}
              </div>

              {/* 굿즈 상세 보기 */}
              <h3 style={{ marginTop: 14 }}>
                <Link
                  to={`/goods/${item.id}`}
                  style={{
                    color: '#315d46',
                    textDecoration: 'underline',
                    textUnderlineOffset: 4,
                  }}
                >
                  {item.goods_type} 상세 보기
                </Link>
              </h3>

              {/* 굿즈 정보 */}
              <p>
                {item.work_name} | {item.character_name}
              </p>

              <p>구매처: {item.purchase_place}</p>

              <p>
                가격:{' '}
                {Number(item.purchase_price).toLocaleString()}원
              </p>

              <small>
                구매일: {item.purchase_date}
              </small>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
