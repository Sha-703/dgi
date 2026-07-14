import { useState, useEffect, createContext, useContext, useCallback } from "react";

const BASE_URL = '/api';
const getToken = () => localStorage.getItem('dgi_token');
const setToken = (t) => localStorage.setItem('dgi_token', t);
const removeToken = () => localStorage.removeItem('dgi_token');

async function apiRequest(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Token ${token}`;
  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);
  let res;
  try { res = await fetch(`${BASE_URL}${path}`, options); }
  catch { throw new Error("Impossible de joindre le serveur. Vérifiez que Django est lancé sur le port 8000."); }
  if (res.status === 204) return null;
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.detail || data?.error || data?.non_field_errors?.[0]
      || Object.values(data)?.[0]?.[0] || `Erreur ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

const api = {
  login:  (login, password) => apiRequest('POST', '/auth/login/', { login, password }),
  logout: () => apiRequest('POST', '/auth/logout/'),
  register: (data) => apiRequest('POST', '/contribuables/register/', data),
  getDeclarations: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiRequest('GET', `/declarations/${qs ? '?' + qs : ''}`);
  },
  soumettreDeclaration: (data) => apiRequest('POST', '/declarations/', data),
  validerDeclaration: (id, statut, motif_rejet = '') =>
    apiRequest('PATCH', `/declarations/${id}/`, { statut, motif_rejet }),
  getContribuables: () => apiRequest('GET', '/contribuables/'),
  getPaiements: () => apiRequest('GET', '/paiements/'),
  creerPaiement: (data) => apiRequest('POST', '/paiements/', data),
  getStatistiques: (annee) => apiRequest('GET', `/statistiques/${annee ? '?annee=' + annee : ''}`),
};

const C = {
  navy:"#0A1628",navyMid:"#112240",gold:"#C8A84B",emerald:"#1A7A4A",
  crimson:"#C0392B",sky:"#1B6CA8",slate:"#4A5568",fog:"#E8EDF4",
  white:"#FFFFFF",offWhite:"#F5F7FA",
};
const AuthCtx = createContext(null);
const useAuth = () => useContext(AuthCtx);
const formatCDF = (n) => new Intl.NumberFormat("fr-CD",{style:"currency",currency:"CDF",maximumFractionDigits:0}).format(n??0);
const MOIS=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";
const moisLabel = (m) => MOIS[(parseInt(m)||1)-1];

