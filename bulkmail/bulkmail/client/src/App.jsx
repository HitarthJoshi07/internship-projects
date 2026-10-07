import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { api } from './api';

const emptyForm = { name: '', email: '', password: '' };
const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function decodeUser(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => decodeUser(localStorage.getItem('token') || ''));
  const [authMode, setAuthMode] = useState('login');
  const [auth, setAuth] = useState(emptyForm);
  const [authBusy, setAuthBusy] = useState(false);
  const [manualEmails, setManualEmails] = useState('');
  const [csvFile, setCsvFile] = useState(null);
  const [csvRecipients, setCsvRecipients] = useState([]);
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [toast, setToast] = useState(null);
  const fileInput = useRef(null);

  const notify = useCallback((message, type = 'info') => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 4500);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  }, []);

  const loadTemplates = useCallback(async () => {
    if (!token) return;
    setLoadingTemplates(true);
    try {
      setTemplates(await api.templates());
    } catch (error) {
      if (error.message.includes('token') || error.message.includes('authorization')) logout();
      else notify(error.message, 'error');
    } finally {
      setLoadingTemplates(false);
    }
  }, [logout, notify, token]);

  useEffect(() => {
    const expire = () => logout();
    window.addEventListener('auth-expired', expire);
    if (token) loadTemplates();
    return () => window.removeEventListener('auth-expired', expire);
  }, [loadTemplates, logout, token]);

  const recipients = useMemo(() => {
    const manual = manualEmails.split(/[\n,;]+/)
      .map(email => ({ email: email.trim(), name: '' }))
      .filter(item => validEmail.test(item.email));
    
      const all = [...manual, ...csvRecipients];
      const seen = new Set();
    
      return all.filter(item => {
      const key = item.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [csvRecipients, manualEmails]);

  const submitAuth = async event => {
    event.preventDefault();
    if (!auth.email || !auth.password || (authMode === 'register' && !auth.name)) {
      notify('Complete all required fields.', 'error');
      return;
    }
    setAuthBusy(true);
    try {
      const data = authMode === 'login'
        ? await api.login({ email: auth.email, password: auth.password })
        : await api.register(auth);
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(decodeUser(data.token));
      setAuth(emptyForm);
      notify(authMode === 'login' ? 'Welcome back.' : 'Account created.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleCsv = file => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.csv')) {
      notify('Choose a .csv file.', 'error');
      return;
    }
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: parsed => {
        const rows = parsed.data.map(row => ({
          email: String(row.email || row.Email || '').trim(),
          name: String(row.name || row.Name || '').trim(),
        })).filter(item => validEmail.test(item.email));
        setCsvFile(file);
        setCsvRecipients(rows);
        notify(`${rows.length} valid recipients imported.`, 'success');
      },
      error: error => notify(`CSV error: ${error.message}`, 'error'),
    });
  };

  const saveTemplate = async () => {
    if (!templateName.trim() || !subject.trim() || !html.trim()) {
      notify('Template name, subject, and body are required.', 'error');
      return;
    }
    try {
      const saved = await api.saveTemplate({ name: templateName.trim(), subject: subject.trim(), html });
      setTemplates(current => [saved, ...current]);
      setSelectedTemplate(saved._id);
      notify('Template saved.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const deleteTemplate = async () => {
    if (!selectedTemplate) return notify('Select a template first.', 'error');
    try {
      await api.deleteTemplate(selectedTemplate);
      setTemplates(current => current.filter(item => item._id !== selectedTemplate));
      setSelectedTemplate('');
      setTemplateName('');
      notify('Template deleted.', 'success');
    } catch (error) {
      notify(error.message, 'error');
    }
  };

  const sendMail = async event => {
    event.preventDefault();
    if (!subject.trim() || !html.trim()) return notify('Subject and HTML body are required.', 'error');
    if (!recipients.length) return notify('Add at least one valid recipient.', 'error');
    setSending(true);
    setResult(null);
    setProgress(15);
    const body = new FormData();
    body.append('subject', subject.trim());
    body.append('html', html);
    body.append('manualEmails', manualEmails);
    if (csvFile) body.append('csvfile', csvFile);
    try {
      setProgress(40);
      const data = await api.sendMail(body);
      setProgress(100);
      setResult(data);
      if (data.failed?.length) notify(`${data.sent.length} sent, ${data.failed.length} failed.`, 'error');
      else notify(`Delivered ${data.sent.length} email${data.sent.length === 1 ? '' : 's'}.`, 'success');
    } catch (error) {
      setProgress(0);
      notify(error.message, 'error');
    } finally {
      setSending(false);
    }
  };

  if (!token || !user) {
    return (
      <AuthScreen 
        mode={authMode} 
        setMode={setAuthMode} 
        values={auth} 
        setValues={setAuth} 
        busy={authBusy} 
        onSubmit={submitAuth} 
        toast={toast} 
      />
    );
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">✦</span>
          <span>BulkMail <i>Studio</i></span>
        </div>
        <div className="account">
          <span>Hi, {user.name || user.email}</span>
          <button className="ghost-button" onClick={logout}>Log out</button>
        </div>
      </header>
      <main className="workspace">
        <div className="page-heading">
          <div>
            <p className="eyebrow">CAMPAIGN WORKSPACE</p>
            <h1>Send thoughtful emails, at scale.</h1>
            <p className="muted">Build your message, review it, and deliver it to your audience.</p>
          </div>
          <div className="recipient-pill">● {recipients.length} recipients ready</div>
        </div>
        <form onSubmit={sendMail}>
          <section className="grid two-col">
            <Card number="01" title="Your audience" subtitle="Import contacts or add them manually.">
              <label className="label">Paste email addresses</label>
              <textarea 
                className="input textarea" 
                value={manualEmails} 
                onChange={event => setManualEmails(event.target.value)} 
                placeholder="alex@example.com&#10;sam@example.com" 
              />
              <div 
                className="dropzone" 
                onClick={() => fileInput.current?.click()} 
                onDragOver={event => event.preventDefault()} 
                onDrop={event => { event.preventDefault(); handleCsv(event.dataTransfer.files[0]); }}
              >
                <input 
                  ref={fileInput} 
                  type="file" 
                  accept=".csv,text/csv" 
                  hidden 
                  onChange={event => handleCsv(event.target.files[0])} 
                />
                <span className="drop-icon">↥</span>
                <strong>{csvFile ? csvFile.name : 'Drop a CSV here or browse'}</strong>
                <small>Columns: email, name (name is optional)</small>
              </div>
              {csvRecipients.length > 0 && <p className="success-note">✓ {csvRecipients.length} contacts loaded from CSV</p>}
            </Card>
            <Card number="02" title="Compose your message" subtitle="Personalize with {{name}} and {{email}}.">
              <label className="label">Saved template</label>
              <select 
                className="input" 
                value={selectedTemplate} 
                disabled={loadingTemplates} 
                onChange={event => {
                  const item = templates.find(template => template._id === event.target.value);
                  setSelectedTemplate(event.target.value);
                  if (item) { setTemplateName(item.name); setSubject(item.subject); setHtml(item.html); }
                }}
              >
                <option value="">{loadingTemplates ? 'Loading templates…' : 'Choose a saved template'}</option>
                {templates.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}
              </select>
              <label className="label">Template name</label>
              <input 
                className="input" 
                value={templateName} 
                onChange={event => setTemplateName(event.target.value)} 
                placeholder="Monthly update" 
              />
              <label className="label">Subject</label>
              <input 
                className="input" 
                value={subject} 
                onChange={event => setSubject(event.target.value)} 
                placeholder="Hello {{name}}, here is your update" 
              />
              <label className="label">HTML message</label>
              <textarea 
                className="input html-editor" 
                value={html} 
                onChange={event => setHtml(event.target.value)} 
                placeholder="<h2>Welcome {{name}}!</h2><p>Write your message here.</p>" 
              />
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={saveTemplate}>Save template</button>
                <button type="button" className="danger-button" onClick={deleteTemplate}>Delete</button>
              </div>
            </Card>
          </section>
          <section className="grid two-col lower-grid">
            <Card number="03" title="Preview" subtitle="See the message before it leaves your inbox.">
              <div className="email-preview">
                <div className="preview-head">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                  <span className="preview-label">Email preview</span>
                </div>
                <div className="preview-body">
                  <p className="preview-subject">{(subject || 'Your subject line').replaceAll('{{name}}', 'Taylor')}</p>
                  <div dangerouslySetInnerHTML={{ __html: (html || '<p>Your HTML message will appear here.</p>').replaceAll('{{name}}', 'Taylor').replaceAll('{{email}}', 'taylor@example.com') }} />
                </div>
              </div>
            </Card>
            <Card number="04" title="Ready to send?" subtitle="Your SMTP account will deliver this campaign.">
              <div className="send-summary">
                <div><span>Recipients</span><strong>{recipients.length}</strong></div>
                <div><span>Subject</span><strong>{subject || 'Not set'}</strong></div>
              </div>
              <button className="send-button" disabled={sending} type="submit">
                {sending ? `Sending… ${progress}%` : 'Send bulk email  →'}
              </button>
              {sending && <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>}
              <p className="send-note">Emails are sent individually so each recipient receives their personalized name.</p>
            </Card>
          </section>
        </form>
        {result && <Results result={result} />}
      </main>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  );
}

function Card({ number, title, subtitle, children }) { 
  return (
    <article className="card">
      <div className="card-heading">
        <span className="step-number">{number}</span>
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </article>
  ); 
}

function Results({ result }) { 
  return (
    <section className="card results">
      <div className="card-heading">
        <span className="step-number">✓</span>
        <div>
          <h2>Delivery report</h2>
          <p>{result.message}</p>
        </div>
      </div>
      <div className="result-counts">
        <strong className="sent">{result.sent?.length || 0}<small>sent</small></strong>
        <strong className="failed">{result.failed?.length || 0}<small>failed</small></strong>
      </div>
      {result.failed?.length > 0 && (
        <div className="failure-list">
          {result.failed.map(item => (
            <div key={item.email}>
              <span>{item.email}</span>
              <small>{item.error}</small>
            </div>
          ))}
        </div>
      )}
    </section>
  ); 
}

function AuthScreen({ mode, setMode, values, setValues, busy, onSubmit, toast }) { 
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand auth-brand">
          <span className="brand-mark">✦</span>
          <span>BulkMail <i>Studio</i></span>
        </div>
        <p className="eyebrow">{mode === 'login' ? 'WELCOME BACK' : 'GET STARTED'}</p>
        <h1>{mode === 'login' ? 'Sign in to your workspace' : 'Create your workspace'}</h1>
        <p className="muted">Simple, personal email delivery for your audience.</p>
        <form onSubmit={onSubmit}>
          {mode === 'register' && (
            <input 
              className="input" 
              value={values.name} 
              onChange={e => setValues(v => ({ ...v, name: e.target.value }))} 
              placeholder="Your name" 
            />
          )}
          <input 
            className="input" 
            type="email" 
            value={values.email} 
            onChange={e => setValues(v => ({ ...v, email: e.target.value }))} 
            placeholder="Email address" 
          />
          <input 
            className="input" 
            type="password" 
            value={values.password} 
            onChange={e => setValues(v => ({ ...v, password: e.target.value }))} 
            placeholder="Password" 
          />
          <button className="send-button" disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in  →' : 'Create account  →'}
          </button>
        </form>
        <button className="switch-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </button>
      </div>
      {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
    </div>
  ); 
}

export default App;