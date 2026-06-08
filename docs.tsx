import { useCallback, useEffect, useRef, useState } from 'react'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

const FOLDERS = ['Umum', 'Desain', 'Backend', 'Spesifikasi', 'Rapat', 'Lainnya']
const ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.zip,.txt'

export default function DocsPage() {
  const [files, setFiles] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [folder, setFolder] = useState('Semua')
  const [search, setSearch] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [selectedFolder, setSelectedFolder] = useState('Umum')
  const [access, setAccess] = useState<'public'|'team'|'private'>('team')
  const [preview, setPreview] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        setProfile(data)
      }
    })
    loadFiles()
  }, [])

  useEffect(() => {
    let f = files
    if (folder !== 'Semua') f = f.filter(x => x.folder === folder)
    if (search) f = f.filter(x => x.original_name.toLowerCase().includes(search.toLowerCase()))
    setFiltered(f)
  }, [files, folder, search])

  async function loadFiles() {
    const { data } = await supabase
      .from('files')
      .select('*, profiles:uploaded_by(name)')
      .order('created_at', { ascending: false })
    setFiles(data || [])
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProgress(10)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const ext = file.name.split('.').pop()
      const storagePath = `${user.id}/${Date.now()}_${file.name}`
      setProgress(30)

      // Upload to Supabase Storage bucket "documents"
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { contentType: file.type })

      if (uploadError) throw uploadError
      setProgress(70)

      // Get public URL
      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath)

      // Save to DB
      const { error: dbError } = await supabase.from('files').insert({
        name: file.name.replace(/\.[^/.]+$/, ''),
        original_name: file.name,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: file.type,
        size_bytes: file.size,
        folder: selectedFolder,
        access: access,
        uploaded_by: user.id,
      })

      if (dbError) throw dbError
      setProgress(90)

      // Log activity
      await supabase.from('activity_logs').insert({
        user_id: user.id,
        action: 'upload_file',
        entity_type: 'file',
        detail: `mengupload "${file.name}" ke folder ${selectedFolder}`,
      })

      setProgress(100)
      toast.success(`"${file.name}" berhasil diupload!`)
      loadFiles()
    } catch (err: any) {
      toast.error(err.message || 'Gagal upload')
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(file: any) {
    if (!confirm(`Hapus file "${file.original_name}"?`)) return
    await supabase.storage.from('documents').remove([file.storage_path])
    await supabase.from('files').delete().eq('id', file.id)
    toast.success('File dihapus')
    loadFiles()
  }

  async function copyLink(file: any) {
    const link = `${appUrl}/share/${file.share_token}`
    await navigator.clipboard.writeText(link)
    toast.success('Link disalin!')
  }

  async function shareLink(file: any) {
    const link = `${appUrl}/share/${file.share_token}`
    if (navigator.share) {
      navigator.share({ title: file.original_name, url: link })
    } else {
      await navigator.clipboard.writeText(link)
      toast.success('Link disalin ke clipboard!')
    }
  }

  function getIcon(mime: string, name: string) {
    if (!mime && name) {
      const ext = name.split('.').pop()?.toLowerCase()
      if (ext === 'pdf') return { icon: 'ti-file-type-pdf', color: '#ff6b7a', bg: 'rgba(255,107,122,0.1)' }
      if (['doc','docx'].includes(ext||'')) return { icon: 'ti-file-type-doc', color: '#5baeff', bg: 'rgba(91,174,255,0.1)' }
      if (['xls','xlsx'].includes(ext||'')) return { icon: 'ti-file-spreadsheet', color: '#2dd6a0', bg: 'rgba(45,214,160,0.1)' }
      if (['ppt','pptx'].includes(ext||'')) return { icon: 'ti-file-type-ppt', color: '#ffb347', bg: 'rgba(255,179,71,0.1)' }
      if (['jpg','jpeg','png','webp'].includes(ext||'')) return { icon: 'ti-photo', color: '#a594ff', bg: 'rgba(124,108,255,0.1)' }
      if (ext === 'zip') return { icon: 'ti-file-zip', color: '#ffb347', bg: 'rgba(255,179,71,0.1)' }
    }
    if (mime?.includes('pdf')) return { icon: 'ti-file-type-pdf', color: '#ff6b7a', bg: 'rgba(255,107,122,0.1)' }
    if (mime?.includes('word') || mime?.includes('document')) return { icon: 'ti-file-type-doc', color: '#5baeff', bg: 'rgba(91,174,255,0.1)' }
    if (mime?.includes('sheet') || mime?.includes('excel')) return { icon: 'ti-file-spreadsheet', color: '#2dd6a0', bg: 'rgba(45,214,160,0.1)' }
    if (mime?.includes('presentation') || mime?.includes('powerpoint')) return { icon: 'ti-file-type-ppt', color: '#ffb347', bg: 'rgba(255,179,71,0.1)' }
    if (mime?.includes('image')) return { icon: 'ti-photo', color: '#a594ff', bg: 'rgba(124,108,255,0.1)' }
    return { icon: 'ti-file', color: '#9896b8', bg: 'rgba(152,150,184,0.1)' }
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024*1024) return (bytes/1024).toFixed(0) + ' KB'
    return (bytes/1024/1024).toFixed(1) + ' MB'
  }

  function canPreview(file: any) {
    const m = file.mime_type || ''
    const n = file.original_name || ''
    return m.includes('image') || m.includes('pdf') || n.endsWith('.pdf') || ['jpg','jpeg','png','webp'].some(e => n.endsWith(e))
  }

  return (
    <Layout title="Dokumen">
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18, flexWrap:'wrap' }}>
        {/* Search */}
        <div style={{ display:'flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,0.1)', borderRadius:8, padding:'7px 12px', background:'#13131a', width:220 }}>
          <i className="ti ti-search" style={{ fontSize:14, color:'#5c5a7a' }}></i>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari file..." style={{ border:'none', background:'transparent', flex:1, padding:0, fontSize:12, outline:'none' }} />
        </div>

        {/* Folder filter */}
        <select value={folder} onChange={e => setFolder(e.target.value)} style={{ fontSize:12, padding:'7px 10px', width:'auto' }}>
          <option>Semua</option>
          {FOLDERS.map(f => <option key={f}>{f}</option>)}
        </select>

        <div style={{ marginLeft:'auto', display:'flex', gap:8, alignItems:'center' }}>
          {/* Upload folder & access select */}
          <select value={selectedFolder} onChange={e => setSelectedFolder(e.target.value)} style={{ fontSize:12, padding:'7px 10px', width:'auto' }}>
            {FOLDERS.map(f => <option key={f}>{f}</option>)}
          </select>
          <select value={access} onChange={e => setAccess(e.target.value as any)} style={{ fontSize:12, padding:'7px 10px', width:'auto' }}>
            <option value="public">Public</option>
            <option value="team">Team Only</option>
            <option value="private">Private</option>
          </select>
          <label style={{ background:'#7c6cff', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:5, fontWeight:600 }}>
            <i className="ti ti-upload" style={{ fontSize:14 }}></i>
            {uploading ? `Mengupload... ${progress}%` : 'Upload File'}
            <input ref={fileInputRef} type="file" accept={ACCEPT} onChange={handleUpload} style={{ display:'none' }} disabled={uploading} />
          </label>
        </div>
      </div>

      {/* Progress bar */}
      {uploading && (
        <div style={{ marginBottom:16, background:'#13131a', borderRadius:8, height:6, overflow:'hidden' }}>
          <div style={{ height:'100%', background:'#7c6cff', width:`${progress}%`, transition:'width .3s', borderRadius:8 }}></div>
        </div>
      )}

      {/* Folders overview */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:22 }}>
        {FOLDERS.map(f => {
          const count = files.filter(x => x.folder === f).length
          return (
            <div key={f} onClick={() => setFolder(f === folder ? 'Semua' : f)} style={{ background:'#13131a', border:`1px solid ${folder===f ? 'rgba(124,108,255,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius:12, padding:13, cursor:'pointer', transition:'all .15s' }}>
              <div style={{ width:32, height:32, borderRadius:8, background:'rgba(124,108,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:8 }}>
                <i className="ti ti-folder-filled" style={{ fontSize:18, color:'#a594ff' }}></i>
              </div>
              <div style={{ fontSize:12, fontWeight:600, color:'#f0efff' }}>{f}</div>
              <div style={{ fontSize:10, color:'#5c5a7a', marginTop:2 }}>{count} file</div>
            </div>
          )
        })}
      </div>

      {/* File list */}
      <div style={{ fontFamily:'Syne,sans-serif', fontSize:12, fontWeight:700, color:'#f0efff', marginBottom:10 }}>
        File {folder !== 'Semua' ? `— ${folder}` : 'Semua'} ({filtered.length})
      </div>
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:40, color:'#5c5a7a', fontSize:13 }}>
          {uploading ? 'Mengupload...' : 'Belum ada file. Upload file pertama kamu!'}
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {filtered.map(file => {
            const ic = getIcon(file.mime_type, file.original_name)
            const shareLink = `${appUrl}/share/${file.share_token}`
            return (
              <div key={file.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:'#13131a', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, transition:'all .12s' }}>
                <div style={{ width:34, height:34, borderRadius:8, background:ic.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <i className={`ti ${ic.icon}`} style={{ fontSize:18, color:ic.color }}></i>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:'#f0efff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.original_name}</div>
                  <div style={{ fontSize:10, color:'#5c5a7a', marginTop:2, display:'flex', gap:8 }}>
                    <span>{file.profiles?.name || '—'}</span>
                    <span>{file.size_bytes ? formatSize(file.size_bytes) : '—'}</span>
                    <span>{file.folder}</span>
                    <span style={{ color: file.access === 'public' ? '#2dd6a0' : file.access === 'private' ? '#ff6b7a' : '#5baeff' }}>
                      {file.access === 'public' ? '🌐 Public' : file.access === 'private' ? '🔒 Private' : '👥 Team'}
                    </span>
                    <span>{new Date(file.created_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {canPreview(file) && (
                    <button className="btn" onClick={() => setPreview(file)} title="Preview" style={{ padding:'5px 10px', fontSize:11 }}>
                      <i className="ti ti-eye"></i> Preview
                    </button>
                  )}
                  <a href={file.public_url} target="_blank" rel="noopener noreferrer" className="btn" style={{ padding:'5px 10px', fontSize:11 }} title="Buka file">
                    <i className="ti ti-external-link"></i> Open
                  </a>
                  <a href={file.public_url} download={file.original_name} className="btn" style={{ padding:'5px 10px', fontSize:11 }} title="Download">
                    <i className="ti ti-download"></i> Download
                  </a>
                  <button className="btn" onClick={() => copyLink(file)} title="Salin link" style={{ padding:'5px 10px', fontSize:11 }}>
                    <i className="ti ti-link"></i> Copy Link
                  </button>
                  <button className="btn" onClick={() => shareLink(file)} title="Bagikan" style={{ padding:'5px 10px', fontSize:11 }}>
                    <i className="ti ti-share"></i> Share
                  </button>
                  {(profile?.role === 'admin' || file.uploaded_by === profile?.id) && (
                    <button className="btn btn-danger" onClick={() => handleDelete(file)} style={{ padding:'5px 8px', fontSize:11 }}>
                      <i className="ti ti-trash"></i>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="modal-overlay" onClick={() => setPreview(null)}>
          <div style={{ background:'#13131a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:16, padding:20, width:'90vw', maxWidth:900, maxHeight:'90vh', overflow:'hidden', display:'flex', flexDirection:'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:600, color:'#f0efff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{preview.original_name}</div>
              <div style={{ display:'flex', gap:8 }}>
                <a href={preview.public_url} download className="btn" style={{ fontSize:11 }}><i className="ti ti-download"></i> Download</a>
                <button onClick={() => copyLink(preview)} className="btn" style={{ fontSize:11 }}><i className="ti ti-link"></i> Copy Link</button>
                <button onClick={() => setPreview(null)} style={{ background:'transparent', border:'none', color:'#9896b8', fontSize:20, cursor:'pointer' }}>✕</button>
              </div>
            </div>
            <div style={{ flex:1, overflow:'auto', borderRadius:8, background:'#0c0c10' }}>
              {preview.mime_type?.includes('image') || ['jpg','jpeg','png','webp'].some((e:string) => preview.original_name?.endsWith(e)) ? (
                <img src={preview.public_url} alt={preview.original_name} style={{ maxWidth:'100%', maxHeight:'70vh', display:'block', margin:'auto' }} />
              ) : preview.mime_type?.includes('pdf') || preview.original_name?.endsWith('.pdf') ? (
                <iframe src={preview.public_url} style={{ width:'100%', height:'70vh', border:'none' }}></iframe>
              ) : (
                <div style={{ textAlign:'center', padding:40, color:'#5c5a7a' }}>
                  <i className="ti ti-file" style={{ fontSize:48, display:'block', marginBottom:12 }}></i>
                  Preview tidak tersedia untuk format ini.<br />
                  <a href={preview.public_url} target="_blank" rel="noopener" style={{ color:'#a594ff', marginTop:8, display:'inline-block' }}>Buka di tab baru →</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
