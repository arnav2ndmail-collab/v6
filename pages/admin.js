import { useState, useEffect } from 'react'
import Head from 'next/head'

const ADM_KEY = 'tz_adm_tok'

const COLORS = ['#6366f1','#4285f4','#f59e0b','#ef4444','#2dd4bf','#ec4899','#34a853','#f97316','#8b5cf6','#0ea5e9']

export default function AdminPage() {
  const [tok, setTok] = useState('')
  const [in_, setIn_] = useState(false)
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('tests')
  const [tests, setTests] = useState([])
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState({txt:'',ok:true})
  const [editTest, setEditTest] = useState(null)
  const [newFolder, setNewFolder] = useState('')
  const [uploadFolder, setUploadFolder] = useState('')
  const [selUser, setSelUser] = useState(null)
  const [userAtts, setUserAtts] = useState([])

  useEffect(() => {
    const t = localStorage.getItem(ADM_KEY)
    if (t) { setTok(t); setIn_(true); load(t) }
  }, [])

  const adm = async (action, body, t) => {
    const tk = t || tok
    const r = await fetch(`/api/admin/ops?action=${action}`, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tk },
      body: body ? JSON.stringify(body) : undefined
    })
    return r.json()
  }

  const load = async (t) => {
    setLoading(true)
    const [td, ud, sd] = await Promise.all([
      fetch('/api/admin/ops?action=list-tests', { headers: { Authorization: 'Bearer ' + (t||tok) } }).then(r=>r.json()),
      fetch('/api/admin/ops?action=list-users', { headers: { Authorization: 'Bearer ' + (t||tok) } }).then(r=>r.json()),
      fetch('/api/admin/ops?action=stats', { headers: { Authorization: 'Bearer ' + (t||tok) } }).then(r=>r.json()),
    ])
    if (Array.isArray(td)) setTests(td)
    if (Array.isArray(ud)) setUsers(ud)
    if (!sd.error) setStats(sd)
    setLoading(false)
  }

  const login = async () => {
    setErr('')
    const r = await fetch('/api/admin/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email,password:pass}) })
    const d = await r.json()
    if (d.error) { setErr(d.error); return }
    localStorage.setItem(ADM_KEY, d.token)
    setTok(d.token); setIn_(true); load(d.token)
  }

  const logout = () => { localStorage.removeItem(ADM_KEY); setIn_(false); setTok('') }

  const flash = (txt, ok=true) => { setMsg({txt,ok}); setTimeout(()=>setMsg({txt:'',ok:true}),3000) }

  const saveTest = async () => {
    if (!editTest) return
    const d = await adm('rename-test', editTest)
    if (d.ok) { flash('✅ Saved!'); setEditTest(null); load() }
    else flash('❌ '+d.error, false)
  }

  const delTest = async (p) => {
    alert('⚠️ Vercel filesystem is read-only.\n\nTo delete a test:\n1. Open your GitHub repo\n2. Delete the file: public/tests/' + p + '\n3. Commit & push → Vercel redeploys automatically')
  }

  const uploadJson = async (files) => {
    alert('⚠️ Vercel filesystem is read-only.\n\nTo add tests:\n1. Open your GitHub repo\n2. Add .json files to public/tests/ (or a subfolder like JEE-2026/)\n3. Commit & push → Vercel redeploys automatically\n\nYour test will appear in the library after redeploy.')
  }

  const createFolder = async () => {
    alert('⚠️ Vercel filesystem is read-only.\n\nTo create a folder:\n1. Open your GitHub repo\n2. Create a folder inside public/tests/ (e.g. public/tests/NEET-2025/)\n3. Add a .json file inside it\n4. Commit & push → Vercel redeploys automatically')
  }

  const loadUserAtts = async (u) => {
    setSelUser(u)
    const r = await fetch(`/api/admin/ops?action=user-attempts&username=${u}`, { headers:{ Authorization:'Bearer '+tok } })
    const d = await r.json()
    setUserAtts(Array.isArray(d)?d:[])
  }

  const delUser = async (u) => {
    if (!confirm(`Delete user "${u}" and ALL their data?`)) return
    const d = await adm('delete-user', { username: u })
    if (d.ok) { flash('✅ User deleted'); load() }
    else flash('❌ '+d.error, false)
  }

  const delAtt = async (uid, aid) => {
    const d = await adm('delete-attempt', { userId: uid, attemptId: aid })
    if (d.ok) { flash('✅ Deleted'); loadUserAtts(uid) }
  }

  // ── Login screen ────────────────────────────────────────────────────────
  if (!in_) return (
    <>
      <Head><title>TestZyro Admin</title><link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet"/></Head>
      <style>{`*{margin:0;padding:0;box-sizing:border-box}body{background:#07090f;color:#f1f5f9;font-family:'Outfit',sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh}.box{background:#141b2d;border:1px solid #1e2d45;border-radius:16px;padding:36px;width:360px;display:flex;flex-direction:column;gap:12px}.title{font-size:1.4rem;font-weight:800}.sub{font-size:.78rem;color:#64748b;margin-top:-6px}.f{width:100%;background:#111827;border:1.5px solid #243450;border-radius:8px;padding:10px 13px;color:#f1f5f9;font-family:'Outfit',sans-serif;font-size:.85rem;outline:none}.b{background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;border:none;padding:12px;border-radius:9px;font-family:'Outfit',sans-serif;font-weight:700;cursor:pointer;font-size:.9rem}.e{color:#f87171;font-size:.76rem;background:rgba(248,113,113,.07);border:1px solid rgba(248,113,113,.2);padding:8px 12px;border-radius:7px}`}</style>
      <div className="box">
        <div className="title">🔐 Admin Login</div>
        <div className="sub">TestZyro Control Panel</div>
        <input className="f" type="email" placeholder="Admin email" value={email} onChange={e=>setEmail(e.target.value)}/>
        <input className="f" type="password" placeholder="Password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()}/>
        {err && <div className="e">{err}</div>}
        <button className="b" onClick={login}>Sign In</button>
      </div>
    </>
  )

  const folders = [...new Set(tests.map(t => t.path.includes('/') ? t.path.split('/')[0] : '(root)'))]

  // ── Admin panel ──────────────────────────────────────────────────────────
  return (
    <>
      <Head><title>TestZyro Admin</title><link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/></Head>
      <style>{CSS}</style>
      <div className="adm-bg"/>

      <header className="adm-hdr">
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div className="adm-logo">TZ</div>
          <div>
            <div style={{fontWeight:800,fontSize:'1rem'}}>TestZyro <span style={{background:'var(--grad)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>Admin</span></div>
            <div style={{fontSize:'.65rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>
              {stats ? `${stats.tests} tests · ${stats.users} users · ${stats.attempts} attempts · DB: ${stats.dbStatus||'?'}` : 'Loading…'}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="abtn" onClick={()=>load()}>🔄 Refresh</button>
          <button className="abtn danger" onClick={logout}>Sign Out</button>
        </div>
      </header>

      {msg.txt && <div style={{position:'fixed',top:68,left:'50%',transform:'translateX(-50%)',background:msg.ok?'rgba(74,222,128,.1)':'rgba(248,113,113,.1)',border:`1px solid ${msg.ok?'rgba(74,222,128,.3)':'rgba(248,113,113,.3)'}`,color:msg.ok?'var(--green)':'var(--red)',padding:'9px 20px',borderRadius:9,fontWeight:600,fontSize:'.82rem',zIndex:999,whiteSpace:'nowrap'}}>{msg.txt}</div>}

      <div className="adm-wrap">
        <div className="adm-tabs">
          {[['tests','📋 Tests'],['upload','📤 Upload'],['users','👥 Users']].map(([t,l])=>(
            <button key={t} className={`atab${tab===t?' on':''}`} onClick={()=>setTab(t)}>{l}</button>
          ))}
        </div>

        {loading && <div style={{color:'var(--muted)',padding:'30px 0',textAlign:'center',animation:'pulse 1s infinite',fontFamily:'Space Mono,monospace',fontSize:'.8rem'}}>Loading…</div>}

        {/* ── TESTS ── */}
        {tab==='tests' && !loading && (
          <div>
            <div className="sec-title">📋 All Tests ({tests.length})</div>

            {/* Create folder row */}
            <div style={{display:'flex',gap:9,marginBottom:18,alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'.76rem',color:'var(--muted)'}}>New folder:</span>
              <input className="afield" style={{width:200}} placeholder="e.g. NEET-2025" value={newFolder} onChange={e=>setNewFolder(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createFolder()}/>
              <button className="abtn accent" onClick={createFolder}>+ Create</button>
            </div>

            {tests.length===0 && <div style={{color:'var(--muted)',padding:'20px 0',fontSize:'.84rem'}}>No tests found in public/tests/</div>}

            {/* Group by folder */}
            {folders.map(folder => {
              const folderTests = tests.filter(t => {
                const f = t.path.includes('/') ? t.path.split('/')[0] : '(root)'
                return f === folder
              })
              return (
                <div key={folder} style={{marginBottom:22}}>
                  <div style={{fontSize:'.7rem',fontFamily:'Space Mono,monospace',color:'var(--accent)',textTransform:'uppercase',letterSpacing:1.5,marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                    📁 {folder} <span style={{color:'var(--muted)'}}>({folderTests.length})</span>
                    <div style={{flex:1,height:1,background:'var(--border)'}}/>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {folderTests.map(t => (
                      <div key={t.path} className="test-row">
                        <div style={{width:6,borderRadius:'3px 0 0 3px',alignSelf:'stretch',background:t.accentColor||'var(--accent)',flexShrink:0}}/>
                        <div style={{flex:1,padding:'10px 14px',minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'.88rem',marginBottom:2}}>{t.title}</div>
                          <div style={{fontSize:'.66rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>
                            {t.path} &nbsp;·&nbsp; {t.questionCount} Qs &nbsp;·&nbsp; {t.subject} &nbsp;·&nbsp; +{t.mCor}/−{t.mNeg} &nbsp;·&nbsp; {t.dur}min &nbsp;·&nbsp; order:{t.order}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,padding:'10px 12px',flexShrink:0}}>
                          <button className="abtn" style={{fontSize:'.7rem'}} onClick={()=>setEditTest({...t})}>✏️ Edit</button>
                          <button className="abtn danger" style={{fontSize:'.7rem'}} onClick={()=>delTest(t.path)}>🗑️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── UPLOAD ── */}
        {tab==='upload' && !loading && (
          <div>
            <div className="sec-title">📤 Add Tests</div>
            <div style={{background:'rgba(56,189,248,.06)',border:'1px solid rgba(56,189,248,.2)',borderRadius:12,padding:'18px 20px',marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:'.88rem',color:'var(--blue)',marginBottom:10}}>ℹ️ Vercel filesystem is read-only — add tests via GitHub</div>
              <div style={{fontSize:'.82rem',color:'var(--m2)',lineHeight:2}}>
                <b style={{color:'var(--text)'}}>Step 1.</b> Go to your GitHub repo<br/>
                <b style={{color:'var(--text)'}}>Step 2.</b> Navigate to <code style={{background:'var(--s2)',padding:'1px 7px',borderRadius:4,fontFamily:'Space Mono,monospace',fontSize:'.72rem'}}>public/tests/</code> (or a subfolder like <code style={{background:'var(--s2)',padding:'1px 7px',borderRadius:4,fontFamily:'Space Mono,monospace',fontSize:'.72rem'}}>JEE-2026/</code>)<br/>
                <b style={{color:'var(--text)'}}>Step 3.</b> Click <b>Add file</b> then <b>Upload files</b> and drop your <code style={{background:'var(--s2)',padding:'1px 7px',borderRadius:4,fontFamily:'Space Mono,monospace',fontSize:'.72rem'}}>.json</code> test file<br/>
                <b style={{color:'var(--text)'}}>Step 4.</b> Commit changes → Vercel auto-redeploys → test appears in library ✅
              </div>
            </div>
            <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontWeight:700,fontSize:'.82rem',marginBottom:10}}>📁 Existing folders</div>
              <div style={{display:'flex',gap:7,flexWrap:'wrap'}}>
                {folders.map(f=>(
                  <span key={f} style={{background:'var(--s2)',border:'1px solid var(--b2)',padding:'4px 12px',borderRadius:7,fontSize:'.74rem',fontFamily:'Space Mono,monospace',color:'var(--m2)'}}>
                    {f==='(root)' ? '📁 root' : '📁 '+f}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── USERS ── */}
        {tab==='users' && !loading && (
          <div>
            <div className="sec-title">👥 All Users ({users.length})</div>
            {!stats?.dbStatus || stats.dbStatus==='not configured'
              ? <div style={{background:'rgba(251,146,60,.06)',border:'1px solid rgba(251,146,60,.2)',borderRadius:10,padding:'14px 18px',fontSize:'.8rem',color:'var(--orange)'}}>⚠️ Database not configured. Set up Upstash Redis to enable user accounts.</div>
              : users.length===0
                ? <div style={{color:'var(--muted)',padding:'20px 0',fontSize:'.84rem'}}>No users yet</div>
                : <div style={{display:'flex',flexDirection:'column',gap:7}}>
                  {users.map(u=>(
                    <div key={u.username} className="test-row">
                      <div style={{flex:1,padding:'10px 14px'}}>
                        <div style={{fontWeight:700,fontSize:'.86rem'}}>👤 {u.username}</div>
                        <div style={{fontSize:'.66rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</div>
                      </div>
                      <div style={{display:'flex',gap:6,padding:'10px 12px'}}>
                        <button className="abtn" style={{fontSize:'.7rem'}} onClick={()=>loadUserAtts(u.username)}>📊 Attempts</button>
                        <button className="abtn danger" style={{fontSize:'.7rem'}} onClick={()=>delUser(u.username)}>🗑️ Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}
      </div>

      {/* ── EDIT TEST MODAL ── */}
      {editTest && (
        <div className="modal-ov" onClick={()=>setEditTest(null)}>
          <div className="amodal" onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:800,fontSize:'1.05rem',marginBottom:16}}>✏️ Edit Test</div>
            <div className="afl">Title</div>
            <input className="afield" value={editTest.title} onChange={e=>setEditTest({...editTest,title:e.target.value})}/>
            <div className="afl">Subject</div>
            <select className="afield" value={editTest.subject} onChange={e=>setEditTest({...editTest,subject:e.target.value})}>
              {['JEE','NEET','GATE','UPSC','Board','Other'].map(s=><option key={s}>{s}</option>)}
            </select>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><div className="afl">Duration (min)</div><input className="afield" type="number" value={editTest.dur} onChange={e=>setEditTest({...editTest,dur:e.target.value})}/></div>
              <div><div className="afl">Sort Order</div><input className="afield" type="number" value={editTest.order} onChange={e=>setEditTest({...editTest,order:e.target.value})}/></div>
              <div><div className="afl">Marks Correct</div><input className="afield" type="number" value={editTest.mCor} onChange={e=>setEditTest({...editTest,mCor:e.target.value})}/></div>
              <div><div className="afl">Marks Wrong (−)</div><input className="afield" type="number" value={editTest.mNeg} onChange={e=>setEditTest({...editTest,mNeg:e.target.value})}/></div>
            </div>
            <div className="afl">Card Accent Color (hex)</div>
            <div style={{display:'flex',gap:7,marginBottom:4,flexWrap:'wrap'}}>
              {COLORS.map(c=><div key={c} onClick={()=>setEditTest({...editTest,accentColor:c})} style={{width:24,height:24,borderRadius:6,background:c,cursor:'pointer',outline:editTest.accentColor===c?'2px solid #fff':'none',outlineOffset:2}}/>)}
            </div>
            <input className="afield" placeholder="#6366f1" value={editTest.accentColor||''} onChange={e=>setEditTest({...editTest,accentColor:e.target.value})}/>
            <div style={{display:'flex',gap:8,marginTop:4}}>
              <button className="abtn accent" style={{flex:1}} onClick={saveTest}>💾 Save</button>
              <button className="abtn" onClick={()=>setEditTest(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── USER ATTEMPTS MODAL ── */}
      {selUser && (
        <div className="modal-ov" onClick={()=>setSelUser(null)}>
          <div className="amodal" style={{maxWidth:660}} onClick={e=>e.stopPropagation()}>
            <div style={{fontWeight:800,fontSize:'1.05rem',marginBottom:14}}>📊 {selUser}'s Attempts ({userAtts.length})</div>
            {userAtts.length===0 && <div style={{color:'var(--muted)',padding:'12px 0',fontSize:'.82rem'}}>No attempts yet</div>}
            {userAtts.map((a,i)=>(
              <div key={i} className="test-row" style={{marginBottom:7}}>
                <div style={{flex:1,padding:'8px 12px'}}>
                  <div style={{fontWeight:600,fontSize:'.82rem'}}>{a.testTitle}</div>
                  <div style={{fontSize:'.66rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>{new Date(a.savedAt).toLocaleString()} · Score: {a.score}/{a.maxScore} · ✓{a.correct} ✗{a.wrong} ⊘{a.skipped}</div>
                </div>
                <button className="abtn danger" style={{fontSize:'.68rem',margin:'8px 10px'}} onClick={()=>delAtt(a.userId,a.id)}>🗑️</button>
              </div>
            ))}
            <button className="abtn" style={{marginTop:10}} onClick={()=>setSelUser(null)}>Close</button>
          </div>
        </div>
      )}
    </>
  )
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
:root{--bg:#07090f;--s1:#0d1117;--s2:#111827;--card:#141b2d;--border:#1e2d45;--b2:#243450;--accent:#6366f1;--green:#4ade80;--red:#f87171;--gold:#fbbf24;--muted:#64748b;--m2:#94a3b8;--text:#f1f5f9;--grad:linear-gradient(135deg,#6366f1,#8b5cf6)}
body{background:var(--bg);color:var(--text);font-family:'Outfit',sans-serif;min-height:100vh}
.adm-bg{position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:56px 56px;opacity:.07;pointer-events:none;z-index:0}
.adm-hdr{position:sticky;top:0;z-index:50;padding:12px 26px;display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid var(--border);background:rgba(7,9,15,.94);backdrop-filter:blur(20px)}
.adm-logo{width:30px;height:30px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-weight:700;font-size:.78rem;color:#fff}
.adm-wrap{max-width:960px;margin:0 auto;padding:26px 18px 80px;position:relative;z-index:5}
.adm-tabs{display:flex;align-items:center;gap:6px;margin-bottom:22px;flex-wrap:wrap}
.atab{padding:8px 16px;border-radius:9px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.8rem;cursor:pointer;border:1px solid var(--b2);background:var(--card);color:var(--muted);transition:all .14s}
.atab.on{background:var(--grad);color:#fff;border-color:transparent}
.sec-title{font-size:.67rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:2px;margin-bottom:14px;display:flex;align-items:center;gap:10px;font-family:'Space Mono',monospace}
.sec-title::after{content:'';flex:1;height:1px;background:var(--border)}
.adm-card{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:18px 20px}
.test-row{background:var(--card);border:1px solid var(--border);border-radius:10px;display:flex;align-items:center;overflow:hidden;transition:border-color .14s}
.test-row:hover{border-color:var(--b2)}
.abtn{background:var(--card);border:1px solid var(--b2);color:var(--text);padding:7px 13px;border-radius:8px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.77rem;cursor:pointer;transition:all .14s}
.abtn:hover{border-color:var(--muted)}
.abtn.accent{background:var(--grad);color:#fff;border:none}
.abtn.danger{background:rgba(248,113,113,.07);border-color:rgba(248,113,113,.18);color:var(--red)}
.abtn.danger:hover{background:rgba(248,113,113,.15)}
.afield{width:100%;background:var(--s2);border:1.5px solid var(--b2);border-radius:8px;padding:9px 11px;color:var(--text);font-family:'Outfit',sans-serif;font-size:.83rem;outline:none;transition:border-color .2s;margin-bottom:10px}
.afield:focus{border-color:var(--accent)}
.afl{font-size:.64rem;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px}
.upload-zone{background:var(--s1);border:2px dashed var(--b2);border-radius:12px;padding:32px 22px;text-align:center;transition:all .2s}
.modal-ov{position:fixed;inset:0;background:rgba(7,9,15,.88);backdrop-filter:blur(8px);z-index:500;display:flex;align-items:center;justify-content:center;padding:20px}
.amodal{background:var(--card);border:1px solid var(--b2);border-radius:16px;padding:22px;width:100%;max-width:500px;max-height:88vh;overflow-y:auto}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
`
