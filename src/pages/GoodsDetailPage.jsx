
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { goodsAPI } from '../services/api';
import { requireSupabase } from '../config/supabase';

// 이미지 설정
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// 굿즈 종류
const GOODS_TYPES = [
  '캔뱃지',
  '인형',
  '키링',
  '가챠',
  '포토카드',
  '피규어',
  '아크릴 스탠드',
  '기타',
];

// 화면 스타일
const containerStyle = {
  maxWidth: 750,
  margin: '40px auto',
  padding: 30,
  background: '#f1f8f3',
  color: '#25352e',
  borderRadius: 20,
  boxSizing: 'border-box',
};

const inputStyle = {
  display: 'block',
  width: '100%',
  padding: 12,
  marginTop: 7,
  border: '1px solid #c9d8ce',
  borderRadius: 10,
  boxSizing: 'border-box',
  fontSize: 15,
  background: '#ffffff',
  color: '#25352e',
};

const labelStyle = {
  display: 'block',
  marginBottom: 18,
  fontWeight: 600,
};

const buttonStyle = {
  padding: 14,
  border: 'none',
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 700,
  cursor: 'pointer',
};

// 기존 굿즈 정보를 수정 폼에 입력
function createForm(item) {
  return {
    work_name: item.work_name,
    character_name: item.character_name,
    goods_type: item.goods_type,
    purchase_place: item.purchase_place,
    purchase_price: String(item.purchase_price),
    purchase_date: item.purchase_date,
  };
}

