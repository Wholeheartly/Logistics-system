import { useState, useEffect, useCallback } from 'react';
import { useLogistics } from '../context/LogisticsContext';
import { useAuth } from '../../../context/AuthContext';
import type { ReconBatch, ReconDetail } from '../../../types';

const API = 'http://localhost:8000';

/**
 * 带认证的 fetch 辅助函数
 * 使用 Authorization: Bearer <token> 头部传递令牌
 */
async function authFetch(
  token: string | null,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!token) {
    throw new Error('未登录');
  }
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, {
    ...options,
    headers,
  });
}

const diffTypeNames: Record<string, string> = {
  amount_mismatch: '金额不符',
  base_amount_mismatch: '基础运费不符',
  weight_mismatch: '重量不符',
  billed_weight_mismatch: '计费重不符',
  zone_mismatch: 'Zone不符',
  surcharge_mismatch: '附加费不符',
  missing_in_system: '系统中缺失',
  carrier_mismatch: '物流商不匹配',
};

const statusConfig: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  completed: { label: '已完成', bg: 'var(--success-50)', color: 'var(--success-600)', dot: 'var(--success-500)' },
  failed: { label: '失败', bg: 'var(--error-50)', color: 'var(--error-600)', dot: 'var(--error-500)' },
  processing: { label: '处理中', bg: 'var(--info-50)', color: 'var(--info-500)', dot: 'var(--info-500)' },
};

