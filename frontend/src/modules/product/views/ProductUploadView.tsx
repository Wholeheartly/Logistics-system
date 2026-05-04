import { useState, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import type { ImportResult } from '../../../types';

import API from '../../../config/api';

type UploadTab = 'excel' | 'manual';

interface FormData {
  sku: string;
  name: string;
  model: string;
  specification: string;
  price: string;
  stock_quantity: string;
  length_cm: string;
  width_cm: string;
  height_cm: string;
  gross_weight_kg: string;
  category: string;
  brand: string;
  supplier: string;
  description: string;
}

const initialForm: FormData = {
  sku: '',
  name: '',
  model: '',
  specification: '',
  price: '',
  stock_quantity: '',
  length_cm: '',
  width_cm: '',
  height_cm: '',
  gross_weight_kg: '',
  category: '',
  brand: '',
  supplier: '',
  description: '',
};

export default function ProductUploadView() {
  const { token, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState<UploadTab>('excel');

  // Excel upload state
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual form state
  const [form, setForm] = useState<FormData>(initialForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const canCreate = hasPermission('product.create');

  const getToken = useCallback(() => {
    return token || localStorage.getItem('token') || sessionStorage.getItem('token') || '';
  }, [token]);

  // Excel handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) validateAndSetFile(droppedFile);
  };

  const validateAndSetFile = (f: File) => {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (ext !== 'xlsx' && ext !== 'xls') {
      alert('仅支持 .xlsx 和 .xls 格式的 Excel 文件');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      alert('文件大小不能超过 10MB');
      return;
    }
    setFile(f);
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) validateAndSetFile(selected);
  };

  const handleUpload = async () => {
    if (!file) return;
    const t = getToken();
    if (!t) {
      alert('未登录或登录已过期');
      return;
    }
    setUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${API}/api/products/import/excel?token=${t}`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        setImportResult({
          success: false,
          message: data.detail || '导入失败',
          total: 0,
          success_count: 0,
          failed_count: 0,
          parse_errors: [],
          import_errors: [],
        });
      } else {
        setImportResult(data);
        if (data.success) setFile(null);
      }
    } catch (err) {
      setImportResult({
        success: false,
        message: '网络请求失败，请检查网络连接',
        total: 0,
        success_count: 0,
        failed_count: 0,
        parse_errors: [],
        import_errors: [],
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.open(`${API}/api/products/import/template`, '_blank');
  };

  // Manual form handlers
  const handleFormChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (submitSuccess) setSubmitSuccess(false);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!form.sku.trim()) errors.sku = 'SKU 不能为空';
    else if (form.sku.length > 50) errors.sku = 'SKU 长度不能超过50个字符';

    if (!form.name.trim()) errors.name = '产品名称 不能为空';

    const numericFields: Array<{ key: keyof FormData; label: string }> = [
      { key: 'length_cm', label: '长度' },
      { key: 'width_cm', label: '宽度' },
      { key: 'height_cm', label: '高度' },
      { key: 'gross_weight_kg', label: '毛重' },
    ];

    for (const { key, label } of numericFields) {
      const val = form[key];
      if (!val || val.trim() === '') {
        errors[key] = `${label} 不能为空`;
      } else {
        const num = parseFloat(val);
        if (isNaN(num) || num <= 0) {
          errors[key] = `${label} 必须大于0`;
        }
      }
    }

    if (form.price && form.price.trim() !== '') {
      const num = parseFloat(form.price);
      if (isNaN(num) || num < 0) errors.price = '价格 不能为负数';
    }

    if (form.stock_quantity && form.stock_quantity.trim() !== '') {
      const num = parseInt(form.stock_quantity);
      if (isNaN(num) || num < 0) errors.stock_quantity = '库存数量 不能为负数';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    const t = getToken();
    if (!t) {
      alert('未登录或登录已过期');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess(false);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      model: form.model.trim() || null,
      specification: form.specification.trim() || null,
      price: form.price ? parseFloat(form.price) : 0,
      stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : 0,
      length_cm: parseFloat(form.length_cm),
      width_cm: parseFloat(form.width_cm),
      height_cm: parseFloat(form.height_cm),
      gross_weight_kg: parseFloat(form.gross_weight_kg),
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
      supplier: form.supplier.trim() || null,
      description: form.description.trim() || null,
      status: 'active',
    };

    try {
      const res = await fetch(`${API}/api/products?token=${t}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        if (detail && detail.errors) {
          const errs: Record<string, string> = {};
          detail.errors.forEach((e: string) => {
            if (e.includes('SKU')) errs.sku = e;
            else if (e.includes('名称')) errs.name = e;
            else if (e.includes('长度')) errs.length_cm = e;
            else if (e.includes('宽度')) errs.width_cm = e;
            else if (e.includes('高度')) errs.height_cm = e;
            else if (e.includes('毛重')) errs.gross_weight_kg = e;
            else if (e.includes('价格')) errs.price = e;
            else if (e.includes('库存')) errs.stock_quantity = e;
            else errs.general = e;
          });
          setFormErrors(errs);
        } else {
          setFormErrors({ general: detail || '提交失败' });
        }
      } else {
        setSubmitSuccess(true);
        setForm(initialForm);
      }
    } catch {
      setFormErrors({ general: '网络请求失败，请检查网络连接' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--gray-500)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 16 }}>
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', marginBottom: 8 }}>
          权限不足
        </div>
        <div style={{ fontSize: 'var(--text-sm)' }}>您没有产品添加权限，请联系管理员</div>
      </div>
    );
  }

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, borderBottom: '2px solid var(--border-light)' }}>
        <button
          onClick={() => setActiveTab('excel')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'excel' ? 'var(--primary-500)' : 'transparent'}`,
            background: 'transparent',
            color: activeTab === 'excel' ? 'var(--primary-600)' : 'var(--gray-500)',
            fontWeight: activeTab === 'excel' ? 'var(--font-bold)' : 'var(--font-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            marginBottom: -2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Excel 批量导入
          </span>
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: `3px solid ${activeTab === 'manual' ? 'var(--primary-500)' : 'transparent'}`,
            background: 'transparent',
            color: activeTab === 'manual' ? 'var(--primary-600)' : 'var(--gray-500)',
            fontWeight: activeTab === 'manual' ? 'var(--font-bold)' : 'var(--font-medium)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            marginBottom: -2,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            手动录入
          </span>
        </button>
      </div>

      {/* Excel Upload Tab */}
      {activeTab === 'excel' && (
        <div className="animate-fadeInUp">
          {/* Template download */}
          <div
            style={{
              padding: '16px 20px',
              background: 'var(--primary-50)',
              borderRadius: 'var(--radius-lg)',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--primary-700)' }}>
                请使用标准模板格式导入，支持 .xlsx 和 .xls 格式，文件大小不超过 10MB
              </span>
            </div>
            <button onClick={downloadTemplate} style={outlineBtnStyle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              下载导入模板
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? 'var(--primary-500)' : 'var(--border-light)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: '48px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-base)',
              background: dragOver ? 'var(--primary-50)' : 'var(--surface-secondary)',
              marginBottom: 20,
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-100)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary-600)" strokeWidth="2" strokeLinecap="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            {file ? (
              <div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--gray-800)', marginBottom: 4 }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontWeight: 'var(--font-semibold)', color: 'var(--gray-600)', marginBottom: 4 }}>
                  点击或拖拽文件到此处上传
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                  支持 .xlsx、.xls 格式，单个文件不超过 10MB
                </div>
              </div>
            )}
          </div>

          {/* Upload button */}
          {file && (
            <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
              <button onClick={handleUpload} disabled={uploading} style={primaryBtnStyle}>
                {uploading ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                      <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                    </svg>
                    导入中...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    开始导入
                  </span>
                )}
              </button>
              <button onClick={() => { setFile(null); setImportResult(null); }} style={outlineBtnStyle} disabled={uploading}>
                重新选择
              </button>
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div
              className="animate-fadeInUp"
              style={{
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)',
                marginBottom: 16,
                border: `1px solid ${importResult.success ? 'var(--success-200)' : 'var(--danger-200)'}`,
                background: importResult.success ? 'var(--success-50)' : 'var(--danger-50)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={importResult.success ? 'var(--success-600)' : 'var(--danger-600)'} strokeWidth="2" strokeLinecap="round">
                  {importResult.success ? (
                    <>
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </>
                  ) : (
                    <>
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </>
                  )}
                </svg>
                <span style={{ fontWeight: 'var(--font-semibold)', color: importResult.success ? 'var(--success-700)' : 'var(--danger-700)' }}>
                  {importResult.message}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 'var(--text-sm)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>总计:</span>
                  <span style={{ fontWeight: 'var(--font-bold)' }}>{importResult.total}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>成功:</span>
                  <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--success-600)' }}>{importResult.success_count}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--gray-500)' }}>失败:</span>
                  <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--danger-600)' }}>{importResult.failed_count}</span>
                </div>
              </div>

              {/* Parse errors */}
              {importResult.parse_errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-600)', marginBottom: 6, textTransform: 'uppercase' }}>
                    解析错误
                  </div>
                  <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-200)' }}>
                    {importResult.parse_errors.map((err, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--danger-100)', fontSize: 'var(--text-xs)', background: '#fff' }}>
                        <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--danger-600)' }}>第 {err.row} 行</span>
                        {err.sku && <span style={{ color: 'var(--gray-500)', marginLeft: 8 }}>SKU: {err.sku}</span>}
                        <div style={{ color: 'var(--danger-600)', marginTop: 2 }}>{err.errors.join('；')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Import errors */}
              {importResult.import_errors.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-semibold)', color: 'var(--gray-600)', marginBottom: 6, textTransform: 'uppercase' }}>
                    导入错误
                  </div>
                  <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--danger-200)' }}>
                    {importResult.import_errors.map((err, i) => (
                      <div key={i} style={{ padding: '8px 12px', borderBottom: '1px solid var(--danger-100)', fontSize: 'var(--text-xs)', background: '#fff' }}>
                        <span style={{ fontWeight: 'var(--font-semibold)', color: 'var(--danger-600)' }}>SKU: {err.sku}</span>
                        <div style={{ color: 'var(--danger-600)', marginTop: 2 }}>{err.errors.join('；')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Tab */}
      {activeTab === 'manual' && (
        <div className="animate-fadeInUp">
          {submitSuccess && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--success-50)',
                border: '1px solid var(--success-200)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--success-700)',
                fontSize: 'var(--text-sm)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              产品添加成功！系统已自动完成单位转换。
            </div>
          )}

          {formErrors.general && (
            <div
              style={{
                padding: '12px 16px',
                background: 'var(--danger-50)',
                border: '1px solid var(--danger-200)',
                borderRadius: 'var(--radius-lg)',
                color: 'var(--danger-600)',
                fontSize: 'var(--text-sm)',
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {formErrors.general}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* SKU */}
            <FormField label="SKU" required error={formErrors.sku}>
              <input
                value={form.sku}
                onChange={(e) => handleFormChange('sku', e.target.value)}
                placeholder="输入产品 SKU"
                style={inputStyle(!!formErrors.sku)}
              />
            </FormField>

            {/* Name */}
            <FormField label="产品名称" required error={formErrors.name}>
              <input
                value={form.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="输入产品名称"
                style={inputStyle(!!formErrors.name)}
              />
            </FormField>

            {/* Model */}
            <FormField label="型号" error={formErrors.model}>
              <input
                value={form.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
                placeholder="输入产品型号"
                style={inputStyle(!!formErrors.model)}
              />
            </FormField>

            {/* Specification */}
            <FormField label="规格" error={formErrors.specification}>
              <input
                value={form.specification}
                onChange={(e) => handleFormChange('specification', e.target.value)}
                placeholder="如: 10x20x30cm"
                style={inputStyle(!!formErrors.specification)}
              />
            </FormField>

            {/* Price */}
            <FormField label="价格" error={formErrors.price}>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => handleFormChange('price', e.target.value)}
                placeholder="输入价格"
                style={inputStyle(!!formErrors.price)}
              />
            </FormField>

            {/* Stock */}
            <FormField label="库存数量" error={formErrors.stock_quantity}>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={(e) => handleFormChange('stock_quantity', e.target.value)}
                placeholder="输入库存数量"
                style={inputStyle(!!formErrors.stock_quantity)}
              />
            </FormField>

            {/* Length */}
            <FormField label="长度 (cm)" required error={formErrors.length_cm}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.length_cm}
                onChange={(e) => handleFormChange('length_cm', e.target.value)}
                placeholder="厘米"
                style={inputStyle(!!formErrors.length_cm)}
              />
            </FormField>

            {/* Width */}
            <FormField label="宽度 (cm)" required error={formErrors.width_cm}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.width_cm}
                onChange={(e) => handleFormChange('width_cm', e.target.value)}
                placeholder="厘米"
                style={inputStyle(!!formErrors.width_cm)}
              />
            </FormField>

            {/* Height */}
            <FormField label="高度 (cm)" required error={formErrors.height_cm}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.height_cm}
                onChange={(e) => handleFormChange('height_cm', e.target.value)}
                placeholder="厘米"
                style={inputStyle(!!formErrors.height_cm)}
              />
            </FormField>

            {/* Weight */}
            <FormField label="毛重 (kg)" required error={formErrors.gross_weight_kg}>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.gross_weight_kg}
                onChange={(e) => handleFormChange('gross_weight_kg', e.target.value)}
                placeholder="千克"
                style={inputStyle(!!formErrors.gross_weight_kg)}
              />
            </FormField>

            {/* Category */}
            <FormField label="分类" error={formErrors.category}>
              <input
                value={form.category}
                onChange={(e) => handleFormChange('category', e.target.value)}
                placeholder="输入产品分类"
                style={inputStyle(!!formErrors.category)}
              />
            </FormField>

            {/* Brand */}
            <FormField label="品牌" error={formErrors.brand}>
              <input
                value={form.brand}
                onChange={(e) => handleFormChange('brand', e.target.value)}
                placeholder="输入品牌"
                style={inputStyle(!!formErrors.brand)}
              />
            </FormField>

            {/* Supplier */}
            <FormField label="供应商" error={formErrors.supplier}>
              <input
                value={form.supplier}
                onChange={(e) => handleFormChange('supplier', e.target.value)}
                placeholder="输入供应商"
                style={inputStyle(!!formErrors.supplier)}
              />
            </FormField>

            {/* Description - full width */}
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="描述" error={formErrors.description}>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="输入产品描述"
                  rows={3}
                  style={{ ...inputStyle(!!formErrors.description), resize: 'vertical' }}
                />
              </FormField>
            </div>
          </div>

          {/* Submit */}
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button onClick={handleSubmit} disabled={submitting} style={primaryBtnStyle}>
              {submitting ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                  </svg>
                  提交中...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                    <polyline points="17 21 17 13 7 13 7 21" />
                    <polyline points="7 3 7 8 15 8" />
                  </svg>
                  保存产品
                </span>
              )}
            </button>
            <button onClick={() => { setForm(initialForm); setFormErrors({}); setSubmitSuccess(false); }} style={outlineBtnStyle} disabled={submitting}>
              重置表单
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--gray-600)', marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--danger-500)', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--danger-500)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}

function inputStyle(hasError: boolean): React.CSSProperties {
  return {
    width: '100%',
    padding: '10px 14px',
    border: `2px solid ${hasError ? 'var(--danger-300)' : 'var(--border-light)'}`,
    borderRadius: 'var(--radius-md)',
    fontSize: 'var(--text-sm)',
    outline: 'none',
    transition: 'all var(--transition-fast)',
    background: 'var(--surface-primary)',
    color: 'var(--gray-800)',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 24px',
  background: 'linear-gradient(135deg, var(--primary-500), var(--primary-700))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};

const outlineBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'var(--surface-primary)',
  color: 'var(--primary-600)',
  border: '1px solid var(--primary-300)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
};