export default function GoodsDetailPage() {
  // URL에서 굿즈 ID 가져오기
  const { id } = useParams();
  const navigate = useNavigate();

  // 굿즈 정보
  const [goods, setGoods] = useState(null);
  const [form, setForm] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);

  // 수정 및 사진 관련 상태
  const [editing, setEditing] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [removeImage, setRemoveImage] = useState(false);

  // 실행 상태
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // 새로 선택한 사진 미리보기
  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // 비공개 Supabase Storage 이미지 URL 발급
  async function getImageUrl(path) {
    if (!path) return null;

    const supabase = requireSupabase();

    const { data, error: imageError } =
      await supabase.storage
        .from('goods-images')
        .createSignedUrl(path, 3600);

    if (imageError) {
      console.error('이미지 조회 오류:', imageError);
      return null;
    }

    return data.signedUrl;
  }

  // Storage 이미지 삭제
  async function removeStorageImage(path) {
    if (!path) return true;

    const supabase = requireSupabase();

    const { error: storageError } =
      await supabase.storage
        .from('goods-images')
        .remove([path]);

    if (storageError) {
      console.error('Storage 이미지 삭제 실패:', storageError);
      return false;
    }

    return true;
  }

  // 굿즈 상세 정보 불러오기
  useEffect(() => {
    let active = true;

    async function loadGoods() {
      setLoading(true);
      setError('');
      setNotice('');
      setGoods(null);
      setForm(null);
      setImageUrl(null);
      setEditing(false);
      setImageFile(null);
      setRemoveImage(false);

      try {
        // ID가 숫자인지 먼저 확인
        if (!/^[1-9]\d*$/.test(String(id))) {
          throw new Error('올바른 굿즈 ID가 아닙니다.');
        }

        const response = await goodsAPI.getGoodsById(id);
        const item = response.data;

        if (!item) {
          throw new Error('굿즈 정보를 찾을 수 없습니다.');
        }

        if (!active) return;

        setGoods(item);
        setForm(createForm(item));

        // 기존 이미지가 있다면 임시 URL 발급
        if (item.image_url) {
          const url = await getImageUrl(item.image_url);

          if (active) {
            setImageUrl(url);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err.userMessage ||
            err.message ||
            '굿즈 정보를 불러오지 못했습니다.'
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
  }, [id]);

  // 폼 입력값 변경
  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 수정 시작
  const startEditing = () => {
    setForm(createForm(goods));
    setImageFile(null);
    setRemoveImage(false);
    setError('');
    setNotice('');
    setEditing(true);
  };

  // 수정 취소
  const cancelEditing = () => {
    setForm(createForm(goods));
    setImageFile(null);
    setRemoveImage(false);
    setError('');
    setEditing(false);
  };

  // 새 사진 선택
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!IMAGE_TYPES[file.type]) {
      setError('JPG, PNG, WEBP 이미지만 사용할 수 있습니다.');
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('사진 크기는 5MB 이하여야 합니다.');
      event.target.value = '';
      return;
    }

    setImageFile(file);
    setRemoveImage(false);
    setError('');
  };

  // 수정 내용 저장
  const handleSave = async (event) => {
    event.preventDefault();

    if (saving || deleting || !goods) return;

    setSaving(true);
    setError('');
    setNotice('');

    let newImagePath = null;
    let updateSucceeded = false;

    try {
      const oldImagePath = goods.image_url;

      // 새 사진을 선택했다면 먼저 Storage 업로드
      if (imageFile) {
        const supabase = requireSupabase();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('로그인 상태를 확인할 수 없습니다.');
        }

        const extension = IMAGE_TYPES[imageFile.type];

        if (!extension || imageFile.size > MAX_IMAGE_SIZE) {
          throw new Error('사진 형식이나 크기를 확인해 주세요.');
        }

        const fileName =
          `${crypto.randomUUID()}.${extension}`;

        newImagePath = `${user.id}/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from('goods-images')
            .upload(newImagePath, imageFile, {
              contentType: imageFile.type,
              upsert: false,
            });

        if (uploadError) {
          newImagePath = null;

          throw new Error(
            `사진 업로드 실패: ${uploadError.message}`
          );
        }
      }

      // 수정할 정보
      const payload = {
        work_name: form.work_name.trim(),
        character_name: form.character_name.trim(),
        goods_type: form.goods_type,
        purchase_place: form.purchase_place.trim(),
        purchase_price: Number(form.purchase_price),
        purchase_date: form.purchase_date,
      };

      // 사진을 변경하거나 삭제할 때만 image_url 변경
      if (newImagePath) {
        payload.image_url = newImagePath;
      } else if (removeImage) {
        payload.image_url = null;
      }

      // 서버의 굿즈 수정 API 호출
      const response = await goodsAPI.updateGoods(id, payload);

      updateSucceeded = true;

      const updatedGoods = response.data;

      if (!updatedGoods) {
        throw new Error(
          '수정된 굿즈 정보를 확인하지 못했습니다.'
        );
      }

      // 수정 결과 반영
      setGoods(updatedGoods);
      setForm(createForm(updatedGoods));
      setEditing(false);
      setImageFile(null);
      setRemoveImage(false);

      // 수정된 이미지 표시
      setImageUrl(null);

      if (updatedGoods.image_url) {
        try {
          const url = await getImageUrl(updatedGoods.image_url);
          setImageUrl(url);
        } catch (imageError) {
          console.error('수정 후 이미지 표시 실패:', imageError);
        }
      }

      // 새 이미지로 바뀌거나 기존 이미지를 삭제했다면
      // DB 수정 성공 후 이전 이미지 파일 정리
      const imageChanged =
        oldImagePath &&
        oldImagePath !== updatedGoods.image_url;

      if (imageChanged) {
        const removed =
          await removeStorageImage(oldImagePath);

        if (!removed) {
          setNotice(
            '굿즈 정보는 수정됐지만 이전 사진 파일 정리는 실패했습니다.'
          );
        } else {
          setNotice('굿즈 정보가 수정되었습니다.');
        }
      } else {
        setNotice('굿즈 정보가 수정되었습니다.');
      }

    } catch (err) {
      console.error('굿즈 수정 실패:', err);

      // DB 수정 실패 시 새로 업로드한 이미지 정리
      if (!updateSucceeded && newImagePath) {
        await removeStorageImage(newImagePath);
      }

      if (updateSucceeded) {
        setNotice('굿즈 정보는 저장되었습니다.');
        setEditing(false);
      } else {
        setError(
          err.userMessage ||
          err.message ||
          '굿즈 수정 중 오류가 발생했습니다.'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // 굿즈 삭제
  const handleDelete = async () => {
    if (saving || deleting || !goods) return;

    const confirmed = window.confirm(
      '이 굿즈를 정말 삭제하시겠습니까?\n' +
      '삭제한 굿즈 정보는 복구할 수 없습니다.'
    );

    if (!confirmed) return;

    setDeleting(true);
    setError('');
    setNotice('');

    try {
      const oldImagePath = goods.image_url;

      // DB 기록부터 삭제
      await goodsAPI.deleteGoods(id);

      // 삭제된 굿즈에 연결된 이미지도 정리
      let imageRemoved = true;

      if (oldImagePath) {
        imageRemoved =
          await removeStorageImage(oldImagePath);
      }

      if (imageRemoved) {
        alert('굿즈가 삭제되었습니다.');
      } else {
        alert(
          '굿즈 정보는 삭제됐지만 사진 파일은 남아 있을 수 있습니다.'
        );
      }

      navigate('/collection');
    } catch (err) {
      console.error('굿즈 삭제 실패:', err);

      setError(
        err.userMessage ||
        err.message ||
        '굿즈 삭제 중 오류가 발생했습니다.'
      );

      setDeleting(false);
    }
  };

  // 표시할 이미지 결정
  const displayedImage =
    editing && removeImage
      ? null
      : previewUrl || imageUrl;

  // 로딩 화면
  if (loading) {
    return (
      <div style={containerStyle}>
        <p>굿즈 정보를 불러오는 중입니다...</p>
      </div>
    );
  }

  // 굿즈를 불러오지 못한 경우
  if (!goods || !form) {
    return (
      <div style={containerStyle}>
        <p role="alert" style={{ color: '#b42318' }}>
          {error || '굿즈 정보를 찾을 수 없습니다.'}
        </p>

        <button
          type="button"
          onClick={() => navigate('/collection')}
          style={{
            ...buttonStyle,
            background: '#397b59',
            color: '#ffffff',
          }}
        >
          내 컬렉션으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h1>Goods COLLECT</h1>

      <h2>
        {editing ? '굿즈 정보 수정' : '굿즈 상세 정보'}
      </h2>

      {/* 오류 안내 */}
      {error && (
        <p role="alert" style={{ color: '#b42318' }}>
          {error}
        </p>
      )}

      {/* 작업 결과 안내 */}
      {notice && (
        <p role="status" style={{ color: '#315d46' }}>
          {notice}
        </p>
      )}

      {/* 굿즈 이미지 - 원본 비율 유지 */}
      <div
        style={{
          width: '100%',
          minHeight: 300,
          padding: 20,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#dbe9df',
          borderRadius: 16,
          margin: '24px 0',
          boxSizing: 'border-box',
        }}
      >
        {displayedImage ? (
          <img
            src={displayedImage}
            alt={`${goods.character_name} 굿즈 사진`}
            style={{
              display: 'block',
              maxWidth: '100%',
              maxHeight: '70vh',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              borderRadius: 12,
            }}
          />
        ) : (
          <span
            aria-label="등록된 사진 없음"
            style={{ fontSize: 70 }}
          >
            📦
          </span>
        )}
      </div>

      {editing ? (
        // 굿즈 수정 화면
        <form onSubmit={handleSave}>
          <div
            style={{
              background: '#ffffff',
              padding: 24,
              borderRadius: 14,
            }}
          >
            {/* 사진 변경 */}
            <label style={labelStyle}>
              사진 변경
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageChange}
                disabled={saving}
                style={inputStyle}
              />
              <small>
                JPG, PNG, WEBP / 최대 5MB
              </small>
            </label>

            {/* 새 사진 선택 취소 */}
            {imageFile && (
              <button
                type="button"
                disabled={saving}
                onClick={() => setImageFile(null)}
                style={{
                  ...buttonStyle,
                  marginBottom: 16,
                  background: '#e5efe8',
                  color: '#25352e',
                }}
              >
                새 사진 선택 취소
              </button>
            )}

            {/* 기존 사진 삭제 */}
            {goods.image_url && (
              <label
                style={{
                  display: 'block',
                  marginBottom: 20,
                }}
              >
                <input
                  type="checkbox"
                  checked={removeImage}
                  disabled={saving}
                  onChange={(event) => {
                    setRemoveImage(event.target.checked);

                    if (event.target.checked) {
                      setImageFile(null);
                    }
                  }}
                />
                {' '}기존 사진 삭제
              </label>
            )}

            {/* 작품명 */}
            <label style={labelStyle}>
              작품명 · 장르명 *
              <input
                type="text"
                name="work_name"
                value={form.work_name}
                onChange={updateField}
                required
                maxLength={300}
                style={inputStyle}
              />
            </label>

            {/* 캐릭터명 */}
            <label style={labelStyle}>
              캐릭터명 *
              <input
                type="text"
                name="character_name"
                value={form.character_name}
                onChange={updateField}
                required
                maxLength={300}
                style={inputStyle}
              />
            </label>

            {/* 굿즈 종류 */}
            <label style={labelStyle}>
              굿즈 종류 *
              <select
                name="goods_type"
                value={form.goods_type}
                onChange={updateField}
                required
                style={inputStyle}
              >
                {!GOODS_TYPES.includes(form.goods_type) && (
                  <option value={form.goods_type}>
                    {form.goods_type}
                  </option>
                )}

                {GOODS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>

            {/* 구매처 */}
            <label style={labelStyle}>
              구매처 *
              <input
                type="text"
                name="purchase_place"
                value={form.purchase_place}
                onChange={updateField}
                required
                maxLength={300}
                style={inputStyle}
              />
            </label>

            {/* 구매가격 */}
            <label style={labelStyle}>
              구매가격 (원) *
              <input
                type="number"
                name="purchase_price"
                value={form.purchase_price}
                onChange={updateField}
                min="0"
                step="1"
                required
                style={inputStyle}
              />
            </label>

            {/* 구매일 */}
            <label style={labelStyle}>
              구매일 *
              <input
                type="date"
                name="purchase_date"
                value={form.purchase_date}
                onChange={updateField}
                required
                style={inputStyle}
              />
            </label>
          </div>

          {/* 저장 / 취소 */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              type="submit"
              disabled={saving}
              style={{
                ...buttonStyle,
                flex: 1,
                background: '#397b59',
                color: '#ffffff',
              }}
            >
              {saving ? '저장 중...' : '수정 내용 저장'}
            </button>

            <button
              type="button"
              onClick={cancelEditing}
              disabled={saving}
              style={{
                ...buttonStyle,
                flex: 1,
                background: '#e5e7eb',
                color: '#25352e',
              }}
            >
              취소
            </button>
          </div>
        </form>
      ) : (
        // 굿즈 상세 정보 화면
        <>
          <div
            style={{
              background: '#ffffff',
              padding: 24,
              borderRadius: 14,
              lineHeight: 2.2,
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              {goods.goods_type}
            </h2>

            <p>
              <strong>작품명:</strong> {goods.work_name}
            </p>

            <p>
              <strong>캐릭터명:</strong> {goods.character_name}
            </p>

            <p>
              <strong>굿즈 종류:</strong> {goods.goods_type}
            </p>

            <p>
              <strong>구매처:</strong> {goods.purchase_place}
            </p>

            <p>
              <strong>구매가격:</strong>{' '}
              {Number(goods.purchase_price).toLocaleString()}원
            </p>

            <p>
              <strong>구매일:</strong> {goods.purchase_date}
            </p>
          </div>

          {/* 수정 및 삭제 */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              marginTop: 20,
            }}
          >
            <button
              type="button"
              onClick={startEditing}
              disabled={deleting}
              style={{
                ...buttonStyle,
                flex: 1,
                background: '#397b59',
                color: '#ffffff',
              }}
            >
              수정하기
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              style={{
                ...buttonStyle,
                flex: 1,
                background: '#b42318',
                color: '#ffffff',
              }}
            >
              {deleting ? '삭제 중...' : '삭제하기'}
            </button>
          </div>
        </>
      )}

      {/* 내 컬렉션으로 돌아가기 */}
      <button
        type="button"
        onClick={() => navigate('/collection')}
        disabled={saving || deleting}
        style={{
          ...buttonStyle,
          width: '100%',
          marginTop: 14,
          background: '#ffffff',
          color: '#25352e',
          border: '1px solid #c9d8ce',
        }}
      >
        내 컬렉션으로 돌아가기
      </button>
    </div>
  );
}
