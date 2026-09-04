import React, { useEffect, useState } from 'react';
import { X, Maximize2, Minimize2 } from 'lucide-react';
import { getIdToken } from '../../../utils/cognito-auth';

const WAVE_COLOR = '#7dd3fc';
const ROLLOUT_COLOR = '#4ade80';
const PROJECT_COLOR = '#86efac';

const PHASE_COLORS = {
  Mobilize: '#fca5a5',
  Design: '#fdba74',
  Build: '#fde047',
  Test: '#93c5fd',
  Deploy: '#c4b5fd',
  HyperCare: '#f9a8d4'
};
const DEFAULT_PHASE_COLOR = '#bbf7d0';

const ROW_HEIGHT = 40;
const GRIDLINE_COUNT = 20;

const parseDate = (val) => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const dayDiff = (a, b) => (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);

const formatDate = (date) => {
  if (!date) return '';
  const day = date.getDate().toString().padStart(2, '0');
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${day}-${monthNames[date.getMonth()]}-${date.getFullYear()}`;
};

const GanttChartModal = ({ isOpen, onClose, projectId, projectName, projectDates }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [waves, setWaves] = useState([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const idToken = await getIdToken();
        const pId = projectId || localStorage.getItem('project_id');
        const response = await fetch(`https://pewqu3v5b3.execute-api.ap-south-1.amazonaws.com/New/rice/get/waveRolloutFullDetails?project_id=${encodeURIComponent(pId)}`, {
          headers: { 'Authorization': `Bearer ${idToken}` }
        });
        const result = await response.json();
        if (response.ok) {
          setWaves(Array.isArray(result.data) ? result.data : []);
        } else {
          setError(result.error || 'Failed to load Gantt chart data');
        }
      } catch (err) {
        setError('Error loading Gantt chart data: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [isOpen, projectId]);

  if (!isOpen) return null;

  const projectStart = parseDate(projectDates?.startDate);
  const projectEnd = parseDate(projectDates?.endDate);

  const TYPE_PREFIX = { project: 'Project', wave: 'Wave', rollout: 'Rollout', phase: 'Phase' };

  const rows = [];
  if (projectStart && projectEnd) {
    rows.push({ type: 'project', label: projectName || 'Project', start: projectStart, end: projectEnd, color: PROJECT_COLOR });
  }

  const sortedWaves = [...waves].sort((a, b) => (Number(a.waveRolloutId) || 0) - (Number(b.waveRolloutId) || 0));

  sortedWaves.forEach((wave, wIdx) => {
    const waveStart = parseDate(wave.Wave_Start_Date || wave.Start_Date);
    const waveEnd = parseDate(wave.Wave_End_Date || wave.End_Date);
    if (waveStart && waveEnd) {
      rows.push({
        type: 'wave',
        label: wave.Wave_Description || wave.Wave_Code || `Wave ${wIdx + 1}`,
        start: waveStart,
        end: waveEnd,
        color: WAVE_COLOR,
        waveGroupStart: true
      });
    }

    const rollouts = (Array.isArray(wave.Rollouts) ? wave.Rollouts : [])
      .slice()
      .sort((a, b) => (Number(a.rice_Rollout_Definition_id) || 0) - (Number(b.rice_Rollout_Definition_id) || 0));
    rollouts.forEach((rollout, rIdx) => {
      const rolloutStart = parseDate(rollout.Rollout_Start_Date || rollout.Start_Date);
      const rolloutEnd = parseDate(rollout.Rollout_End_Date || rollout.End_Date);
      if (rolloutStart && rolloutEnd) {
        rows.push({
          type: 'rollout',
          label: rollout.Rollout_Description || rollout.Rollout_Code || `Rollout ${rIdx + 1}`,
          start: rolloutStart,
          end: rolloutEnd,
          color: ROLLOUT_COLOR,
          rolloutGroupStart: true
        });
      }

      const phases = Array.isArray(rollout.Phases) ? rollout.Phases : [];
      phases.forEach((phase) => {
        const phaseStart = parseDate(phase.Start_Date);
        const phaseEnd = parseDate(phase.End_Date);
        if (phaseStart && phaseEnd) {
          rows.push({
            type: 'phase',
            label: phase.Phase,
            start: phaseStart,
            end: phaseEnd,
            color: PHASE_COLORS[phase.Phase] || DEFAULT_PHASE_COLOR
          });
        }
      });
    });
  });

  const allStarts = rows.map(r => r.start);
  const allEnds = rows.map(r => r.end);
  const timelineStart = allStarts.length > 0 ? new Date(Math.min(...allStarts)) : new Date();
  const timelineEnd = allEnds.length > 0 ? new Date(Math.max(...allEnds)) : new Date();
  const totalDays = Math.max(1, dayDiff(timelineStart, timelineEnd));

  const getBarLeftPct = (row) => (dayDiff(timelineStart, row.start) / totalDays) * 100;
  const getBarWidthPct = (row) => Math.max(0.6, (dayDiff(row.start, row.end) / totalDays) * 100);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 11000,
      display: 'flex', justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        width: isFullscreen ? '100%' : '95%',
        height: isFullscreen ? '100%' : 'auto',
        maxWidth: isFullscreen ? 'none' : '1400px',
        maxHeight: isFullscreen ? 'none' : '90vh',
        borderRadius: isFullscreen ? '0px' : '8px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        display: 'flex', flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #e5e7eb',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#111827' }}>
            Gantt Chart{projectName ? ` - ${projectName}` : ''}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px',
                borderRadius: '4px', transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px',
              borderRadius: '4px'
            }} title="Close">
              <X size={20} />
            </button>
          </div>
        </div>

        <div style={{ padding: isFullscreen ? '24px' : '16px 24px', overflow: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>Loading Gantt chart...</p>
          ) : error ? (
            <p style={{ color: '#ef4444', fontSize: '14px' }}>{error}</p>
          ) : rows.length === 0 ? (
            <p style={{ color: '#6b7280', fontSize: '14px' }}>No schedule data available to display.</p>
          ) : (
            (() => {
              const projectRows = rows.filter(r => r.type === 'project');
              const restRows = rows.filter(r => r.type !== 'project');

              const renderRow = (row, idx) => {
                const leftPct = getBarLeftPct(row);
                const widthPct = getBarWidthPct(row);
                const detailText = `${TYPE_PREFIX[row.type]}: ${row.label} (${formatDate(row.start)} - ${formatDate(row.end)})`;
                const rowBg = row.type === 'project' ? 'rgba(134, 239, 172, 0.12)'
                  : row.type === 'wave' ? 'rgba(125, 211, 252, 0.12)'
                  : row.type === 'rollout' ? 'rgba(74, 222, 128, 0.10)'
                  : 'rgba(148, 163, 184, 0.06)';
                const isGroupStart = idx !== 0 && (row.waveGroupStart || row.rolloutGroupStart);
                return (
                  <div key={idx} style={{
                    position: 'relative', height: `${ROW_HEIGHT}px`,
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: rowBg,
                    marginTop: row.waveGroupStart && idx !== 0 ? '12px' : 0,
                    borderTop: isGroupStart ? (row.waveGroupStart ? '2px solid #9ca3af' : '1px dashed #d1d5db') : 'none'
                  }}>
                    <div style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      textAlign: 'left',
                      top: '2px',
                      lineHeight: '14px',
                      fontWeight: (row.type === 'project' || row.type === 'wave') ? '600' : '500',
                      fontSize: row.type === 'phase' ? '10px' : '11px',
                      color: '#111827',
                      whiteSpace: 'nowrap',
                      overflow: 'visible',
                      zIndex: 2,
                      pointerEvents: 'none'
                    }}>
                      {detailText}
                    </div>
                    <div style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      top: '18px',
                      height: `${ROW_HEIGHT - 22}px`,
                      backgroundColor: row.color,
                      border: '1px solid #6b7280',
                      borderRadius: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'hidden',
                      paddingLeft: '4px',
                      paddingRight: '4px'
                    }}>
                      <span style={{
                        fontSize: row.type === 'phase' ? '10px' : '11px',
                        fontWeight: (row.type === 'project' || row.type === 'wave') ? '600' : '500',
                        color: '#0f172a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {row.label}
                      </span>
                    </div>
                  </div>
                );
              };

              const renderGridlines = () => (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  display: 'flex', pointerEvents: 'none'
                }}>
                  {Array.from({ length: GRIDLINE_COUNT }).map((_, i) => (
                    <div key={i} style={{
                      flex: 1,
                      borderRight: i === GRIDLINE_COUNT - 1 ? 'none' : '1px solid #f1f5f9'
                    }} />
                  ))}
                </div>
              );

              return (
                <div style={{ fontSize: '12px', fontFamily: 'inherit' }}>
                  {projectRows.length > 0 && (
                    <div style={{
                      position: 'relative', border: '1px solid #9ca3af', borderRadius: '4px',
                      padding: '10px', marginBottom: '16px'
                    }}>
                      <div style={{ position: 'relative' }}>
                        {renderGridlines()}
                        {projectRows.map((row, idx) => renderRow(row, idx))}
                      </div>
                    </div>
                  )}

                  {restRows.length > 0 && (
                    <div style={{
                      position: 'relative', border: '1px solid #9ca3af', borderRadius: '4px',
                      padding: '10px'
                    }}>
                      <div style={{ position: 'relative' }}>
                        {renderGridlines()}
                        {restRows.map((row, idx) => renderRow(row, idx))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
};

export default GanttChartModal;