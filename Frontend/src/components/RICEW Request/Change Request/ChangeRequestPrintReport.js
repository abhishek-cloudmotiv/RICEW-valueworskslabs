import html2pdf from 'html2pdf.js';
import { Fragment, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

const ChangeRequestPrintReport = ({ form, onClose, linkMaps = {}, onUploadPdf, autoUpload, onAutoUploadComplete }) => {
    const reportRef = useRef(null);
    const onUploadPdfRef = useRef(onUploadPdf);
    const onAutoUploadCompleteRef = useRef(onAutoUploadComplete);
    useEffect(() => {
        onUploadPdfRef.current = onUploadPdf;
        onAutoUploadCompleteRef.current = onAutoUploadComplete;
    });
    const projectName = DOMPurify.sanitize(localStorage.getItem('project_name') || '', { ALLOWED_TAGS: [] });

    const printDate = new Date().toLocaleDateString('en-US', {
        day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();

    const formatDate = (dateStr) => {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const day = date.getDate().toString().padStart(2, '0');
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        return `${day}-${months[date.getMonth()]}-${date.getFullYear()}`;
    };

    const val = (v) => {
        if (v && String(v).trim()) {
            return DOMPurify.sanitize(String(v) || '', { ALLOWED_TAGS: [] });
        }
        return '—';
    };
    const arrVal = (v) => {
        if (Array.isArray(v)) {
            return v.length ? v.map(item => DOMPurify.sanitize(String(item) || '', { ALLOWED_TAGS: [] })).join(', ') : '—';
        }
        return val(v);
    };

    const getFileViewUrl = (url, name) => {
        if (!url) return '';
        const extension = (name || url).split('.').pop().toLowerCase();
        if (['xlsx', 'xls', 'csv', 'docx', 'doc', 'ppt', 'pptx'].includes(extension)) {
            return `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // Splits text into plain-text and image-link segments using the linkMap
    const parseDescriptionParts = (text, linkMap) => {
        if (!text) return [];
        const sanitizedText = DOMPurify.sanitize(String(text) || '', { ALLOWED_TAGS: [] });
        const parts = [];
        const regex = /\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(sanitizedText)) !== null) {
            if (match.index > lastIndex) {
                parts.push({ type: 'text', value: sanitizedText.slice(lastIndex, match.index) });
            }
            const bracketKey = match[0];
            const url = linkMap ? linkMap[bracketKey] : null;
            if (url) {
                parts.push({ type: 'image', key: bracketKey, name: DOMPurify.sanitize(match[1] || '', { ALLOWED_TAGS: [] }), url });
            } else {
                parts.push({ type: 'text', value: bracketKey });
            }
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < sanitizedText.length) {
            parts.push({ type: 'text', value: sanitizedText.slice(lastIndex) });
        }
        return parts;
    };

    const getStatusStyle = (status) => {
        const map = {
            'Approved':                  { bg: '#d4edda', color: '#155724' },
            'Rejected':                  { bg: '#f8d7da', color: '#721c24' },
            'Submitted':                 { bg: '#cce5ff', color: '#004085' },
            'Draft':                     { bg: '#fff3cd', color: '#856404' },
            'More Information Needed':   { bg: '#fff3cd', color: '#856404' },
            'In Review':                 { bg: '#e2e3e5', color: '#383d41' },
            'Pending':                   { bg: '#e2e3e5', color: '#383d41' },
        };
        return map[status] || { bg: '#e2e3e5', color: '#383d41' };
    };

    const StatusBadge = ({ status }) => {
        const sanitizedStatus = DOMPurify.sanitize(status || '', { ALLOWED_TAGS: [] });
        const s = getStatusStyle(sanitizedStatus);
        return (
            <span style={{
                display: 'inline-block',
                padding: '3px 12px',
                borderRadius: '12px',
                backgroundColor: s.bg,
                color: s.color,
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
            }}>
                {sanitizedStatus || '—'}
            </span>
        );
    };

    const buildHtmlString = (outerHtml) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Change Request — ${DOMPurify.sanitize(form.changeRequestDisplayId || 'Report', { ALLOWED_TAGS: [] })}</title>
  <style>
    @page { margin: 1.5cm 1.8cm; }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0; padding: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 12.5px; color: #1a202c; background: white;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    img { max-width: 100%; height: auto; }
    a { color: #1e5baa; }
    .cr-sec-block  { page-break-inside: auto;  break-inside: auto;  overflow: visible; }
    .cr-sec-header { page-break-after:  avoid; break-after:  avoid; }
    .cr-detail-block { page-break-inside: auto; break-inside: auto; }
    .cr-detail-label { page-break-after: avoid; break-after: avoid; }
    .cr-sig-block    { page-break-inside: avoid; break-inside: avoid; }
    .cr-thumb-gallery { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body>
${outerHtml}
</body>
</html>`;

    const pdfOptions = {
        margin: [15, 18, 15, 18],
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    useEffect(() => {
        if (!autoUpload) return;
        const timer = setTimeout(async () => {
            const uploadFn = onUploadPdfRef.current;
            const completeFn = onAutoUploadCompleteRef.current;
            if (!reportRef.current || !uploadFn) { completeFn?.(); return; }
            try {
                const blob = await html2pdf().set(pdfOptions).from(reportRef.current).output('blob');
                await uploadFn(blob);
            } catch (err) {
                console.error('Auto print PDF upload failed:', err);
            } finally {
                completeFn?.();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePrint = () => {
        if (!reportRef.current) return;

        const pw = window.open('', '_blank');
        if (!pw) {
            alert('Please allow pop-ups for this site, then try again.');
            return;
        }

        const htmlContent = buildHtmlString(reportRef.current.outerHTML);
        pw.document.write(htmlContent);
        pw.document.close();
        pw.focus();

        if (onUploadPdf) {
            html2pdf().set(pdfOptions).from(reportRef.current).output('blob')
                .then(blob => onUploadPdf(blob))
                .catch(err => console.error('Print PDF upload failed:', err));
        }

        const imgs = Array.from(pw.document.querySelectorAll('img'));
        if (imgs.length === 0) {
            setTimeout(() => pw.print(), 300);
        } else {
            let pending = imgs.length;
            const onSettled = () => { if (--pending === 0) pw.print(); };
            imgs.forEach(img => {
                if (img.complete) { onSettled(); }
                else {
                    img.addEventListener('load',  onSettled, { once: true });
                    img.addEventListener('error', onSettled, { once: true });
                }
            });
            setTimeout(() => { if (pending > 0) pw.print(); }, 3000);
        }
    };

    // Shared table/cell styles
    const tableS = { width: '100%', borderCollapse: 'collapse', border: '1px solid #c8d0db' };

    const thS = {
        backgroundColor: '#f0f4f8',
        padding: '7px 14px',
        fontSize: '10.5px',
        fontWeight: '700',
        color: '#4a5568',
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
        borderRight: '1px solid #c8d0db',
        borderBottom: '1px solid #c8d0db',
        textAlign: 'left',
        whiteSpace: 'nowrap',
    };

    const tdS = {
        padding: '9px 14px',
        fontSize: '12.5px',
        color: '#1a202c',
        borderRight: '1px solid #c8d0db',
        borderBottom: '1px solid #c8d0db',
        verticalAlign: 'top',
    };

    const sectionHeaderS = {
        background: 'linear-gradient(to right, #1e3a5f, #2c5282)',
        color: 'white',
        padding: '9px 16px',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '1px',
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    };

    const secBlockS = {
        marginBottom: '16px',
        border: '1px solid #c8d0db',
        borderRadius: '3px',
        overflow: 'visible',
    };

    const reasonLabel = form.approvalStatus === 'Rejected'
        ? 'Rejection Reason'
        : form.approvalStatus === 'More Information Needed'
        ? 'Request Reason'
        : 'Reason';

    const sanitizedApprovalStatus = DOMPurify.sanitize(form.approvalStatus || '', { ALLOWED_TAGS: [] });
    const reasonValue = (sanitizedApprovalStatus === 'Rejected' || sanitizedApprovalStatus === 'More Information Needed')
        ? val(form.rejectionReason)
        : '—';

    return (
        <Fragment>
            <style>{`
                @page { margin: 1.5cm 1.8cm; }
            `}</style>

            {/* Modal overlay */}
            <div style={{
                position: 'fixed',
                top: autoUpload ? 0 : 0,
                left: autoUpload ? '-10000px' : 0,
                width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.75)',
                display: 'flex',
                alignItems: 'flex-start', justifyContent: 'center',
                zIndex: autoUpload ? -1 : 12000,
                overflowY: 'auto',
                padding: '20px 0 40px',
                pointerEvents: autoUpload ? 'none' : 'auto',
            }}>
                <div style={{ width: '900px', maxWidth: '96%' }}>

                    {/* Toolbar — hidden during print */}
                    <div className="no-print" style={{
                        backgroundColor: '#1e3a5f',
                        padding: '10px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderRadius: '4px 4px 0 0',
                    }}>
                        <span style={{ color: 'white', fontWeight: '600', fontSize: '14px' }}>
                            Change Request — Print Preview
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handlePrint}
                                style={{
                                    padding: '6px 20px',
                                    backgroundColor: '#fff',
                                    color: '#1e3a5f',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '7px',
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
                                </svg>
                                Print
                            </button>
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '6px 16px',
                                    backgroundColor: 'rgba(255,255,255,0.15)',
                                    color: 'white',
                                    border: '1px solid rgba(255,255,255,0.3)',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                }}
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                                Close
                            </button>
                        </div>
                    </div>

                    {/* ===== REPORT DOCUMENT ===== */}
                    <div id="cr-report-content" className="cr-print-doc" ref={reportRef} style={{
                        backgroundColor: 'white',
                        padding: '36px 44px',
                        fontFamily: '"Segoe UI", Arial, sans-serif',
                        fontSize: '12.5px',
                        color: '#1a202c',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.22)',
                    }}>

                        {/* ── Report Header ── */}
                        <div style={{
                            borderBottom: '3px solid #1e3a5f',
                            paddingBottom: '16px',
                            marginBottom: '20px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                        }}>
                            {/* Left: Title block */}
                            <div>
                                <div style={{
                                    fontSize: '22px',
                                    fontWeight: '800',
                                    color: '#1e3a5f',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                    lineHeight: '1.1',
                                }}>
                                    Change Request
                                </div>
                                <div style={{ fontSize: '13px', color: '#4a5568', marginTop: '5px', fontWeight: '500' }}>
                                    {projectName || 'ERP Project'}
                                </div>
                            </div>

                            {/* Right: ID + status + date */}
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontSize: '20px',
                                    fontWeight: '800',
                                    color: '#1e3a5f',
                                    letterSpacing: '1.5px',
                                    fontFamily: 'monospace',
                                }}>
                                    {val(form.changeRequestDisplayId)}
                                </div>
                                <div style={{ marginTop: '6px' }}>
                                    <StatusBadge status={form.approvalStatus} />
                                </div>
                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '6px' }}>
                                    Date Raised: <strong>{formatDate(form.dateRaised)}</strong>
                                </div>
                                {form.aging && (
                                    <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>
                                        Aging: <strong>{form.aging} {parseInt(form.aging) === 1 ? 'Day' : 'Days'}</strong>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── Change Request Title Banner ── */}
                        <div style={{
                            backgroundColor: '#f7f9fc',
                            border: '1px solid #c8d0db',
                            borderLeft: '4px solid #1e3a5f',
                            borderRadius: '3px',
                            padding: '12px 16px',
                            marginBottom: '18px',
                        }}>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                color: '#718096',
                                textTransform: 'uppercase',
                                letterSpacing: '0.6px',
                                marginBottom: '5px',
                            }}>
                                Change Request Title
                            </div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a202c' }}>
                                {val(form.changeRequestTitle)}
                            </div>
                        </div>

                        {/* ═══ SECTION A: IDENTIFICATION ═══ */}
                        <div className="cr-sec-block" style={secBlockS}>
                            <div className="cr-sec-header" style={sectionHeaderS}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 13h6M9 17h4"/>
                                </svg>
                                Section A: Identification
                            </div>
                            <table style={tableS}>
                                <tbody>
                                    <tr>
                                        <th style={{ ...thS, width: '33%' }}>Change Type</th>
                                        <th style={{ ...thS, width: '34%' }}>Change Category</th>
                                        <th style={{ ...thS, width: '33%', borderRight: 'none' }}>Sub-Category</th>
                                    </tr>
                                    <tr>
                                        <td style={tdS}>{val(form.changeType)}</td>
                                        <td style={tdS}>{val(form.changeCategory)}</td>
                                        <td style={{ ...tdS, borderRight: 'none' }}>{val(form.subCategory)}</td>
                                    </tr>
                                    <tr>
                                        <th style={thS}>Stream</th>
                                        <th style={thS}>Application</th>
                                        <th style={{ ...thS, borderRight: 'none' }}>Module</th>
                                    </tr>
                                    <tr>
                                        <td style={tdS}>{val(form.stream)}</td>
                                        <td style={tdS}>{val(form.application)}</td>
                                        <td style={{ ...tdS, borderRight: 'none' }}>{arrVal(form.module)}</td>
                                    </tr>
                                    <tr>
                                        <th style={thS}>Project Phase</th>
                                        <th style={thS}>Priority</th>
                                        <th style={{ ...thS, borderRight: 'none' }}>Impact Area</th>
                                    </tr>
                                    <tr>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>{val(form.projectPhase)}</td>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>{val(form.priority)}</td>
                                        <td style={{ ...tdS, borderRight: 'none', borderBottom: 'none' }}>{arrVal(form.impactArea)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ═══ SECTION B: CHANGE DETAILS ═══ */}
                        <div className="cr-sec-block" style={secBlockS}>
                            <div className="cr-sec-header" style={sectionHeaderS}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                    <polyline points="14 2 14 8 20 8"/>
                                    <line x1="16" y1="13" x2="8" y2="13"/>
                                    <line x1="16" y1="17" x2="8" y2="17"/>
                                    <polyline points="10 9 9 9 8 9"/>
                                </svg>
                                Section B: Change Details
                            </div>
                            {[
                                { label: 'Change Description',     value: form.changeDescription,     linkMap: linkMaps.changeDescription     || {}, docs: form.changeDescriptionDocuments     || [] },
                                { label: 'Business Justification',  value: form.businessJustification,  linkMap: linkMaps.businessJustification  || {}, docs: form.businessJustificationDocuments  || [] },
                                { label: 'Proposed Solution',       value: form.proposedSolution,       linkMap: linkMaps.proposedSolution       || {}, docs: form.proposedSolutionDocuments       || [] },
                            ].map((item, idx, arr) => {
                                const parts = parseDescriptionParts(item.value, item.linkMap);
                                const images = parts.filter(p => p.type === 'image');
                                return (
                                    <div key={item.label} className="cr-detail-block" style={{
                                        borderBottom: idx < arr.length - 1 ? '1px solid #c8d0db' : 'none',
                                        padding: '12px 16px',
                                    }}>
                                        {/* Field label */}
                                        <div className="cr-detail-label" style={{
                                            fontSize: '10px',
                                            fontWeight: '700',
                                            color: '#4a5568',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                            marginBottom: '7px',
                                        }}>
                                            {item.label}
                                        </div>

                                        {/* Text content with inline screenshot links */}
                                        {parts.length > 0 ? (
                                            <div style={{ fontSize: '12.5px', color: '#1a202c', lineHeight: '1.75', minHeight: '28px' }}>
                                                {parts.map((part, i) =>
                                                    part.type === 'image' ? (
                                                        <a
                                                            key={i}
                                                            href={part.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={`Open ${part.name}`}
                                                            style={{
                                                                color: '#1e5baa',
                                                                textDecoration: 'underline',
                                                                fontWeight: '600',
                                                                fontSize: '12px',
                                                                cursor: 'pointer',
                                                            }}
                                                        >
                                                            {part.key}
                                                        </a>
                                                    ) : (
                                                        <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.value}</span>
                                                    )
                                                )}
                                            </div>
                                        ) : (
                                            <div style={{ fontSize: '12.5px', color: '#1a202c', lineHeight: '1.75', minHeight: '28px' }}>
                                                —
                                            </div>
                                        )}

                                        {/* Screenshot thumbnail gallery (only when images exist) */}
                                        {images.length > 0 && (
                                            <div className="cr-thumb-gallery" style={{
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '12px',
                                                marginTop: '12px',
                                                paddingTop: '10px',
                                                borderTop: '1px dashed #c8d0db',
                                            }}>
                                                {images.map((img, i) => {
                                                    const sanitizedImgName = DOMPurify.sanitize(img.name || '', { ALLOWED_TAGS: [] });
                                                    return (
                                                    <a
                                                        key={i}
                                                        href={img.url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title={`Open ${sanitizedImgName}`}
                                                        style={{ display: 'inline-block', textDecoration: 'none', cursor: 'pointer' }}
                                                    >
                                                        <img
                                                            src={img.url}
                                                            alt={sanitizedImgName}
                                                            style={{
                                                                display: 'block',
                                                                maxWidth: '220px',
                                                                maxHeight: '160px',
                                                                border: '1px solid #c8d0db',
                                                                borderRadius: '4px',
                                                                boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                                                            }}
                                                        />
                                                        <div style={{
                                                            fontSize: '10px',
                                                            color: '#1e5baa',
                                                            textAlign: 'center',
                                                            marginTop: '4px',
                                                            maxWidth: '220px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {sanitizedImgName}
                                                        </div>
                                                    </a>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Attached documents */}
                                        {item.docs.length > 0 && (
                                            <div style={{
                                                marginTop: '10px',
                                                paddingTop: '9px',
                                                borderTop: '1px dashed #c8d0db',
                                            }}>
                                                <div style={{
                                                    fontSize: '10px',
                                                    fontWeight: '700',
                                                    color: '#4a5568',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.4px',
                                                    marginBottom: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '5px',
                                                }}>
                                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.41 17.41a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                                                    </svg>
                                                    Attached Documents
                                                </div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                                    {item.docs.map((doc, i) => {
                                                        const sanitizedDocName = DOMPurify.sanitize(doc.name || '', { ALLOWED_TAGS: [] });
                                                        return (
                                                        <a
                                                            key={i}
                                                            href={getFileViewUrl(doc.url, doc.name)}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            title={`Open ${sanitizedDocName}`}
                                                            style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                color: '#1e5baa',
                                                                textDecoration: 'none',
                                                                fontSize: '12px',
                                                                fontWeight: '500',
                                                                width: 'fit-content',
                                                            }}
                                                        >
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                                <polyline points="14 2 14 8 20 8"/>
                                                            </svg>
                                                            <span style={{ textDecoration: 'underline' }}>{sanitizedDocName}</span>
                                                        </a>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* ═══ SECTION C: SOURCE & OWNERSHIP ═══ */}
                        <div className="cr-sec-block" style={secBlockS}>
                            <div className="cr-sec-header" style={sectionHeaderS}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                                </svg>
                                Section C: Source &amp; Ownership
                            </div>
                            <table style={tableS}>
                                <tbody>
                                    <tr>
                                        <th style={{ ...thS, width: '33%' }}>CR Requestor</th>
                                        <th style={{ ...thS, width: '34%' }}>CR Client Owner</th>
                                        <th style={{ ...thS, width: '33%', borderRight: 'none' }}>Business Owner</th>
                                    </tr>
                                    <tr>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>
                                            <div style={{ fontWeight: '600' }}>{val(form.crRequestorName)}</div>
                                            {form.crRequestorEmail && (
                                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '3px' }}>{form.crRequestorEmail}</div>
                                            )}
                                        </td>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>
                                            <div style={{ fontWeight: '600' }}>{val(form.crClientOwnerName)}</div>
                                            {form.crClientOwnerEmail && (
                                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '3px' }}>{form.crClientOwnerEmail}</div>
                                            )}
                                        </td>
                                        <td style={{ ...tdS, borderRight: 'none', borderBottom: 'none' }}>
                                            <div style={{ fontWeight: '600' }}>{val(form.businessOwnerName)}</div>
                                            {form.businessOwnerEmail && (
                                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '3px' }}>{form.businessOwnerEmail}</div>
                                            )}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ═══ SECTION D: COST & EFFORT ESTIMATE ═══ */}
                        <div className="cr-sec-block" style={secBlockS}>
                            <div className="cr-sec-header" style={sectionHeaderS}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="1" x2="12" y2="23"/>
                                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                                </svg>
                                Section D: Cost &amp; Effort Estimate
                            </div>
                            <table style={tableS}>
                                <tbody>
                                    <tr>
                                        <th style={{ ...thS, width: '33%' }}>Effort Estimate</th>
                                        <th style={{ ...thS, width: '34%' }}>Cost Estimate</th>
                                        <th style={{ ...thS, width: '33%', borderRight: 'none' }}>Schedule Impact</th>
                                    </tr>
                                    <tr>
                                        <td style={tdS}>
                                            {form.effortEstimate ? `${form.effortEstimate} Hours` : '—'}
                                        </td>
                                        <td style={tdS}>
                                            {form.costEstimate ? `${form.costEstimate} ${form.currency || 'USD'}` : '—'}
                                        </td>
                                        <td style={{ ...tdS, borderRight: 'none' }}>
                                            <div>{val(form.scheduleImpact)}</div>
                                            {form.scheduleImpact === 'Yes' && form.scheduleImpactExplanation && (
                                                <div style={{ fontSize: '11px', color: '#718096', marginTop: '3px' }}>
                                                    {form.scheduleImpactExplanation}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th style={thS}>RICEW Impacted</th>
                                        <th style={thS}>RICEW ID</th>
                                        <th style={{ ...thS, borderRight: 'none' }}>RICEW Name</th>
                                    </tr>
                                    <tr>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>{val(form.ricewImpacted)}</td>
                                        <td style={{ ...tdS, borderBottom: 'none' }}>{val(form.ricewId)}</td>
                                        <td style={{ ...tdS, borderRight: 'none', borderBottom: 'none' }}>{val(form.ricewName)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ═══ SECTION E: APPROVAL TRACKING ═══ */}
                        <div className="cr-sec-block" style={secBlockS}>
                            <div className="cr-sec-header" style={sectionHeaderS}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="9 11 12 14 22 4"/>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                                </svg>
                                Section E: Approval Tracking
                            </div>
                            <table style={tableS}>
                                <tbody>
                                    <tr>
                                        <th style={{ ...thS, width: '33%' }}>Approval Status</th>
                                        <th style={{ ...thS, width: '34%' }}>Approved By</th>
                                        <th style={{ ...thS, width: '33%', borderRight: 'none' }}>Approval Date</th>
                                    </tr>
                                    <tr>
                                        <td style={tdS}>
                                            <StatusBadge status={form.approvalStatus} />
                                        </td>
                                        <td style={tdS}>{val(form.approvedBy)}</td>
                                        <td style={{ ...tdS, borderRight: 'none' }}>{formatDate(form.approvalDate)}</td>
                                    </tr>
                                    <tr>
                                        <th style={{ ...thS, borderRight: '1px solid #c8d0db' }} colSpan={2}>{reasonLabel}</th>
                                        <th style={{ ...thS, borderRight: 'none' }}>Aging</th>
                                    </tr>
                                    <tr>
                                        <td style={{ ...tdS, borderBottom: 'none', borderRight: '1px solid #c8d0db' }} colSpan={2}>
                                            {reasonValue}
                                        </td>
                                        <td style={{ ...tdS, borderRight: 'none', borderBottom: 'none' }}>
                                            {form.aging ? `${form.aging} ${parseInt(form.aging) === 1 ? 'Day' : 'Days'}` : '—'}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ═══ SIGNATURE & ACKNOWLEDGEMENT ═══ */}
                        <div className="cr-sec-block cr-sig-block" style={secBlockS}>
                            <div className="cr-sec-header" style={{ ...sectionHeaderS, background: 'linear-gradient(to right, #374151, #4b5563)' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34"/>
                                    <polygon points="18 2 22 6 12 16 8 16 8 12 18 2"/>
                                </svg>
                                Acknowledgement &amp; Signatures
                            </div>
                            <table style={tableS}>
                                <tbody>
                                    <tr>
                                        <th style={{ ...thS, width: '33%' }}>Prepared By</th>
                                        <th style={{ ...thS, width: '34%' }}>Reviewed By</th>
                                        <th style={{ ...thS, width: '33%', borderRight: 'none' }}>Approved By</th>
                                    </tr>
                                    <tr>
                                        <td style={{ ...tdS, height: '64px', verticalAlign: 'bottom', borderBottom: 'none' }}>
                                            <div style={{
                                                borderTop: '1px solid #888',
                                                paddingTop: '5px',
                                                fontSize: '10px',
                                                color: '#718096',
                                            }}>
                                                Signature &nbsp;/&nbsp; Date
                                            </div>
                                        </td>
                                        <td style={{ ...tdS, height: '64px', verticalAlign: 'bottom', borderBottom: 'none' }}>
                                            <div style={{
                                                borderTop: '1px solid #888',
                                                paddingTop: '5px',
                                                fontSize: '10px',
                                                color: '#718096',
                                            }}>
                                                Signature &nbsp;/&nbsp; Date
                                            </div>
                                        </td>
                                        <td style={{ ...tdS, height: '64px', verticalAlign: 'bottom', borderRight: 'none', borderBottom: 'none' }}>
                                            <div style={{
                                                borderTop: '1px solid #888',
                                                paddingTop: '5px',
                                                fontSize: '10px',
                                                color: '#718096',
                                            }}>
                                                Signature &nbsp;/&nbsp; Date
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* ── Report Footer ── */}
                        <div style={{
                            borderTop: '1px solid #c8d0db',
                            paddingTop: '10px',
                            marginTop: '6px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '10px',
                            color: '#718096',
                        }}>
                            <span>Generated: {printDate}</span>
                            <span style={{ fontWeight: '600', color: '#4a5568' }}>
                                {projectName || 'ERP Project'}
                            </span>
                            <span>CONFIDENTIAL — FOR INTERNAL USE ONLY</span>
                        </div>

                    </div>
                    {/* end .cr-print-doc */}

                </div>
            </div>
        </Fragment>
    );
};

export default ChangeRequestPrintReport;