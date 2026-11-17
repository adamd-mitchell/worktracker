import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clipboard, Copy, Download, Plus, Trash2 } from 'lucide-react';

const KEY = 'workday-tracker-v1';
const today = () => new Date().toLocaleDateString('en-CA');
const shift = (date, amount) => {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return d.toLocaleDateString('en-CA');
};
const formatDate = (date, options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, options);

function loadEntries() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return Object.fromEntries(Object.entries(saved).map(([date, items]) => [
      date,
      (items || []).filter(item => item.done !== false).map(item => ({
        id: item.id || crypto.randomUUID(),
        title: item.title || item.text || ''
      })).filter(item => item.title)
    ]));
  } catch {
    return {};
  }
}

export default function App() {
  const [entries, setEntries] = useState(loadEntries);
  const [date, setDate] = useState(today());
  const [newItem, setNewItem] = useState('');
  const [period, setPeriod] = useState('7');
  const [unit, setUnit] = useState('days');
  const [reportOpen, setReportOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const save = next => {
    setEntries(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const items = entries[date] || [];
  const addItem = event => {
    event.preventDefault();
    const title = newItem.trim();
    if (!title) return;
    save({ ...entries, [date]: [...items, { id: crypto.randomUUID(), title }] });
    setNewItem('');
  };
  const removeItem = id => {
    const remaining = items.filter(item => item.id !== id);
    const next = { ...entries };
    if (remaining.length) next[date] = remaining;
    else delete next[date];
    save(next);
  };

  const days = Math.max(1, Math.min(365, Number(period) || 1)) * (unit === 'weeks' ? 7 : 1);
  const start = shift(today(), -(days - 1));
  const report = useMemo(() => Object.entries(entries)
    .filter(([day, list]) => day >= start && day <= today() && list.length)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({ day, items: list })), [entries, start]);
  const reportText = report.map(group =>
    `${formatDate(group.day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}\n${group.items.map(item => `• ${item.title}`).join('\n')}`
  ).join('\n\n');
  const reportMarkdown = `# Tasks completed\n\n${formatDate(start)} – ${formatDate(today())}\n\n${report.map(group =>
    `## ${formatDate(group.day)}\n\n${group.items.map(item => `- ${item.title.replace(/\r?\n/g, ' ')}`).join('\n')}`
  ).join('\n\n')}\n`;

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(reportText || 'No accomplishments recorded for this period.');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-log-${start}-to-${today()}.md`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return <main className="page">
    <header className="header">
      <div className="logo"><CalendarDays size={20}/></div>
      <div><div className="brand">Work Log</div><div className="tagline">A simple record of what you got done.</div></div>
    </header>

    <section className="panel">
      <div className="section-top">
        <div><div className="eyebrow">DAILY LOG</div><h1>What did you get done?</h1></div>
        <button className="text-button" onClick={() => setReportOpen(!reportOpen)}>
          <Clipboard size={16}/>{reportOpen ? 'Daily log' : 'View report'}
        </button>
      </div>

      {!reportOpen ? <>
        <div className="date-bar">
          <button className="arrow" aria-label="Previous day" onClick={() => setDate(shift(date, -1))}><ChevronLeft size={18}/></button>
          <div className="date-label"><strong>{formatDate(date)}</strong>{date === today() && <span>Today</span>}</div>
          <button className="arrow" aria-label="Next day" onClick={() => setDate(shift(date, 1))}><ChevronRight size={18}/></button>
          <input aria-label="Choose date" type="date" value={date} onChange={e => setDate(e.target.value)}/>
        </div>

        <form className="add-form" onSubmit={addItem}>
          <input value={newItem} onChange={e => setNewItem(e.target.value)} placeholder="What did you complete or deploy?" aria-label="Accomplishment"/>
          <button type="submit" disabled={!newItem.trim()}><Plus size={17}/> Add</button>
        </form>

        <div className="list-heading"><strong>Tasks completed</strong><span>{items.length}</span></div>
        {items.length ? <div className="items">
          {items.map(item => <div className="item" key={item.id}>
            <span className="bullet">✓</span><span className="item-title">{item.title}</span>
            <button className="delete" onClick={() => removeItem(item.id)} aria-label={`Delete ${item.title}`}><Trash2 size={16}/></button>
          </div>)}
        </div> : <div className="empty"><div className="empty-mark"><Clipboard size={22}/></div><strong>No tasks completed</strong><p>Add something you completed or deployed on this date.</p></div>}
      </> : <>
        <div className="report-controls">
          <div><strong>Show accomplishments from the last</strong><span>Choose a time period for your report.</span></div>
          <input type="number" min="1" max="365" value={period} onChange={e => setPeriod(e.target.value)} aria-label="Number of days or weeks"/>
          <select value={unit} onChange={e => setUnit(e.target.value)} aria-label="Period unit"><option value="days">days</option><option value="weeks">weeks</option></select>
        </div>
        <div className="report-meta">{report.reduce((n, group) => n + group.items.length, 0)} accomplishments · {formatDate(start, {month:'short',day:'numeric'})} – {formatDate(today(), {month:'short',day:'numeric',year:'numeric'})}</div>
        {report.length ? <div className="report-list">{report.map(group => <div className="report-group" key={group.day}>
          <h3>{formatDate(group.day)}</h3>
          {group.items.map(item => <div className="report-item" key={item.id}><span>✓</span>{item.title}</div>)}
        </div>)}</div> : <div className="empty"><div className="empty-mark"><Clipboard size={22}/></div><strong>No accomplishments in this period</strong><p>Try a longer time period or add entries to your daily log.</p></div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 18 }}>
          <button className="copy-button" style={{ flex: '1 1 auto', marginTop: 0 }} onClick={copyReport} disabled={!report.length}><Copy size={16}/>{copied ? 'Copied!' : 'Copy consolidated report'}</button>
          <button className="copy-button" style={{ flex: '1 1 auto', marginTop: 0 }} onClick={downloadReport} disabled={!report.length}><Download size={16}/>Download Markdown</button>
        </div>
      </>}
    </section>
    <footer>Saved in this browser only</footer>
  </main>;
}
