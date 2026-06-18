import { useState, useEffect } from 'react';
import { executionAPI, pipelineAPI } from '../services/api';

function DonutChart({ percentage, color, size = 120 }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--bg-tertiary)" strokeWidth="12" />
      <circle
        cx="50" cy="50" r={radius} fill="none"
        stroke={color} strokeWidth="12"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
    </svg>
  );
}

export default function Analytics() {
  const [executions, setExecutions] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [eRes, pRes] = await Promise.all([executionAPI.list(), pipelineAPI.list()]);
        setExecutions(eRes.data.executions);
        setPipelines(pRes.data.pipelines);
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="page-loader"><div className="loader"></div></div>;

  // Compute stats
  const total = executions.length;
  const completed = executions.filter(e => e.status === 'completed').length;
  const failed = executions.filter(e => e.status === 'failed').length;
  const running = executions.filter(e => e.status === 'running').length;
  const pending = executions.filter(e => e.status === 'pending').length;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Pipeline activity (count executions per pipeline)
  const pipelineActivity = pipelines.map(p => ({
    name: p.name,
    count: executions.filter(e => e.pipeline_id === p.id).length,
  })).sort((a, b) => b.count - a.count).slice(0, 5);

  const maxActivity = Math.max(...pipelineActivity.map(p => p.count), 1);

  // Executions over last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  });

  const executionsByDay = last7Days.map(day => ({
    label: day,
    count: executions.filter(e => {
      const eDate = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return eDate === day;
    }).length,
  }));

  const maxDay = Math.max(...executionsByDay.map(d => d.count), 1);

  // Status breakdown
  const statusData = [
    { label: 'Completed', count: completed, color: 'var(--success)' },
    { label: 'Failed', count: failed, color: 'var(--error)' },
    { label: 'Running', count: running, color: 'var(--info)' },
    { label: 'Pending', count: pending, color: 'var(--text-muted)' },
  ].filter(s => s.count > 0);

  const maxStatus = Math.max(...statusData.map(s => s.count), 1);

  // Recent executions
  const recent = [...executions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  return (
    <>
      <div className="app-topbar">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Analytics</h2>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          All-time stats from {total} execution{total !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="app-content">
        {/* Top stat cards */}
        <div className="stats-row fade-in">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--accent-light)' }}>📋</div>
            <div><div className="stat-value">{pipelines.length}</div><div className="stat-label">Total Pipelines</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--info)' }}>⚡</div>
            <div><div className="stat-value">{total}</div><div className="stat-label">Total Executions</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--success)' }}>✅</div>
            <div><div className="stat-value">{completed}</div><div className="stat-label">Successful Runs</div></div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: successRate >= 80 ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)', color: successRate >= 80 ? 'var(--success)' : 'var(--warning)' }}>
              {successRate >= 80 ? '🎯' : '📊'}
            </div>
            <div>
              <div className="stat-value">{successRate}%</div>
              <div className="stat-label">Success Rate</div>
            </div>
          </div>
        </div>

        {total === 0 ? (
          <div className="empty-state fade-in" style={{ marginTop: 40 }}>
            <div className="empty-icon">📈</div>
            <h3>No data yet</h3>
            <p>Run some pipelines to see analytics here.</p>
          </div>
        ) : (
          <>
            <div className="analytics-grid fade-in">
              {/* Success Rate Donut */}
              <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <h3>Success Rate</h3>
                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <DonutChart percentage={successRate} color={successRate >= 80 ? 'var(--success)' : successRate >= 50 ? 'var(--warning)' : 'var(--error)'} />
                  <div style={{ position: 'absolute', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{successRate}%</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>success</div>
                  </div>
                </div>
                <div style={{ marginTop: 16, width: '100%' }}>
                  {statusData.map(s => (
                    <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                        {s.label}
                      </span>
                      <span style={{ fontWeight: 600 }}>{s.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Executions per Day */}
              <div className="chart-card">
                <h3>Executions (Last 7 Days)</h3>
                <div style={{ display: 'flex', align: 'flex-end', gap: 8, height: 120, alignItems: 'flex-end' }}>
                  {executionsByDay.map(day => (
                    <div key={day.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{day.count || ''}</span>
                      <div
                        style={{
                          width: '100%',
                          height: `${Math.max((day.count / maxDay) * 90, day.count > 0 ? 8 : 2)}px`,
                          background: day.count > 0 ? 'linear-gradient(180deg, var(--accent-light), var(--accent))' : 'var(--bg-tertiary)',
                          borderRadius: '4px 4px 0 0',
                          transition: 'height 0.6s ease',
                          minHeight: 2,
                        }}
                      />
                      <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.2 }}>
                        {day.label.split(' ').map((w, i) => <span key={i}>{w}<br /></span>)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Activity */}
              <div className="chart-card">
                <h3>Most Active Pipelines</h3>
                {pipelineActivity.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', paddingTop: 20 }}>No executions yet</div>
                ) : (
                  <div className="bar-chart">
                    {pipelineActivity.map(p => (
                      <div key={p.name} className="bar-row">
                        <div className="bar-row-label" title={p.name}>
                          {p.name.length > 12 ? p.name.substring(0, 12) + '…' : p.name}
                        </div>
                        <div className="bar-track">
                          <div
                            className="bar-fill"
                            style={{
                              width: `${(p.count / maxActivity) * 100}%`,
                              background: 'linear-gradient(90deg, var(--accent), var(--accent-light))',
                            }}
                          />
                        </div>
                        <div className="bar-value">{p.count}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Status Breakdown */}
              <div className="chart-card">
                <h3>Status Breakdown</h3>
                <div className="bar-chart">
                  {statusData.map(s => (
                    <div key={s.label} className="bar-row">
                      <div className="bar-row-label">{s.label}</div>
                      <div className="bar-track">
                        <div
                          className="bar-fill"
                          style={{
                            width: `${(s.count / maxStatus) * 100}%`,
                            background: s.color,
                          }}
                        />
                      </div>
                      <div className="bar-value">{s.count}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="chart-card fade-in" style={{ marginTop: 20 }}>
              <h3>Recent Executions</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', textAlign: 'left' }}>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Pipeline</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Topic</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Status</th>
                      <th style={{ padding: '8px 12px', fontWeight: 600 }}>Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map(e => (
                      <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 500 }}>{e.pipeline_name}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                          {e.input_data?.topic?.substring(0, 40) || 'N/A'}
                          {e.input_data?.topic?.length > 40 ? '…' : ''}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span className={`badge badge-${e.status === 'completed' ? 'success' : e.status === 'failed' ? 'error' : e.status === 'running' ? 'info' : 'default'}`}>
                            {e.status}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                          {new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
