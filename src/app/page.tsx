"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Lead = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  status: string;
  created_at: string;
};

type Note = {
  id: string;
  content: string;
  user_email?: string;
  type?: string;
  created_at: string;
};

const STATUS_OPTIONS = [
  "Yeni",
  "Arandı",
  "Ulaşılamadı",
  "İlgileniyor",
  "İptal",
  "Satışa Döndü",
];

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Login State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [leadNotes, setLeadNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [status, setStatus] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Filter, Sort, Pagination State
  const [filters, setFilters] = useState({
    name: "",
    phone: "",
    email: "",
    source: "",
    status: "",
  });
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'}>({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    // Oturum kontrolü
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoginError(error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchLeads = async () => {
    if (!session) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching leads:", error);
    else setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (session) {
      fetchLeads();

      const channel = supabase
        .channel("custom-all-channel")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, () => {
          fetchLeads();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  if (authLoading) {
    return <div className="dashboard-layout" style={{justifyContent: 'center', alignItems: 'center'}}><div className="loader"></div></div>;
  }

  if (!session) {
    return (
      <div className="dashboard-layout" style={{justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-app)'}}>
        <div className="card" style={{width: '100%', maxWidth: '400px', padding: '2rem'}}>
          <h2 style={{textAlign: 'center', marginBottom: '1.5rem', fontFamily: 'Outfit'}}>Giriş Yap</h2>
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Şifre</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {loginError && <p style={{color: 'var(--danger-color)', fontSize: '0.875rem', marginBottom: '1rem'}}>{loginError}</p>}
            <button type="submit" className="btn" style={{width: '100%'}}>Giriş Yap</button>
          </form>
        </div>
      </div>
    );
  }

  const openLeadModal = async (lead: Lead) => {
    setSelectedLead(lead);
    setStatus(lead.status);
    
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching notes:", error);
    else setLeadNotes(data || []);
  };

  const closeLeadModal = () => {
    setSelectedLead(null);
    setNewNote("");
  };

  const handleUpdate = async () => {
    if (!selectedLead) return;
    setIsUpdating(true);

    let hasChanges = false;

    if (status !== selectedLead.status) {
      const { error: statusError } = await supabase
        .from("leads")
        .update({ status })
        .eq("id", selectedLead.id);
      
      if (statusError) console.error("Status update error:", statusError);
      else {
        hasChanges = true;
        // Log status change as a note
        await supabase.from("notes").insert([{ 
          lead_id: selectedLead.id, 
          content: `Durum güncellendi: ${selectedLead.status} ➔ ${status}`,
          user_email: session.user.email,
          type: 'status_change'
        }]);
      }
    }

    if (newNote.trim()) {
      const { error: noteError } = await supabase
        .from("notes")
        .insert([{ 
          lead_id: selectedLead.id, 
          content: newNote,
          user_email: session.user.email,
          type: 'note'
        }]);
      
      if (noteError) console.error("Note insert error:", noteError);
      else hasChanges = true;
    }

    if (hasChanges) {
      await fetchLeads();
      // Yorumları/geçmişi yenilemek için açık olan modalın verilerini tekrar çek
      const { data } = await supabase
        .from("notes")
        .select("*")
        .eq("lead_id", selectedLead.id)
        .order("created_at", { ascending: false });
      if (data) setLeadNotes(data);
    }
    
    setIsUpdating(false);
    setNewNote(""); // Not eklendikten sonra sadece not alanını temizle, modalı kapatma!
  };

  const getStatusClass = (s: string) => {
    const map: Record<string, string> = {
      "Yeni": "yeni",
      "Arandı": "arandi",
      "Ulaşılamadı": "ulasilamadi",
      "İlgileniyor": "ilgileniyor",
      "İptal": "iptal",
      "Satışa Döndü": "satisa-dondu",
    };
    return map[s] || "yeni";
  };

  const totalLeads = leads.length;
  const newLeads = leads.filter(l => l.status === 'Yeni').length;
  const convertedLeads = leads.filter(l => l.status === 'Satışa Döndü').length;

  const renderDashboardTable = () => {
    const dataToShow = leads.slice(0, 10); // Son 10 müşteri
    
    return (
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Ad Soyad</th>
              <th>Telefon</th>
              <th>E-posta</th>
              <th>Kaynak</th>
              <th>Durum</th>
              <th>Tarih</th>
            </tr>
          </thead>
          <tbody>
            {dataToShow.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>
                  Henüz müşteri adayı bulunmuyor.
                </td>
              </tr>
            ) : (
              dataToShow.map((lead) => (
                <tr key={lead.id} onClick={() => openLeadModal(lead)}>
                  <td style={{ fontWeight: 600 }}>{lead.name}</td>
                  <td>{lead.phone || "-"}</td>
                  <td>{lead.email || "-"}</td>
                  <td>{lead.source}</td>
                  <td>
                    <span className={`badge ${getStatusClass(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td>
                    {new Date(lead.created_at).toLocaleDateString("tr-TR", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key: string) => {
    if (sortConfig.key !== key) return <span style={{opacity: 0.3, marginLeft: '4px'}}>↕</span>;
    return <span style={{marginLeft: '4px'}}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  const renderLeadsTable = () => {
    // 1. Filtreleme
    let filteredData = leads.filter((lead) => {
      const matchName = lead.name.toLowerCase().includes(filters.name.toLowerCase());
      const matchPhone = (lead.phone || "").toLowerCase().includes(filters.phone.toLowerCase());
      const matchEmail = (lead.email || "").toLowerCase().includes(filters.email.toLowerCase());
      const matchSource = (lead.source || "").toLowerCase().includes(filters.source.toLowerCase());
      const matchStatus = filters.status === "" || lead.status === filters.status;
      return matchName && matchPhone && matchEmail && matchSource && matchStatus;
    });

    // 2. Sıralama
    filteredData.sort((a: any, b: any) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // 3. Sayfalama
    const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
    // Eğer filtre sonucu sayfa sayısı azalırsa currentPage'i sınırla
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedData = filteredData.slice((safeCurrentPage - 1) * pageSize, safeCurrentPage * pageSize);
    
    return (
      <div>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('name')}>
                    Ad Soyad {renderSortIndicator('name')}
                  </div>
                  <input type="text" placeholder="Ara..." className="filter-input" value={filters.name} onChange={(e) => {setFilters({...filters, name: e.target.value}); setCurrentPage(1);}} />
                </th>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('phone')}>
                    Telefon {renderSortIndicator('phone')}
                  </div>
                  <input type="text" placeholder="Ara..." className="filter-input" value={filters.phone} onChange={(e) => {setFilters({...filters, phone: e.target.value}); setCurrentPage(1);}} />
                </th>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('email')}>
                    E-posta {renderSortIndicator('email')}
                  </div>
                  <input type="text" placeholder="Ara..." className="filter-input" value={filters.email} onChange={(e) => {setFilters({...filters, email: e.target.value}); setCurrentPage(1);}} />
                </th>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('source')}>
                    Kaynak {renderSortIndicator('source')}
                  </div>
                  <input type="text" placeholder="Ara..." className="filter-input" value={filters.source} onChange={(e) => {setFilters({...filters, source: e.target.value}); setCurrentPage(1);}} />
                </th>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('status')}>
                    Durum {renderSortIndicator('status')}
                  </div>
                  <select className="filter-input" value={filters.status} onChange={(e) => {setFilters({...filters, status: e.target.value}); setCurrentPage(1);}} style={{padding: '0.25rem'}}>
                    <option value="">Tümü</option>
                    {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </th>
                <th>
                  <div style={{cursor: 'pointer', userSelect: 'none'}} onClick={() => handleSort('created_at')}>
                    Tarih {renderSortIndicator('created_at')}
                  </div>
                  <div style={{height: '24px', marginTop: '0.5rem'}}></div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)", padding: "3rem" }}>Kayıt bulunamadı.</td></tr>
              ) : (
                paginatedData.map((lead) => (
                  <tr key={lead.id} onClick={() => openLeadModal(lead)}>
                    <td style={{ fontWeight: 600 }}>{lead.name}</td>
                    <td>{lead.phone || "-"}</td>
                    <td>{lead.email || "-"}</td>
                    <td>{lead.source}</td>
                    <td><span className={`badge ${getStatusClass(lead.status)}`}>{lead.status}</span></td>
                    <td>{new Date(lead.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-surface)' }}>
          <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>
            Toplam {filteredData.length} kayıttan {(safeCurrentPage - 1) * pageSize + 1} - {Math.min(safeCurrentPage * pageSize, filteredData.length)} arası gösteriliyor
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn btn-secondary" 
              style={{padding: '0.25rem 0.75rem'}} 
              disabled={safeCurrentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            >
              Önceki
            </button>
            <div style={{display: 'flex', alignItems: 'center', padding: '0 0.5rem', fontSize: '0.875rem'}}>
              Sayfa {safeCurrentPage} / {totalPages}
            </div>
            <button 
              className="btn btn-secondary" 
              style={{padding: '0.25rem 0.75rem'}} 
              disabled={safeCurrentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-layout">
      {/* Mobile Overlay */}
      <div 
        className={`overlay-mobile ${isSidebarOpen ? 'show' : ''}`} 
        onClick={() => setIsSidebarOpen(false)}
      ></div>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          Mini CRM
          <button className="mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>
        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
          >
            <svg style={{marginRight: '12px'}} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            Dashboard
          </button>
          <button 
            className={`nav-item ${activeTab === 'leads' ? 'active' : ''}`}
            onClick={() => { setActiveTab('leads'); setIsSidebarOpen(false); }}
          >
            <svg style={{marginRight: '12px'}} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            Müşteri Adayları
          </button>
          <button 
            className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }}
          >
            <svg style={{marginRight: '12px'}} width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            Raporlar
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="topbar-title">
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>☰</button>
            {activeTab === 'dashboard' ? 'Genel Bakış' : activeTab === 'leads' ? 'Tüm Müşteri Adayları' : 'Raporlar'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{fontSize: '0.875rem', color: 'var(--text-secondary)'}}>{session.user.email}</span>
            <button className="btn btn-secondary" onClick={handleLogout} style={{padding: '0.4rem 0.8rem', fontSize: '0.8rem'}}>
              Çıkış
            </button>
          </div>
        </header>

        <div className="content-area">
          {loading ? (
            <div className="loader"></div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <>
                  <div className="metrics-grid">
                    <div className="metric-card">
                      <div className="metric-title">Toplam Kayıt</div>
                      <div className="metric-value">{totalLeads}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Yeni Bekleyen</div>
                      <div className="metric-value" style={{color: 'var(--primary-color)'}}>{newLeads}</div>
                    </div>
                    <div className="metric-card">
                      <div className="metric-title">Satışa Dönen</div>
                      <div className="metric-value" style={{color: '#10b981'}}>{convertedLeads}</div>
                    </div>
                  </div>

                  <div className="data-section">
                    <div className="data-section-header">
                      <h2>Son 10 Müşteri</h2>
                      <button className="btn btn-secondary" style={{padding: '0.25rem 0.75rem', fontSize: '0.75rem'}} onClick={() => setActiveTab('leads')}>
                        Tümünü Gör
                      </button>
                    </div>
                    {renderDashboardTable()}
                  </div>
                </>
              )}

              {activeTab === 'leads' && (
                <div className="data-section">
                  <div className="data-section-header">
                    <h2>Tüm Müşteri Adayları ({totalLeads})</h2>
                  </div>
                  {renderLeadsTable()}
                </div>
              )}

              {activeTab === 'reports' && (
                <div className="data-section" style={{padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)'}}>
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{margin: '0 auto 1rem', opacity: 0.5}}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p>Raporlar modülü yakında eklenecektir.</p>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Lead Detail Modal */}
      {selectedLead && (
        <div className="modal-overlay" onClick={closeLeadModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">{selectedLead.name}</h2>
                <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem'}}>
                  Kaynak: {selectedLead.source} • Tarih: {new Date(selectedLead.created_at).toLocaleDateString("tr-TR")}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={closeLeadModal} style={{padding: '0.5rem', minWidth: '40px', border: 'none'}}>
                ✕
              </button>
            </div>

            <div className="flex-gap">
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label>İletişim Bilgileri</label>
                <div style={{ padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  <div style={{marginBottom: '0.5rem'}}>
                    {selectedLead.phone ? (
                      <a href={`tel:${selectedLead.phone}`} style={{ textDecoration: 'none', color: 'var(--primary-color)', fontWeight: 600, fontSize: '1.125rem' }}>
                        📞 {selectedLead.phone}
                      </a>
                    ) : "Telefon yok"}
                  </div>
                  <div style={{color: 'var(--text-secondary)', fontSize: '0.875rem'}}>
                    📧 {selectedLead.email || "E-posta yok"}
                  </div>
                </div>
              </div>
              
              <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
                <label>Durum Güncelle</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{height: '42px'}}>
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Yeni Görüşme Notu</label>
              <textarea 
                rows={3} 
                placeholder="Müşteri ile yapılan görüşme hakkında detaylar..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem' }}>
              <button className="btn btn-secondary" onClick={closeLeadModal}>İptal</button>
              <button className="btn" onClick={handleUpdate} disabled={isUpdating}>
                {isUpdating ? "Kaydediliyor..." : "Kaydet ve Kapat"}
              </button>
            </div>

            <div className="notes-list">
              <h3 style={{fontSize: '1.125rem', fontWeight: 600}}>İşlem Geçmişi & Notlar</h3>
              {leadNotes.length === 0 ? (
                <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Henüz işlem geçmişi yok.</p>
              ) : (
                leadNotes.map(note => (
                  <div key={note.id} className="note-item" style={{
                    borderLeft: note.type === 'status_change' ? '3px solid var(--primary-color)' : '3px solid var(--border-color)',
                    backgroundColor: note.type === 'status_change' ? '#eef2ff' : '#f8fafc'
                  }}>
                    <div className="note-meta" style={{display: 'flex', justifyContent: 'space-between'}}>
                      <span>{new Date(note.created_at).toLocaleString("tr-TR")}</span>
                      <span style={{color: 'var(--text-secondary)'}}>{note.user_email || 'Sistem'}</span>
                    </div>
                    <div className="note-content" style={{
                      fontWeight: note.type === 'status_change' ? 500 : 400,
                      color: note.type === 'status_change' ? 'var(--primary-color)' : 'var(--text-primary)'
                    }}>{note.content}</div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
