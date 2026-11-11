
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { goodsAPI } from '../services/api';
import { requireSupabase } from '../config/supabase';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

const initialForm = {
  work_name: '',
  character_name: '',
  goods_type: '',
  purchase_place: '',
  purchase_price: '',
  purchase_date: '',
};

export default function GoodsRegisterPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(initialForm);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // 이미지 미리보기
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

  // 입력값 변경
  const updateField = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 이미지 선택
  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    setError('');

    if (!file) {
      setImageFile(null);
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('JPG, PNG, WEBP 이미지만 등록할 수 있습니다.');
      setImageFile(null);
      event.target.value = '';
      return;
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setError('이미지 크기는 최대 5MB입니다.');
      setImageFile(null);
      event.target.value = '';
      return;
    }

    setImageFile(file);
  };

  // 굿즈 등록
  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);
    setError('');

    let uploadedPath = null;
    let saved = false;

    try {
      const supabase = requireSupabase();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('로그인이 필요합니다.');
      }

      // 사진을 선택했다면 Storage에 업로드
      if (imageFile) {
        const extensions = {
          'image/jpeg': 'jpg',
          'image/png': 'png',
          'image/webp': 'webp',
        };

        const extension = extensions[imageFile.type];

        if (!extension || imageFile.size > MAX_IMAGE_SIZE) {
          throw new Error('이미지 파일을 다시 확인해 주세요.');
        }

        const fileName = `${crypto.randomUUID()}.${extension}`;
        uploadedPath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('goods-images')
          .upload(uploadedPath, imageFile, {
            contentType: imageFile.type,
            upsert: false,
          });

        if (uploadError) {
          uploadedPath = null;
          throw new Error(
            `사진 업로드 실패: ${uploadError.message}`
          );
        }
      }

      const payload = {
        work_name: form.work_name.trim(),
        character_name: form.character_name.trim(),
        goods_type: form.goods_type,
        purchase_place: form.purchase_place.trim(),
        purchase_price: Number(form.purchase_price),
        purchase_date: form.purchase_date,
        image_url: uploadedPath,
      };

      await goodsAPI.createGoods(payload);
      saved = true;

      alert('굿즈가 성공적으로 등록되었습니다!');
      navigate('/collection');
    } catch (err) {
      console.error('굿즈 등록 실패:', err);

      // 데이터 저장 실패 시 업로드한 이미지 정리
      if (uploadedPath && !saved) {
        const supabase = requireSupabase();
        const { error: cleanupError } = await supabase.storage
          .from('goods-images')
          .remove([uploadedPath]);

        if (cleanupError) {
          console.error('이미지 정리 실패:', cleanupError);
        }
      }

      setError(
        err.userMessage ||
        err.message ||
        '굿즈 등록 중 오류가 발생했습니다.'
      );
    } finally {
      setSaving(false);
    }
  };

  const fieldStyle = {
    display: 'block',
    width: '100%',
    padding: 12,
    marginTop: 8,
    border: '1px solid #c9d8ce',
    borderRadius: 10,
    boxSizing: 'border-box',
    background: '#ffffff',
    color: '#25352e',
    fontSize: 15,
  };

  const labelStyle = {
    display: 'block',
    marginBottom: 20,
    fontWeight: 600,
  };

  return (
    <div style={{
      maxWidth: 650,
      margin: '40px auto',
      padding: 30,
      background: '#f1f8f3',
      borderRadius: 20,
      color: '#25352e',
      boxSizing: 'border-box',
    }}>
      <h1>Goods COLLECT</h1>
      <h2>굿즈 등록하기</h2>

      <p style={{
        color: '#64756b',
        marginBottom: 30,
      }}>
        소장하고 있는 굿즈를 사진과 함께 등록해 보세요.
      </p>

      <form onSubmit={handleSubmit}>
        {/* 굿즈 사진 */}
        <label style={labelStyle}>
          굿즈 사진 (선택사항)
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleImageChange}
            disabled={saving}
            style={fieldStyle}
          />
          <small style={{
            display: 'block',
            marginTop: 6,
            color: '#64756b',
          }}>
            JPG, PNG, WEBP / 최대 5MB
          </small>
        </label>

        {/* 사진 미리보기 */}
        {previewUrl && (
          <div style={{
            marginBottom: 24,
            textAlign: 'center',
          }}>
            <img
              src={previewUrl}
              alt="등록할 굿즈 미리보기"
              style={{
                maxWidth: '100%',
                maxHeight: 300,
                objectFit: 'contain',
                borderRadius: 14,
              }}
            />

            <div>
              <button
                type="button"
                disabled={saving}
                onClick={() => setImageFile(null)}
                style={{
                  marginTop: 10,
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid #c9d8ce',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                사진 선택 취소
              </button>
            </div>
          </div>
        )}

        {/* 작품명 */}
        <label style={labelStyle}>
          작품명 · 장르명 *
          <input
            type="text"
            name="work_name"
            value={form.work_name}
            onChange={updateField}
            placeholder="예: 산리오"
            maxLength={300}
            required
            style={fieldStyle}
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
            placeholder="예: 헬로키티"
            maxLength={300}
            required
            style={fieldStyle}
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
            style={fieldStyle}
          >
            <option value="">종류를 선택하세요</option>
            <option value="캔뱃지">캔뱃지</option>
            <option value="인형">인형</option>
            <option value="키링">키링</option>
            <option value="가챠">가챠</option>
            <option value="포토카드">포토카드</option>
            <option value="피규어">피규어</option>
            <option value="아크릴 스탠드">아크릴 스탠드</option>
            <option value="기타">기타</option>
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
            placeholder="예: 온라인 쇼핑몰"
            maxLength={300}
            required
            style={fieldStyle}
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
            placeholder="예: 8000"
            min="0"
            step="1"
            required
            style={fieldStyle}
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
            style={fieldStyle}
          />
        </label>

        {/* 오류 메시지 */}
        {error && (
          <p role="alert" style={{
            color: '#b42318',
            marginBottom: 20,
          }}>
            {error}
          </p>
        )}

        {/* 등록 버튼 */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: 15,
            background: '#397b59',
            color: '#ffffff',
            border: 'none',
            borderRadius: 12,
            fontSize: 16,
            fontWeight: 700,
            cursor: saving ? 'wait' : 'pointer',
          }}
        >
          {saving ? '등록 중...' : '굿즈 등록하기'}
        </button>

        {/* 목록으로 돌아가기 */}
        <button
          type="button"
          disabled={saving}
          onClick={() => navigate('/collection')}
          style={{
            width: '100%',
            padding: 13,
            marginTop: 12,
            background: '#ffffff',
            color: '#25352e',
            border: '1px solid #c9d8ce',
            borderRadius: 12,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          내 컬렉션으로 돌아가기
        </button>
      </form>
    </div>
  );
}