export default function ReconciliationView() {
  const { navigateToCompare } = useLogistics();
  const { token } = useAuth();
  const [view, setView] = useState<'upload' | 'batches' | 'details'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [batches, setBatches] = useState<ReconBatch[]>([]);
  const [batchPage, setBatchPage] = useState(1);
  const [batchTotal, setBatchTotal] = useState(0);
  const [selectedBatch, setSelectedBatch] = useState<ReconBatch | null>(null);
  const [details, setDetails] = useState<ReconDetail[]>([]);
  const [detailPage, setDetailPage] = useState(1);
  const [detailTotal, setDetailTotal] = useState(0);
  const [detailFilter, setDetailFilter] = useState<'all' | 'diff' | 'match'>('all');
  const [detailLoading, setDetailLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const fetchBatches = useCallback(async (page = 1) => {
    if (!token) { alert('请先登录'); return; }
    try {
      const res = await authFetch(token, `${API}/api/reconciliation/batches?page=${page}&page_size=20`);
      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.detail === 'string' ? data.detail : '加载批次列表失败');
        return;
      }
      setBatches(data.batches || []);
      setBatchTotal(data.total || 0);
      setBatchPage(data.page || 1);
    } catch {
      alert('加载批次列表失败');
    }
  }, [token]);

  useEffect(() => {
    if (view === 'batches') {
      fetchBatches(batchPage);
    }
  }, [view, batchPage, fetchBatches]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f: File) => {
    const maxSize = 10 * 1024 * 1024;
    if (f.size > maxSize) { alert('文件大小超过 10MB 限制'); return; }
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (!ext || !['csv', 'xlsx', 'xls'].includes(ext)) { alert('仅支持 CSV 和 Excel (.xlsx/.xls) 格式'); return; }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    if (!token) { alert('请先登录'); return; }
    setUploading(true);
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await authFetch(token, `${API}/api/reconciliation/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = typeof data.detail === 'string' ? data.detail : (data.detail ? JSON.stringify(data.detail) : '上传失败');
        alert(errorMsg);
      }
      else { setUploadResult(data); setView('batches'); fetchBatches(1); }
    } catch { alert('上传请求失败'); }
    finally { setUploading(false); setFile(null); }
  };

  const fetchDetails = async (batchId: number, page = 1, filter: 'all' | 'diff' | 'match' = 'all') => {
    if (!token) { alert('请先登录'); return; }
    setDetailLoading(true);
    try {
      let url = `${API}/api/reconciliation/batch/${batchId}/details?page=${page}&page_size=50`;
      if (filter === 'diff') url += '&has_diff=true';
      if (filter === 'match') url += '&has_diff=false';
      const res = await authFetch(token, url);
      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.detail === 'string' ? data.detail : '加载明细失败');
        return;
      }
      setDetails(data.details || []);
      setDetailTotal(data.total || 0);
      setDetailPage(data.page || 1);
    } catch { alert('加载明细失败'); }
    finally { setDetailLoading(false); }
  };

  const openDetails = (batch: ReconBatch) => {
    setSelectedBatch(batch);
    setDetailFilter('all');
    setDetailPage(1);
    setView('details');
    fetchDetails(batch.id, 1, 'all');
  };

  const exportDiff = async (batchId: number) => {
    if (!token) { alert('请先登录'); return; }
    try {
      const res = await authFetch(token, `${API}/api/reconciliation/batch/${batchId}/export`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(typeof data.detail === 'string' ? data.detail : '导出失败');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `diff_report_${batchId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch { alert('导出请求失败'); }
  };

  const handleCompareSku = (sku: string | null, warehouse: string | null) => {
    if (sku) navigateToCompare(sku, warehouse || 'CA');
  };

  const renderUpload = () => (
    <div className="animate-fadeInUp">
      <div
        style={{
          border: `2px dashed ${dragOver ? 'var(--primary-500)' : file ? 'var(--success-500)' : 'var(--border-medium)'}`,
          borderRadius: 'var(--radius-xl)',
          padding: '60px 40px',
          background: dragOver ? 'var(--primary-50)' : file ? 'var(--success-50)' : 'var(--surface-secondary)',
          cursor: 'pointer',
          transition: 'all var(--transition-base)',
          textAlign: 'center',
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
          }
        }}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <input id="fileInput" type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 'var(--radius-full)',
            background: file ? 'var(--success-100)' : 'var(--primary-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            transition: 'all var(--transition-base)',
          }}
        >
          {file ? (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <polyline points="9 15 12 12 15 15" />
              <line x1="12" y1="12" x2="12" y2="21" />
            </svg>
          ) : (
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          )}
        </div>
        <div style={{ fontSize: 'var(--text-lg)', color: 'var(--gray-800)', marginBottom: 8, fontWeight: 'var(--font-semibold)' }}>
          {file ? `已选择: ${file.name}` : '点击或拖拽文件到此处上传'}
        </div>
        {file && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginBottom: 12 }}>
            文件大小: {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        )}
        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-400)' }}>
          支持 CSV、Excel 格式，单个文件不超过 10MB
        </div>
      </div>

      {file && (
        <div className="animate-fadeInUp" style={{ textAlign: 'center', marginTop: 24 }}>
          <button
            onClick={handleUpload}
            disabled={uploading}
            style={{
              ...primaryBtnStyle,
              padding: '12px 40px',
              fontSize: 'var(--text-base)',
              opacity: uploading ? 0.7 : 1,
              cursor: uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
                上传并对账中...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                开始批量对账
              </span>
            )}
          </button>
        </div>
      )}

      {uploadResult && (
        <div
          className="animate-fadeInUp"
          style={{
            marginTop: 24,
            padding: '20px 24px',
            background: 'var(--success-50)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid rgba(34, 197, 94, 0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 'var(--radius-full)',
              background: 'var(--success-500)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--success-600)', marginBottom: 4 }}>
              对账完成
            </div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
              批次号: <strong>{uploadResult.batch_no}</strong> | 共 {uploadResult.total} 条 | 一致 {uploadResult.matched} 条 | 差异 {uploadResult.diff} 条
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderBatches = () => (
    <div className="animate-fadeInUp">
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 'var(--text-xl)', margin: 0, fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>对账批次列表</h2>
          <p style={{ margin: '4px 0 0', fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>查看历史对账记录与差异分析</p>
        </div>
        <button onClick={() => setView('upload')} style={{ ...successBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          新建对账
        </button>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle}>批次号</th>
              <th style={thStyle}>文件名</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>总记录</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>一致</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>差异</th>
              <th style={thStyle}>状态</th>
              <th style={thStyle}>创建时间</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {batches.map((b) => {
              const status = statusConfig[b.status] || statusConfig.processing;
              return (
                <tr
                  key={b.id}
                  style={{ cursor: 'pointer', transition: 'background var(--transition-fast)' }}
                  onClick={() => openDetails(b)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gray-50)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <td style={{ ...tdStyle, fontWeight: 'var(--font-semibold)', color: 'var(--gray-800)' }}>{b.batch_no}</td>
                  <td style={tdStyle}>{b.file_name}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{b.total_records}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--success-600)', fontWeight: 'var(--font-semibold)' }}>{b.matched_records}</td>
                  <td style={{ ...tdStyle, textAlign: 'center', color: b.diff_records > 0 ? 'var(--error-600)' : 'var(--success-600)', fontWeight: 'var(--font-bold)' }}>{b.diff_records}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '4px 12px',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-xs)',
                      fontWeight: 'var(--font-semibold)',
                      background: status.bg,
                      color: status.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: status.dot }} />
                      {status.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                    {new Date(b.created_at).toLocaleString()}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); exportDiff(b.id); }}
                      style={{ ...warningBtnStyle, padding: '5px 12px', fontSize: 'var(--text-xs)' }}
                    >
                      导出差异
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {batchTotal > 20 && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
          <PageButton disabled={batchPage <= 1} onClick={() => setBatchPage(batchPage - 1)}>上一页</PageButton>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
            第 {batchPage} 页 / 共 {Math.ceil(batchTotal / 20)} 页
          </span>
          <PageButton disabled={batchPage >= Math.ceil(batchTotal / 20)} onClick={() => setBatchPage(batchPage + 1)}>下一页</PageButton>
        </div>
      )}
    </div>
  );

  const renderDetails = () => {
    if (!selectedBatch) return null;
    return (
      <div className="animate-fadeInUp">
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setView('batches')} style={{ ...secondaryBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              返回列表
            </button>
            <span style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--gray-900)' }}>
              批次 {selectedBatch.batch_no}
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
              共 {selectedBatch.total_records} 条 | <span style={{ color: 'var(--success-600)', fontWeight: 'var(--font-semibold)' }}>一致 {selectedBatch.matched_records}</span> | <span style={{ color: 'var(--error-600)', fontWeight: 'var(--font-semibold)' }}>差异 {selectedBatch.diff_records}</span>
            </span>
          </div>
          <button onClick={() => exportDiff(selectedBatch.id)} style={{ ...warningBtnStyle, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            导出差异报告
          </button>
        </div>

        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          {(['all', 'diff', 'match'] as const).map((f) => (
            <FilterButton key={f} active={detailFilter === f} onClick={() => { setDetailFilter(f); setDetailPage(1); fetchDetails(selectedBatch.id, 1, f); }}>
              {f === 'all' ? '全部' : f === 'diff' ? '仅差异' : '仅一致'}
            </FilterButton>
          ))}
        </div>

        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary-500)" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }}>
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
            <p style={{ marginTop: 12, color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>加载中...</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)' }}>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>行号</th>
                    <th style={thStyle}>跟踪号</th>
                    <th style={thStyle}>SKU</th>
                    <th style={thStyle}>物流商</th>
                    <th style={thStyle}>文件总价</th>
                    <th style={thStyle}>系统总价</th>
                    <th style={thStyle}>差异金额</th>
                    <th style={thStyle}>差异类型</th>
                    <th style={thStyle}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {details.map((d) => (
                    <tr
                      key={d.id}
                      style={{
                        background: d.has_diff ? 'var(--error-50)' : 'var(--success-50)',
                        transition: 'background var(--transition-fast)',
                      }}
                    >
                      <td style={tdStyle}>{d.row_no}</td>
                      <td style={tdStyle}>{d.file_tracking_no || '-'}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {d.file_sku || '-'}
                          {d.file_sku && (
                            <button
                              onClick={() => handleCompareSku(d.file_sku, d.file_warehouse)}
                              style={{
                                fontSize: 'var(--text-xs)',
                                padding: '2px 8px',
                                border: '1px solid var(--primary-300)',
                                background: 'var(--primary-50)',
                                color: 'var(--primary-600)',
                                borderRadius: 'var(--radius-sm)',
                                cursor: 'pointer',
                                fontWeight: 'var(--font-semibold)',
                                transition: 'all var(--transition-fast)',
                              }}
                              title="跳转到物流比价"
                            >
                              比价
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>{d.file_carrier || '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: 'var(--font-semibold)' }}>${d.file_total_amount?.toFixed(2) ?? '-'}</td>
                      <td style={{ ...tdStyle, fontWeight: 'var(--font-semibold)' }}>${d.sys_total_amount?.toFixed(2) ?? '-'}</td>
                      <td style={{ ...tdStyle, color: d.diff_amount !== 0 ? 'var(--error-600)' : 'var(--success-600)', fontWeight: 'var(--font-bold)' }}>
                        {d.diff_amount !== 0
                          ? (d.sys_total_amount !== null && d.file_total_amount !== null && d.sys_total_amount > d.file_total_amount
                              ? `+$${d.diff_amount.toFixed(2)}`
                              : `-$${d.diff_amount.toFixed(2)}`)
                          : '$0.00'}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {d.diff_types.map((t) => (
                            <span key={t} style={{
                              fontSize: 'var(--text-xs)',
                              padding: '3px 8px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--error-50)',
                              color: 'var(--error-600)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              fontWeight: 'var(--font-medium)',
                            }}>
                              {diffTypeNames[t] || t}
                            </span>
                          ))}
                          {d.diff_types.length === 0 && (
                            <span style={{ color: 'var(--success-600)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)' }}>一致</span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        {d.has_diff ? <DiffDetailPopover detail={d} /> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {detailTotal > 50 && (
              <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12 }}>
                <PageButton disabled={detailPage <= 1} onClick={() => { const p = detailPage - 1; setDetailPage(p); fetchDetails(selectedBatch.id, p, detailFilter); }}>上一页</PageButton>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', fontWeight: 'var(--font-medium)' }}>
                  第 {detailPage} 页 / 共 {Math.ceil(detailTotal / 50)} 页
                </span>
                <PageButton disabled={detailPage >= Math.ceil(detailTotal / 50)} onClick={() => { const p = detailPage + 1; setDetailPage(p); fetchDetails(selectedBatch.id, p, detailFilter); }}>下一页</PageButton>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Tabs */}
      <div style={{ marginBottom: 24, display: 'flex', gap: 4, borderBottom: '2px solid var(--border-light)' }}>
        <TabButton active={view === 'upload'} onClick={() => setView('upload')} icon="upload">文件上传</TabButton>
        <TabButton active={view === 'batches'} onClick={() => setView('batches')} icon="list">对账记录</TabButton>
      </div>
      {view === 'upload' && renderUpload()}
      {view === 'batches' && renderBatches()}
      {view === 'details' && renderDetails()}
    </div>
  );
}

function TabButton({ active, onClick, children, icon }: { active: boolean; onClick: () => void; children: React.ReactNode; icon: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '10px 20px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: active ? 'var(--font-bold)' : 'var(--font-medium)',
        color: active ? 'var(--primary-600)' : 'var(--gray-500)',
        borderBottom: active ? '2px solid var(--primary-500)' : '2px solid transparent',
        marginBottom: -2,
        transition: 'all var(--transition-base)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon === 'upload' ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <line x1="3" y1="6" x2="3.01" y2="6" />
          <line x1="3" y1="12" x2="3.01" y2="12" />
          <line x1="3" y1="18" x2="3.01" y2="18" />
        </svg>
      )}
      {children}
    </button>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 18px',
        borderRadius: 'var(--radius-full)',
        border: '1px solid',
        borderColor: active ? 'var(--primary-500)' : 'var(--border-light)',
        background: active ? 'var(--primary-500)' : 'var(--surface-primary)',
        color: active ? '#fff' : 'var(--gray-600)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-semibold)',
        transition: 'all var(--transition-base)',
      }}
    >
      {children}
    </button>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '7px 16px',
        border: '1px solid var(--border-light)',
        background: 'var(--surface-primary)',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-medium)',
        color: disabled ? 'var(--gray-400)' : 'var(--gray-700)',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition-fast)',
      }}
    >
      {children}
    </button>
  );
}

function DiffDetailPopover({ detail }: { detail: ReconDetail }) {
  const [show, setShow] = useState(false);
  const rows: { label: string; file: any; sys: any }[] = [];
  if (detail.diff_details?.amount) rows.push({ label: '总价', file: `$${detail.diff_details.amount.file}`, sys: `$${detail.diff_details.amount.system}` });
  if (detail.diff_details?.base_amount) rows.push({ label: '基础运费', file: `$${detail.diff_details.base_amount.file}`, sys: `$${detail.diff_details.base_amount.system}` });
  if (detail.diff_details?.weight) rows.push({ label: '重量', file: `${detail.diff_details.weight.file} lbs`, sys: `${detail.diff_details.weight.system} lbs` });
  if (detail.diff_details?.billed_weight) rows.push({ label: '计费重', file: `${detail.diff_details.billed_weight.file} lbs`, sys: `${detail.diff_details.billed_weight.system} lbs` });
  if (detail.diff_details?.zone) rows.push({ label: 'Zone', file: detail.diff_details.zone.file, sys: detail.diff_details.zone.system });
  if (detail.diff_details?.surcharge) rows.push({ label: '附加费', file: `$${detail.diff_details.surcharge.file}`, sys: `$${detail.diff_details.surcharge.system}` });
  if (detail.diff_details?.missing_product) rows.push({ label: '缺失', file: detail.diff_details.missing_product, sys: '-' });

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setShow(!show)}
        style={{
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: 'var(--primary-500)',
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--font-semibold)',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        查看详情
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transform: show ? 'rotate(180deg)' : undefined, transition: 'transform var(--transition-fast)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {show && (
        <div
          className="animate-fadeInScale"
          style={{
            position: 'absolute',
            right: 0,
            top: '100%',
            zIndex: 100,
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            padding: 16,
            minWidth: 320,
            marginTop: 8,
          }}
        >
          <div style={{ fontWeight: 'var(--font-bold)', marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--gray-800)' }}>差异详情</div>
          <table style={{ fontSize: 'var(--text-xs)', width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--gray-600)' }}>字段</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--error-600)' }}>文件值</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--primary-600)' }}>系统值</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', fontWeight: 'var(--font-medium)', color: 'var(--gray-700)' }}>{r.label}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--error-600)', fontWeight: 'var(--font-medium)' }}>{r.file}</td>
                  <td style={{ padding: '6px 8px', borderBottom: '1px solid var(--border-light)', color: 'var(--primary-600)', fontWeight: 'var(--font-medium)' }}>{r.sys}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setShow(false)}
            style={{
              marginTop: 10,
              fontSize: 'var(--text-xs)',
              color: 'var(--gray-400)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              float: 'right',
              fontWeight: 'var(--font-medium)',
            }}
          >
            关闭
          </button>
        </div>
      )}
    </div>
  );
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse' as const,
  fontSize: 'var(--text-sm)',
};

const thStyle: React.CSSProperties = {
  padding: '14px 16px',
  borderBottom: '2px solid var(--border-light)',
  textAlign: 'left' as const,
  background: 'var(--surface-secondary)',
  fontWeight: 'var(--font-semibold)',
  whiteSpace: 'nowrap' as const,
  color: 'var(--gray-600)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--border-light)',
  color: 'var(--gray-700)',
};

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
};

const successBtnStyle: React.CSSProperties = {
  padding: '10px 20px',
  background: 'linear-gradient(135deg, var(--success-500), var(--success-600))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)',
  fontFamily: 'inherit',
};

const warningBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  background: 'linear-gradient(135deg, var(--warning-500), var(--warning-600))',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
  fontFamily: 'inherit',
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  background: 'var(--surface-secondary)',
  color: 'var(--gray-700)',
  border: '1px solid var(--border-light)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontSize: 'var(--text-sm)',
  fontWeight: 'var(--font-semibold)',
  transition: 'all var(--transition-base)',
  fontFamily: 'inherit',
};
