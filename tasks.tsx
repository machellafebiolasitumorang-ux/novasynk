import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const STATUSES = [
  { key:'todo', label:'Belum Mulai', color:'#9896b8' },
  { key:'wip', label:'Dikerjakan', color:'#7c6cff' },
  { key:'review', label:'Review', color:'#ffb347' },
  { key:'done', label:'Selesai', color:'#2dd6a0' },
]

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [members, setMembers] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title:'', description:'', priority:'mid', assigned_to:'', deadline:'', status:'todo' })
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadData()

    // Realtime subscription
    const sub = supabase.channel('tasks-channel')
      .on('postgres_changes', { event:'*', schema:'public', table:'tasks' }, () => loadData())
      .subscribe()

    return () => { sub.unsubscribe() }
  }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
    }
    const { data: t } = await supabase.from('tasks').select('*, assigned:assigned_to(name,id), creator:created_by(name)').order('created_at', { ascending: false })
    setTasks(t || [])
    const { data: m } = await supabase.from('profiles').select('id,name').eq('is_active', true)
    setMembers(m || [])
  }

  async function submitTask() {
    if (!form.title.trim()) { toast.error('Judul tugas wajib diisi'); return }
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('tasks').insert({
      ...form,
      created_by: user?.id,
      assigned_to: form.assigned_to || null,
      deadline: form.deadline || null,
    })
    if (error) { toast.error(error.message) } else {
      await supabase.from('activity_logs').insert({ user_id: user?.id, action:'create_task', detail:`membuat tugas "${form.title}"` })
      toast.success('Tugas dibuat!')
      setShowModal(false)
      setForm({ title:'', description:'', priority:'mid', assigned_to:'', deadline:'', status:'todo' })
      loadData()
    }
    setSaving(false)
  }

  async function moveTask(taskId: string, newStatus: string) {
    await supabase.from('tasks').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', taskId)
    loadData()
  }

  async function deleteTask(id: string) {
    if (!confirm('Hapus tugas ini?')) return
    await supabase.from('tasks').delete().eq('id', id)
    toast.success('Tugas dihapus')
    loadData()
  }

  function filteredTasks(status: string) {
    return tasks.filter(t => {
      if (t.status !== status) return false
      if (filter === 'mine') return t.assigned_to === profile?.id
      if (filter === 'high') return t.priority === 'high'
      return true
    })
  }

  const priorityBadge: Record<string,string> = { high:'badge-red', mid:'badge-amber', low:'badge-purple' }
  const priorityLabel: Record<string,string> = { high:'Tinggi', mid:'Sedang', low:'Rendah' }

  return (
    <Layout title="Manajemen Tugas">
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:6 }}>
          {[['all','Semua'],['mine','Milik Saya'],['high','Prioritas Tinggi']].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ padding:'5px 12px', fontSize:11, border:`1px solid ${filter===k ? 'rgba(124,108,255,0.35)' : 'rgba(255,255,255,0.1)'}`, borderRadius:20, background: filter===k ? 'rgba(124,108,255,0.12)' : 'transparent', color: filter===k ? '#a594ff' : '#9896b8', cursor:'pointer' }}>
              {l}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ marginLeft:'auto' }}>
          <i className="ti ti-plus"></i> Tugas Baru
        </button>
      </div>

      {/* Kanban board */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, alignItems:'start' }}>
        {STATUSES.map(col => (
          <div key={col.key}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, padding:'4px 2px' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:col.color }}></div>
              <span style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color:'#f0efff' }}>{col.label}</span>
              <span style={{ fontSize:10, color:'#5c5a7a' }}>{filteredTasks(col.key).length}</span>
              <button onClick={() => { setForm(f => ({...f, status:col.key})); setShowModal(true) }} style={{ marginLeft:'auto', background:'none', border:'none', color:'#5c5a7a', fontSize:18, cursor:'pointer', lineHeight:1 }}>+</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filteredTasks(col.key).map(task => (
                <div key={task.id} style={{ background:'#13131a', border:`1px solid ${col.key==='wip' ? 'rgba(124,108,255,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:13, cursor:'default', transition:'all .15s' }}>
                  <div style={{ fontSize:13, color:'#f0efff', lineHeight:1.4, marginBottom:8 }}>{task.title}</div>
                  <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginBottom:8 }}>
                    <span className={`badge ${priorityBadge[task.priority]}`}>{priorityLabel[task.priority]}</span>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ fontSize:10, color:'#5c5a7a' }}>
                      {task.assigned?.name || '—'}
                      {task.deadline && ` · ${new Date(task.deadline).toLocaleDateString('id-ID',{day:'numeric',month:'short'})}`}
                    </div>
                    <div style={{ display:'flex', gap:4 }}>
                      {/* Move buttons */}
                      {col.key !== 'todo' && (
                        <button onClick={() => moveTask(task.id, STATUSES[STATUSES.findIndex(s=>s.key===col.key)-1].key)} style={{ background:'none', border:'none', color:'#5c5a7a', cursor:'pointer', fontSize:14, padding:2 }} title="Mundur">←</button>
                      )}
                      {col.key !== 'done' && (
                        <button onClick={() => moveTask(task.id, STATUSES[STATUSES.findIndex(s=>s.key===col.key)+1].key)} style={{ background:'none', border:'none', color:'#a594ff', cursor:'pointer', fontSize:14, padding:2 }} title="Maju">→</button>
                      )}
                      {(profile?.role === 'admin' || task.created_by === profile?.id) && (
                        <button onClick={() => deleteTask(task.id)} style={{ background:'none', border:'none', color:'#5c5a7a', cursor:'pointer', fontSize:13, padding:2 }} title="Hapus">✕</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTasks(col.key).length === 0 && (
                <div style={{ border:'1.5px dashed rgba(255,255,255,0.07)', borderRadius:12, padding:16, textAlign:'center', fontSize:11, color:'#5c5a7a', cursor:'pointer' }}
                  onClick={() => { setForm(f=>({...f,status:col.key})); setShowModal(true) }}>
                  + Tambah
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            <h2><i className="ti ti-plus" style={{ color:'#a594ff' }}></i> Tambah Tugas Baru</h2>
            <label>Judul Tugas *</label>
            <input value={form.title} onChange={e => setForm({...form, title:e.target.value})} placeholder="Judul tugas..." style={{ width:'100%' }} />
            <label>Deskripsi</label>
            <textarea value={form.description} onChange={e => setForm({...form, description:e.target.value})} placeholder="Deskripsi..." rows={3} style={{ width:'100%', resize:'vertical' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label>Assignee</label>
                <select value={form.assigned_to} onChange={e => setForm({...form, assigned_to:e.target.value})} style={{ width:'100%' }}>
                  <option value="">— Pilih Anggota —</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div>
                <label>Prioritas</label>
                <select value={form.priority} onChange={e => setForm({...form, priority:e.target.value})} style={{ width:'100%' }}>
                  <option value="high">Tinggi</option>
                  <option value="mid">Sedang</option>
                  <option value="low">Rendah</option>
                </select>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <div>
                <label>Status</label>
                <select value={form.status} onChange={e => setForm({...form, status:e.target.value})} style={{ width:'100%' }}>
                  {STATUSES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label>Deadline</label>
                <input type="date" value={form.deadline} onChange={e => setForm({...form, deadline:e.target.value})} style={{ width:'100%' }} />
              </div>
            </div>
            <div className="modal-btns">
              <button className="btn" onClick={() => setShowModal(false)}>Batal</button>
              <button className="btn btn-primary" onClick={submitTask} disabled={saving}>{saving ? 'Menyimpan...' : 'Tambah Tugas'}</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
