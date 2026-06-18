import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { pipelineAPI } from '../services/api';

const TEMPLATES = [
  {
    id: 'market-research',
    icon: '📈',
    title: 'Market Research Report',
    description: 'A 4-agent pipeline that researches a market, analyzes trends, writes a structured report, and then critiques it for accuracy before finalizing.',
    color: '#3b82f6',
    agents: ['Researcher', 'Analyst', 'Writer', 'Critic'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 200, y: 60 }, data: { label: 'Market Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true } } },
        { id: 'n2', type: 'agentNode', position: { x: 200, y: 200 }, data: { label: 'Data Analyst', role: 'analyst', color: '#8b5cf6', icon: '📊', config: {} } },
        { id: 'n3', type: 'agentNode', position: { x: 200, y: 340 }, data: { label: 'Report Writer', role: 'writer', color: '#10b981', icon: '✍️', config: {} } },
        { id: 'n4', type: 'agentNode', position: { x: 200, y: 480 }, data: { label: 'Fact Checker', role: 'critic', color: '#f59e0b', icon: '🔎', config: { requiresApproval: true } } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
  {
    id: 'blog-post',
    icon: '✍️',
    title: 'Blog Post Generator',
    description: 'A streamlined 3-agent pipeline — research, write, and edit — to produce a publish-ready blog post on any topic in minutes.',
    color: '#10b981',
    agents: ['Researcher', 'Writer', 'Critic'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 200, y: 60 }, data: { label: 'Topic Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true } } },
        { id: 'n2', type: 'agentNode', position: { x: 200, y: 220 }, data: { label: 'Content Writer', role: 'writer', color: '#10b981', icon: '✍️', config: { systemPrompt: 'You are a skilled blog writer who crafts engaging, SEO-friendly blog posts in markdown. Use a conversational but authoritative tone. Include an intro hook, subheadings, and a conclusion with a call to action.' } } },
        { id: 'n3', type: 'agentNode', position: { x: 200, y: 380 }, data: { label: 'Editor', role: 'critic', color: '#f59e0b', icon: '🔎', config: {} } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
  {
    id: 'competitive-analysis',
    icon: '🏆',
    title: 'Competitive Analysis',
    description: 'Two parallel researcher agents feed into a single analyst for comparative competitive analysis — ideal for benchmarking against multiple competitors simultaneously.',
    color: '#ec4899',
    agents: ['Researcher', 'Researcher', 'Analyst', 'Writer'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 80, y: 60 }, data: { label: 'Product Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true } } },
        { id: 'n2', type: 'agentNode', position: { x: 340, y: 60 }, data: { label: 'Competitor Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true } } },
        { id: 'n3', type: 'agentNode', position: { x: 210, y: 220 }, data: { label: 'Competitive Analyst', role: 'analyst', color: '#8b5cf6', icon: '📊', config: {} } },
        { id: 'n4', type: 'agentNode', position: { x: 210, y: 380 }, data: { label: 'Strategy Writer', role: 'writer', color: '#10b981', icon: '✍️', config: {} } },
      ],
      edges: [
        { id: 'e1-3', source: 'n1', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
  {
    id: 'code-review',
    icon: '🛠️',
    title: 'Code Review & Documentation',
    description: 'Analyzes code for quality, security, and best practices, then generates clean documentation and an executive summary for non-technical stakeholders.',
    color: '#8b5cf6',
    agents: ['Analyst', 'Critic', 'Writer'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 200, y: 60 }, data: { label: 'Code Analyzer', role: 'analyst', color: '#8b5cf6', icon: '📊', config: { systemPrompt: 'You are a senior software engineer doing a code review. Analyze the provided code snippet or description for: correctness, security vulnerabilities, performance issues, readability, and adherence to best practices. Be direct and specific in your feedback.' } } },
        { id: 'n2', type: 'agentNode', position: { x: 200, y: 220 }, data: { label: 'Security Critic', role: 'critic', color: '#f59e0b', icon: '🔎', config: { systemPrompt: 'You are a security-focused code reviewer. Given the code analysis, specifically identify security vulnerabilities (OWASP Top 10, injection risks, auth issues), rate each finding by severity (Critical/High/Medium/Low), and suggest concrete fixes.' } } },
        { id: 'n3', type: 'agentNode', position: { x: 200, y: 380 }, data: { label: 'Docs Writer', role: 'writer', color: '#10b981', icon: '✍️', config: { systemPrompt: 'You are a technical writer. Given the code analysis and security review, produce clean markdown documentation including: a summary for non-technical readers, an API reference (if applicable), and a prioritized list of recommended improvements.' } } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
  {
    id: 'investment-memo',
    icon: '💼',
    title: 'Investment Memo Generator',
    description: 'Researches a company or sector, performs financial and strategic analysis, then writes a concise VC-style investment memo with a human approval checkpoint.',
    color: '#f59e0b',
    agents: ['Researcher', 'Analyst', 'Writer', 'Critic'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 200, y: 60 }, data: { label: 'Due Diligence Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true, systemPrompt: 'You are a venture capital analyst doing due diligence. Research the company/sector for: business model, team, market size (TAM/SAM/SOM), revenue traction, funding history, and competitive landscape. Be factual and data-driven.' } } },
        { id: 'n2', type: 'agentNode', position: { x: 200, y: 220 }, data: { label: 'Financial Analyst', role: 'analyst', color: '#8b5cf6', icon: '📊', config: { systemPrompt: 'You are a financial analyst at a VC firm. Based on the due diligence research, analyze: growth metrics, unit economics, burn rate signals, valuation comparables, and risk factors. Provide a structured financial thesis.' } } },
        { id: 'n3', type: 'agentNode', position: { x: 200, y: 380 }, data: { label: 'Memo Writer', role: 'writer', color: '#10b981', icon: '✍️', config: { requiresApproval: true, systemPrompt: 'You are a VC partner writing an investment memo. Using the research and financial analysis, write a concise 1-page investment memo covering: Company Overview, Market Opportunity, Investment Thesis, Key Risks, and Recommendation (Invest/Pass/More DD).' } } },
        { id: 'n4', type: 'agentNode', position: { x: 200, y: 540 }, data: { label: 'Partner Review', role: 'critic', color: '#f59e0b', icon: '🔎', config: {} } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e3-4', source: 'n3', target: 'n4', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
  {
    id: 'social-campaign',
    icon: '📣',
    title: 'Social Media Campaign',
    description: 'Researches trends and audience, then generates a full social media content calendar with posts across multiple platforms — ready to schedule and publish.',
    color: '#ec4899',
    agents: ['Researcher', 'Analyst', 'Writer'],
    workflow_json: {
      nodes: [
        { id: 'n1', type: 'agentNode', position: { x: 200, y: 60 }, data: { label: 'Trend Researcher', role: 'researcher', color: '#3b82f6', icon: '🔍', config: { enableWebSearch: true, systemPrompt: 'You are a social media strategist. Research current trending topics, viral formats, and relevant hashtags for the given topic. Identify what content is performing well and why. Note audience demographics and peak engagement times.' } } },
        { id: 'n2', type: 'agentNode', position: { x: 200, y: 220 }, data: { label: 'Audience Analyst', role: 'analyst', color: '#8b5cf6', icon: '📊', config: { systemPrompt: 'You are an audience intelligence analyst. Based on the trend research, define the target audience persona, identify their pain points and desires, and outline the key messaging angles that will resonate most for this campaign.' } } },
        { id: 'n3', type: 'agentNode', position: { x: 200, y: 380 }, data: { label: 'Content Creator', role: 'writer', color: '#ec4899', icon: '✍️', config: { systemPrompt: 'You are a creative social media copywriter. Using the trend research and audience analysis, write a 7-day social media content calendar. For each day, provide: 1 LinkedIn post, 1 Twitter/X thread (3 tweets), and 1 Instagram caption with hashtags. Use engaging hooks and clear calls to action.' } } },
      ],
      edges: [
        { id: 'e1-2', source: 'n1', target: 'n2', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
        { id: 'e2-3', source: 'n2', target: 'n3', animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 }, markerEnd: { type: 'arrowclosed', color: '#7c3aed' } },
      ],
    },
  },
];

export default function Templates() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);
  const [search, setSearch] = useState('');

  const filtered = TEMPLATES.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.description.toLowerCase().includes(search.toLowerCase())
  );

  const useTemplate = async (template) => {
    setLoading(template.id);
    try {
      const res = await pipelineAPI.create({
        name: template.title,
        description: template.description,
      });
      const pipelineId = res.data.pipeline.id;
      await pipelineAPI.update(pipelineId, {
        workflowJson: template.workflow_json,
        status: 'ready',
      });
      navigate(`/pipeline/${pipelineId}`);
    } catch (err) {
      console.error('Failed to create pipeline from template:', err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="app-topbar">
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Pipeline Templates</h2>
        <input
          className="form-input"
          style={{ width: 280, padding: '7px 14px' }}
          placeholder="🔍 Search templates..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="app-content">
        <div style={{ marginBottom: 8 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            Start from a pre-built multi-agent pipeline. All templates are fully editable.
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state fade-in">
            <div className="empty-icon">🔍</div>
            <h3>No templates found</h3>
            <p>Try a different search term</p>
          </div>
        ) : (
          <div className="templates-grid fade-in">
            {filtered.map(template => (
              <div
                key={template.id}
                className="template-card"
                style={{ '--template-color': template.color }}
                onClick={() => useTemplate(template)}
              >
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: template.color, borderRadius: 'var(--radius) var(--radius) 0 0'
                }} />

                <div className="template-card-icon">{template.icon}</div>
                <div className="template-card-title">{template.title}</div>
                <div className="template-card-desc">{template.description}</div>

                <div className="template-agents">
                  {template.agents.map((a, i) => (
                    <span key={i} className="template-agent-chip">{a}</span>
                  ))}
                </div>

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={loading === template.id}
                    onClick={e => { e.stopPropagation(); useTemplate(template); }}
                  >
                    {loading === template.id ? 'Creating...' : '⚡ Use Template'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
