import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'

export default function ProgressPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [files, setFiles] = useState<any[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: t } = await supabase.from('tasks').select('*, assigned:assigned_to(name,id)')
    setTasks(t || [])
    const { data: m } = await supabase.from('profiles').select('*').eq('is_active', true)
    setMembers(m || [])
    const { data: f } = await supabase.from('files').select('id,created_at,folder')
    setFiles(f || [])
  }

  const total = tasks.length
  const done = tasks.filter(t => t.status === 'done').length
  const wip = tasks.filter(t => t.status === 'wip').length
  const review = tasks.filter(t => t.status === 'review').length
  const late = tasks.filter(t => t.deadline && new Date(t.deadline) < new Date() && t.status !== 'done').length
  const completion = total ? Math.round(done/total*100) : 0

  function memberStats(id: string) {
    const mine = tasks.filter(t => t.assigned_to === id)
    const doneMine = mine.filter(t => t.status === 'done')
    return { total: mine.length, done: doneMine.length, pct: mine.length ? Math.round(doneMine.length/mine.length*100) : 0 }
  }

  const statusColors: Record<string,string> = { todo:'#5c5a7a', wip:'#7c6cff', review:'#ffb347', done:'#2dd6a0' }
  const statusLabels: Record<string,string> = { todo:'Belum Mulai', wip:'Dikerjakan', review:'Review', done:'Selesai' }

  return (
    <Layout title="Progres Tim">
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Tugas', val:total, color:'#a594ff', bg:'rgba(124,108,255,0.1)', icon:'ti-checklist' },
          { label:'Selesai', val:done, color:'#2dd6a0', bg:'rgba(45,214,160,0.1)', icon:'ti-circle-check', sub:`${completion}%` },
          { label:'Terlambat', val:late, color:'#ff6b7a', bg:'rgba(255,107,122,0.1)', icon:'ti-alert-circle' },
          { label:'Total File', val:files.length, color:'#ffb347', bg:'rgba(255,179,71,0.1)', icon:'ti-folder' },
        ].map(s => (
          <div key={s.label} style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize:17, color:s.color }}></i>
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'#f0efff', letterSpacing:-1 }}>
              {s.val} {(s as any).sub && <span style={{ fontSize:14, color:s.color }}>{(s as any).sub}</span>}
            </div>
            <div style={{ fontSize:11, color:'#5c5a7a', marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Overall progress bar */}
      <div className="card" style={{ marginBottom:18 }}>
        <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Progress Keseluruhan</span>
        </div>
        <div style={{ padding:16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:13, color:'#9896b8' }}>Sprint Progress</span>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:14, fontWeight:700, color:'#a594ff' }}>{completion}%</span>
          </div>
          <div style={{ height:8, background:'#22222f', borderRadius:4, overflow:'hidden', marginBottom:14 }}>
            <div style={{ height:'100%', background:'linear-gradient(90deg,#7c6cff,#a594ff)', width:`${completion}%`, borderRadius:4, transition:'width .8s ease' }}></div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
            {Object.entries(statusLabels).map(([k,l]) => {
              const cnt = tasks.filter(t=>t.status===k).length
              return (
                <div key={k} style={{ textAlign:'center', background:'#1a1a24', borderRadius:8, padding:'10px 6px' }}>
                  <div style={{ fontFamily:'Syne,sans-serif', fontSize:18, fontWeight:700, color:statusColors[k] }}>{cnt}</div>
                  <div style={{ fontSize:10, color:'#5c5a7a', marginTop:2 }}>{l}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Per member */}
        <div className="card">
          <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Distribusi per Anggota</span>
          </div>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
            {members.map(m => {
              const s = memberStats(m.id)
              return (
                <div key={m.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:22, height:22, borderRadius:'50%', background:'rgba(124,108,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'#a594ff' }}>
                        {m.name.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize:12, color:'#f0efff' }}>{m.name}</span>
                    </div>
                    <span style={{ fontSize:10, color:'#5c5a7a' }}>{s.done}/{s.total} tugas · {s.pct}%</span>
                  </div>
                  <div style={{ height:5, background:'#22222f', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background: s.pct===100 ? '#2dd6a0' : s.pct>=50 ? '#7c6cff' : '#ffb347', width:`${s.pct}%`, transition:'width .6s ease' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Files per folder */}
        <div className="card">
          <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
            <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Dokumen per Folder</span>
          </div>
          <div style={{ padding:16, display:'flex', flexDirection:'column', gap:12 }}>
            {Array.from(new Set(files.map(f=>f.folder))).map(folder => {
              const cnt = files.filter(f=>f.folder===folder).length
              const pct = files.length ? Math.round(cnt/files.length*100) : 0
              return (
                <div key={folder}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:12, color:'#f0efff' }}>{folder}</span>
                    <span style={{ fontSize:10, color:'#5c5a7a' }}>{cnt} file · {pct}%</span>
                  </div>
                  <div style={{ height:5, background:'#22222f', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, background:'#5baeff', width:`${pct}%`, transition:'width .6s' }}></div>
                  </div>
                </div>
              )
            })}
            {files.length === 0 && <div style={{ color:'#5c5a7a', fontSize:13, textAlign:'center', padding:20 }}>Belum ada file diupload</div>}
          </div>
        </div>
      </div>
    </Layout>
  )
}