const StatutBadge = ({statut}) => {
  const cfg={EN_ATTENTE:{bg:"#FFF3CD",color:"#856404",label:"En attente"},VALIDE:{bg:"#D4EDDA",color:"#155724",label:"Validée"},REJETE:{bg:"#F8D7DA",color:"#721C24",label:"Rejetée"},GELE:{bg:"#D1ECF1",color:"#0C5460",label:"Gelée"}}[statut]||{bg:C.fog,color:C.slate,label:statut};
  return <span style={{background:cfg.bg,color:cfg.color,padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,whiteSpace:"nowrap"}}>{cfg.label}</span>;
};
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,gap:12}}>
    <div style={{width:32,height:32,border:`4px solid ${C.fog}`,borderTop:`4px solid ${C.gold}`,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
    <span style={{color:C.slate,fontSize:14}}>Chargement…</span>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
const ErrorBox = ({msg,onRetry}) => (
  <div style={{margin:24,padding:16,background:"#FFF3F3",border:`1px solid ${C.crimson}`,borderRadius:10,color:C.crimson,fontSize:14,display:"flex",alignItems:"center",gap:12}}>
    <span>⚠ {msg}</span>
    {onRetry && <button onClick={onRetry} style={{background:"none",border:`1px solid ${C.crimson}`,borderRadius:6,padding:"4px 12px",color:C.crimson,cursor:"pointer",fontSize:13,flexShrink:0}}>Réessayer</button>}
  </div>
);
const Toast=({msg,ok})=>(
  <div style={{position:"fixed",top:20,right:20,padding:"12px 20px",borderRadius:10,background:ok?C.emerald:C.crimson,color:C.white,fontWeight:600,fontSize:14,zIndex:2000,boxShadow:"0 4px 16px rgba(0,0,0,0.2)"}}>
    <style>{`@keyframes slideIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
    {msg}
  </div>
);

function LoginPage({onLogin, setPage}){
  const [login,setLogin]=useState("");const [pwd,setPwd]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);
  const handleSubmit=async()=>{if(!login||!pwd)return;setError("");setLoading(true);try{const data=await api.login(login,pwd);setToken(data.token);onLogin(data);}catch(e){setError(e.message);}finally{setLoading(false);}};
  const goRegister=()=>setPage('register');

  return(
    <div style={{minHeight:"100vh",background:`linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 60%,#1a3a6e 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{textAlign:"center",marginBottom:36}}>
        <div style={{width:72,height:72,background:C.gold,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",fontSize:32}}>🏛️</div>
        <div style={{color:C.gold,fontWeight:800,fontSize:22,letterSpacing:2,textTransform:"uppercase"}}>DGI Mbanza-Ngungu</div>
        <div style={{color:"rgba(255,255,255,0.55)",fontSize:13,marginTop:4}}>Plateforme de gestion de l'IPER</div>
        <div style={{color:"rgba(255,255,255,0.25)",fontSize:11,marginTop:4,letterSpacing:1}}>Province du Kongo-Central · RDC</div>
      </div>
      <div style={{background:C.white,borderRadius:16,padding:"36px 40px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>
        <h2 style={{margin:"0 0 6px",fontSize:20,color:C.navy}}>Connexion</h2>
        <p style={{margin:"0 0 22px",color:C.slate,fontSize:14}}>Accédez à votre espace personnel.</p>
        {[{label:"Identifiant",val:login,set:setLogin,type:"text",ph:"agent@dgi"},{label:"Mot de passe",val:pwd,set:setPwd,type:"password",ph:"••••••••"}].map(f=>(
          <label key={f.label} style={{display:"block",marginBottom:14}}>
            <span style={{fontSize:13,fontWeight:600,color:C.slate,display:"block",marginBottom:6}}>{f.label}</span>
            <input type={f.type} value={f.val} onChange={e=>f.set(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleSubmit()} placeholder={f.ph}
              style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"}}/>
          </label>
        ))}
        {error&&<div style={{background:"#FFF3F3",border:`1px solid #F5C6CB`,borderRadius:8,padding:"10px 14px",color:C.crimson,fontSize:13,marginBottom:14}}>{error}</div>}
        <button onClick={handleSubmit} disabled={loading||!login||!pwd}
          style={{width:"100%",padding:12,background:loading?C.slate:C.navy,color:C.white,border:"none",borderRadius:8,fontSize:15,fontWeight:700,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",marginBottom:20}}>
          {loading?"Connexion…":"Se connecter"}
        </button>
        
        <div style={{marginTop:12, textAlign:"center"}}>
          <button onClick={goRegister} style={{background:"none",border:"none",color:C.gold,cursor:"pointer",fontSize:13}}>Créer un compte</button>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({onLogin, setPage}) {
  const [login, setLogin] = useState("");
  const [pwd, setPwd] = useState("");
  const [raisonSociale, setRaisonSociale] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!login || !pwd || !raisonSociale) {
      setError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.register({
        login,
        password: pwd,
        raison_sociale: raisonSociale,
        email,
        telephone: phone,
        adresse_physique: adresse
      });
      const loginData = await api.login(login, pwd);
      setToken(loginData.token);
      onLogin(loginData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: `linear-gradient(135deg,${C.navy} 0%,${C.navyMid} 60%,#1a3a6e 100%)`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ width: 72, height: 72, background: C.gold, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: 32 }}>🏛️</div>
        <div style={{ color: C.gold, fontWeight: 800, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" }}>Créer un compte</div>
        <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginTop: 4 }}>Rejoignez la plateforme DGI.</div>
      </div>
      <div style={{ background: C.white, borderRadius: 16, padding: "30px 36px", width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <h2 style={{ margin: "0 0 6px", fontSize: 20, color: C.navy }}>Inscription</h2>
        <p style={{ margin: "0 0 20px", color: C.slate, fontSize: 14 }}>Créez votre compte contribuable.</p>

        {error && <div style={{ background: "#FFF3F3", border: `1px solid ${C.crimson}`, borderRadius: 8, padding: 12, marginBottom: 16, color: C.crimson, fontSize: 13 }}>{error}</div>}

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: `1px solid ${C.fog}`, paddingBottom: 6 }}>Informations Entreprise</div>
          
          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Raison Sociale *</span>
            <input type="text" value={raisonSociale} onChange={e => setRaisonSociale(e.target.value)} placeholder="Nom de l'entreprise"
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </label>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <label>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Email (Optionnel)</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contact@cie.com"
                style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </label>
            <label>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Téléphone (Optionnel)</span>
              <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+243..."
                style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </label>
          </div>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Adresse physique (Optionnel)</span>
            <input type="text" value={adresse} onChange={e => setAdresse(e.target.value)} placeholder="Adresse de l'entreprise"
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </label>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, borderBottom: `1px solid ${C.fog}`, paddingBottom: 6 }}>Identifiants de connexion</div>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Identifiant (Login) *</span>
            <input type="text" value={login} onChange={e => setLogin(e.target.value)} placeholder="ex: contrib@dgi.com"
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </label>

          <label style={{ display: "block", marginBottom: 16 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.slate, display: "block", marginBottom: 4 }}>Mot de passe *</span>
            <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} placeholder="••••••••"
              style={{ width: "100%", padding: "8px 12px", border: `1.5px solid ${C.fog}`, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </label>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 700, fontFamily: "inherit", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "#aaa" : C.navy, color: C.white }}>
          {loading ? "Création..." : "Créer le compte et se connecter"}
        </button>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <button onClick={() => setPage('login')} style={{ background: "none", border: "none", color: C.slate, cursor: "pointer", fontSize: 13 }}>Déjà un compte ? Se connecter</button>
        </div>
      </div>
    </div>
  );
}


function Shell({children,activePage,setPage}){
  const {user,logout}=useAuth();
  const isAgent=user.role==="AGENT"||user.role==="ADMIN";
  const nav=isAgent
    ?[{id:"dashboard",icon:"📊",label:"Tableau de bord"},{id:"declarations",icon:"📋",label:"Déclarations"},{id:"contribuables",icon:"🏢",label:"Contribuables"},{id:"paiements",icon:"💳",label:"Paiements"},{id:"creer-paiement",icon:"➕",label:"Créer paiement"}]
    :[{id:"dashboard",icon:"🏠",label:"Mon espace"},{id:"nouvelle-declaration",icon:"➕",label:"Nouvelle déclaration"},{id:"mes-declarations",icon:"📋",label:"Mes déclarations"}];
  return(
    <div style={{display:"flex",minHeight:"100vh"}}>
      <aside style={{width:230,background:C.navy,display:"flex",flexDirection:"column",flexShrink:0,position:"sticky",top:0,height:"100vh"}}>
        <div style={{padding:"22px 18px 16px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{color:C.gold,fontWeight:800,fontSize:15,letterSpacing:1}}>DGI IPER</div>
          <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginTop:2}}>Mbanza-Ngungu</div>
        </div>
        <nav style={{flex:1,padding:"14px 10px"}}>
          {nav.map(item=>(
            <button key={item.id} onClick={()=>setPage(item.id)}
              style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 12px",background:activePage===item.id?"rgba(200,168,75,0.15)":"transparent",color:activePage===item.id?C.gold:"rgba(255,255,255,0.6)",border:"none",borderRadius:8,cursor:"pointer",fontSize:14,textAlign:"left",fontFamily:"inherit",fontWeight:activePage===item.id?600:400,borderLeft:activePage===item.id?`3px solid ${C.gold}`:"3px solid transparent",transition:"all 0.15s"}}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"14px 18px",borderTop:"1px solid rgba(255,255,255,0.08)"}}>
          <div style={{color:C.white,fontSize:13,fontWeight:600,marginBottom:2}}>{user.profile?.nom||user.login}</div>
          <div style={{color:"rgba(255,255,255,0.3)",fontSize:11,marginBottom:10}}>{user.role==="CONTRIBUABLE"?`NIF: ${user.profile?.nif}`:user.profile?.matricule}</div>
          <button onClick={logout} style={{width:"100%",padding:7,background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>Déconnexion</button>
        </div>
      </aside>
      <main style={{flex:1,background:C.offWhite,overflow:"auto"}}>{children}</main>
    </div>
  );
}

function DashboardAgent(){
  const [stats,setStats]=useState(null);const [declarations,setDeclarations]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{const[s,d]=await Promise.all([api.getStatistiques(),api.getDeclarations()]);setStats(s);setDeclarations(d);}catch(e){setError(e.message);}finally{setLoading(false);};},[]);
  useEffect(()=>{load();},[load]);
  if(loading)return<Spinner/>;if(error)return<ErrorBox msg={error} onRetry={load}/>;
  const kpis=[{label:"Total déclarations",value:stats.total_declarations,icon:"📋",color:C.sky},{label:"En attente",value:stats.declarations_en_attente,icon:"⏳",color:"#E67E22"},{label:"Validées",value:stats.declarations_validees,icon:"✅",color:C.emerald},{label:"Rejetées",value:stats.declarations_rejetees,icon:"❌",color:C.crimson}];
  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Tableau de bord</h1>
      <p style={{margin:"0 0 26px",color:C.slate,fontSize:14}}>Vue d'ensemble — Exercice {stats.annee}</p>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:26}}>
        {kpis.map(s=>(
          <div key={s.label} style={{background:C.white,borderRadius:12,padding:20,borderTop:`4px solid ${s.color}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:26,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:13,color:C.slate}}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:12,padding:26,marginBottom:26,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{color:"rgba(255,255,255,0.4)",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:6}}>Total recouvré — IPER {stats.annee}</div>
          <div style={{color:C.gold,fontSize:34,fontWeight:800}}>{formatCDF(stats.total_recouvre ?? 0)}</div>
          <div style={{color:"rgba(255,255,255,0.35)",fontSize:12,marginTop:4}}>{stats.nb_contribuables} contribuables · {stats.nb_agents} agents</div>
        </div>
        <div style={{fontSize:52,opacity:0.15}}>🏦</div>
      </div>
      <div style={{background:C.white,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflowX:"auto"}}>
        <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.fog}`}}><h3 style={{margin:0,fontSize:15,color:C.navy}}>Déclarations récentes</h3></div>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
          <thead><tr style={{background:C.offWhite}}>{["Entreprise","NIF","Période","Montant IPER","Statut","Soumis le"].map(h=><th key={h} style={{padding:"9px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
          <tbody>
            {declarations.slice(0,6).map(d=>(
              <tr key={d.id_declaration} style={{borderBottom:`1px solid ${C.fog}`}}>
                <td style={{padding:"11px 16px",fontWeight:600,fontSize:14,color:C.navy}}>{d.contribuable_nom}</td>
                <td style={{padding:"11px 16px",fontSize:12,fontFamily:"monospace",color:C.slate}}>{d.contribuable_nif}</td>
                <td style={{padding:"11px 16px",fontSize:14}}>{moisLabel(d.mois_fiscal)} {d.annee_fiscale}</td>
                <td style={{padding:"11px 16px",fontSize:14,fontWeight:600}}>{formatCDF(d.montant_iper)}</td>
                <td style={{padding:"11px 16px"}}><StatutBadge statut={d.statut}/></td>
                <td style={{padding:"11px 16px",fontSize:13,color:C.slate}}>{fmtDate(d.date_soumission)}</td>
              </tr>
            ))}
            {declarations.length===0&&<tr><td colSpan={6} style={{padding:30,textAlign:"center",color:C.slate}}>Aucune déclaration.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DeclarationsAgent(){
  const [declarations,setDeclarations]=useState([]);const [filtreStatut,setFiltreStatut]=useState("TOUS");const [loading,setLoading]=useState(true);const [error,setError]=useState(null);const [modal,setModal]=useState(null);const [motif,setMotif]=useState("");const [saving,setSaving]=useState(false);const [toast,setToast]=useState(null);
  const showToast=(msg,ok=true)=>{setToast({msg,ok});setTimeout(()=>setToast(null),3000);};
  const load=useCallback(async()=>{setLoading(true);setError(null);try{const params=filtreStatut!=="TOUS"?{statut:filtreStatut}:{};setDeclarations(await api.getDeclarations(params));}catch(e){setError(e.message);}finally{setLoading(false);};},[filtreStatut]);
  useEffect(()=>{load();},[load]);
  const handleAction = async () => {
  if (!modal) return;
  setSaving(true);
  try {
    const updated = await api.validerDeclaration(
      modal.decl.id_declaration,
      modal.action,
      motif
    );
    // Update state
    setDeclarations((prev) =>
      prev.map((d) => (d.id_declaration === updated.id_declaration ? updated : d))
    );
    // Dispatch event to refresh dashboard stats
    window.dispatchEvent(new Event('refreshStats'));
    showToast(
      modal.action === "VALIDE"
        ? "✓ Déclaration validée"
        : "Déclaration rejetée"
    );
    setModal(null);
    setMotif("");
  } catch (e) {
    showToast(e.message, false);
  } finally {
    setSaving(false);
  }
};
  const filtered=filtreStatut==="TOUS"?declarations:declarations.filter(d=>d.statut===filtreStatut);
  return(
    <div style={{padding:32}}>
      {toast&&<Toast {...toast}/>}
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Gestion des déclarations</h1>
      <p style={{margin:"0 0 20px",color:C.slate,fontSize:14}}>Examinez et traitez les déclarations IPER.</p>
      <div style={{display:"flex",gap:8,marginBottom:20}}>
        {[["TOUS","Toutes"],["EN_ATTENTE","En attente"],["VALIDE","Validées"],["REJETE","Rejetées"]].map(([val,label])=>(
          <button key={val} onClick={()=>setFiltreStatut(val)}
            style={{padding:"8px 16px",borderRadius:20,border:"none",cursor:"pointer",fontSize:13,fontWeight:600,fontFamily:"inherit",background:filtreStatut===val?C.navy:C.white,color:filtreStatut===val?C.white:C.slate,boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}>
            {label}
          </button>
        ))}
      </div>
      {loading?<Spinner/>:error?<ErrorBox msg={error} onRetry={load}/>:(
        <div style={{background:C.white,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:860}}>
            <thead><tr style={{background:C.offWhite}}>{["Entreprise","Période","Base imposable","IPER","Pénalité","Statut","Actions"].map(h=><th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length===0?<tr><td colSpan={7} style={{padding:40,textAlign:"center",color:C.slate}}>Aucune déclaration.</td></tr>:filtered.map(d=>(
                <tr key={d.id_declaration} style={{borderBottom:`1px solid ${C.fog}`}}>
                  <td style={{padding:"11px 14px"}}><div style={{fontWeight:700,fontSize:14,color:C.navy}}>{d.contribuable_nom}</div><div style={{fontSize:11,fontFamily:"monospace",color:C.slate}}>{d.contribuable_nif}</div></td>
                  <td style={{padding:"11px 14px",fontSize:14}}>{moisLabel(d.mois_fiscal)} {d.annee_fiscale}</td>
                  <td style={{padding:"11px 14px",fontSize:14}}>{formatCDF(d.base_imposable)}</td>
                  <td style={{padding:"11px 14px",fontSize:14,fontWeight:700}}>{formatCDF(d.montant_iper)}</td>
                  <td style={{padding:"11px 14px",fontSize:14,color:parseFloat(d.penalite_retard)>0?C.crimson:C.slate}}>{parseFloat(d.penalite_retard)>0?formatCDF(d.penalite_retard):"—"}</td>
                  <td style={{padding:"11px 14px"}}><StatutBadge statut={d.statut}/></td>
                  <td style={{padding:"11px 14px"}}>
                    {d.statut==="EN_ATTENTE"?(
                      <div style={{display:"flex",gap:6}}>
                        <button onClick={()=>setModal({decl:d,action:"VALIDE"})} style={{padding:"5px 11px",background:C.emerald,color:C.white,border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>✓ Valider</button>
                        <button onClick={()=>{setModal({decl:d,action:"REJETE"});setMotif("");}} style={{padding:"5px 11px",background:C.crimson,color:C.white,border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit"}}>✕ Rejeter</button>
                      </div>
                    ):<span style={{fontSize:12,color:C.slate}}>{fmtDate(d.date_validation)}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000}}>
          <div style={{background:C.white,borderRadius:14,padding:32,width:460,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {modal.action==="VALIDE"?(
              <><h3 style={{margin:"0 0 10px",color:C.emerald}}>✓ Confirmer la validation</h3><p style={{color:C.slate,fontSize:14,margin:"0 0 20px"}}>Valider la déclaration de <strong>{modal.decl.contribuable_nom}</strong><br/>Période : {moisLabel(modal.decl.mois_fiscal)} {modal.decl.annee_fiscale} · IPER : <strong>{formatCDF(modal.decl.montant_iper)}</strong></p></>
            ):(
              <><h3 style={{margin:"0 0 8px",color:C.crimson}}>✕ Motif de rejet</h3><p style={{color:C.slate,fontSize:14,margin:"0 0 12px"}}>{modal.decl.contribuable_nom} — {moisLabel(modal.decl.mois_fiscal)} {modal.decl.annee_fiscale}</p><textarea value={motif} onChange={e=>setMotif(e.target.value)} rows={4} placeholder="Motif obligatoire…" style={{width:"100%",padding:12,border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/></>
            )}
            <div style={{display:"flex",gap:10,marginTop:20,justifyContent:"flex-end"}}>
              <button onClick={()=>{setModal(null);setMotif("");}} style={{padding:"10px 20px",background:C.fog,color:C.slate,border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>Annuler</button>
              <button onClick={handleAction} disabled={saving||(modal.action==="REJETE"&&!motif.trim())} style={{padding:"10px 20px",border:"none",borderRadius:8,cursor:"pointer",fontFamily:"inherit",fontWeight:700,color:C.white,background:saving?C.slate:modal.action==="VALIDE"?C.emerald:(motif.trim()?C.crimson:"#ccc")}}>
                {saving?"…":modal.action==="VALIDE"?"Confirmer":"Rejeter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContribuablesAgent(){
  const [contribuables,setContribuables]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);const [searchTerm,setSearchTerm]=useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const raw = await api.getContribuables();
      // Ensure we always store an array for .map()
      const list = Array.isArray(raw) ? raw : (raw?.results || raw?.contribuables || []);
      setContribuables(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(()=>{load();},[load]);
  const filtered = contribuables.filter(c=>c.raison_sociale.toLowerCase().includes(searchTerm.toLowerCase()));
  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Contribuables enregistrés</h1>
      <p style={{margin:"0 0 24px",color:C.slate,fontSize:14}}>{contribuables.length} entreprises assujetties à l'IPER.</p>
<div style={{marginBottom:12}}>
  <input
    type="text"
    placeholder="Rechercher un contribuable..."
    value={searchTerm}
    onChange={e=>setSearchTerm(e.target.value)}
    style={{
      width:"100%",
      padding:"10px 14px",
      border:`1.5px solid ${C.fog}`,
      borderRadius:8,
      fontSize:14,
      outline:"none",
      boxSizing:"border-box",
      fontFamily:"inherit"
    }}
  />
</div>
      {loading?<Spinner/>:error?<ErrorBox msg={error} onRetry={load}/>:(
        <div style={{display:"grid",gap:14}}>
          {filtered.length===0?<div style={{textAlign:"center",padding:40,color:C.slate}}>Aucun contribuable.</div>:filtered.map(c=>(
            <div key={c.id_contribuable} style={{background:C.white,borderRadius:12,padding:22,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontWeight:700,fontSize:17,color:C.navy,marginBottom:4}}>{c.raison_sociale}</div>
                <div style={{fontSize:12,fontFamily:"monospace",color:C.gold,fontWeight:700,marginBottom:4}}>NIF : {c.nif}</div>
                {c.adresse_physique&&<div style={{fontSize:13,color:C.slate}}>📍 {c.adresse_physique}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0}}>
                <div style={{fontSize:24,fontWeight:800,color:C.sky}}>{c.nb_declarations}</div>
                <div style={{fontSize:12,color:C.slate}}>déclaration(s)</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaiementsAgent(){
  const [paiements,setPaiements]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPaiements(await api.getPaiements());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(()=>{load();},[load]);
  const total=paiements.reduce((s,p)=>s+parseFloat(p.montant_paye||0),0);
  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Paiements & quittances</h1>
      <p style={{margin:"0 0 24px",color:C.slate,fontSize:14}}>Historique des versements enregistrés.</p>
      {loading?<Spinner/>:error?<ErrorBox msg={error} onRetry={load}/>:(
        <>
          <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:12,padding:22,marginBottom:22,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{color:"rgba(255,255,255,0.35)",fontSize:11,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Total encaissé</div><div style={{color:C.gold,fontSize:30,fontWeight:800}}>{formatCDF(total)}</div></div>
            <div style={{fontSize:48,opacity:0.12}}>💳</div>
          </div>
          <div style={{background:C.white,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
              <thead><tr style={{background:C.offWhite}}>{["Quittance","Contribuable","Période","Montant payé","Mode","Date"].map(h=><th key={h} style={{padding:"9px 16px",textAlign:"left",fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase"}}>{h}</th>)}</tr></thead>
              <tbody>
                {paiements.length===0?<tr><td colSpan={6} style={{padding:40,textAlign:"center",color:C.slate}}>Aucun paiement.</td></tr>:paiements.map(p=>(
                  <tr key={p.id_paiement} style={{borderBottom:`1px solid ${C.fog}`}}>
                    <td style={{padding:"11px 16px",fontFamily:"monospace",fontSize:12,color:C.emerald,fontWeight:700}}>{p.reference_quittance}</td>
                    <td style={{padding:"11px 16px",fontSize:14,fontWeight:600}}>{p.declaration_info?.contribuable_nom||"—"}</td>
                    <td style={{padding:"11px 16px",fontSize:14}}>{p.declaration_info?`${moisLabel(p.declaration_info.mois_fiscal)} ${p.declaration_info.annee_fiscale}`:"—"}</td>
                    <td style={{padding:"11px 16px",fontSize:14,fontWeight:700}}>{formatCDF(p.montant_paye)}</td>
                    <td style={{padding:"11px 16px",fontSize:13}}>{p.mode_paiement}</td>
                    <td style={{padding:"11px 16px",fontSize:13,color:C.slate}}>{fmtDate(p.date_transaction)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function DashboardContribuable({setPage}){
  const {user}=useAuth();const [declarations,setDeclarations]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const load=useCallback(async()=>{setLoading(true);setError(null);try{setDeclarations(await api.getDeclarations());}catch(e){setError(e.message);}finally{setLoading(false);};},[]);
  useEffect(()=>{load();},[load]);
  if(loading)return<Spinner/>;if(error)return<ErrorBox msg={error} onRetry={load}/>;
  const en_attente=declarations.filter(d=>d.statut==="EN_ATTENTE").length;
  const total_iper=declarations.filter(d=>d.statut==="VALIDE").reduce((s,d)=>s+parseFloat(d.montant_iper||0),0);
  return(
    <div style={{padding:32}}>
      <div style={{background:`linear-gradient(135deg,${C.navy},${C.navyMid})`,borderRadius:16,padding:26,marginBottom:24}}>
        <div style={{color:"rgba(255,255,255,0.4)",fontSize:13,marginBottom:4}}>Bienvenue,</div>
        <div style={{color:C.white,fontSize:22,fontWeight:800,marginBottom:2}}>{user.profile?.nom}</div>
        <div style={{color:C.gold,fontSize:13}}>NIF : {user.profile?.nif}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
        {[{label:"Déclarations soumises",value:declarations.length,color:C.sky,icon:"📋"},{label:"En attente validation",value:en_attente,color:"#E67E22",icon:"⏳"},{label:"IPER validé total",value:formatCDF(total_iper),color:C.emerald,icon:"💰",big:true}].map(s=>(
          <div key={s.label} style={{background:C.white,borderRadius:12,padding:20,borderTop:`4px solid ${s.color}`,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:26,marginBottom:8}}>{s.icon}</div>
            <div style={{fontSize:s.big?15:26,fontWeight:800,color:s.color}}>{s.value}</div>
            <div style={{fontSize:13,color:C.slate}}>{s.label}</div>
          </div>
        ))}
      </div>
      <button onClick={()=>setPage("nouvelle-declaration")} style={{width:"100%",padding:16,background:C.gold,color:C.navy,border:"none",borderRadius:12,fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"inherit",marginBottom:24}}>
        ➕ Soumettre une nouvelle déclaration IPER
      </button>
      {declarations.length>0&&(
        <div style={{background:C.white,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{padding:"16px 22px",borderBottom:`1px solid ${C.fog}`}}><h3 style={{margin:0,fontSize:15}}>Dernières déclarations</h3></div>
          {declarations.slice(0,4).map(d=>(
            <div key={d.id_declaration} style={{padding:"13px 22px",borderBottom:`1px solid ${C.fog}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontWeight:600,fontSize:14,color:C.navy}}>{moisLabel(d.mois_fiscal)} {d.annee_fiscale}</div>
                {d.statut==="REJETE"&&d.motif_rejet&&<div style={{fontSize:12,color:C.crimson,marginTop:3}}>⚠ {d.motif_rejet}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:700,fontSize:15,color:C.navy,marginBottom:4}}>{formatCDF(d.montant_iper)}</div>
                <StatutBadge statut={d.statut}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NouvelleDeclaration({setPage}){
  const [form,setForm]=useState({mois_fiscal:"",annee_fiscale:new Date().getFullYear(),base_imposable:""});const [loading,setLoading]=useState(false);const [error,setError]=useState(null);const [success,setSuccess]=useState(null);
  const TAUX=15;const montant=parseFloat(form.base_imposable)>0?parseFloat(form.base_imposable)*TAUX/100:0;
  const handleSubmit=async()=>{setError(null);setLoading(true);try{const result=await api.soumettreDeclaration({mois_fiscal:parseInt(form.mois_fiscal),annee_fiscale:parseInt(form.annee_fiscale),base_imposable:parseFloat(form.base_imposable)});setSuccess(result);}catch(e){setError(e.message);}finally{setLoading(false);};};
  if(success)return(
    <div style={{padding:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420}}>
      <div style={{fontSize:60,marginBottom:16}}>✅</div>
      <h2 style={{color:C.emerald,margin:"0 0 8px"}}>Déclaration soumise !</h2>
      <p style={{color:C.slate,textAlign:"center",marginBottom:6}}>{moisLabel(success.mois_fiscal)} {success.annee_fiscale}</p>
      <p style={{color:C.navy,fontSize:22,fontWeight:800,marginBottom:6}}>{formatCDF(success.montant_iper)}</p>
      {parseFloat(success.penalite_retard)>0&&<p style={{color:C.crimson,fontSize:14,marginBottom:6}}>+ {formatCDF(success.penalite_retard)} pénalité de retard</p>}
      <p style={{color:C.slate,fontSize:14,marginBottom:24}}>En attente de validation par un agent de la DGI.</p>
      <button onClick={()=>setPage("mes-declarations")} style={{padding:"12px 28px",background:C.navy,color:C.white,border:"none",borderRadius:8,cursor:"pointer",fontSize:15,fontWeight:700,fontFamily:"inherit"}}>Voir mes déclarations →</button>
    </div>
  );
  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Nouvelle déclaration IPER</h1>
      <p style={{margin:"0 0 26px",color:C.slate,fontSize:14}}>Soumettez votre déclaration mensuelle en ligne.</p>
      <div style={{maxWidth:540}}>
        <div style={{background:C.white,borderRadius:12,padding:28,boxShadow:"0 2px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
            <label><span style={{fontSize:13,fontWeight:600,color:C.slate,display:"block",marginBottom:6}}>Mois fiscal *</span>
              <select value={form.mois_fiscal} onChange={e=>setForm(p=>({...p,mois_fiscal:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,fontFamily:"inherit",background:C.white}}>
                <option value="">— Choisir —</option>{MOIS.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </label>
            <label><span style={{fontSize:13,fontWeight:600,color:C.slate,display:"block",marginBottom:6}}>Année fiscale *</span>
              <select value={form.annee_fiscale} onChange={e=>setForm(p=>({...p,annee_fiscale:e.target.value}))} style={{width:"100%",padding:"10px 12px",border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,fontFamily:"inherit",background:C.white}}>
                {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
              </select>
            </label>
          </div>
          <label style={{display:"block",marginBottom:20}}><span style={{fontSize:13,fontWeight:600,color:C.slate,display:"block",marginBottom:6}}>Base imposable (CDF) *</span>
            <input type="number" min="1" value={form.base_imposable} onChange={e=>setForm(p=>({...p,base_imposable:e.target.value}))} placeholder="ex: 4 500 000"
              style={{width:"100%",padding:"10px 14px",border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,fontFamily:"inherit",boxSizing:"border-box"}}/>
          </label>
          {parseFloat(form.base_imposable)>0&&(
            <div style={{background:C.offWhite,borderRadius:10,padding:18,marginBottom:18,borderLeft:`4px solid ${C.gold}`}}>
              <div style={{fontSize:11,fontWeight:700,color:C.slate,textTransform:"uppercase",marginBottom:10}}>Calcul automatique IPER</div>
              {[["Base imposable",formatCDF(parseFloat(form.base_imposable))],["Taux IPER légal",`${TAUX} %`]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:14,marginBottom:5}}><span style={{color:C.slate}}>{k}</span><span style={{fontWeight:600}}>{v}</span></div>
              ))}
              <div style={{height:1,background:C.fog,margin:"10px 0"}}/>
              <div style={{display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,color:C.navy,fontSize:15}}>Montant IPER dû</span>
                <span style={{fontWeight:800,color:C.emerald,fontSize:18}}>{formatCDF(montant)}</span>
              </div>
            </div>
          )}
          {error&&<div style={{background:"#FFF3F3",border:`1px solid ${C.crimson}`,borderRadius:8,padding:12,marginBottom:16,color:C.crimson,fontSize:13}}>⚠ {error}</div>}
          <button onClick={handleSubmit} disabled={loading||!form.mois_fiscal||!parseFloat(form.base_imposable)}
            style={{width:"100%",padding:14,fontSize:15,fontWeight:700,fontFamily:"inherit",border:"none",borderRadius:8,cursor:(loading||!form.mois_fiscal||!form.base_imposable)?"not-allowed":"pointer",background:(loading||!form.mois_fiscal||!form.base_imposable)?"#aaa":C.navy,color:C.white}}>
            {loading?"Soumission en cours…":"Soumettre la déclaration"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MesDeclarations(){
  const [declarations,setDeclarations]=useState([]);const [loading,setLoading]=useState(true);const [error,setError]=useState(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDeclarations(await api.getDeclarations());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(()=>{load();},[load]);
  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Mes déclarations</h1>
      <p style={{margin:"0 0 24px",color:C.slate,fontSize:14}}>Historique complet de vos déclarations IPER.</p>
      {loading?<Spinner/>:error?<ErrorBox msg={error} onRetry={load}/>:declarations.length===0?(
        <div style={{background:C.white,borderRadius:12,padding:48,textAlign:"center",color:C.slate}}><div style={{fontSize:48,marginBottom:12}}>📭</div><p>Aucune déclaration soumise.</p></div>
      ):(
        <div style={{display:"grid",gap:12}}>
          {declarations.map(d=>(
            <div key={d.id_declaration} style={{background:C.white,borderRadius:12,padding:20,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:16,color:C.navy,marginBottom:4}}>{moisLabel(d.mois_fiscal)} {d.annee_fiscale}</div>
                <div style={{fontSize:13,color:C.slate,marginBottom:3}}>Base : {formatCDF(d.base_imposable)}</div>
                <div style={{fontSize:12,color:C.slate}}>Soumis le {fmtDate(d.date_soumission)}{d.agent_nom&&` · Par ${d.agent_nom}`}</div>
                {d.statut==="REJETE"&&d.motif_rejet&&<div style={{marginTop:8,padding:"8px 12px",background:"#FFF3F3",borderRadius:6,fontSize:13,color:C.crimson,borderLeft:`3px solid ${C.crimson}`}}>Motif : {d.motif_rejet}</div>}
              </div>
              <div style={{textAlign:"right",flexShrink:0,marginLeft:20}}>
                <div style={{fontWeight:800,fontSize:18,color:C.navy,marginBottom:4}}>{formatCDF(d.montant_iper)}</div>
                {parseFloat(d.penalite_retard)>0&&<div style={{fontSize:12,color:C.crimson,marginBottom:6}}>+ {formatCDF(d.penalite_retard)} pénalité</div>}
                <StatutBadge statut={d.statut}/>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreatePaymentPage({setPage}){
  const [declarations,setDeclarations]=useState([]);
  const [form,setForm]=useState({montant_paye:"",mode_paiement:"ESPECES",date_transaction:new Date().toISOString().slice(0,10),declaration:""});
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [success,setSuccess]=useState(null);

  const loadDeclarations=useCallback(async() => {
    try{
      const data=await api.getDeclarations();
      // Garder uniquement les déclarations VALIDÉES (payables)
      const valides=data.filter(d => d.statut === 'VALIDE');
      setDeclarations(valides);
    }catch(e){
      setError("Impossible de charger les déclarations : "+e.message);
    }
  },[]);
  useEffect(()=>{loadDeclarations();},[loadDeclarations]);

  const handleChange=e=>setForm(p=>({...p,[e.target.name]:e.target.value}));

  const handleSubmit=async()=>{
    setError(null);
    if(!form.montant_paye||!form.declaration){
      setError("Tous les champs obligatoires (*) doivent être remplis.");
      return;
    }
    if(parseFloat(form.montant_paye)<=0){
      setError("Le montant doit être supérieur à 0.");
      return;
    }
    setLoading(true);
    try{
      const result=await api.creerPaiement({...form,montant_paye:parseFloat(form.montant_paye),declaration:parseInt(form.declaration)});
      setSuccess(result);
    }catch(e){
      setError(e.message);
    }finally{
      setLoading(false);
    }
  };

  const INP={width:"100%",padding:"10px 12px",border:`1.5px solid ${C.fog}`,borderRadius:8,fontSize:14,fontFamily:"inherit",boxSizing:"border-box",background:C.white};
  const LBL={fontSize:13,fontWeight:600,color:C.slate,display:"block",marginBottom:6};

  if(success) return(
    <div style={{padding:32,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:420}}>
      <div style={{fontSize:64,marginBottom:16}}>✅</div>
      <h2 style={{color:C.emerald,margin:"0 0 8px"}}>Paiement enregistré !</h2>
      <p style={{color:C.slate,marginBottom:4}}>Référence quittance : <strong>{success.reference_quittance}</strong></p>
      <p style={{color:C.navy,fontSize:22,fontWeight:800,marginBottom:24}}>{formatCDF(success.montant_paye)}</p>
      <div style={{display:"flex",gap:12}}>
        <button onClick={()=>setSuccess(null)} style={{padding:"10px 22px",background:C.fog,color:C.navy,border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:600,fontFamily:"inherit"}}>Créer un autre</button>
        <button onClick={()=>setPage("paiements")} style={{padding:"10px 22px",background:C.navy,color:C.white,border:"none",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:700,fontFamily:"inherit"}}>Voir les paiements →</button>
      </div>
    </div>
  );

  return(
    <div style={{padding:32}}>
      <h1 style={{margin:"0 0 4px",fontSize:24,color:C.navy}}>Créer un paiement / quittance</h1>
      <p style={{margin:"0 0 26px",color:C.slate,fontSize:14}}>Enregistrez un paiement IPER reçu d'un contribuable.</p>
      <div style={{maxWidth:560}}>
        <div style={{background:C.white,borderRadius:12,padding:28,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",display:"flex",flexDirection:"column",gap:18}}>

          {/* Note : la référence quittance est générée automatiquement par le système */}
          <div style={{background:C.offWhite,borderRadius:8,padding:"10px 14px",fontSize:13,color:C.slate,borderLeft:`3px solid ${C.gold}`}}>
            📋 La référence de la quittance sera générée automatiquement au format <strong>DGI-MBZ-XXXXXXXX</strong>.
          </div>

          {/* Montant */}
          <label style={{display:"block"}}>
            <span style={LBL}>Montant payé (CDF) *</span>
            <input type="number" name="montant_paye" value={form.montant_paye} onChange={handleChange} min="1" placeholder="ex: 45900" style={INP}/>
          </label>

          {/* Mode de paiement */}
          <label style={{display:"block"}}>
            <span style={LBL}>Mode de paiement *</span>
            <select name="mode_paiement" value={form.mode_paiement} onChange={handleChange} style={INP}>
              <option value="ESPECES">Espèces</option>
              <option value="VIREMENT">Virement bancaire</option>
              <option value="CHEQUE">Chèque</option>
              <option value="MOBILE_MONEY">Mobile Money</option>
            </select>
          </label>

          {/* Date */}
          <label style={{display:"block"}}>
            <span style={LBL}>Date de la transaction *</span>
            <input type="date" name="date_transaction" value={form.date_transaction} onChange={handleChange} style={INP}/>
          </label>

          {/* Déclaration liée */}
          <label style={{display:"block"}}>
            <span style={LBL}>Déclaration associée *</span>
            <select name="declaration" value={form.declaration} onChange={handleChange} style={INP}>
              <option value="">— Choisir une déclaration —</option>
              {declarations.map(d=>(
                <option key={d.id_declaration} value={d.id_declaration}>
                  {d.contribuable_nom ? `${d.contribuable_nom} · ` : ""}{moisLabel(d.mois_fiscal)} {d.annee_fiscale} — {formatCDF(d.montant_iper)}
                </option>
              ))}
            </select>
          </label>

          {/* Résumé du montant */}
          {parseFloat(form.montant_paye)>0&&form.declaration&&(
            <div style={{background:C.offWhite,borderRadius:10,padding:16,borderLeft:`4px solid ${C.emerald}`}}>
              <div style={{fontSize:12,fontWeight:700,color:C.slate,textTransform:"uppercase",marginBottom:8}}>Récapitulatif</div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:14}}>
                <span style={{color:C.slate}}>Montant à encaisser</span>
                <span style={{fontWeight:800,color:C.emerald,fontSize:17}}>{formatCDF(parseFloat(form.montant_paye))}</span>
              </div>
            </div>
          )}

          {error&&<div style={{background:"#FFF3F3",border:`1px solid ${C.crimson}`,borderRadius:8,padding:12,color:C.crimson,fontSize:13}}>⚠ {error}</div>}

          <button onClick={handleSubmit} disabled={loading}
            style={{padding:14,fontSize:15,fontWeight:700,fontFamily:"inherit",border:"none",borderRadius:8,cursor:loading?"not-allowed":"pointer",background:loading?"#aaa":C.emerald,color:C.white}}>
            {loading?"Enregistrement…":"💾 Enregistrer le paiement"}
          </button>
        </div>
      </div>
    </div>
  );
}

function App(){
  const [user,setUser]=useState(()=>{const token=localStorage.getItem('dgi_token');const saved=localStorage.getItem('dgi_user');if(token&&saved){try{return JSON.parse(saved);}catch{return null;}}return null;});
  const [page,setPage]=useState("dashboard");
  const login=(data)=>{setUser(data);localStorage.setItem('dgi_user',JSON.stringify(data));setPage("dashboard");};
  const logout=async()=>{try{await api.logout();}catch{}removeToken();localStorage.removeItem('dgi_user');setUser(null);setPage("dashboard");};
  if(!user) {
    if(page === "register") return <RegisterPage onLogin={login} setPage={setPage}/>;
    return <LoginPage onLogin={login} setPage={setPage}/>;
  }
  const isAgent=user.role==="AGENT"||user.role==="ADMIN";
  const renderPage = () => {
    if (isAgent) {
      if (page === "dashboard") return <DashboardAgent />;
      if (page === "declarations") return <DeclarationsAgent />;
      if (page === "contribuables") return <ContribuablesAgent />;
      if (page === "paiements") return <PaiementsAgent />;
      if (page === "creer-paiement") return <CreatePaymentPage setPage={setPage} />;
    } else {
      if (page === "dashboard") return <DashboardContribuable setPage={setPage} />;
      if (page === "nouvelle-declaration") return <NouvelleDeclaration setPage={setPage} />;
      if (page === "mes-declarations") return <MesDeclarations />;
      if (page === "register") return <RegisterPage onLogin={login} setPage={setPage} />;
    }
    return null;
  };
  return(
    <AuthCtx.Provider value={{user,logout}}>
      <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",minHeight:"100vh"}}>
        <Shell activePage={page} setPage={setPage}>{renderPage()}</Shell>
      </div>
    </AuthCtx.Provider>
  );
}
export default App;