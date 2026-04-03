import { useState, useEffect, useRef, useCallback } from 'react'
import Head from 'next/head'

// ── Constants ────────────────────────────────────────────────────────────────
const COLORS = ['135deg,#6366f1,#8b5cf6','135deg,#4285f4,#34a853','135deg,#f59e0b,#ef4444','135deg,#2dd4bf,#4f86f7','135deg,#ec4899,#a78bfa','135deg,#34a853,#2dd4bf','135deg,#f97316,#eab308']
const pad = n => String(n).padStart(2,'0')
const fmt = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}:${pad(s%60)}`
const sleep = ms => new Promise(r => setTimeout(r,ms))
const TOKEN_KEY = 'tz_token_v2'
const SAVED_KEY = 'tz_saved_v2'
const GEMINI_KEY_STORE = 'tz_gemini_v2'

// ── API helpers ───────────────────────────────────────────────────────────────
const authFetch = async (url, opts = {}) => {
  const token = localStorage.getItem(TOKEN_KEY)
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opts.headers || {}) }
  })
  return res
}

export default function TestZyro() {
  // ── Nav ──
  const [page, setPage] = useState('library')

  // ── Auth ──
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [aUser, setAUser] = useState('')
  const [aPass, setAPass] = useState('')
  const [aErr, setAErr] = useState('')
  const [dbAvailable, setDbAvailable] = useState(true)

  // ── Library ──
  const [tree, setTree] = useState({ folders:{}, tests:[] })
  const [savedTests, setSavedTests] = useState([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [openFolders, setOpenFolders] = useState({})
  const [treeLoad, setTreeLoad] = useState(true)

  // ── Attempts ──
  const [attempts, setAttempts] = useState([])
  const [reviewAttempt, setReviewAttempt] = useState(null) // for reviewing a past attempt

  // ── CBT ──
  const [cbtOn, setCbtOn] = useState(false)
  const [Qs, setQs] = useState([])
  const [ans, setAns] = useState([])
  const [revealed, setRevealed] = useState([])
  const [cur, setCur] = useState(0)
  const [secs, setSecs] = useState(0)
  const [done, setDone] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  const [isPractice, setIsPractice] = useState(false)
  const [cfg, setCfg] = useState({})
  const [result, setResult] = useState(null)
  const [showDiagram, setShowDiagram] = useState(false)
  const timerRef = useRef(null)
  const startRef = useRef(null)
  const cbtAns = useRef([]) // keep ref in sync for submitCBT

  // ── Convert ──
  const [gemKey, setGemKey] = useState('')
  const [keyStatus, setKeyStatus] = useState({t:'hint',m:'Paste key → Click Check Key'})
  const [models, setModels] = useState([])
  const [selModel, setSelModel] = useState('')
  const [pdfFile, setPdfFile] = useState(null)
  const [pdfPageCount, setPdfPageCount] = useState(0)
  const [convMode, setConvMode] = useState('cbt')
  const [qFrom, setQFrom] = useState(1)
  const [qTo, setQTo] = useState(75)
  const [eTitle, setETitle] = useState('')
  const [eSubj, setESubj] = useState('JEE')
  const [eDur, setEDur] = useState(180)
  const [mCor, setMCor] = useState(4)
  const [mNeg, setMNeg] = useState(1)
  const [progPct, setProgPct] = useState(0)
  const [progLbl, setProgLbl] = useState('')
  const [progSt, setProgSt] = useState([0,0,0,0])
  const [genning, setGenning] = useState(false)
  const [convErr, setConvErr] = useState('')
  const [pendQ, setPendQ] = useState(null)
  const [pendCfg, setPendCfg] = useState(null)
  const [showSave, setShowSave] = useState(false)
  const [saveName, setSaveName] = useState('')

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const k = localStorage.getItem(GEMINI_KEY_STORE)
    if (k) setGemKey(k)
    setSavedTests(JSON.parse(localStorage.getItem(SAVED_KEY)||'[]'))
    loadTree()
    // Check auth
    const token = localStorage.getItem(TOKEN_KEY)
    if (token) {
      authFetch('/api/auth?action=me').then(async r => {
        if (r.ok) {
          const d = await r.json()
          setUser(d)
          loadAttempts()
        } else {
          localStorage.removeItem(TOKEN_KEY)
        }
        setAuthLoading(false)
      }).catch(() => setAuthLoading(false))
    } else {
      setAuthLoading(false)
    }
  }, [])

  const loadTree = async () => {
    setTreeLoad(true)
    try {
      const r = await fetch('/api/tests')
      const d = await r.json()
      setTree(d)
      const keys = Object.keys(d.folders||{})
      if (keys.length) setOpenFolders({ [keys[0]]: true })
    } catch(e) {}
    setTreeLoad(false)
  }

  const loadAttempts = async () => {
    const r = await authFetch('/api/attempts')
    if (r.ok) {
      const d = await r.json()
      setAttempts(Array.isArray(d) ? d : [])
    } else {
      const d = await r.json().catch(()=>({}))
      if (d.setup || r.status === 503) setDbAvailable(false)
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const doAuth = async () => {
    setAErr('')
    const res = await fetch('/api/auth?action=' + authMode, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: aUser.trim(), password: aPass })
    })
    const d = await res.json()
    if (d.error) { setAErr(d.error); return }
    if (!res.ok) { setAErr(d.error || 'Error'); return }
    localStorage.setItem(TOKEN_KEY, d.token)
    setUser(d.user)
    setShowAuth(false)
    setAUser(''); setAPass('')
    loadAttempts()
  }

  const doLogout = async () => {
    await authFetch('/api/auth?action=logout', { method: 'POST' })
    localStorage.removeItem(TOKEN_KEY)
    setUser(null); setAttempts([])
  }

  // ── Start test ────────────────────────────────────────────────────────────
  const startFromTree = async (testPath, mode) => {
    try {
      const r = await fetch(`/api/test/${testPath}`)
      const d = await r.json()
      if (!d.questions) throw new Error('bad file')
      doLaunch(d.questions, {
        title: d.title, dur: d.dur||180, mCor: d.mCor||4, mNeg: d.mNeg||1,
        id: d.id||testPath, subject: d.subject,
        pdfPath: testPath,
        pageImages: d.pageImages || null  // for pageRef-based image display
      }, mode)
    } catch(e) { alert('Failed: '+e.message) }
  }

  const startFromSaved = (t, mode) => {
    doLaunch(t.questions, { title:t.title, dur:t.dur||180, mCor:t.mCor||4, mNeg:t.mNeg||1, id:t.id, subject:t.subject }, mode)
  }

  const doLaunch = (qs, c, mode) => {
    const blankAns = new Array(qs.length).fill(null)
    setQs(qs); setCfg(c); setIsPractice(mode==='practice')
    setAns(blankAns); cbtAns.current = blankAns
    setRevealed(new Array(qs.length).fill(false))
    setCur(0); setDone(false); setReviewing(false); setResult(null)
    setSecs(c.dur*60)
    setShowDiagram(false)
    setCbtOn(true)
    startRef.current = Date.now()
    clearInterval(timerRef.current)
  }

  useEffect(() => {
    if (!cbtOn || isPractice || done) { clearInterval(timerRef.current); return }
    timerRef.current = setInterval(() => setSecs(s => {
      if (s <= 1) { clearInterval(timerRef.current); doSubmit(true); return 0 }
      return s - 1
    }), 1000)
    return () => clearInterval(timerRef.current)
  }, [cbtOn, isPractice, done])

  const exitCBT = () => {
    if (!confirm('Exit? Progress lost.')) return
    clearInterval(timerRef.current)
    setCbtOn(false); setResult(null)
  }

  // Keep ref in sync with state
  const setAnswer = useCallback((val) => {
    setAns(prev => {
      const a = [...prev]; a[cur] = val
      cbtAns.current = a
      return a
    })
  }, [cur])

  const skipQ = () => { setAnswer('skip'); if(cur<Qs.length-1) setCur(c=>c+1) }
  const clearQ = () => setAnswer(null)
  const revealAns = () => setRevealed(prev => { const r=[...prev]; r[cur]=true; return r })

  const doSubmit = useCallback((auto=false) => {
    if (!auto && !confirm('Submit test?')) return
    clearInterval(timerRef.current)
    const finalAns = cbtAns.current
    const elapsed = Math.round((Date.now() - startRef.current)/1000)
    let cor=0,wrg=0,skp=0,un=0
    finalAns.forEach((a,i) => {
      const ak = (Qs[i]?.ans||'').toString().trim()
      if (!a) { un++; return }
      if (a==='skip') { skp++; return }
      const parts = ak.split(/\s+or\s+/i).map(s=>s.trim().toUpperCase())
      if (parts.includes(a.toString().toUpperCase().trim())) cor++; else wrg++
    })
    const score = cor*(cfg.mCor||4) - wrg*(cfg.mNeg||1)
    const max = Qs.length*(cfg.mCor||4)
    const res = { cor,wrg,skp,un,score,max,elapsed,pct:Math.round(cor/Qs.length*100), answers:finalAns }
    setResult(res)
    setDone(true)
    // Save attempt with full question+answer data for review
    if (user) {
      const attemptData = {
        testId: cfg.id, testTitle: cfg.title, subject: cfg.subject||'Other',
        score, maxScore: max, correct: cor, wrong: wrg, skipped: skp, unattempted: un,
        duration: elapsed, date: new Date().toISOString(),
        questions: Qs.map(q => ({ type:q.type, text:q.text, opts:q.opts, ans:q.ans, hasImage:q.hasImage, pageRef:q.pageRef, images:q.images })),
        answers: finalAns,
        pageImages: cfg.pageImages || null  // store for review
      }
      authFetch('/api/attempts', { method:'POST', body: JSON.stringify(attemptData) })
        .then(() => loadAttempts())
    }
  }, [Qs, cfg, user])

  const deleteAttempt = async (id) => {
    if (!confirm('Delete this result?')) return
    await authFetch('/api/attempts', { method:'DELETE', body: JSON.stringify({ id }) })
    loadAttempts()
  }

  // ── PDF.js ────────────────────────────────────────────────────────────────
  const loadPdfJs = async () => {
    if (window.pdfjsLib) return
    await new Promise((res,rej) => {
      const s = document.createElement('script')
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
      s.onload=res; s.onerror=()=>rej(new Error('PDF.js load failed'))
      document.head.appendChild(s)
    })
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
  }

  // Crop a question image from page: renders the page and tries to extract a tight region
  const cropQuestionImage = async (pageCanvas, qIndex, totalOnPage) => {
    // Divide page into sections per question, take a reasonable crop
    const { width, height } = pageCanvas
    const tempCanvas = document.createElement('canvas')
    // Take a section of the page (each question roughly 1/totalOnPage of the page height)
    const secH = Math.floor(height / Math.max(totalOnPage, 3))
    const startY = Math.min(qIndex * secH, height - secH)
    tempCanvas.width = width
    tempCanvas.height = Math.min(secH + 20, height - startY)
    const ctx = tempCanvas.getContext('2d')
    ctx.drawImage(pageCanvas, 0, startY, width, tempCanvas.height, 0, 0, width, tempCanvas.height)
    return tempCanvas.toDataURL('image/jpeg', 0.82).split(',')[1]
  }

  // ── API Key ───────────────────────────────────────────────────────────────
  const checkKey = async () => {
    if (!gemKey.startsWith('AIza')) { setKeyStatus({t:'bad',m:'✗ Key should start with AIza…'}); return }
    setKeyStatus({t:'hint',m:'Checking…'})
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${gemKey}&pageSize=50`)
      const d = await r.json()
      if (!r.ok) throw new Error(d?.error?.message||'Error '+r.status)
      const all = (d.models||[]).filter(m => m.supportedGenerationMethods?.includes('generateContent') && m.name.includes('gemini') && !m.name.includes('embedding'))
        .sort((a,b) => { const r=n=>n.includes('flash-8b')?0:n.includes('flash')?1:n.includes('lite')?2:3; return r(a.name)-r(b.name) })
      if (!all.length) throw new Error('No usable models')
      setModels(all)
      setSelModel(all[0].name.replace('models/',''))
      setKeyStatus({t:'ok',m:`✓ ${all.length} models · ${all[0].name.replace('models/','')} selected`})
      localStorage.setItem(GEMINI_KEY_STORE, gemKey)
    } catch(e) { setKeyStatus({t:'bad',m:'✗ '+e.message}) }
  }

  // ── Generate ──────────────────────────────────────────────────────────────
  const pStep = async (i, pct, lbl) => {
    setProgSt(prev => { const s=[...prev]; s.forEach((_,j)=>{ if(s[j]===1)s[j]=2 }); s[i]=1; return s })
    setProgPct(pct); setProgLbl(lbl)
    await sleep(i===1?50:200)
  }

  const generate = async () => {
    if (!pdfFile) { setConvErr('Select a PDF first.'); return }
    if (!gemKey.startsWith('AIza')) { setConvErr('Enter and verify your Gemini API key.'); return }
    if (!selModel) { setConvErr('Click Check Key first.'); return }
    setGenning(true); setConvErr(''); setShowSave(false)
    setProgSt([0,0,0,0])
    try {
      await pStep(0, 8, 'Rendering PDF pages…')
      await loadPdfJs()
      const ab = await pdfFile.arrayBuffer()
      const pdf = await window.pdfjsLib.getDocument({data:ab}).promise
      // Render all pages
      const pageCanvases = []
      const pageImgB64 = [] // for API calls
      for (let p=1; p<=pdf.numPages; p++) {
        const page = await pdf.getPage(p)
        const vp = page.getViewport({scale:2.2})
        const canvas = document.createElement('canvas')
        canvas.width=vp.width; canvas.height=vp.height
        await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise
        pageCanvases.push(canvas)
        pageImgB64.push(canvas.toDataURL('image/jpeg',0.85).split(',')[1])
      }

      const qToVal = qTo >= 9999 ? 9999 : qTo
      let allQs = []
      // Track how many Qs found per page for crop estimation
      const pageQCounts = {}
      for (let b=0; b<pageImgB64.length; b++) {
        const pct = Math.round(10+(b/pageImgB64.length)*78)
        await pStep(1, pct, `Page ${b+1}/${pageImgB64.length} — ${allQs.length} Qs found…`)
        const bQs = await callBatch(pageImgB64[b], gemKey, b+1, qFrom, qToVal)
        pageQCounts[b] = bQs.length
        allQs = allQs.concat(bQs.map(q => ({ ...q, _page: b })))
        if (qToVal<9999 && allQs.filter(q=>q._qnum>=qFrom&&q._qnum<=qToVal).length >= (qToVal-qFrom+1)) break
        if (b < pageImgB64.length-1) await sleep(700)
      }
      if (qToVal<9999) allQs = allQs.filter(q=>q._qnum===0||(q._qnum>=qFrom&&q._qnum<=qToVal))

      // For questions with images, crop a region from the page
      await pStep(2, 93, 'Cropping diagram images…')
      const finalQs = []
      for (let i=0; i<allQs.length; i++) {
        const q = allQs[i]
        const { _qnum, _page, ...rest } = q
        let finalQ = { ...rest, pageIdx: _page }
        if (q.hasImage && pageCanvases[_page]) {
          // Find question's position within its page
          const samePageQs = allQs.filter(x=>x._page===_page)
          const idxOnPage = samePageQs.findIndex(x=>x===q)
          try {
            const cropped = await cropQuestionImage(pageCanvases[_page], idxOnPage, samePageQs.length)
            finalQ.diagramImg = cropped // base64 JPEG crop
          } catch(e) {}
        }
        finalQs.push(finalQ)
      }

      if (!finalQs.length) throw new Error('No questions found. Check page/question range.')
      await pStep(3, 100, 'Done!')
      const c = { title:eTitle||pdfFile.name.replace(/\.pdf$/i,''), subject:eSubj, dur:eDur, mCor, mNeg }
      setPendQ(finalQs); setPendCfg(c); setSaveName(c.title); setShowSave(true)
    } catch(e) {
      let m = e.message||'Error'
      if (m.includes('403')||m.includes('API_KEY')) m='❌ Invalid API key. Get free at aistudio.google.com/apikey'
      else if (m.includes('429')||m.includes('RESOURCE')) m='⏱ Rate limit. Wait 60s then retry.'
      else if (m.includes('INVALID_ARGUMENT')) m='⚠️ Model does not support images. Select a gemini-1.5-flash model.'
      setConvErr(m)
    }
    setGenning(false)
  }

  const callBatch = async (imgB64, key, pageNum, qFrom, qTo) => {
    const note = qTo<9999 ? `Only extract questions numbered ${qFrom} to ${qTo}.` : 'Extract ALL questions on this page.'
    const prompt = `You are extracting exam questions from page ${pageNum}. ${note}

Return a JSON array. Each element:
- "qnum": integer question number (e.g. 1, 2, 3)
- "type": "MCQ" (has 4 options labeled (1)(2)(3)(4) or A B C D) or "INTEGER" (numeric answer)
- "text": COMPLETE question text word-for-word, include ALL values/units/formulas
- "opts": array of 4 full option strings (MCQ only, omit for INTEGER)
- "ans": "A","B","C","D" for MCQ; number string for INTEGER
- "hasImage": true ONLY if question text says "as shown in figure", "see figure", "shown below", "given figure", or has a visible diagram/circuit/graph

RULES: Never shorten question text. Full options always. Skip headers/instructions/page numbers. Return [] if no questions. ONLY JSON array, no other text.`
    const parts = [{ inline_data:{ mime_type:'image/jpeg', data:imgB64 } }, { text:prompt }]
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selModel}:generateContent?key=${key}`,{
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ contents:[{parts}], generationConfig:{temperature:0.05,maxOutputTokens:4096} })
    })
    if (!res.ok) { const e=await res.json().catch(()=>({})); throw new Error(e.error?.message||`HTTP ${res.status}`) }
    const data = await res.json()
    if (!data.candidates?.[0]) return []
    let raw = (data.candidates[0].content?.parts?.[0]?.text||'').trim()
    raw = raw.replace(/^```json\s*/i,'').replace(/^```\s*/,'').replace(/\s*```$/,'').trim()
    const s = raw.indexOf('['); if (s===-1) return []
    let parsed = null
    const e2 = raw.lastIndexOf(']')
    if (e2>s) { try { parsed=JSON.parse(raw.slice(s,e2+1)) } catch(ex) { parsed=null } }
    if (!parsed) {
      const chunk = raw.slice(s)
      for (const sep of ['},{','  },\n  {','},\n{']) {
        const cut = chunk.lastIndexOf(sep)
        if (cut>2) { try { parsed=JSON.parse(chunk.slice(0,cut+1)+']'); break } catch(ex){} }
      }
    }
    if (!Array.isArray(parsed)) return []
    return parsed.filter(q=>(q.text||'').trim().length>10&&!/^\d+\.?\s*$/.test((q.text||'').trim()))
      .map(q=>({
        _qnum: parseInt(q.qnum)||0,
        type: (q.type||'MCQ').toUpperCase().includes('INT')?'INTEGER':'MCQ',
        text: (q.text||'').trim(),
        opts: (()=>{ if(!Array.isArray(q.opts)) return ['Option A','Option B','Option C','Option D']; const c=q.opts.slice(0,4).map(o=>String(o||'').trim()); return c.every(o=>/^\d+$/.test(o))?['Option A','Option B','Option C','Option D']:c.map(o=>o||'—') })(),
        ans: (q.ans||'').toString().trim(),
        hasImage: !!q.hasImage
      }))
  }

  const saveToLib = () => {
    if (!pendQ||!pendCfg) return
    const entry = { id:'sv_'+Date.now(), title:saveName||pendCfg.title, subject:pendCfg.subject||'Other', questions:pendQ, dur:pendCfg.dur, mCor:pendCfg.mCor, mNeg:pendCfg.mNeg, savedAt:Date.now() }
    const list = [entry, ...savedTests]
    setSavedTests(list)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list.map(t => ({ ...t, questions: t.questions.map(q => { const { diagramImg, ...rest } = q; return rest }) })))) } catch(e) {} // save without large imgs to localStorage
    setShowSave(false)
    doLaunch(pendQ, {...pendCfg,title:saveName}, convMode)
  }

  const launchDirect = () => { setShowSave(false); doLaunch(pendQ, pendCfg, convMode) }

  // ── JSON Upload ───────────────────────────────────────────────────────────
  const onJsonFiles = async (files) => {
    let ok=0, fail=0
    const current = [...savedTests]
    for (const f of files) {
      try {
        const d = JSON.parse(await f.text())
        if (!Array.isArray(d.questions)) throw new Error('no questions')
        const entry = { id:d.id||'json_'+Date.now()+'_'+ok, title:d.title||f.name.replace('.json',''), subject:d.subject||'Other', source:d.source||'', questions:d.questions, dur:d.dur||180, mCor:d.mCor||4, mNeg:d.mNeg||1, savedAt:Date.now() }
        current.unshift(entry); ok++
      } catch { fail++ }
    }
    setSavedTests(current)
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(current)) } catch(e) {}
    alert(`✅ Loaded ${ok} test(s)${fail?`, ${fail} failed`:''}`)
    setPage('library')
  }

  // ── CBT derived ───────────────────────────────────────────────────────────
  const q = Qs[cur]
  const ua = ans[cur]
  const ak = (q?.ans||'').toUpperCase().trim()
  const isRev = revealed[cur]
  const stats = { a:ans.filter(x=>x&&x!=='skip').length, s:ans.filter(x=>x==='skip').length, r:ans.filter(x=>!x).length }

  const optCls = (lbl) => {
    const sel = ua===lbl
    if (reviewing) return lbl===ak?'opt cor':sel?'opt wrg':'opt'
    if (isPractice&&isRev) return lbl===ak?'opt sc':sel?'opt wrg':'opt'
    return sel?'opt sel':'opt'
  }

  // ── Filter ────────────────────────────────────────────────────────────────
  const filt = t => {
    const q2 = search.toLowerCase()
    return (!q2||t.title.toLowerCase().includes(q2))&&(filter==='all'||t.subject===filter)
  }
  const countAll = (tr) => {
    if (!tr) return 0
    let n = (tr.tests||[]).filter(filt).length
    Object.values(tr.folders||{}).forEach(f => n+=countAll(f))
    return n
  }
  const renderTree = (tr, depth=0, prefix='') => {
    if (!tr) return null
    return (
      <div style={{marginLeft:depth>0?18:0}}>
        {Object.entries(tr.folders||{}).map(([name,sub]) => {
          if (!countAll(sub)) return null
          const key=prefix+name, open=openFolders[key]
          const cnt=countAll(sub)
          return (
            <div key={key} style={{marginBottom:8}}>
              <div className="folder-row" onClick={()=>setOpenFolders(p=>({...p,[key]:!p[key]}))}>
                <span>{open?'📂':'📁'}</span>
                <span style={{fontWeight:700,fontSize:'.88rem',flex:1}}>{name}</span>
                <span className="folder-count">{cnt} test{cnt!==1?'s':''}</span>
                <span style={{color:'var(--muted)',fontSize:'.78rem'}}>{open?'▾':'▸'}</span>
              </div>
              {open&&<div style={{marginTop:8,paddingLeft:10,borderLeft:'2px solid var(--border)'}}>{renderTree(sub,depth+1,key+'/')}</div>}
            </div>
          )
        })}
        {(tr.tests||[]).filter(filt).length>0&&(
          <div className="test-grid" style={{marginTop:depth>0?10:0}}>
            {(tr.tests||[]).filter(filt).map((t,i)=>(
              <TestCard key={t.path||t.id} t={t} ci={i} badge="READY"
                onCBT={()=>startFromTree(t.path,'cbt')}
                onPrac={()=>startFromTree(t.path,'practice')}/>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── REVIEW a past attempt ─────────────────────────────────────────────────
  const ReviewModal = ({ attempt, onClose }) => {
    const [ri, setRi] = useState(0)
    if (!attempt?.questions) return null
    const rq = attempt.questions[ri]
    const ra = attempt.answers?.[ri]
    const rak = (rq?.ans||'').toUpperCase().trim()
    const rOptCls = (lbl) => {
      if (lbl===rak) return 'opt cor'
      if (ra===lbl && ra!==rak) return 'opt wrg'
      return 'opt'
    }
    return (
      <div style={{position:'fixed',inset:0,background:'rgba(7,9,15,.95)',zIndex:800,overflow:'auto',padding:'20px 0'}}>
        <div style={{maxWidth:760,margin:'0 auto',padding:'0 16px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <div>
              <div style={{fontWeight:800,fontSize:'1.1rem'}}>{attempt.testTitle}</div>
              <div style={{fontSize:'.7rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>{new Date(attempt.date).toLocaleString()} · Score {attempt.score}/{attempt.maxScore}</div>
            </div>
            <button className="exit-b" onClick={onClose}>✕ Close</button>
          </div>
          <div style={{display:'flex',gap:10,marginBottom:16}}>
            <span style={{fontSize:'.75rem',background:'rgba(74,222,128,.08)',color:'var(--green)',padding:'4px 10px',borderRadius:7,border:'1px solid rgba(74,222,128,.2)'}}>✓ {attempt.correct} correct</span>
            <span style={{fontSize:'.75rem',background:'rgba(248,113,113,.08)',color:'var(--red)',padding:'4px 10px',borderRadius:7,border:'1px solid rgba(248,113,113,.2)'}}>✗ {attempt.wrong} wrong</span>
            <span style={{fontSize:'.75rem',background:'rgba(251,191,36,.08)',color:'var(--gold)',padding:'4px 10px',borderRadius:7,border:'1px solid rgba(251,191,36,.2)'}}>⊘ {attempt.skipped} skipped</span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}}>
            {attempt.questions.map((_,i)=>{
              const a=attempt.answers?.[i]
              const ak2=(attempt.questions[i]?.ans||'').toUpperCase().trim()
              const parts=ak2.split(/\s+or\s+/i).map(s=>s.trim().toUpperCase())
              let cls='qdot'
              if(i===ri) cls+=' cur'
              else if(!a) {}
              else if(a==='skip') cls+=' skp'
              else if(parts.includes(a.toString().toUpperCase().trim())) cls+=' ans'
              else cls+=' wrg-dot'
              return <div key={i} className={cls} style={cls.includes('wrg-dot')?{background:'var(--red)',color:'#fff'}:{}} onClick={()=>setRi(i)}>{i+1}</div>
            })}
          </div>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:13,padding:20}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:12}}>
              <span className="qnum">Q {ri+1} / {attempt.questions.length}</span>
              <span className={`qbadge ${rq?.type==='INTEGER'?'int':'mcq'}`}>{rq?.type==='INTEGER'?'Integer':'MCQ'}</span>
            </div>
            {rq?.images && rq.images.length > 0
              ? <div style={{marginBottom:14}}>{rq.images.map((img,i)=><img key={i} src={`data:image/png;base64,${img}`} alt={`Q${ri+1}`} style={{width:'100%',display:'block',borderRadius:i===0?'8px 8px 0 0':'0',marginBottom:i<rq.images.length-1?2:0,border:'1px solid var(--border)'}}/>)}</div>
              : rq?.pageRef != null && attempt.pageImages?.[String(rq.pageRef)]
                ? <div style={{marginBottom:14}}><img src={`data:image/jpeg;base64,${attempt.pageImages[String(rq.pageRef)]}`} alt={`Q${ri+1}`} style={{width:'100%',display:'block',borderRadius:8,border:'1px solid var(--border)'}}/></div>
                : <div className="qtext" dangerouslySetInnerHTML={{__html:(rq?.text||'').replace(/\n/g,'<br/>')}}/> }
            {rq?.diagramImg && <div style={{marginBottom:14}}><img src={`data:image/jpeg;base64,${rq.diagramImg}`} alt="diagram" style={{width:'100%',borderRadius:8,border:'1px solid var(--border)'}}/></div>}
            {rq?.type==='MCQ'
              ? <div className="opts">{['A','B','C','D'].map((lbl,i)=>(
                  <div key={lbl} className={rOptCls(lbl)}>
                    <span className="olbl">{lbl}</span>
                    <span style={{fontSize:'.84rem',lineHeight:1.6}}>{rq.opts?.[i]||`Option ${lbl}`}</span>
                  </div>
                ))}</div>
              : <div style={{marginBottom:12}}>
                  <div style={{fontSize:'.7rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',marginBottom:5}}>Your answer: <b style={{color:ra&&ra!=='skip'?'var(--accent)':'var(--muted)'}}>{ra||'Not answered'}</b></div>
                  <div style={{fontSize:'.7rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>Correct: <b style={{color:'var(--green)'}}>{rq?.ans}</b></div>
                </div>
            }
            <div className="ans-b">✓ Correct Answer: <b style={{fontFamily:'Space Mono,monospace'}}>{rq?.ans||'?'}</b>{ra&&ra!=='skip'&&<span style={{marginLeft:10,color:([rq?.ans||''].join('').toUpperCase()===ra?.toUpperCase())?'var(--green)':'var(--red)'}}>{(['A','B','C','D','a','b','c','d'].includes(ra)||parseInt(ra)!==NaN)?`(Your answer: ${ra})`:''}  {([rq?.ans?.toUpperCase()].includes(ra?.toUpperCase()))?'✓ Correct':'✗ Wrong'}</span>}</div>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginTop:14}}>
            <button className="ca ca-n" onClick={()=>setRi(r=>Math.max(0,r-1))}>← Prev</button>
            <button className="ca ca-n" onClick={()=>setRi(r=>Math.min(attempt.questions.length-1,r+1))}>Next →</button>
          </div>
        </div>
      </div>
    )
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>TestZyro — CBT Platform</title>
        <meta name="description" content="JEE NEET CBT practice platform"/>
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>"/>
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      </Head>
      <style>{CSS}</style>
      <div className="grid-bg"/><div className="orb o1"/><div className="orb o2"/>

      {/* HEADER */}
      <header className="hdr">
        <div className="logo" onClick={()=>setPage('library')}>
          <div className="logo-mark">TZ</div>
          <div className="logo-txt">Test<span>Zyro</span></div>
        </div>
        <nav className="nav">
          {[['library','📚 Library'],['convert','⚡ PDF→CBT'],['upload-json','📤 JSON']].map(([p,l])=>(
            <button key={p} className={`nb${page===p?' active':''}`} onClick={()=>setPage(p)}>{l}</button>
          ))}
          <button className={`nb${page==='results'?' active':''}`} onClick={()=>{ if(!user){setShowAuth(true)}else setPage('results') }}>📊 Results</button>
        </nav>
        <div className="hdr-r">
          {!authLoading && (user
            ? <><div className="user-chip">👤 {user.username}</div><button className="btn-sm" onClick={doLogout}>Sign out</button></>
            : <button className="btn-accent" onClick={()=>setShowAuth(true)}>Sign In / Up</button>
          )}
        </div>
      </header>

      {/* AUTH MODAL */}
      {showAuth && (
        <div className="overlay" onClick={()=>setShowAuth(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-title">{authMode==='login'?'👋 Welcome Back':'🚀 Join TestZyro'}</div>
            <div className="modal-sub">{authMode==='login'?'Sign in to sync results across devices':'No email. Instant signup. Just username & password.'}</div>
            {!dbAvailable && <div style={{background:'rgba(251,146,60,.07)',border:'1px solid rgba(251,146,60,.2)',borderRadius:8,padding:'8px 11px',fontSize:'.72rem',color:'var(--orange)',marginBottom:8}}>⚠️ Database not set up yet. Add Upstash Redis env vars to enable accounts — see README.</div>}
            <input className="field" placeholder="Username" value={aUser} onChange={e=>setAUser(e.target.value)} autoFocus/>
            <input className="field" type="password" placeholder="Password" value={aPass} onChange={e=>setAPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&doAuth()}/>
            {aErr && <div style={{fontSize:'.76rem',color:'var(--red)',background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)',borderRadius:7,padding:'7px 11px'}}>{aErr}</div>}
            <button className="btn-grad w100" onClick={doAuth}>{authMode==='login'?'Sign In':'Create Account'}</button>
            <div style={{fontSize:'.76rem',color:'var(--muted)',textAlign:'center'}}>
              {authMode==='login'?<>No account? <span className="link" onClick={()=>{setAuthMode('signup');setAErr('')}}>Sign up</span></>:<>Have account? <span className="link" onClick={()=>{setAuthMode('login');setAErr('')}}>Sign in</span></>}
            </div>
          </div>
        </div>
      )}

      {/* ════ LIBRARY ════ */}
      {page==='library' && (
        <div className="wrap anim">
          <div className="page-top">
            <div><h2>📚 Test Library</h2><p>CBT or Practice mode · Pre-loaded + your saved tests</p></div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              <button className="btn-sm" onClick={loadTree}>🔄</button>
              <button className="btn-grad" onClick={()=>setPage('convert')}>+ Convert PDF</button>
            </div>
          </div>
          <div className="toolbar">
            <input className="search-inp" placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
            <div className="fbtns">{['all','JEE','NEET','GATE','Board','Other'].map(f=><button key={f} className={`fbtn${filter===f?' on':''}`} onClick={()=>setFilter(f)}>{f}</button>)}</div>
          </div>
          <SecTitle>📁 Pre-loaded Tests</SecTitle>
          {treeLoad ? <div className="loading-txt">Loading…</div> : renderTree(tree)}
          <SecTitle style={{marginTop:32}}>💾 Saved Tests</SecTitle>
          {savedTests.filter(filt).length===0
            ? <div className="empty-s"><span>📭</span><h3>No saved tests</h3><p>Convert a PDF or upload a JSON file to save tests here.</p></div>
            : <div className="test-grid">{savedTests.filter(filt).map((t,i)=><TestCard key={t.id} t={t} ci={i} badge="SAVED" onCBT={()=>startFromSaved(t,'cbt')} onPrac={()=>startFromSaved(t,'practice')} onDel={()=>{if(confirm('Delete?')){const l=savedTests.filter(x=>x.id!==t.id);setSavedTests(l);try{localStorage.setItem(SAVED_KEY,JSON.stringify(l))}catch(e){}}}}/>)}</div>
          }
        </div>
      )}

      {/* ════ CONVERT ════ */}
      {page==='convert' && (
        <div className="wrap anim narrow">
          <div className="page-hero"><h2>⚡ PDF → CBT</h2><p>AI extracts every question. Diagrams are auto-detected and shown in-exam.</p></div>
          {/* API KEY */}
          <div className="crd">
            <div className="crd-t">🔑 Gemini API Key <span className="chip-free">FREE · 1500/day</span></div>
            <div className="hint">Get free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a> — no card. <b>Key stays in your browser only. Never sent to our servers.</b></div>
            <div className="row gap8">
              <input className="field mono flex1" type="password" placeholder="AIzaSy…" value={gemKey} onChange={e=>setGemKey(e.target.value)}/>
              <button className="btn-sm blue" onClick={checkKey}>🔍 Check Key</button>
            </div>
            <div className={`ks ${keyStatus.t}`}>{keyStatus.m}</div>
            {models.length>0&&(
              <div style={{marginTop:11}}>
                <div style={{fontSize:'.66rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',marginBottom:6,display:'flex',justifyContent:'space-between'}}>SELECT MODEL <span style={{color:'var(--green)'}}>{models.length} available</span></div>
                {models.map(m=>{const id=m.name.replace('models/','');const free=id.includes('flash')||id.includes('lite');return(
                  <div key={id} className={`mi${selModel===id?' sel':''}`} onClick={()=>setSelModel(id)}>
                    <input type="radio" readOnly checked={selModel===id}/>
                    <div style={{flex:1}}><div className="mi-name">{id}</div><div className="mi-desc">{m.displayName||id}</div></div>
                    <span className={`mi-tag ${free?'free':'paid'}`}>{free?'✓ FREE':'paid?'}</span>
                  </div>
                )})}
              </div>
            )}
          </div>

          <DropZone onFile={async f=>{
            if(!f||f.type!=='application/pdf'){return}
            if(f.size>20*1024*1024){setConvErr('Max 20 MB');return}
            setPdfFile(f);setETitle(f.name.replace(/\.pdf$/i,''));setConvErr('');setShowSave(false)
            try{await loadPdfJs();const ab=await f.arrayBuffer();const pdf=await window.pdfjsLib.getDocument({data:ab}).promise;setPdfPageCount(pdf.numPages);setQTo(75)}catch(e){}
          }}>
            <div className="up-icon">📄</div>
            <div className="up-title">Drop question paper PDF here</div>
            <div className="up-sub">JEE · NEET · GATE · Any MCQ exam</div>
            <label htmlFor="pdf-inp" className="btn-grad" style={{cursor:'pointer',display:'inline-block',padding:'9px 24px'}}>Choose PDF</label>
            <input id="pdf-inp" type="file" accept=".pdf" style={{display:'none'}} onChange={e=>{const f2=e.target.files[0];if(!f2)return;if(f2.size>20*1024*1024){setConvErr('Max 20 MB');return}setPdfFile(f2);setETitle(f2.name.replace(/\.pdf$/i,''));setConvErr('');setShowSave(false);loadPdfJs().then(()=>f2.arrayBuffer().then(ab=>window.pdfjsLib.getDocument({data:ab}).promise.then(pdf=>{setPdfPageCount(pdf.numPages);setQTo(75)}).catch(()=>{})).catch(()=>{})).catch(()=>{})}}/>
            <div className="up-hint">PDF only · Max 20 MB · Diagrams auto-detected</div>
          </DropZone>

          {pdfFile&&(
            <div className="crd">
              <div className="crd-t">⚙️ Configure</div>
              <div className="fi-bar">
                <span style={{fontSize:'1.4rem'}}>📋</span>
                <div style={{flex:1}}><div style={{fontWeight:600,fontSize:'.86rem'}}>{pdfFile.name}</div><div style={{fontSize:'.67rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>{(pdfFile.size/1024).toFixed(1)} KB{pdfPageCount?` · ${pdfPageCount} pages`:''}</div></div>
              </div>
              <div className="sl">Mode</div>
              <div className="mode-row">
                {[['cbt','🎯','CBT Mode','Timed · Submit · Score'],['practice','📖','Practice Mode','No timer · See answers']].map(([m,ic,tl,ds])=>(
                  <div key={m} className={`mo${convMode===m?' on':''}`} onClick={()=>setConvMode(m)}>
                    <span className="mo-ic">{ic}</span><div className="mo-tl">{tl}</div><div className="mo-ds">{ds}</div>
                  </div>
                ))}
              </div>
              <div className="range-box">
                <div className="sl">📌 Question Range</div>
                <div className="row gap8" style={{flexWrap:'wrap',marginBottom:8}}>
                  <span className="rl">From Q</span>
                  <input className="ri" type="number" value={qFrom} min={1} onChange={e=>setQFrom(parseInt(e.target.value)||1)}/>
                  <span style={{color:'var(--muted)'}}>→</span>
                  <span className="rl">To Q</span>
                  <input className="ri" type="number" value={qTo} min={1} onChange={e=>setQTo(parseInt(e.target.value)||75)}/>
                  <span className="rh">{qTo>=9999?'All questions':`Q${qFrom}–Q${qTo} (${Math.max(0,qTo-qFrom+1)})`}</span>
                </div>
                <div className="presets">{[[1,25],[1,50],[1,75],[1,100],[26,50],[51,75],[1,9999]].map(([f,t])=><button key={`${f}-${t}`} className="preset" onClick={()=>{setQFrom(f);setQTo(t)}}>{t>=9999?'All':`Q${f}–${t}`}</button>)}</div>
              </div>
              <div className="sg-grid">
                <div className="sg"><label>Title</label><input className="field" value={eTitle} onChange={e=>setETitle(e.target.value)} placeholder="Exam name"/></div>
                <div className="sg"><label>Subject</label><select className="field" value={eSubj} onChange={e=>setESubj(e.target.value)}>{['JEE','NEET','GATE','UPSC','Board','Other'].map(s=><option key={s}>{s}</option>)}</select></div>
                <div className="sg"><label>Duration (min)</label><input className="field" type="number" value={eDur} min={5} onChange={e=>setEDur(parseInt(e.target.value)||180)}/></div>
                <div className="sg"><label>Marks Correct / Wrong</label><div className="row gap8"><input className="field flex1" type="number" value={mCor} min={1} onChange={e=>setMCor(parseInt(e.target.value)||4)}/><input className="field flex1" type="number" value={mNeg} min={0} onChange={e=>setMNeg(parseInt(e.target.value)||1)}/></div></div>
              </div>
            </div>
          )}
          {pdfFile&&<div style={{textAlign:'center',marginTop:14}}><button className="btn-grad big" disabled={genning} onClick={generate}>{genning?'⏳ Processing…':'⚡ Generate Test'}</button></div>}
          {genning&&(
            <div className="crd" style={{marginTop:14}}>
              <div className="row" style={{justifyContent:'space-between',fontSize:'.67rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',marginBottom:6}}><span>{progLbl}</span><span>{progPct}%</span></div>
              <div style={{background:'var(--s2)',borderRadius:99,height:6,overflow:'hidden',marginBottom:14}}><div style={{height:'100%',background:'var(--grad)',borderRadius:99,width:progPct+'%',transition:'width .5s ease'}}/></div>
              {['Rendering PDF pages','Extracting questions with AI','Cropping diagram images','Ready!'].map((l,i)=>(
                <div key={i} className={`ps${progSt[i]===1?' active':progSt[i]===2?' done':''}`}><span className="psd"/>{l}</div>
              ))}
            </div>
          )}
          {showSave&&!genning&&(
            <div className="save-prompt">
              <div className="sp-title">✅ {pendQ?.length} questions extracted!</div>
              <div className="sp-sub">Save to library for instant access — diagrams are embedded in the file.</div>
              <div className="row gap8" style={{flexWrap:'wrap'}}>
                <input className="field flex1" value={saveName} onChange={e=>setSaveName(e.target.value)} placeholder="Test name…"/>
                <button className="btn-green" onClick={saveToLib}>💾 Save & Launch</button>
                <button className="btn-ghost" onClick={launchDirect}>Launch only</button>
              </div>
            </div>
          )}
          {convErr&&<div className="err-box"><b>⚠️ Error</b><div style={{fontSize:'.82rem',color:'var(--m2)',marginTop:4,whiteSpace:'pre-wrap'}}>{convErr}</div></div>}
        </div>
      )}

      {/* ════ UPLOAD JSON ════ */}
      {page==='upload-json'&&(
        <div className="wrap anim narrow">
          <div className="page-hero"><h2>📤 Upload JSON Test</h2><p>Add pre-built .json files to your saved library instantly</p></div>
          <DropZone multi onFiles={onJsonFiles}>
            <div className="up-icon">📋</div>
            <div className="up-title">Drop .json test files here</div>
            <div className="up-sub">TestZyro format JSON files</div>
            <label htmlFor="json-inp" className="btn-grad" style={{cursor:'pointer',display:'inline-block',padding:'9px 24px'}}>Choose JSON File(s)</label>
            <input id="json-inp" type="file" accept=".json" multiple style={{display:'none'}} onChange={e=>e.target.files.length&&onJsonFiles(Array.from(e.target.files))}/>
          </DropZone>
          <div className="crd" style={{marginTop:18}}>
            <div className="crd-t">📄 JSON Format</div>
            <pre className="code-block">{`{\n  "title": "JEE Main 2026 Physics",\n  "subject": "JEE",\n  "dur": 180, "mCor": 4, "mNeg": 1,\n  "questions": [\n    { "type": "MCQ", "text": "...", "opts": ["A","B","C","D"], "ans": "B" },\n    { "type": "INTEGER", "text": "...", "ans": "42" }\n  ]\n}`}</pre>
          </div>
        </div>
      )}

      {/* ════ RESULTS ════ */}
      {page==='results'&&(
        <div className="wrap anim">
          {!user
            ? <div className="empty-s"><span>🔐</span><h3>Sign in to see results</h3><p>Create a free account — syncs across all your devices.</p><button className="btn-grad" style={{marginTop:14}} onClick={()=>setShowAuth(true)}>Sign In / Sign Up</button></div>
            : <>
              <div className="page-top"><div><h2>📊 My Results</h2><p>{attempts.length} attempt{attempts.length!==1?'s':''} · synced across devices</p></div></div>
              {attempts.length>0&&(
                <div className="stats-row">
                  {[['Total',attempts.length,'var(--accent)'],['Best Score',Math.max(...attempts.map(a=>a.score)),'var(--green)'],['Avg Accuracy',Math.round(attempts.reduce((s,a)=>s+(a.correct/((a.correct+a.wrong+a.skipped+a.unattempted)||1)),0)/attempts.length*100)+'%','var(--gold)'],['Tests',new Set(attempts.map(a=>a.testId)).size,'var(--purple)']].map(([l,v,c])=>(
                    <div key={l} className="stat-box"><div className="stat-n" style={{color:c}}>{v}</div><div className="stat-l">{l}</div></div>
                  ))}
                </div>
              )}
              {attempts.length===0
                ? <div className="empty-s"><span>📊</span><h3>No attempts yet</h3><p>Complete a CBT test to see results here.</p></div>
                : <div className="attempts-list">
                  {attempts.map((a,i)=>(
                    <div key={a.id||i} className="attempt-row" style={{animationDelay:`${i*.04}s`}}>
                      <div className="ar-left">
                        <div className="ar-title">{a.testTitle}</div>
                        <div className="ar-meta">{a.subject||'Exam'} · {new Date(a.date).toLocaleString()} · {Math.round(a.duration/60)}min</div>
                      </div>
                      <div className="ar-stats">
                        <span className="ar-s green">✓ {a.correct}</span>
                        <span className="ar-s red">✗ {a.wrong}</span>
                        <span className="ar-s gold">⊘ {a.skipped}</span>
                      </div>
                      <div className="ar-score" style={{color:a.score>=0?'var(--green)':'var(--red)'}}>{a.score}<span className="ar-max">/{a.maxScore}</span></div>
                      <div className="ar-pct" style={{color:a.correct/((a.correct+a.wrong)||1)>=.6?'var(--green)':'var(--gold)'}}>{Math.round(a.correct/((a.correct+a.wrong+a.skipped+a.unattempted)||1)*100)}%</div>
                      <div className="row gap6">
                        {a.questions&&<button className="btn-sm" style={{fontSize:'.7rem',padding:'5px 10px'}} onClick={()=>setReviewAttempt(a)}>📖 Review</button>}
                        <button className="btn-sm" style={{fontSize:'.7rem',padding:'5px 10px',color:'var(--red)',borderColor:'rgba(248,113,113,.2)'}} onClick={()=>deleteAttempt(a.id)}>🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </>
          }
        </div>
      )}

      {/* ════ CBT ════ */}
      {cbtOn&&!result&&(
        <div className="cbt-app">
          <div className="cbt-top">
            <div><div style={{fontWeight:700,fontSize:'.88rem'}}>{cfg.title}</div><div style={{fontSize:'.64rem',color:'var(--muted)',fontFamily:'Space Mono,monospace'}}>{Qs.length} Q · +{cfg.mCor}/−{cfg.mNeg}{isPractice?'':` · ${cfg.dur}min`}</div></div>
            <div className="row gap8">
              {isPractice&&<div className="prac-b">📖 PRACTICE</div>}
              {!isPractice&&<div className={`timer${secs<=300?' warn':''}`}>{fmt(secs)}</div>}
              <button className="exit-b" onClick={exitCBT}>✕ Exit</button>
            </div>
          </div>
          <div className="cbt-body">
            <div className="qpanel">
              <div className="row" style={{justifyContent:'space-between',marginBottom:12}}>
                <span className="qnum">Q {cur+1} / {Qs.length}</span>
                <div className="row gap7">
                  {q?.hasImage&&<button className="btn-sm" style={{fontSize:'.7rem',padding:'3px 9px'}} onClick={()=>setShowDiagram(v=>!v)}>{showDiagram?'📄 Hide':'🖼️ Diagram'}</button>}
                  <span className={`qbadge ${q?.type==='INTEGER'?'int':'mcq'}`}>{q?.type==='INTEGER'?'Integer':'MCQ'}</span>
                </div>
              </div>
              {/* Diagram image */}
              {showDiagram&&q?.hasImage&&(
                q?.diagramImg
                  ? <div className="diagram-box">
                      <div className="diagram-label">🖼️ Figure — Q{cur+1}</div>
                      <img src={`data:image/jpeg;base64,${q.diagramImg}`} alt="figure" style={{width:'100%',display:'block'}}/>
                    </div>
                  : <DiagramFromPDF qnum={cur+1} pageIdx={q.pageIdx} testPath={cfg.pdfPath||cfg.id} onClose={()=>setShowDiagram(false)}/>
              )}
              {/* IMAGE MODE: show question as image(s) */}
              {q?.images && q.images.length > 0 ? (
                <div style={{marginBottom:16}}>
                  {q.images.map((img, i) => (
                    <img key={i} src={`data:image/png;base64,${img}`} alt={`Q${cur+1}`}
                      style={{width:'100%',display:'block',borderRadius:i===0?'10px 10px 0 0':'0',marginBottom:i<q.images.length-1?2:0,border:'1px solid var(--border)'}}/>
                  ))}
                </div>
              ) : q?.pageRef != null && cfg.pageImages?.[String(q.pageRef)] ? (
                <div style={{marginBottom:16}}>
                  <img src={`data:image/jpeg;base64,${cfg.pageImages[String(q.pageRef)]}`} alt={`Q${cur+1}`}
                    style={{width:'100%',display:'block',borderRadius:10,border:'1px solid var(--border)'}}/>
                </div>
              ) : (
                <div className="qtext" dangerouslySetInnerHTML={{__html:(q?.text||'').replace(/\n/g,'<br/>')}}/>
              )}
              {q?.hasImage&&!showDiagram&&!(q?.images?.length)&&<div className="img-hint">🖼️ This question references a figure — click <b>Diagram</b> above to view it</div>}
              {q?.type==='MCQ'
                ?<div className="opts">{['A','B','C','D'].map((lbl,i)=>(
                  <div key={lbl} className={optCls(lbl)} onClick={()=>{if(!done&&!reviewing&&!(isPractice&&isRev))setAnswer(lbl)}}>
                    <span className="olbl">{lbl}</span>
                    <span style={{fontSize:'.84rem',lineHeight:1.65}}>{q.opts?.[i]||`Option ${lbl}`}</span>
                  </div>
                ))}</div>
                :<div style={{marginBottom:16}}>
                  <div style={{fontSize:'.67rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',marginBottom:5}}>Enter numeric answer:</div>
                  <input className="int-inp" type="text" inputMode="decimal" value={(ua&&ua!=='skip')?ua:''} disabled={done||reviewing||(isPractice&&isRev)} onChange={e=>setAnswer(e.target.value.trim()||null)} placeholder="Type answer…"/>
                </div>
              }
              {(reviewing||(isPractice&&isRev))&&<div className="ans-b">✓ Correct Answer: <b style={{fontFamily:'Space Mono,monospace'}}>{q?.ans||'?'}</b></div>}
              {!done&&!reviewing&&(
                <div className="row gap7" style={{flexWrap:'wrap',marginBottom:10}}>
                  <button className="ca ca-p" onClick={()=>setCur(c=>Math.min(Qs.length-1,c+1))}>Save & Next</button>
                  <button className="ca ca-s" onClick={skipQ}>Skip</button>
                  <button className="ca ca-c" onClick={clearQ}>Clear</button>
                  {isPractice&&<button className="ca ca-rev" onClick={revealAns}>💡 Answer</button>}
                  <button className="ca ca-sub" onClick={()=>doSubmit()}>Submit</button>
                </div>
              )}
              <div className="row" style={{justifyContent:'space-between',paddingTop:10,borderTop:'1px solid var(--border)'}}>
                <button className="ca ca-n" onClick={()=>{setCur(c=>Math.max(0,c-1));setShowDiagram(false)}}>← Prev</button>
                <button className="ca ca-n" onClick={()=>{setCur(c=>Math.min(Qs.length-1,c+1));setShowDiagram(false)}}>Next →</button>
              </div>
            </div>
            <div className="sb">
              <div className="sb-h">Navigator</div>
              <div className="sb-leg"><div className="leg"><div className="ldot a"/>Answered</div><div className="leg"><div className="ldot s"/>Skipped</div><div className="leg"><div className="ldot u"/>Untouched</div>{isPractice&&<div className="leg"><div className="ldot r"/>Revealed</div>}</div>
              <div className="qgrid">
                {Qs.map((_,i)=>{const a2=ans[i];let c='qdot';if(i===cur)c+=' cur';else if(revealed[i])c+=' rev';else if(a2&&a2!=='skip')c+=' ans';else if(a2==='skip')c+=' skp';return<div key={i} className={c} onClick={()=>{setCur(i);setShowDiagram(false)}}>{i+1}</div>})}
              </div>
              <div className="sb-stats"><div className="sbr"><span>Answered</span><span style={{color:'var(--green)',fontFamily:'Space Mono,monospace',fontWeight:700}}>{stats.a}</span></div><div className="sbr"><span>Skipped</span><span style={{color:'var(--gold)',fontFamily:'Space Mono,monospace',fontWeight:700}}>{stats.s}</span></div><div className="sbr"><span>Remaining</span><span style={{color:'var(--muted)',fontFamily:'Space Mono,monospace',fontWeight:700}}>{stats.r}</span></div></div>
            </div>
          </div>
        </div>
      )}

      {/* ════ RESULT ════ */}
      {result&&(
        <div className="overlay">
          <div className="result-box">
            <div className="res-head">
              <div className="res-trophy">{result.pct>=80?'🏆':result.pct>=60?'🎯':result.pct>=40?'📚':'💪'}</div>
              <div style={{fontSize:'1.25rem',fontWeight:800}}>Test Complete!</div>
              <div style={{fontSize:'.68rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',margin:'4px 0 12px'}}>{cfg.title}</div>
              <div style={{fontFamily:'Space Mono,monospace',fontSize:'3.2rem',fontWeight:700,color:result.score>=0?'var(--green)':'var(--red)'}}>{result.score}</div>
              <div style={{fontSize:'.76rem',color:'var(--muted)',marginBottom:3}}>out of {result.max} (+{cfg.mCor}/−{cfg.mNeg})</div>
              <div style={{fontSize:'.82rem',fontWeight:700,color:result.pct>=60?'var(--green)':'var(--gold)'}}>{result.pct}% accuracy</div>
            </div>
            <div className="res-grid">
              {[['✓',result.cor,'Correct','var(--green)'],['✗',result.wrg,'Wrong','var(--red)'],['⊘',result.skp,'Skipped','var(--gold)'],['—',result.un,'Unattempted','var(--muted)']].map(([ic,n,l,c])=>(
                <div key={l} style={{background:'var(--card)',padding:15,textAlign:'center'}}>
                  <div style={{fontFamily:'Space Mono,monospace',fontSize:'1.5rem',fontWeight:700,color:c,marginBottom:2}}>{n}</div>
                  <div style={{fontSize:'.6rem',color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.5px'}}>{ic} {l}</div>
                </div>
              ))}
            </div>
            <div className="row gap9" style={{padding:'16px 18px',justifyContent:'center',flexWrap:'wrap'}}>
              <button className="btn-sm" onClick={()=>{setReviewing(true);setResult(null);setCur(0)}}>📖 Review</button>
              <button className="btn-sm" onClick={()=>{setResult(null);setCbtOn(false);setPage('library')}}>📚 Library</button>
              {user&&<button className="btn-sm" onClick={()=>{setResult(null);setCbtOn(false);setPage('results')}}>📊 Results</button>}
              <button className="btn-grad" onClick={()=>{setResult(null);setCbtOn(false)}}>🔄 New</button>
            </div>
          </div>
        </div>
      )}

      {/* Past attempt review modal */}
      {reviewAttempt&&<ReviewModal attempt={reviewAttempt} onClose={()=>setReviewAttempt(null)}/>}
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SecTitle({children,style}) {
  return <div style={{fontSize:'.67rem',fontFamily:'Space Mono,monospace',color:'var(--muted)',letterSpacing:2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:10,...style}}>{children}<div style={{flex:1,height:1,background:'var(--border)'}}/></div>
}

function TestCard({t,ci,badge,onCBT,onPrac,onDel}) {
  // Use custom accent color from JSON, else cycle through palette
  const PALETTE = ['#6366f1','#4285f4','#f59e0b','#ef4444','#2dd4bf','#ec4899','#34a853','#f97316','#8b5cf6','#0ea5e9']
  const accent = t.accentColor || PALETTE[ci % PALETTE.length]
  const gradBg = `linear-gradient(135deg, ${accent}22, ${accent}08)`

  return(
    <div className="tc" style={{'--card-accent': accent}}>
      {/* Top color strip — thicker, gradient */}
      <div style={{height:4,background:`linear-gradient(90deg, ${accent}, ${accent}88)`}}/>
      <div style={{padding:'14px 15px 15px'}}>
        {/* Subject + source row */}
        <div className="row" style={{justifyContent:'space-between',marginBottom:6}}>
          <span style={{
            fontSize:'.62rem',fontWeight:800,fontFamily:'Space Mono,monospace',
            color:accent,textTransform:'uppercase',letterSpacing:.8,
            background:`${accent}18`,padding:'2px 8px',borderRadius:20,
            border:`1px solid ${accent}35`
          }}>{t.subject||'Exam'}</span>
          <span style={{fontSize:'.6rem',color:'var(--muted)',fontFamily:'Space Mono,monospace',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.source||''}</span>
        </div>
        {/* Title */}
        <div style={{fontWeight:800,fontSize:'.92rem',lineHeight:1.38,marginBottom:10,color:'var(--text)',letterSpacing:'-.3px'}}>{t.title}</div>
        {/* Meta tags */}
        <div className="row gap6" style={{marginBottom:13,flexWrap:'wrap'}}>
          {[`${t.questionCount||t.questions?.length||'?'} Qs`,`${t.dur||180} min`,`+${t.mCor||4} / −${t.mNeg||1}`].map(tag=>(
            <span key={tag} style={{
              fontSize:'.62rem',fontFamily:'Space Mono,monospace',padding:'3px 8px',
              borderRadius:6,background:'var(--s2)',color:'var(--m2)',
              border:'1px solid var(--border)'
            }}>{tag}</span>
          ))}
          <span style={{
            fontSize:'.6rem',fontFamily:'Space Mono,monospace',padding:'3px 8px',borderRadius:6,
            background: badge==='READY' ? 'rgba(74,222,128,.1)' : `${accent}12`,
            color: badge==='READY' ? 'var(--green)' : accent,
            border: `1px solid ${badge==='READY' ? 'rgba(74,222,128,.25)' : accent+'30'}`
          }}>{badge==='READY'?'✓ READY':'SAVED'}</span>
        </div>
        {/* Action buttons */}
        <div className="row gap7">
          <button className="tc-cbt" style={{background:`linear-gradient(135deg, ${accent}, ${accent}cc)`}} onClick={onCBT}>🎯 CBT</button>
          <button className="tc-prac" style={{borderColor:`${accent}30`,color:accent,background:`${accent}10`}} onClick={onPrac}>📖 Practice</button>
          {onDel&&<button className="tc-del" onClick={onDel}>✕</button>}
        </div>
      </div>
    </div>
  )
}

// ── DiagramFromPDF: renders PDF page live in browser for pre-built tests ────
function DiagramFromPDF({ qnum, pageIdx, testPath, onClose }) {
  const [imgSrc, setImgSrc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function render() {
      setLoading(true); setErr(false)
      try {
        // Load PDF.js if needed
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
            s.onload = res; s.onerror = rej; document.head.appendChild(s)
          })
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
        }
        // Fetch the PDF from public/tests/ — same name as JSON but .pdf extension
        const pdfUrl = '/tests/' + testPath.replace(/\.json$/i, '.pdf')
        const res = await fetch(pdfUrl)
        if (!res.ok) throw new Error('PDF not found at ' + pdfUrl)
        const ab = await res.arrayBuffer()
        const pdf = await window.pdfjsLib.getDocument({ data: ab }).promise
        const pageNum = (pageIdx != null ? pageIdx : 0) + 1
        const safePage = Math.min(Math.max(1, pageNum), pdf.numPages)
        const page = await pdf.getPage(safePage)
        const vp = page.getViewport({ scale: 2.0 })
        const canvas = document.createElement('canvas')
        canvas.width = vp.width; canvas.height = vp.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
        if (!cancelled) setImgSrc(canvas.toDataURL('image/jpeg', 0.88))
      } catch (e) {
        if (!cancelled) setErr(true)
      }
      if (!cancelled) setLoading(false)
    }
    render()
    return () => { cancelled = true }
  }, [testPath, pageIdx])

  return (
    <div className="diagram-box">
      <div className="diagram-label" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span>🖼️ PDF Page — Q{qnum}</span>
        <span style={{fontSize:'.62rem',cursor:'pointer',color:'var(--muted)'}} onClick={onClose}>✕ Hide</span>
      </div>
      {loading && <div style={{textAlign:'center',padding:'24px',color:'var(--muted)',fontSize:'.78rem',fontFamily:'Space Mono,monospace',animation:'pulse 1s infinite'}}>Loading PDF page…</div>}
      {err && <div style={{textAlign:'center',padding:'20px',color:'var(--orange)',fontSize:'.78rem',lineHeight:1.7}}>
        🖼️ To show diagrams for pre-built tests, put the original PDF in:<br/>
        <code style={{background:'rgba(0,0,0,.3)',padding:'2px 8px',borderRadius:4,fontFamily:'Space Mono,monospace',fontSize:'.7rem'}}>public/tests/{testPath?.replace(/\.json$/i,'.pdf')}</code><br/>
        Then redeploy. The app will auto-render the correct page for each diagram question.
      </div>}
      {imgSrc && <img src={imgSrc} alt={`Page for Q${qnum}`} style={{width:'100%',display:'block'}}/>}
    </div>
  )
}

function DropZone({children,onFile,onFiles,multi}) {
  const [drag,setDrag]=useState(false)
  const handle=files=>{if(!files.length)return;if(multi&&onFiles)onFiles(Array.from(files));else if(onFile)onFile(files[0])}
  return<div className={`up-zone${drag?' drag':''}`} onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)} onDrop={e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files)}}>{children}</div>
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
.grid-bg{position:fixed;inset:0;background-image:linear-gradient(var(--border) 1px,transparent 1px),linear-gradient(90deg,var(--border) 1px,transparent 1px);background-size:56px 56px;opacity:.09;pointer-events:none;z-index:0}
.orb{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0}
.o1{width:480px;height:480px;background:radial-gradient(circle,rgba(99,102,241,.14),transparent);top:-80px;right:-80px}
.o2{width:380px;height:380px;background:radial-gradient(circle,rgba(52,168,83,.09),transparent);bottom:0;left:-80px}
.hdr{position:sticky;top:0;z-index:100;padding:10px 26px;display:flex;align-items:center;gap:12px;border-bottom:1px solid var(--border);background:rgba(7,9,15,.92);backdrop-filter:blur(20px)}
.logo{display:flex;align-items:center;gap:8px;cursor:pointer;flex-shrink:0}
.logo-mark{width:30px;height:30px;background:var(--grad);border-radius:8px;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-weight:700;font-size:.78rem;color:#fff}
.logo-txt{font-weight:800;font-size:1.1rem;letter-spacing:-.5px}
.logo-txt span{background:var(--grad);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.nav{display:flex;align-items:center;gap:2px;flex:1;justify-content:center;flex-wrap:wrap}
.nb{padding:6px 13px;border-radius:8px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.78rem;cursor:pointer;border:none;background:transparent;color:var(--muted);transition:all .15s}
.nb:hover{color:var(--text);background:rgba(255,255,255,.05)}
.nb.active{background:var(--card);color:var(--text);border:1px solid var(--b2)}
.hdr-r{display:flex;align-items:center;gap:7px;flex-shrink:0}
.user-chip{font-size:.7rem;background:rgba(99,102,241,.1);border:1px solid rgba(99,102,241,.22);color:var(--accent);padding:3px 9px;border-radius:20px;font-family:'Space Mono',monospace}
.btn-accent{background:var(--grad);color:#fff;border:none;padding:7px 14px;border-radius:8px;font-family:'Outfit',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer}
.wrap{position:relative;z-index:5;max-width:1060px;margin:0 auto;padding:34px 18px 80px}
.narrow{max-width:800px}
.anim{animation:up .36s ease both}
.row{display:flex;align-items:center}
.flex1{flex:1}
.gap6{gap:6px}.gap7{gap:7px}.gap8{gap:8px}.gap9{gap:9px}
.overlay{position:fixed;inset:0;background:rgba(7,9,15,.86);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--card);border:1px solid var(--b2);border-radius:16px;padding:26px;width:100%;max-width:380px;display:flex;flex-direction:column;gap:10px}
.modal-title{font-size:1.2rem;font-weight:800;letter-spacing:-.5px}
.modal-sub{font-size:.77rem;color:var(--m2);margin-top:-4px}
.w100{width:100%}
.link{color:var(--accent);cursor:pointer;text-decoration:underline}
.btn-sm{background:var(--card);border:1px solid var(--b2);color:var(--text);padding:6px 13px;border-radius:8px;font-size:.76rem;font-weight:600;cursor:pointer;transition:all .14s;font-family:'Outfit',sans-serif}
.btn-sm:hover{border-color:var(--muted)}
.btn-sm.blue{background:rgba(56,189,248,.08);border-color:rgba(56,189,248,.25);color:var(--blue)}
.btn-grad{background:var(--grad);color:#fff;border:none;padding:9px 18px;border-radius:9px;font-weight:700;font-size:.82rem;cursor:pointer;transition:all .2s;font-family:'Outfit',sans-serif}
.btn-grad:hover{transform:translateY(-1px);box-shadow:0 5px 18px rgba(99,102,241,.28)}
.btn-grad:disabled{opacity:.35;cursor:not-allowed;transform:none;box-shadow:none}
.btn-grad.big{padding:13px 46px;font-size:.9rem;border-radius:12px}
.btn-green{background:linear-gradient(135deg,var(--green),#16a34a);color:#000;border:none;padding:9px 16px;border-radius:8px;font-weight:700;font-size:.8rem;cursor:pointer;font-family:'Outfit',sans-serif}
.btn-ghost{background:transparent;border:1px solid var(--border);color:var(--muted);padding:9px 13px;border-radius:8px;font-size:.78rem;cursor:pointer;font-family:'Outfit',sans-serif}
.page-top{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:22px;flex-wrap:wrap;gap:12px}
.page-top h2{font-size:1.65rem;font-weight:800;letter-spacing:-1px}
.page-top p{font-size:.81rem;color:var(--m2);margin-top:4px}
.page-hero{margin-bottom:20px}
.page-hero h2{font-size:1.6rem;font-weight:800;letter-spacing:-1px;margin-bottom:4px}
.page-hero p{font-size:.83rem;color:var(--m2)}
.toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:18px}
.search-inp{flex:1;min-width:160px;background:var(--card);border:1.5px solid var(--b2);border-radius:9px;padding:8px 12px;color:var(--text);font-family:'Outfit',sans-serif;font-size:.82rem;outline:none;transition:border-color .2s}
.search-inp:focus{border-color:var(--accent)}
.search-inp::placeholder{color:var(--muted)}
.fbtns{display:flex;gap:4px;flex-wrap:wrap}
.fbtn{padding:5px 11px;border-radius:7px;font-size:.68rem;font-weight:700;cursor:pointer;border:1.5px solid var(--b2);background:var(--card);color:var(--muted);font-family:'Space Mono',monospace;transition:all .13s}
.fbtn.on,.fbtn:hover{border-color:var(--accent);color:var(--accent);background:rgba(99,102,241,.07)}
.folder-row{display:flex;align-items:center;gap:8px;cursor:pointer;background:var(--card);border:1px solid var(--border);border-radius:10px;padding:9px 13px;transition:all .15s;user-select:none;margin-bottom:4px}
.folder-row:hover{border-color:var(--accent)}
.folder-count{font-size:.64rem;font-family:'Space Mono',monospace;color:var(--muted);background:var(--s2);padding:2px 8px;border-radius:6px}
.test-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(272px,1fr));gap:13px}
.tc{background:var(--card);border:1px solid var(--border);border-radius:13px;overflow:hidden;transition:all .18s}
.tc:hover{transform:translateY(-2px);border-color:var(--b2);box-shadow:0 7px 22px rgba(0,0,0,.26)}
.tc-cbt{flex:1;padding:7px 5px;border-radius:7px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.74rem;cursor:pointer;border:none;background:var(--grad);color:#fff;transition:all .13s}
.tc-prac{flex:1;padding:7px 5px;border-radius:7px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.74rem;cursor:pointer;border:1px solid rgba(167,139,250,.22);background:rgba(167,139,250,.1);color:var(--purple)}
.tc-del{padding:7px 10px;border-radius:7px;font-size:.68rem;cursor:pointer;border:1px solid rgba(248,113,113,.18);background:rgba(248,113,113,.07);color:var(--red)}
.crd{background:var(--card);border:1px solid var(--border);border-radius:13px;padding:18px 20px;margin-bottom:13px}
.crd-t{font-size:.66rem;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1.5px;font-family:'Space Mono',monospace;margin-bottom:11px;display:flex;align-items:center;gap:7px}
.crd-t::after{content:'';flex:1;height:1px;background:var(--border)}
.chip-free{font-size:.6rem;font-weight:700;font-family:'Space Mono',monospace;padding:2px 7px;border-radius:20px;background:rgba(52,168,83,.13);border:1px solid rgba(52,168,83,.28);color:#34a853}
.hint{font-size:.76rem;color:var(--muted);line-height:1.65;margin-bottom:10px}
.hint a{color:var(--accent);text-decoration:none}
.field{background:var(--s2);border:1.5px solid var(--b2);border-radius:8px;padding:9px 11px;color:var(--text);font-family:'Outfit',sans-serif;font-size:.83rem;outline:none;transition:border-color .2s;width:100%}
.field:focus{border-color:var(--accent)}
.field.mono{font-family:'Space Mono',monospace;font-size:.77rem}
.ks{font-size:.68rem;margin-top:6px;font-family:'Space Mono',monospace}
.ks.ok{color:var(--green)}.ks.bad{color:var(--red)}.ks.hint{color:var(--muted)}
.mi{display:flex;align-items:center;gap:8px;background:var(--s2);border:1.5px solid var(--b2);border-radius:8px;padding:8px 11px;cursor:pointer;transition:all .12s;margin-bottom:4px}
.mi.sel{border-color:#34a853;background:rgba(52,168,83,.06)}
.mi-name{font-family:'Space Mono',monospace;font-size:.68rem;font-weight:700;color:var(--text)}
.mi-desc{font-size:.62rem;color:var(--muted);margin-top:1px}
.mi-tag{font-size:.58rem;font-family:'Space Mono',monospace;padding:2px 6px;border-radius:5px;white-space:nowrap}
.mi-tag.free{background:rgba(52,168,83,.12);color:#34a853;border:1px solid rgba(52,168,83,.24)}
.mi-tag.paid{background:rgba(251,146,60,.08);color:var(--orange);border:1px solid rgba(251,146,60,.2)}
.up-zone{background:var(--s1);border:2px dashed var(--b2);border-radius:12px;padding:34px 22px;text-align:center;transition:all .22s}
.up-zone.drag,.up-zone:hover{border-color:var(--accent);background:#0e1a2e}
.up-icon{font-size:2.2rem;margin-bottom:9px}
.up-title{font-size:.96rem;font-weight:700;margin-bottom:5px}
.up-sub{font-size:.76rem;color:var(--muted);margin-bottom:15px}
.up-hint{margin-top:10px;font-size:.66rem;color:var(--muted);font-family:'Space Mono',monospace}
.fi-bar{display:flex;align-items:center;gap:9px;background:rgba(99,102,241,.05);border:1px solid rgba(99,102,241,.15);border-radius:8px;padding:9px 12px;margin-bottom:12px}
.sl{font-size:.63rem;color:var(--muted);font-family:'Space Mono',monospace;margin-bottom:7px;text-transform:uppercase;letter-spacing:.8px}
.mode-row{display:flex;gap:8px;margin-bottom:11px}
.mo{flex:1;padding:11px 9px;border-radius:9px;border:1.5px solid var(--b2);cursor:pointer;text-align:center;transition:all .15s;background:var(--s2)}
.mo.on{border-color:var(--accent);background:rgba(99,102,241,.08)}
.mo-ic{font-size:1.2rem;display:block;margin-bottom:3px}
.mo-tl{font-size:.78rem;font-weight:700}
.mo-ds{font-size:.63rem;color:var(--muted);margin-top:2px}
.range-box{background:rgba(74,222,128,.04);border:1px solid rgba(74,222,128,.15);border-radius:9px;padding:11px 13px;margin-bottom:11px}
.rl{font-size:.73rem;color:var(--m2)}
.ri{width:58px;background:var(--s2);border:1.5px solid var(--b2);border-radius:7px;padding:6px 7px;color:var(--text);font-family:'Space Mono',monospace;font-size:.8rem;outline:none;text-align:center}
.ri:focus{border-color:var(--accent)}
.rh{font-size:.67rem;font-family:'Space Mono',monospace;color:var(--green);flex:1;min-width:80px}
.presets{display:flex;gap:4px;flex-wrap:wrap;margin-top:7px}
.preset{background:var(--s2);border:1.5px solid var(--b2);border-radius:6px;padding:3px 8px;color:var(--m2);font-family:'Space Mono',monospace;font-size:.61rem;cursor:pointer;transition:all .13s}
.preset:hover{border-color:var(--green);color:var(--green)}
.sg-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.sg{display:flex;flex-direction:column;gap:3px}
.sg label{font-size:.64rem;color:var(--muted);font-family:'Space Mono',monospace}
.ps{display:flex;align-items:center;gap:8px;font-size:.76rem;color:var(--muted);padding:5px 7px;border-radius:6px;transition:all .22s}
.ps.active{color:var(--accent);background:rgba(99,102,241,.07)}
.ps.done{color:var(--green)}
.psd{width:6px;height:6px;border-radius:50%;background:var(--b2);flex-shrink:0}
.ps.active .psd{background:var(--accent);box-shadow:0 0 6px rgba(99,102,241,.5);animation:blink 1s infinite}
.ps.done .psd{background:var(--green)}
.save-prompt{background:rgba(74,222,128,.05);border:1px solid rgba(74,222,128,.2);border-radius:12px;padding:15px 18px;margin-top:12px}
.sp-title{font-weight:700;color:var(--green);margin-bottom:4px;font-size:.88rem}
.sp-sub{font-size:.77rem;color:var(--m2);margin-bottom:10px}
.err-box{background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.2);border-radius:11px;padding:14px 16px;margin-top:12px}
.code-block{background:var(--s2);border-radius:9px;padding:14px;font-size:.7rem;color:var(--green);overflow-x:auto;font-family:'Space Mono',monospace;line-height:1.7}
.empty-s{text-align:center;padding:50px 20px}
.empty-s span{font-size:2.8rem;display:block;margin-bottom:12px}
.empty-s h3{font-size:1.05rem;font-weight:700;margin-bottom:5px;color:var(--m2)}
.empty-s p{font-size:.79rem;color:var(--muted);max-width:300px;margin:0 auto;line-height:1.7}
.loading-txt{color:var(--muted);font-size:.82rem;padding:16px 0}
.stats-row{display:grid;grid-template-columns:repeat(auto-fill,minmax(195px,1fr));gap:12px;margin-bottom:22px}
.stat-box{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:17px;text-align:center}
.stat-n{font-family:'Space Mono',monospace;font-size:1.75rem;font-weight:700;margin-bottom:4px}
.stat-l{font-size:.68rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.attempts-list{display:flex;flex-direction:column;gap:7px}
.attempt-row{background:var(--card);border:1px solid var(--border);border-radius:11px;padding:13px 15px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;animation:up .3s ease both}
.ar-left{flex:1;min-width:150px}
.ar-title{font-weight:600;font-size:.87rem;margin-bottom:2px}
.ar-meta{font-size:.67rem;color:var(--muted);font-family:'Space Mono',monospace}
.ar-stats{display:flex;gap:7px;flex-wrap:wrap}
.ar-s{font-size:.7rem;font-family:'Space Mono',monospace;padding:2px 8px;border-radius:5px}
.ar-s.green{background:rgba(74,222,128,.08);color:var(--green);border:1px solid rgba(74,222,128,.17)}
.ar-s.red{background:rgba(248,113,113,.08);color:var(--red);border:1px solid rgba(248,113,113,.17)}
.ar-s.gold{background:rgba(251,191,36,.08);color:var(--gold);border:1px solid rgba(251,191,36,.17)}
.ar-score{font-family:'Space Mono',monospace;font-size:1.25rem;font-weight:700;white-space:nowrap}
.ar-max{font-size:.7rem;color:var(--muted);font-weight:400}
.ar-pct{font-family:'Space Mono',monospace;font-size:.88rem;font-weight:700;min-width:42px;text-align:right}
.cbt-app{position:fixed;inset:0;z-index:500;background:#ffffff;display:flex;flex-direction:column}
.cbt-app *{
  color:#000 !important;
}

.cbt-app .qpanel,
.cbt-app .sb {
  background:#ffffff !important;
  color:#000 !important;
  border:1px solid #d1d5db;
}

.qtext{
  font-size:18px;
  font-weight:500;
  line-height:1.6;
}
.cbt-top{background:linear-gradient(135deg,#0b1120,#17083a);border-bottom:1px solid var(--border);padding:10px 19px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;gap:10px}
.cbt-body{display:flex;flex:1;overflow:hidden;min-height:0}
.qpanel{flex:1;padding:19px 23px;overflow-y:auto;border-right:1px solid var(--border)}
.qtext{font-size:.88rem;line-height:1.82;background:var(--card);border:1px solid var(--border);border-radius:11px;padding:14px;margin-bottom:15px;white-space:pre-wrap}
.img-hint{font-size:.75rem;color:var(--gold);background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:8px 12px;margin-bottom:14px}
.diagram-box{margin-bottom:14px;background:var(--card);border:1px solid rgba(99,102,241,.25);border-radius:10px;overflow:hidden}
.diagram-label{font-size:.67rem;font-family:'Space Mono',monospace;color:var(--accent);padding:8px 12px;background:rgba(99,102,241,.07);border-bottom:1px solid rgba(99,102,241,.15)}
.opts{display:flex;flex-direction:column;gap:7px;margin-bottom:15px}
.opt{display:flex;align-items:flex-start;gap:10px;background:var(--card);border:1.5px solid var(--border);border-radius:10px;padding:10px 13px;cursor:pointer;transition:all .12s}
.opt:hover{border-color:var(--accent);background:#121d33}
.opt.sel{border-color:var(--accent);background:rgba(99,102,241,.07)}
.opt.cor{border-color:var(--green)!important;background:rgba(74,222,128,.06)!important}
.opt.wrg{border-color:var(--red)!important;background:rgba(248,113,113,.06)!important}
.opt.sc{border-color:var(--green)!important;background:rgba(74,222,128,.04)!important}
.olbl{font-family:'Space Mono',monospace;font-size:.68rem;font-weight:700;color:var(--gold);min-width:15px;flex-shrink:0;padding-top:2px}
.opt.sel .olbl{color:var(--accent)}
.opt.cor .olbl,.opt.sc .olbl{color:var(--green)}
.opt.wrg .olbl{color:var(--red)}
.int-inp{background:var(--card);border:1.5px solid var(--b2);border-radius:8px;padding:9px 13px;color:var(--text);font-family:'Space Mono',monospace;font-size:1rem;width:175px;outline:none;transition:border-color .2s;margin-bottom:15px}
.int-inp:focus{border-color:var(--accent)}
.ans-b{background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);border-radius:8px;padding:7px 12px;margin-bottom:11px;font-size:.76rem;color:var(--gold)}
.ca{padding:7px 13px;border-radius:8px;font-family:'Outfit',sans-serif;font-weight:600;font-size:.75rem;cursor:pointer;border:none;transition:all .12s}
.ca-p{background:var(--grad);color:#fff}
.ca-s{background:rgba(251,191,36,.09);color:var(--gold);border:1px solid rgba(251,191,36,.2)}
.ca-c{background:rgba(248,113,113,.07);color:var(--red);border:1px solid rgba(248,113,113,.14)}
.ca-sub{background:linear-gradient(135deg,var(--green),#16a34a);color:#000;padding:7px 16px}
.ca-n{background:var(--card);color:var(--text);border:1px solid var(--border)}
.ca-rev{background:rgba(251,191,36,.1);color:var(--gold);border:1px solid rgba(251,191,36,.22)}
.timer{font-family:'Space Mono',monospace;font-size:1.08rem;font-weight:700;color:var(--gold);background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.2);padding:4px 12px;border-radius:7px;min-width:96px;text-align:center}
.timer.warn{color:var(--red);border-color:rgba(248,113,113,.4);background:rgba(248,113,113,.07);animation:warn 1s infinite}
.prac-b{background:rgba(167,139,250,.13);border:1px solid rgba(167,139,250,.27);color:var(--purple);font-size:.68rem;font-family:'Space Mono',monospace;padding:4px 10px;border-radius:20px;font-weight:700}
.exit-b{background:rgba(248,113,113,.07);color:var(--red);border:1px solid rgba(248,113,113,.17);padding:5px 11px;border-radius:7px;font-family:'Outfit',sans-serif;font-size:.73rem;font-weight:600;cursor:pointer}
.qnum{font-family:'Space Mono',monospace;font-size:.67rem;color:var(--muted);background:var(--card);border:1px solid var(--border);padding:3px 10px;border-radius:20px}
.qbadge{font-size:.62rem;font-weight:700;padding:3px 9px;border-radius:20px}
.qbadge.mcq{background:rgba(99,102,241,.09);color:var(--accent);border:1px solid rgba(99,102,241,.2)}
.qbadge.int{background:rgba(167,139,250,.09);color:var(--purple);border:1px solid rgba(167,139,250,.2)}
.sb{width:245px;background:var(--s1);flex-shrink:0;overflow-y:auto;display:flex;flex-direction:column}
.sb-h{padding:9px 12px;border-bottom:1px solid var(--border);font-size:.63rem;font-family:'Space Mono',monospace;color:var(--muted);letter-spacing:1px;text-transform:uppercase}
.sb-leg{padding:7px 12px;display:flex;flex-wrap:wrap;gap:6px;border-bottom:1px solid var(--border)}
.leg{display:flex;align-items:center;gap:4px;font-size:.61rem;color:var(--muted)}
.ldot{width:6px;height:6px;border-radius:50%}
.ldot.a{background:var(--green)}.ldot.s{background:var(--gold)}.ldot.u{background:#2a3a52}.ldot.r{background:var(--purple)}
.qgrid{padding:9px 10px;display:grid;grid-template-columns:repeat(6,1fr);gap:3px;flex:1}
.qdot{height:25px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-family:'Space Mono',monospace;font-size:.57rem;font-weight:700;cursor:pointer;background:#1a2840;color:var(--muted);border:1.5px solid transparent;transition:all .11s}
.qdot:hover{transform:scale(1.1)}
.qdot.cur{border-color:var(--accent);color:var(--accent)}
.qdot.ans{background:var(--green);color:#000}
.qdot.skp{background:var(--gold);color:#000}
.qdot.rev{background:var(--purple);color:#fff}
.sb-stats{padding:10px 12px;border-top:1px solid var(--border);margin-top:auto}
.sbr{display:flex;justify-content:space-between;font-size:.71rem;margin-bottom:4px}
.result-box{background:var(--card);border:1px solid var(--border);border-radius:18px;overflow:hidden;width:100%;max-width:560px;animation:up .32s ease both}
.res-head{background:linear-gradient(135deg,#0b1120,#17083a);padding:28px;text-align:center;border-bottom:1px solid var(--border)}
.res-trophy{font-size:2.4rem;margin-bottom:7px}
.res-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border)}
@media(max-width:660px){
  .hdr{padding:8px 12px}
  .nb{padding:5px 8px;font-size:.73rem}
  .cbt-body{flex-direction:column}
  .sb{width:100%;max-height:180px}
  .res-grid{grid-template-columns:repeat(2,1fr)}
  .sg-grid{grid-template-columns:1fr}
  .mode-row{flex-direction:column}
  .page-top{flex-direction:column}
  .stats-row{grid-template-columns:repeat(2,1fr)}
  .attempt-row{flex-direction:column;align-items:flex-start;gap:8px}
}`
