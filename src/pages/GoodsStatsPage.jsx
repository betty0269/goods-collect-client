
import React, { useEffect, useMemo, useState } from 'react';
import { goodsAPI } from '../services/api';

// 통계 그래프에 사용할 색상
const COLORS = [
  '#397b59',
  '#76ad8b',
  '#a6c9ae',
  '#d2ad75',
  '#7f9dc1',
  '#b29ac6',
  '#db9797',
  '#91b9bb',
];

const pageStyle = {
  maxWidth: 1100,
  margin: '0 auto',
  padding: '32px 20px',
  color: '#25352e',
};

const panelStyle = {
  background: '#ffffff',
  padding: 24,
  borderRadius: 18,
  border: '1px solid #e0eae3',
};

const formatNumber = (value) =>
  Number(value).toLocaleString('ko-KR');

// 배열에서 지정한 항목의 개수 집계
function countBy(items, key) {
  const counts = new Map();

  items.forEach((item) => {
    const name = String(item[key] || '미분류').trim();
    const label = name || '미분류';

    counts.set(label, (counts.get(label) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// 작품별 가로 막대그래프
function WorkBarChart({ data }) {
  if (data.length === 0) {
    return <p>표시할 작품별 데이터가 없습니다.</p>;
  }

  const maxCount = Math.max(...data.map((item) => item.count));

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {data.map((item) => (
        <div key={item.name}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 8,
            fontSize: 14,
          }}>
            <strong style={{ overflowWrap: 'anywhere' }}>
              {item.name}
            </strong>
            <span style={{ whiteSpace: 'nowrap' }}>
              {item.count}개
            </span>
          </div>

          <div style={{
            height: 18,
            background: '#e9f1eb',
            borderRadius: 20,
            overflow: 'hidden',
          }}>
            <div
              role="img"
              aria-label={`${item.name} ${item.count}개`}
              style={{
                width: `${(item.count / maxCount) * 100}%`,
                height: '100%',
                background: '#397b59',
                borderRadius: 20,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// 종류별 도넛 그래프
function TypeDonutChart({ data, total }) {
  const segments = useMemo(() => {
    if (!total) return [];

    // 종류가 많으면 상위 7종류와 나머지로 묶기
    const top = data.slice(0, 7);
    const remaining = data.slice(7).reduce(
      (sum, item) => sum + item.count,
      0
    );

    const groups = remaining > 0
      ? [...top, { name: '기타 종류 합계', count: remaining }]
      : top;

    return groups;
  }, [data, total]);

  const gradient = useMemo(() => {
    if (!total) return '#e9f1eb';

    let current = 0;

    const stops = segments.map((item, index) => {
      const start = current;
      current += (item.count / total) * 100;

      const color = COLORS[index % COLORS.length];

      return `${color} ${start}% ${current}%`;
    });

    return `conic-gradient(${stops.join(', ')})`;
  }, [segments, total]);

  if (total === 0) {
    return <p>표시할 종류별 데이터가 없습니다.</p>;
  }

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36,
      marginTop: 20,
    }}>
      {/* 도넛 그래프 */}
      <div
        role="img"
        aria-label={`총 ${total}개 굿즈의 종류별 비율`}
        style={{
          width: 230,
          height: 230,
          flexShrink: 0,
          borderRadius: '50%',
          background: gradient,
          display: 'grid',
          placeItems: 'center',
        }}
      >
        <div style={{
          width: 135,
          height: 135,
          borderRadius: '50%',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#64756b' }}>
            전체 굿즈
          </span>

          <strong style={{ fontSize: 26 }}>
            {total}개
          </strong>
        </div>
      </div>

      {/* 그래프 범례 */}
      <div style={{
        minWidth: 200,
        flex: '1 1 220px',
        display: 'grid',
        gap: 12,
      }}>
        {segments.map((item, index) => {
          const percentage = (item.count / total) * 100;

          return (
            <div
              key={item.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 14,
              }}
            >
              <span style={{
                width: 13,
                height: 13,
                flexShrink: 0,
                borderRadius: 4,
                background: COLORS[index % COLORS.length],
              }} />

              <span style={{
                flex: 1,
                overflowWrap: 'anywhere',
              }}>
                {item.name}
              </span>

              <strong style={{ whiteSpace: 'nowrap' }}>
                {percentage.toFixed(1)}%
              </strong>

              <span style={{
                color: '#64756b',
                whiteSpace: 'nowrap',
              }}>
                ({item.count}개)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function GoodsStatsPage() {
  const [goods, setGoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // 로그인한 사용자의 굿즈 목록 조회
  useEffect(() => {
    let active = true;

    async function loadGoods() {
      setLoading(true);
      setError('');

      try {
        const response = await goodsAPI.getGoods();
        const items = response.data ?? [];

        if (!Array.isArray(items)) {
          throw new Error('굿즈 데이터 형식이 올바르지 않습니다.');
        }

        if (active) {
          setGoods(items);
        }
      } catch (err) {
        if (active) {
          setError(
            err.userMessage ||
            err.message ||
            '통계 데이터를 불러오지 못했습니다.'
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
  }, [refreshKey]);

  // 통계 자동 계산
  const stats = useMemo(() => {
    const totalCount = goods.length;

    const totalPrice = goods.reduce(
      (sum, item) =>
        sum + Number(item.purchase_price || 0),
      0
    );

    const works = countBy(goods, 'work_name');
    const types = countBy(goods, 'goods_type');

    return {
      totalCount,
      totalPrice,
      averagePrice: totalCount > 0
        ? Math.round(totalPrice / totalCount)
        : 0,
      workCount: works.length,
      works,
      types,
    };
  }, [goods]);

  return (
    <div style={pageStyle}>
      <h1 style={{ marginBottom: 6 }}>
        Goods COLLECT
      </h1>

      <h2 style={{ marginBottom: 8 }}>
        컬렉션 통계
      </h2>

      <p style={{ color: '#64756b' }}>
        내가 소장한 굿즈를 작품별·종류별로 살펴보세요.
      </p>

      <button
        type="button"
        onClick={() => setRefreshKey((value) => value + 1)}
        disabled={loading}
        style={{
          padding: '10px 16px',
          marginBottom: 24,
          background: '#397b59',
          color: '#ffffff',
          border: 'none',
          borderRadius: 10,
          cursor: loading ? 'wait' : 'pointer',
          fontWeight: 600,
        }}
      >
        통계 새로고침
      </button>

      {loading && (
        <p>컬렉션 통계를 불러오는 중입니다...</p>
      )}

      {error && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <>
          {/* 주요 통계 카드 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}>
            {[
              {
                label: '전체 보유 굿즈',
                value: `${formatNumber(stats.totalCount)}개`,
              },
              {
                label: '총 구매금액',
                value: `${formatNumber(stats.totalPrice)}원`,
              },
              {
                label: '굿즈 평균 구매가격',
                value: `${formatNumber(stats.averagePrice)}원`,
              },
              {
                label: '소장 작품 수',
                value: `${formatNumber(stats.workCount)}개`,
              },
            ].map((card) => (
              <div key={card.label} style={{
                ...panelStyle,
                background: '#edf5ef',
              }}>
                <p style={{
                  marginTop: 0,
                  color: '#64756b',
                  fontSize: 14,
                }}>
                  {card.label}
                </p>

                <strong style={{
                  fontSize: 24,
                  overflowWrap: 'anywhere',
                }}>
                  {card.value}
                </strong>
              </div>
            ))}
          </div>

          {stats.totalCount === 0 ? (
            <div style={{
              ...panelStyle,
              textAlign: 'center',
              padding: 48,
            }}>
              <h3>아직 등록된 굿즈가 없습니다.</h3>
              <p>굿즈를 등록하면 통계가 자동으로 표시됩니다.</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gap: 24,
            }}>
              {/* 작품별 통계 */}
              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>
                  작품별 소장 현황
                </h3>

                <p style={{
                  color: '#64756b',
                  fontSize: 14,
                  marginBottom: 24,
                }}>
                  작품별로 보유한 굿즈 개수입니다.
                </p>

                <WorkBarChart data={stats.works} />
              </section>

              {/* 굿즈 종류별 통계 */}
              <section style={panelStyle}>
                <h3 style={{ marginTop: 0 }}>
                  굿즈 종류별 비율
                </h3>

                <p style={{
                  color: '#64756b',
                  fontSize: 14,
                }}>
                  내가 소장한 굿즈의 종류별 구성입니다.
                </p>

                <TypeDonutChart
                  data={stats.types}
                  total={stats.totalCount}
                />
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
}
