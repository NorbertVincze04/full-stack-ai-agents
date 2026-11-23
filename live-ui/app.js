(() => {
  'use strict';

  const AGENTS = {
    'Orchestrator': { c: '#8b7cff', i: 'OR' },
    'Task Analyst': { c: '#4da3ff', i: 'TA' },
    'Implementer': { c: '#3ecf8e', i: 'IM' },
    'Tester': { c: '#f5b942', i: 'TE' },
    'Reviewer': { c: '#ef6fa8', i: 'RV' },
    'Release Manager': { c: '#2fc4d6', i: 'RM' },
    'Container Engineer': { c: '#26b5a0', i: 'CE' },
    'Pipeline Engineer': { c: '#f08a4b', i: 'PE' },
    'Discovery Analyst': { c: '#6f86ff', i: 'DA' },
    'You': { c: '#7c8cff', i: 'ME' },
  };

  // Skills per agent, from docs/workflow.md.
  const SKILLS = {
    'Orchestrator': ['start-task', 'clarify-task'],
    'Task Analyst': ['get-task', 'spec'],
    'Implementer': ['implement'],
    'Tester': ['tdd', 'test'],
    'Reviewer': ['review'],
    'Release Manager': ['create-pr', 'approve-pr'],
    'Container Engineer': ['containerize', 'container-runtime'],
    'Pipeline Engineer': ['ci-cd'],
    'Discovery Analyst': ['discover', 'discover-update'],
  };

  const WORKFLOW_TITLES = {
    'start-task': 'Standard task',
    'containerize': 'Containerization',
    'ci-cd': 'CI/CD pipelines',
  };

  const WORKFLOWS = {
    'start-task': [
      ['task', 'Task', 'Task Analyst', '/get-task'],
      ['spec', 'Spec', 'Task Analyst', '/spec'],
      ['approval', 'Approval gate', 'Orchestrator', '/clarify-task'],
      ['tdd-red', 'Tests first (red)', 'Tester', '/tdd red'],
      ['implement', 'Implement', 'Implementer', '/implement'],
      ['test', 'Tests (green + e2e)', 'Tester', '/test'],
      ['review', 'Review', 'Reviewer', '/review'],
      ['manual', 'Manual checks', 'Orchestrator', 'human'],
      ['pr', 'Pull request proposal', 'Release Manager', '/create-pr'],
      ['commit', 'Commit', 'Release Manager', '/approve-pr commit'],
      ['push', 'Push and PR', 'Release Manager', '/approve-pr push'],
      ['cleanup', 'Cleanup', 'Release Manager', '/approve-pr cleanup'],
    ],
    'containerize': [
      ['task', 'Task', 'Task Analyst', '/get-task'],
      ['spec', 'Spec', 'Task Analyst', '/spec'],
      ['approval', 'Approval gate', 'Orchestrator', '/clarify-task'],
      ['containerize', 'Containerize', 'Container Engineer', '/containerize'],
      ['review', 'Review containers', 'Reviewer', '/review containers'],
      ['pr', 'Pull request proposal', 'Release Manager', '/create-pr'],
      ['commit', 'Commit', 'Release Manager', '/approve-pr commit'],
      ['push', 'Push and PR', 'Release Manager', '/approve-pr push'],
    ],
    'ci-cd': [
      ['task', 'Task', 'Task Analyst', '/get-task'],
      ['spec', 'Spec', 'Task Analyst', '/spec'],
      ['approval', 'Approval gate', 'Orchestrator', '/clarify-task'],
      ['ci-cd', 'Write CI and CD', 'Pipeline Engineer', '/ci-cd'],
      ['review', 'Review workflows', 'Reviewer', '/review pipelines'],
      ['pr', 'Pull request proposal', 'Release Manager', '/create-pr'],
      ['commit', 'Commit', 'Release Manager', '/approve-pr commit'],
      ['push', 'Push and PR', 'Release Manager', '/approve-pr push'],
    ],
  };

  const STATUS_LABEL = {
    pending: 'Waiting', running: 'Running', 'waiting-human': 'Needs you',
    done: 'Done', failed: 'Failed', skipped: 'Skipped',
  };

  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const agentOf = (name) => AGENTS[name] || { c: '#8b96a8', i: (name || '?').slice(0, 2).toUpperCase() };
  const skillName = (cmd) => (cmd || '').trim().split(/\s+/)[0].replace(/^\//, '');
  const clock = (iso) => {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  const elapsed = (iso) => {
    const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    const p = (n) => String(n).padStart(2, '0');
    return `${p(Math.floor(s / 3600))}:${p(Math.floor(s / 60) % 60)}:${p(s % 60)}`;
  };

  let runs = {};            // workflow id -> run state
  let selected = null;      // workflow id chosen by the user (null = follow the active one)
  let lastRaw = '';
  let fileHandle = null;
  let demoTimer = null;
  let mode = 'http';        // http | file | demo

  try { selected = localStorage.getItem('agent-live-workflow'); } catch { /* storage blocked */ }
  if (!WORKFLOWS[selected]) selected = null;

  function setConn(text, cls) {
    const c = $('conn');
    c.textContent = text;
    c.className = 'pill ' + cls;
  }

  function avatar(name, small, live) {
    const a = agentOf(name);
    const n = el('span', 'avatar' + (small ? ' sm' : '') + (live ? ' live' : ''), a.i);
    n.style.setProperty('--c', a.c);
    n.title = name;
    return n;
  }

  function skillChips(agent, active) {
    const row = el('span', 'chips');
    (SKILLS[agent] || []).forEach((s) => {
      row.appendChild(el('span', 'chip' + (s === active ? ' on' : ''), s));
    });
    return row;
  }

  // Accepts { workflows: { id: run } } or a single run with a `workflow` field.
  function normalize(raw) {
    if (raw && raw.workflows && typeof raw.workflows === 'object') return raw.workflows;
    if (raw && raw.workflow) return { [raw.workflow]: raw };
    return {};
  }

  const isActive = (r) => r && (r.status === 'running' || r.status === 'waiting-human');

  function currentId() {
    if (selected) return selected;
    const active = Object.keys(WORKFLOWS).find((id) => isActive(runs[id]));
    if (active) return active;
    const known = Object.keys(WORKFLOWS).filter((id) => runs[id]);
    return known.length ? known[known.length - 1] : 'start-task';
  }

  function stageEntry(s, id) {
    const v = s.stages && s.stages[id];
    if (!v) return { status: s.current && s.current.stage === id ? 'running' : 'pending' };
    return typeof v === 'string' ? { status: v } : v;
  }

  function renderTabs(id) {
    const nav = $('tabs');
    nav.replaceChildren();
    const auto = el('button', 'tab' + (selected ? '' : ' on'), 'Follow active');
    auto.type = 'button';
    auto.title = 'Switch automatically to the workflow that is running';
    auto.addEventListener('click', () => pick(null));
    nav.appendChild(auto);
    Object.keys(WORKFLOWS).forEach((wf) => {
      const b = el('button', 'tab' + (selected === wf ? ' on' : ''));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(wf === id));
      const run = runs[wf];
      const dot = el('span', 'tdot ' + (isActive(run) ? run.status : run && run.status === 'done' ? 'done' : ''));
      b.append(dot, WORKFLOW_TITLES[wf]);
      if (!selected && wf === id) b.classList.add('shown');
      b.addEventListener('click', () => pick(wf));
      nav.appendChild(b);
    });
  }

  function pick(wf) {
    selected = wf;
    try { wf ? localStorage.setItem('agent-live-workflow', wf) : localStorage.removeItem('agent-live-workflow'); } catch { /* storage blocked */ }
    if (mode === 'demo') startDemo(); else render();
  }

  function renderNow(s) {
    const box = $('now');
    box.replaceChildren();
    box.className = 'now';
    box.style.removeProperty('--c');
    const cur = s && s.current;
    if (!s) {
      box.classList.add('idle');
      const b = el('div');
      b.append(el('div', 'label', 'Idle'), el('h2', '', 'Not started'));
      b.appendChild(el('p', 'note', 'Start this workflow in the Copilot chat and it shows up here.'));
      box.appendChild(b);
      return;
    }
    if (s.status === 'done' || (!cur && s.status !== 'failed')) {
      box.classList.add('done');
      const b = el('div');
      b.append(el('div', 'label', s.status === 'done' ? 'Finished' : 'Idle'),
        el('h2', '', s.status === 'done' ? 'All steps complete' : 'Not started'));
      if (s.summary) b.appendChild(el('p', 'note', s.summary));
      box.appendChild(b);
      return;
    }
    if (s.status === 'waiting-human') box.classList.add('waiting');
    if (s.status === 'failed') box.classList.add('failed');
    const agent = cur ? cur.agent : 'Orchestrator';
    box.style.setProperty('--c', agentOf(agent).c);
    box.appendChild(avatar(agent, false, s.status !== 'failed'));

    const body = el('div', 'grow');
    const label = s.status === 'waiting-human' ? 'Waiting for you in the chat'
      : s.status === 'failed' ? 'Stopped' : 'Running now';
    body.append(el('div', 'label', label), el('h2', '', agent));
    body.appendChild(skillChips(agent, skillName(cur && cur.skill)));
    if (cur && cur.skill) body.appendChild(el('div', 'skill', cur.skill));
    if (cur && cur.note) body.appendChild(el('p', 'note', cur.note));
    box.appendChild(body);

    if (cur && cur.since) {
      const meta = el('div', 'meta');
      const t = el('div', 'timer', elapsed(cur.since));
      t.id = 'timer';
      t.dataset.since = cur.since;
      meta.append(el('div', 'label', 'Elapsed'), t);
      box.appendChild(meta);
    }
  }

  function renderPipeline(wf, s) {
    const list = $('pipeline');
    list.replaceChildren();
    let done = 0;
    let counted = 0;
    WORKFLOWS[wf].forEach(([id, label, agent, skill], idx) => {
      const e = s ? stageEntry(s, id) : { status: 'pending' };
      if (e.status !== 'skipped') counted++;
      if (e.status === 'done') done++;
      const li = el('li', 'step ' + e.status);
      li.appendChild(el('span', 'dot', e.status === 'done' ? '\u2713' : e.status === 'failed' ? '!' : String(idx + 1)));
      const card = el('div', 'card');
      const stageAgent = (s && s.current && s.current.stage === id && s.current.agent) || agent;
      card.appendChild(avatar(stageAgent, true, e.status === 'running'));
      const txt = el('div', 'txt');
      const head = el('div', 'head');
      head.append(el('strong', '', label), el('span', 'badge', STATUS_LABEL[e.status] || e.status));
      const activeSkill = skillName((s && s.current && s.current.stage === id && s.current.skill) || skill);
      const sub = [stageAgent, skill].filter(Boolean).join('  ') + (e.round > 1 ? `  round ${e.round}` : '') + (e.note ? `  ${e.note}` : '');
      txt.append(head, el('span', 'sub', sub), skillChips(stageAgent, activeSkill));
      card.appendChild(txt);
      li.appendChild(card);
      list.appendChild(li);
    });
    $('bar').style.width = (counted ? Math.round((done / counted) * 100) : 0) + '%';
    $('progressText').textContent = `${done} of ${counted} steps done`;
  }

  function renderFeed(s) {
    const feed = $('feed');
    const nearBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight < 80;
    feed.replaceChildren();
    const events = (s && s.events) || [];
    if (!events.length) {
      const e = el('div', 'empty');
      e.append('No messages yet. The Orchestrator writes to ', el('code', '', 'live-ui/state.json'), '.');
      feed.appendChild(e);
      return;
    }
    events.forEach((ev) => {
      const me = ev.kind === 'answer';
      const who = me ? 'You' : ev.agent || 'Orchestrator';
      const m = el('div', 'msg' + (me ? ' me' : '') + (ev.kind === 'human' ? ' question' : '') +
        (ev.kind === 'fail' ? ' fail' : '') + (ev.kind === 'done' ? ' done' : ''));
      m.appendChild(avatar(who, true, false));
      const body = el('div', 'body');
      const head = el('div', 'who');
      head.append(el('b', '', who), el('span', '', clock(ev.time)));
      body.append(head, el('p', '', ev.text || ''));
      m.appendChild(body);
      feed.appendChild(m);
    });
    if (nearBottom) feed.scrollTop = feed.scrollHeight;
  }

  function render() {
    const wf = currentId();
    const s = runs[wf] || null;
    const t = s && s.task;
    $('taskLine').textContent = t && (t.id || t.title)
      ? [t.id, t.title].filter(Boolean).join('  ')
      : WORKFLOW_TITLES[wf];
    renderTabs(wf);
    renderNow(s);
    renderPipeline(wf, s);
    renderFeed(s);
  }

  function apply(raw) {
    if (raw === lastRaw) return;
    let parsed;
    try { parsed = JSON.parse(raw); } catch { return; } // file may be mid-write; keep last view
    lastRaw = raw;
    runs = normalize(parsed);
    render();
  }

  async function poll() {
    if (mode === 'demo') return;
    try {
      if (mode === 'file' && fileHandle) {
        apply(await (await fileHandle.getFile()).text());
        setConn('Live (file)', 'pill-on');
      } else {
        const r = await fetch('state.json?t=' + Date.now(), { cache: 'no-store' });
        if (!r.ok) throw new Error(String(r.status));
        apply(await r.text());
        setConn('Live', 'pill-on');
      }
    } catch {
      setConn('Not connected', 'pill-off');
      if (location.protocol === 'file:' && window.showOpenFilePicker) $('btnConnect').hidden = false;
    }
  }

  async function connectFile() {
    try {
      [fileHandle] = await window.showOpenFilePicker({
        types: [{ description: 'state.json', accept: { 'application/json': ['.json'] } }],
      });
      mode = 'file';
      $('btnConnect').hidden = true;
      lastRaw = '';
      poll();
    } catch { /* picker cancelled */ }
  }

  // Demo: plays the selected workflow so the UI can be previewed without the agents.
  function startDemo() {
    clearInterval(demoTimer);
    mode = 'demo';
    setConn('Demo', 'pill-demo');
    $('btnDemo').textContent = 'Stop demo';
    const wf = selected || 'start-task';
    const defs = WORKFLOWS[wf];
    const run = { workflow: wf, task: { id: 'demo', title: WORKFLOW_TITLES[wf] }, status: 'running', stages: {}, events: [] };
    const now = () => new Date().toISOString();
    let i = -1;
    const step = () => {
      if (i >= 0) {
        const [id, , agent, skill] = defs[i];
        run.stages[id] = 'done';
        run.events.push({ time: now(), agent, kind: 'done', text: `${skill} finished.` });
        if (id === 'approval') run.events.push({ time: now(), kind: 'answer', text: 'Approved.' });
      }
      i++;
      if (i >= defs.length) {
        run.status = 'done'; run.current = null; run.summary = 'Demo finished.';
        clearInterval(demoTimer);
      } else {
        const [id, label, agent, skill] = defs[i];
        const human = id === 'approval';
        run.status = human ? 'waiting-human' : 'running';
        run.stages[id] = human ? 'waiting-human' : 'running';
        run.current = { stage: id, agent, skill, note: human ? 'Do you approve the spec and the risks?' : label, since: now() };
        run.events.push({ time: now(), agent, kind: human ? 'human' : 'start', text: human ? run.current.note : `${skill}: ${label}` });
      }
      runs = { [wf]: JSON.parse(JSON.stringify(run)) };
      render();
    };
    step();
    demoTimer = setInterval(step, 3000);
  }

  function stopDemo() {
    clearInterval(demoTimer);
    mode = fileHandle ? 'file' : 'http';
    lastRaw = '';
    runs = {};
    $('btnDemo').textContent = 'Demo';
    render();
    poll();
  }

  $('btnConnect').addEventListener('click', connectFile);
  $('btnDemo').addEventListener('click', () => (mode === 'demo' ? stopDemo() : startDemo()));

  setInterval(() => {
    const t = $('timer');
    if (t) t.textContent = elapsed(t.dataset.since);
  }, 1000);

  render();
  poll();
  setInterval(poll, 1000);
})();
