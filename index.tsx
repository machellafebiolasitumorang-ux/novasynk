import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, done: 0, files: 0, members: 0 })
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }

    // Tasks stats
    const { data: allTasks } = await supabase.from('tasks').select('id,status,title,priority,deadline,assigned_to, profiles:assigned_to(name)')
    if (allTasks) {
      setStats(s => ({
        ...s,
        total: allTasks.length,
        done: allTasks.filter(t => t.status === 'done').length
      }))
      setTasks(allTasks.filter(t => t.status !== 'done').slice(0, 4))
    }

    // Files count
    const { count: fileCount } = await supabase.from('files').select('id', { count:'exact', head:true })
    setStats(s => ({ ...s, files: fileCount || 0 }))

    // Members count
    const { count: memCount } = await supabase.from('profiles').select('id', { count:'exact', head:true }).eq('is_active', true)
    setStats(s => ({ ...s, members: memCount || 0 }))

    // Activity logs
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('*, profiles:user_id(name)')
      .order('created_at', { ascending: false })
      .limit(5)
    setActivities(logs || [])
  }

  function timeAgo(d: string) {
    const diff = Date.now() - new Date(d).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'baru saja'
    if (mins < 60) return `${mins} menit lalu`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} jam lalu`
    return `${Math.floor(hrs / 24)} hari lalu`
  }

  const statusBadge: Record<string, string> = {
    todo: 'badge-blue', wip: 'badge-purple', review: 'badge-amber', done: 'badge-teal'
  }
  const statusLabel: Record<string, string> = {
    todo: 'Belum Mulai', wip: 'Dikerjakan', review: 'Review', done: 'Selesai'
  }

  return (
    <Layout title="">
      {/* Greeting */}
      <div style={{ marginBottom:22 }}>
        <div style={{ fontFamily:'Syne,sans-serif', fontSize:20, fontWeight:800, color:'#f0efff', letterSpacing:'-.5px' }}>
          Selamat datang, {profile?.name || 'Tim'} 👋
        </div>
        <div style={{ fontSize:12, color:'#5c5a7a', marginTop:3 }}>
          {new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:22 }}>
        {[
          { label:'Total Tugas', val:stats.total, color:'#ac94ff', bg:'rgba(124,108,255,0.1)', icon:'ti-checklist', trend:'Sprint aktif' },
          { label:'Selesai', val:stats.done, color:'#2dd6a0', bg:'rgba(45,214,160,0.1)', icon:'ti-circle-check', trend:`${stats.total ? Math.round(stats.done/stats.total*100) : 0}% selesai` },
          { label:'Dokumen', val:stats.files, color:'#ffb347', bg:'rgba(255,179,71,0.1)', icon:'ti-folder', trend:'File terupload' },
          { label:'Anggota Aktif', val:stats.members, color:'#5baeff', bg:'rgba(91,174,255,0.1)', icon:'ti-users', trend:'Tim aktif' },
        ].map(s => (
          <div key={s.label} style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16, cursor:'pointer' }}>
            <div style={{ width:32, height:32, borderRadius:8, background:s.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:10 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize:17, color:s.color }}></i>
            </div>
            <div style={{ fontFamily:'Syne,sans-serif', fontSize:26, fontWeight:800, color:'#f0efff', letterSpacing:-1 }}>{s.val}</div>
            <div style={{ fontSize:11, color:'#5c5a7a', marginTop:2 }}>{s.label}</div>
            <div style={{ fontSize:11, color:s.color, marginTop:6 }}>{s.trend}</div>
          </div>
        ))}
      </div>

      {/* Two column */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:16 }}>
        {/* Tasks */}
        <div>
          <div className="card" style={{ marginBottom:16 }}>
            <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Tugas Aktif</span>
              <Link href="/tasks" style={{ fontSize:11, color:'#a594ff' }}>Lihat semua →</Link>
            </div>
            {tasks.length === 0 ? (
              <div style={{ padding:'24px 16px', textAlign:'center', color:'#5c5a7a', fontSize:13 }}>Belum ada tugas aktif</div>
            ) : tasks.map(t => (
              <div key={t.id} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:'#f0efff' }}>{t.title}</div>
                  <div style={{ fontSize:11, color:'#5c5a7a', marginTop:2, display:'flex', gap:8, alignItems:'center' }}>
                    <span>{t.profiles?.name || '—'}</span>
                    <span className={`badge ${statusBadge[t.status]}`}>{statusLabel[t.status]}</span>
                    {t.deadline && <span>{new Date(t.deadline).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Activity */}
          <div className="card">
            <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Aktivitas Terbaru</span>
            </div>
            {activities.length === 0 ? (
              <div style={{ padding:'24px 16px', textAlign:'center', color:'#5c5a7a', fontSize:13 }}>Belum ada aktivitas</div>
            ) : activities.map(a => (
              <div key={a.id} style={{ padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#7c6cff', marginTop:4, flexShrink:0 }}></div>
                <div>
                  <div style={{ fontSize:12, color:'#9896b8', lineHeight:1.55 }}>
                    <strong style={{ color:'#f0efff' }}>{a.profiles?.name}</strong> {a.detail || a.action}
                  </div>
                  <div style={{ fontSize:10, color:'#5c5a7a', marginTop:2 }}>{timeAgo(a.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div className="card">
            <div style={{ padding:'13px 16px', borderBottom:'1px solid rgba(255,255,255,0.07)', display:'flex', justifyContent:'space-between' }}>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:13, fontWeight:600, color:'#f0efff' }}>Quick Actions</span>
            </div>
            {[
              { href:'/tasks', icon:'ti-plus', label:'Tambah Tugas Baru', color:'#a594ff' },
              { href:'/docs', icon:'ti-upload', label:'Upload Dokumen', color:'#2dd6a0' },
              { href:'/schedule', icon:'ti-calendar-plus', label:'Buat Jadwal', color:'#ffb347' },
              { href:'/chat', icon:'ti-message-2', label:'Buka Chat Tim', color:'#5baeff' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', textDecoration:'none', transition:'background .12s' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize:16, color:a.color }}></i>
                </div>
                <span style={{ fontSize:13, color:'#9896b8' }}>{a.label}</span>
                <i className="ti ti-chevron-right" style={{ fontSize:14, color:'#5c5a7a', marginLeft:'auto' }}></i>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  )
}
