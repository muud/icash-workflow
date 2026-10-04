"use client";
import { useEffect, useState, useMemo } from "react";
import { api, getStoredToken, setStoredToken } from "../lib/api";
import { TEMPLATES } from "../lib/templates";
import { translations } from "../lib/i18n";

// Format currency
const money = (n) =>
  Number(n || 0).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default function Page() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [tab, setTab] = useState("inbox");
  const [notice, setNotice] = useState(null);
  const [lang, setLang] = useState("so"); // Default to Af-Soomaali

  useEffect(() => {
    try {
      const saved = localStorage.getItem("icash_lang");
      if (saved && (saved === "so" || saved === "en")) setLang(saved);
    } catch {}
  }, []);

  const toggleLang = (l) => {
    setLang(l);
    try {
      localStorage.setItem("icash_lang", l);
    } catch {}
  };

  const t = (k) => translations[lang]?.[k] || translations.en?.[k] || k;

  const flash = (msg, isError = false) => {
    setNotice({ msg, isError });
    setTimeout(() => setNotice(null), 4500);
  };

  const loadMe = async () => {
    try {
      const u = await api.auth.me();
      setUser(u);
    } catch {
      setUser(null);
      setStoredToken(null);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    const token = getStoredToken();
    if (token) loadMe();
    else setAuthLoading(false);

    const handleUnauthorized = () => {
      setUser(null);
      flash(t("sessionExpired") || "Session expired. Please sign in again.", true);
    };
    window.addEventListener("icash:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("icash:unauthorized", handleUnauthorized);
  }, []);

  const handleLogout = () => {
    setStoredToken(null);
    setUser(null);
    flash(lang === "so" ? "Waad ka baxday nidaamka." : "Signed out successfully.");
  };

  if (authLoading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: 12, color: "#94a3b8" }}>
          {lang === "so" ? "Waa la furayaa iCash Workspace..." : "Loading iCash Workspace..."}
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onLoginSuccess={loadMe}
        flash={flash}
        notice={notice}
        t={t}
        lang={lang}
        toggleLang={toggleLang}
      />
    );
  }

  const isAdmin = user.roles?.includes("Admin");
  const hasRole = (...roles) => isAdmin || roles.some((r) => user.roles?.includes(r));

  return (
    <div style={styles.container}>
      {notice && (
        <div style={{ ...styles.toast, background: notice.isError ? "rgba(239, 68, 68, 0.9)" : "rgba(13, 148, 136, 0.9)" }}>
          {notice.msg}
        </div>
      )}

      {/* Glass Header */}
      <header style={styles.header} className="header-responsive">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={styles.logoBadge}>iCash</div>
          <div>
            <h1 style={styles.title}>{t("platformTitle")}</h1>
            <div style={styles.subtitle}>{t("platformSubtitle")}</div>
          </div>
        </div>

        <div style={styles.userInfo}>
          {/* Language Switcher */}
          <div
            style={{
              display: "inline-flex",
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(12px)",
              borderRadius: 10,
              padding: 3,
              border: "1px solid rgba(255, 255, 255, 0.12)",
            }}
          >
            <button
              type="button"
              className="touch-btn"
              onClick={() => toggleLang("so")}
              style={{
                background: lang === "so" ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "transparent",
                color: lang === "so" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: lang === "so" ? "0 2px 10px rgba(13, 148, 136, 0.4)" : "none",
              }}
            >
              🇸🇴 Soomaali
            </button>
            <button
              type="button"
              className="touch-btn"
              onClick={() => toggleLang("en")}
              style={{
                background: lang === "en" ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "transparent",
                color: lang === "en" ? "#ffffff" : "#94a3b8",
                border: "none",
                borderRadius: 8,
                padding: "5px 10px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: lang === "en" ? "0 2px 10px rgba(13, 148, 136, 0.4)" : "none",
              }}
            >
              🇬🇧 English
            </button>
          </div>

          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.06)", padding: "4px 10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #0d9488, #14b8a6)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#fff" }}>
              {(user.full_name || user.email || "U").charAt(0).toUpperCase()}
            </span>
            <span style={styles.userName}>{user.full_name || user.email}</span>
            <span style={styles.roleTag}>{user.roles?.join(", ") || "User"}</span>
          </div>

          <button style={styles.btnGhost} className="touch-btn" onClick={handleLogout}>
            {t("signOut")}
          </button>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav} className="nav-responsive">
        {[
          ["inbox", t("tabInbox")],
          ["requests", t("tabRequests")],
          ...(hasRole("Cashier", "Sales", "Manager") ? [["pos", t("tabSell")]] : []),
          ...(hasRole("Storekeeper", "Warehouse", "Manager") ? [["receive", t("tabReceive")]] : []),
          [["stock", t("tabStock")]],
          ...(hasRole("Manager", "Finance") ? [["closeout", t("tabCloseout")]] : []),
          ...(isAdmin ? [["builder", t("tabBuilder")], ["team", t("tabTeam")]] : []),
        ].map(([key, label]) => (
          <button
            key={key}
            style={tab === key ? styles.tabActive : styles.tab}
            className="touch-btn"
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Tab Panels */}
      <main style={styles.main}>
        {tab === "inbox" && <InboxView flash={flash} user={user} t={t} />}
        {tab === "requests" && <RequestsView flash={flash} t={t} />}
        {tab === "pos" && <PosView flash={flash} user={user} t={t} />}
        {tab === "stock" && <StockView flash={flash} user={user} hasRole={hasRole} t={t} />}
        {tab === "receive" && <ReceiveView flash={flash} t={t} />}
        {tab === "closeout" && <CloseoutView flash={flash} hasRole={hasRole} t={t} />}
        {tab === "builder" && <BuilderView flash={flash} t={t} />}
        {tab === "team" && <TeamView flash={flash} t={t} />}
      </main>
    </div>
  );
}

// ── Auth Screen (Login + Register Company) ───────────────────────────
function AuthScreen({ onLoginSuccess, flash, notice, t, lang, toggleLang }) {
  const [isRegister, setIsRegister] = useState(true); // Default to Onboarding registration
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenantName, setTenantName] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const fillDemo = () => {
    setIsRegister(false);
    setEmail("testadmin@acme.co.ke");
    setPassword("password123");
    flash(lang === "so" ? "Xogtii Demo Admin waa la shubay! Guji 'Gal Nidaamka'." : "Demo Admin credentials loaded! Click Sign In.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return flash(lang === "so" ? "Fadlan geli email-ka iyo furaha sirta." : "Please fill in email and password.", true);
    setBusy(true);
    try {
      let res;
      if (isRegister) {
        if (!tenantName || !fullName) {
          setBusy(false);
          return flash(lang === "so" ? "Fadlan geli magaca shirkadda iyo magacaaga buuxa." : "Please enter company and full name.", true);
        }
        res = await api.auth.registerTenant(tenantName, fullName, email, password);
        flash(lang === "so" ? "Akoonka shirkadda waa la abuuray! Ku soo dhowow iCash." : "Company workspace created! Welcome.");
      } else {
        res = await api.auth.login(email, password);
        flash(lang === "so" ? "Ku soo dhowow mar kale!" : "Welcome back!");
      }
      setStoredToken(res.token);
      await onLoginSuccess();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={styles.authContainer}>
      {notice && (
        <div style={{ ...styles.toast, background: notice.isError ? "rgba(239, 68, 68, 0.92)" : "rgba(13, 148, 136, 0.92)" }}>
          {notice.msg}
        </div>
      )}

      <div className="onboard-grid">
        {/* Left Side: Brand Hero & Value Proposition */}
        <div style={styles.onboardHero} className="onboard-hero-pad">
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <div style={styles.heroLogoBadge}>iCash</div>
                <span style={{ fontSize: 13, letterSpacing: 1.2, textTransform: "uppercase", color: "#e2e8f0", fontWeight: 800 }}>
                  Mtiririko Platform
                </span>
              </div>

              {/* Language Switcher inside Onboarding */}
              <div
                style={{
                  display: "inline-flex",
                  background: "rgba(0, 0, 0, 0.35)",
                  backdropFilter: "blur(12px)",
                  borderRadius: 10,
                  padding: 3,
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                }}
              >
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => toggleLang("so")}
                  style={{
                    background: lang === "so" ? "#ffffff" : "transparent",
                    color: lang === "so" ? "#0f766e" : "#f1f5f9",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: lang === "so" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  🇸🇴 Soomaali
                </button>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => toggleLang("en")}
                  style={{
                    background: lang === "en" ? "#ffffff" : "transparent",
                    color: lang === "en" ? "#0f766e" : "#f1f5f9",
                    border: "none",
                    borderRadius: 7,
                    padding: "5px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: lang === "en" ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                  }}
                >
                  🇬🇧 English
                </button>
              </div>
            </div>

            <div style={{ margin: "34px 0 24px" }}>
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 12px",
                  borderRadius: 99,
                  background: "rgba(20, 184, 166, 0.2)",
                  border: "1px solid rgba(20, 184, 166, 0.4)",
                  color: "#2dd4bf",
                  fontSize: 12,
                  fontWeight: 700,
                  marginBottom: 14,
                  letterSpacing: 0.5,
                }}
              >
                ✦ Wholesale & Supply Flow Engine
              </div>
              <h1
                style={{
                  fontSize: 32,
                  fontWeight: 900,
                  margin: "0 0 12px",
                  lineHeight: 1.22,
                  fontFamily: "'Outfit', sans-serif",
                  letterSpacing: -0.5,
                  color: "#ffffff",
                  textShadow: "0 2px 10px rgba(0,0,0,0.4)",
                }}
              >
                {t("heroTitle")}
              </h1>
              <p style={{ fontSize: 14, color: "#cbd5e1", margin: 0, lineHeight: 1.6 }}>
                {t("heroDesc")}
              </p>
            </div>
          </div>

          {/* Core Feature Cards */}
          <div style={styles.featureGrid} className="feature-grid-responsive">
            <div style={styles.featureCard} className="glass-hover">
              <div style={{ fontSize: 22, marginBottom: 6 }}>📦</div>
              <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>{t("fefoTitle")}</strong>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
                {t("fefoDesc")}
              </div>
            </div>

            <div style={styles.featureCard} className="glass-hover">
              <div style={{ fontSize: 22, marginBottom: 6 }}>⚡</div>
              <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>{t("approvalsTitle")}</strong>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
                {t("approvalsDesc")}
              </div>
            </div>

            <div style={styles.featureCard} className="glass-hover">
              <div style={{ fontSize: 22, marginBottom: 6 }}>💳</div>
              <strong style={{ fontSize: 13, color: "#ffffff", display: "block" }}>{t("touchTitle")}</strong>
              <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>
                {t("touchDesc")}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "#94a3b8" }}>
            <span>🔒 Multi-Tenant Cloud Architecture</span>
            <span>v2.4 Production Ready</span>
          </div>
        </div>

        {/* Right Side: Interactive Morphing Glass Form */}
        <div style={styles.onboardCard} className="onboard-card-pad">
          {/* Segmented Mode Switcher (Register vs Login) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
            <div
              style={{
                display: "inline-flex",
                background: "rgba(0, 0, 0, 0.4)",
                padding: 4,
                borderRadius: 12,
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <button
                type="button"
                className="touch-btn"
                onClick={() => setIsRegister(true)}
                style={{
                  background: isRegister ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "transparent",
                  color: isRegister ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: isRegister ? "0 2px 10px rgba(13, 148, 136, 0.4)" : "none",
                }}
              >
                {lang === "so" ? "Abuur Shirkad" : "New Company"}
              </button>
              <button
                type="button"
                className="touch-btn"
                onClick={() => setIsRegister(false)}
                style={{
                  background: !isRegister ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "transparent",
                  color: !isRegister ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: !isRegister ? "0 2px 10px rgba(13, 148, 136, 0.4)" : "none",
                }}
              >
                {lang === "so" ? "Gal Akoon" : "Sign In"}
              </button>
            </div>

            {/* 1-Click Demo Admin Button */}
            <button
              type="button"
              className="touch-btn"
              style={{
                background: "rgba(13, 148, 136, 0.2)",
                color: "#2dd4bf",
                border: "1px solid rgba(45, 212, 191, 0.4)",
                borderRadius: 10,
                padding: "7px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 0 14px rgba(45, 212, 191, 0.25)",
              }}
              onClick={fillDemo}
            >
              <span>⚡</span> {t("demoAdminBtn")}
            </button>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "#ffffff", fontFamily: "'Outfit', sans-serif", letterSpacing: -0.4 }}>
              {isRegister ? t("launchWorkspace") : t("welcomeBack")}
            </h2>
            <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 4 }}>
              {isRegister
                ? t("onboardSubtitleRegister")
                : t("onboardSubtitleLogin")}
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <>
                <label style={styles.label}>{t("companyNameLabel")}</label>
                <input
                  style={styles.input}
                  placeholder={lang === "so" ? "tusaale: Acme Wholesale Somalia" : "e.g. Acme Wholesale Kenya"}
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  required={isRegister}
                />

                <label style={styles.label}>{t("adminNameLabel")}</label>
                <input
                  style={styles.input}
                  placeholder={lang === "so" ? "tusaale: Cali Maxamed" : "e.g. Amina Hassan"}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={isRegister}
                />
              </>
            )}

            <label style={styles.label}>{t("emailLabel")}</label>
            <input
              style={styles.input}
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <label style={styles.label}>{t("passwordLabel")}</label>
            <input
              style={styles.input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              style={{ ...styles.btnPrimary, width: "100%", marginTop: 22, fontSize: 15, minHeight: 50 }}
              className="touch-btn"
              disabled={busy}
            >
              {busy
                ? (lang === "so" ? "Waa la kicinayaa..." : "Launching Workspace...")
                : isRegister
                ? (lang === "so" ? "Biloow Nidaamkaaga Hadda 🚀" : t("btnLaunch"))
                : (lang === "so" ? "Gal Nidaamka ⚡" : t("btnSignIn"))}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
            <button
              style={styles.btnText}
              type="button"
              className="touch-btn"
              onClick={() => {
                setIsRegister(!isRegister);
              }}
            >
              {isRegister
                ? t("alreadyHaveAccount")
                : t("needNewWorkspace")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 1. Task Inbox ────────────────────────────────────────────────────
function InboxView({ flash, user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});

  const loadInbox = async () => {
    try {
      const data = await api.tasks.inbox();
      setTasks(data);
    } catch (err) {
      flash(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInbox();
  }, []);

  const handleAct = async (taskId, action) => {
    const comment = comments[taskId]?.trim() || null;
    try {
      const res = await api.tasks.act(taskId, action, comment);
      flash(`Task ${action}d. Request status: ${res.request_status}`);
      loadInbox();
    } catch (err) {
      flash(err.message, true);
    }
  };

  const lateCount = tasks.filter((t) => t.overdue).length;

  return (
    <div>
      <div style={styles.viewHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <h2 style={{ margin: 0 }}>Task Inbox</h2>
          {lateCount > 0 && <span style={styles.badgeLate}>{lateCount} overdue</span>}
        </div>
        <button style={styles.btnGhost} onClick={loadInbox}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading pending tasks...</p>
      ) : tasks.length === 0 ? (
        <div style={styles.emptyCard}>All clear! No tasks waiting on your role right now.</div>
      ) : (
        tasks.map((t) => (
          <div key={t.id} style={styles.card}>
            <div style={styles.row}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ fontSize: 16 }}>
                    #{t.request_id} · {t.step}
                  </strong>
                  {t.overdue && <span style={styles.badgeLate}>Overdue</span>}
                </div>
                <div style={styles.metaText}>
                  Waiting on role: <strong>{t.role}</strong>
                  {t.due_at && ` · Due: ${new Date(t.due_at + "Z").toLocaleString("en-KE")}`}
                </div>
                <div style={styles.dataBadge}>
                  {Object.entries(t.data || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("  |  ")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                {t.type === "task" ? (
                  <button style={styles.btnPrimary} onClick={() => handleAct(t.id, "complete")}>
                    Mark Done
                  </button>
                ) : (
                  <>
                    <button style={styles.btnPrimary} onClick={() => handleAct(t.id, "approve")}>
                      Approve
                    </button>
                    <button style={styles.btnDanger} onClick={() => handleAct(t.id, "reject")}>
                      Reject
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Workflow Step Tracker */}
            <StepTrack steps={t.steps} />

            <div style={{ marginTop: 12 }}>
              <input
                style={styles.inputSmall}
                placeholder="Optional review comment or note..."
                value={comments[t.id] || ""}
                onChange={(e) => setComments({ ...comments, [t.id]: e.target.value })}
              />
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ── 2. Requests & Dynamic Forms ──────────────────────────────────────
function RequestsView({ flash }) {
  const [workflows, setWorkflows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedWfIdx, setSelectedWfIdx] = useState(0);
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      const [wfs, reqs] = await Promise.all([api.workflows.list(), api.requests.list()]);
      setWorkflows(wfs);
      setRequests(reqs);
      if (wfs.length > 0) setFormData({});
    } catch (err) {
      flash(err.message, true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeWorkflow = workflows[selectedWfIdx];

  const handleStartRequest = async (e) => {
    e.preventDefault();
    if (!activeWorkflow) return;
    setSubmitting(true);
    try {
      const res = await api.requests.create(activeWorkflow.id, formData);
      flash(`Request #${res.id} created successfully! Status: ${res.status}`);
      setFormData({});
      loadData();
    } catch (err) {
      flash(err.message, true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>Start & Track Requests</h2>

      <div style={styles.card}>
        <strong style={{ fontSize: 16 }}>Submit New Request</strong>
        {workflows.length === 0 ? (
          <p style={{ color: "#94a3b8", marginTop: 8 }}>
            No workflows published yet. An Admin can publish workflows from the Workflow Builder.
          </p>
        ) : (
          <form onSubmit={handleStartRequest} style={{ marginTop: 12 }}>
            <label style={styles.label}>Select Workflow</label>
            <select
              style={styles.input}
              value={selectedWfIdx}
              onChange={(e) => {
                setSelectedWfIdx(Number(e.target.value));
                setFormData({});
              }}
            >
              {workflows.map((w, idx) => (
                <option key={w.id} value={idx}>
                  {w.name} (v{w.version})
                </option>
              ))}
            </select>

            {/* Dynamic fields from workflow version schema */}
            <div style={styles.gridTwo}>
              {(activeWorkflow?.fields || []).map((f) => (
                <div key={f.key}>
                  <label style={styles.label}>
                    {f.label} {f.required && <span style={{ color: "#ef4444" }}>*</span>}
                  </label>
                  {f.type === "select" ? (
                    <select
                      style={styles.input}
                      value={formData[f.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      required={f.required}
                    >
                      <option value="">Select option...</option>
                      {(f.options || []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      style={styles.input}
                      type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                      step={f.type === "number" ? "any" : undefined}
                      value={formData[f.key] || ""}
                      onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                      required={f.required}
                    />
                  )}
                </div>
              ))}
            </div>

            <button style={{ ...styles.btnPrimary, marginTop: 14 }} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        )}
      </div>

      <h3 style={{ margin: "24px 0 12px" }}>Active & Past Requests</h3>
      {requests.length === 0 ? (
        <div style={styles.emptyCard}>No requests submitted yet.</div>
      ) : (
        requests.map((r) => (
          <div key={r.id} style={styles.card}>
            <div style={styles.row}>
              <div>
                <strong>
                  #{r.id} · {r.workflow}
                </strong>
                <div style={styles.metaText}>
                  Submitted: {new Date(r.created_at + "Z").toLocaleString("en-KE")}
                </div>
                <div style={styles.dataBadge}>
                  {Object.entries(r.data || {})
                    .map(([k, v]) => `${k}: ${v}`)
                    .join("  |  ")}
                </div>
              </div>
              <span
                style={{
                  ...styles.statusTag,
                  ...(r.status === "done"
                    ? styles.statusDone
                    : r.status === "rejected"
                    ? styles.statusBad
                    : styles.statusRunning),
                }}
              >
                {r.status}
              </span>
            </div>
            <StepTrack steps={r.steps} />
          </div>
        ))
      )}
    </div>
  );
}

// ── 3. Sell / POS ────────────────────────────────────────────────────
function PosView({ flash }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedPid, setSelectedPid] = useState("");
  const [qty, setQty] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [lastReceipt, setLastReceipt] = useState(null);

  const loadPos = async () => {
    try {
      const [prods, custs] = await Promise.all([api.pos.getProducts(), api.pos.getCustomers()]);
      setProducts(prods);
      setCustomers(custs);
      if (prods.length > 0 && !selectedPid) setSelectedPid(prods[0].id);
    } catch (err) {
      flash(err.message, true);
    }
  };

  useEffect(() => {
    loadPos();
  }, []);

  const addToCart = () => {
    const prod = products.find((p) => p.id === Number(selectedPid));
    if (!prod) return;
    const q = Number(qty);
    if (!q || q <= 0) return flash("Quantity must be greater than zero.", true);

    const existing = cart.find((l) => l.product_id === prod.id);
    const totalQty = (existing ? existing.qty : 0) + q;
    if (totalQty > prod.sellable) {
      return flash(`Cannot exceed available sellable stock (${prod.sellable} ${prod.unit}).`, true);
    }

    if (existing) {
      setCart(cart.map((l) => (l.product_id === prod.id ? { ...l, qty: totalQty } : l)));
    } else {
      setCart([
        ...cart,
        {
          product_id: prod.id,
          name: prod.name,
          unit: prod.unit,
          qty: q,
          price: prod.sell_price,
        },
      ]);
    }
    setQty(1);
  };

  const updateCartQty = (pid, delta) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod) return;
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id !== pid) return item;
          const newQty = Math.round((item.qty + delta) * 1000) / 1000;
          if (newQty <= 0) return null;
          if (newQty > prod.sellable) {
            flash(`Cannot exceed available stock (${prod.sellable} ${prod.unit}).`, true);
            return item;
          }
          return { ...item, qty: newQty };
        })
        .filter(Boolean)
    );
  };

  const quickAddProduct = (prod) => {
    if (prod.sellable <= 0) return flash(`${prod.name} is out of stock.`, true);
    const existing = cart.find((l) => l.product_id === prod.id);
    const totalQty = (existing ? existing.qty : 0) + 1;
    if (totalQty > prod.sellable) {
      return flash(`Cannot exceed available stock (${prod.sellable} ${prod.unit}).`, true);
    }
    if (existing) {
      setCart(cart.map((l) => (l.product_id === prod.id ? { ...l, qty: totalQty } : l)));
    } else {
      setCart([
        ...cart,
        {
          product_id: prod.id,
          name: prod.name,
          unit: prod.unit,
          qty: 1,
          price: prod.sell_price,
        },
      ]);
    }
  };

  const removeFromCart = (pid) => {
    setCart(cart.filter((l) => l.product_id !== pid));
  };

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  const handleCheckout = async () => {
    if (cart.length === 0) return flash("Sale cart is empty.", true);
    if (method !== "cash" && !reference.trim()) {
      return flash("Please enter M-Pesa transaction code or card reference slip.", true);
    }

    try {
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        method,
        reference: reference.trim() || null,
        lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      };
      const res = await api.pos.sell(payload);
      flash(`Sale #${res.id} completed! Total: KES ${money(res.total)}`);

      setLastReceipt({
        id: res.id,
        total: res.total,
        cart: [...cart],
        method,
        reference,
        date: new Date().toLocaleString("en-KE"),
      });

      setCart([]);
      setReference("");
      loadPos();
    } catch (err) {
      flash(err.message, true);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>Point of Sale (Wholesale Till)</h2>

      {/* Quick Touch Product Grid */}
      <div style={{ ...styles.card, marginBottom: 14 }}>
        <strong style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
          ⚡ Quick Tap Products (Touch Screen Till)
        </strong>
        <div style={styles.productGrid} className="pos-grid-responsive">
          {products.map((p) => (
            <button
              key={p.id}
              type="button"
              className="touch-btn glass-hover"
              style={{
                ...styles.productTile,
                opacity: p.sellable > 0 ? 1 : 0.45,
              }}
              onClick={() => quickAddProduct(p)}
            >
              <div>
                <strong style={{ fontSize: 13, color: "#ffffff", display: "block", lineHeight: 1.3 }}>{p.name}</strong>
                <span style={{ fontSize: 11, color: "#94a3b8", marginTop: 2, display: "inline-block" }}>
                  {p.sellable} {p.unit} left
                </span>
              </div>
              <div style={{ marginTop: 6, fontWeight: 800, color: "#2dd4bf", fontSize: 14 }}>
                KES {money(p.sell_price)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.gridTwo} className="grid-two-responsive">
        {/* Add Product by Quantity */}
        <div style={styles.card}>
          <strong style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>Manual / Bulk Add</strong>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Product</label>
            <select
              style={styles.input}
              value={selectedPid}
              onChange={(e) => setSelectedPid(e.target.value)}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · Available: {p.sellable} {p.unit} · KES {money(p.sell_price)}
                </option>
              ))}
            </select>

            <label style={styles.label}>Quantity</label>
            <input
              style={styles.input}
              type="number"
              step="any"
              min="0.001"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />

            <button style={{ ...styles.btnGhost, width: "100%", marginTop: 14 }} className="touch-btn" onClick={addToCart}>
              + Add to Sale Cart
            </button>
          </div>
        </div>

        {/* Customer & Payment Method */}
        <div style={styles.card}>
          <strong style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>Customer & Payment</strong>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Customer (Optional)</label>
            <select
              style={styles.input}
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.kind ? `(${c.kind})` : ""}
                </option>
              ))}
            </select>

            <label style={styles.label}>Payment Method</label>
            <select
              style={styles.input}
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="card">Card</option>
            </select>

            {method !== "cash" && (
              <>
                <label style={styles.label}>
                  {method === "mpesa" ? "M-Pesa Reference Code" : "Card Slip Number"}
                </label>
                <input
                  style={styles.input}
                  placeholder="e.g. QKH7189XYZ"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <strong style={{ fontSize: 15, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>Current Sale Cart</strong>
        {cart.length === 0 ? (
          <p style={{ color: "#94a3b8", margin: "10px 0" }}>Cart is currently empty. Tap a product above to add.</p>
        ) : (
          <div style={{ marginTop: 14 }}>
            <div className="table-responsive-wrapper">
              <table style={styles.table}>
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8" }}>
                    <th style={{ textAlign: "left", paddingBottom: 10 }}>Product</th>
                    <th style={{ textAlign: "right", paddingBottom: 10 }}>Qty</th>
                    <th style={{ textAlign: "right", paddingBottom: 10 }}>Unit Price</th>
                    <th style={{ textAlign: "right", paddingBottom: 10 }}>Line Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line) => (
                    <tr key={line.product_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <td style={{ padding: "10px 0" }}>
                        <strong style={{ color: "#ffffff" }}>{line.name}</strong>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap", padding: "10px 0" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            className="touch-btn"
                            style={styles.touchStepBtn}
                            onClick={() => updateCartQty(line.product_id, -1)}
                          >
                            -
                          </button>
                          <span style={{ minWidth: 28, textAlign: "center", fontWeight: 800, color: "#ffffff" }}>
                            {line.qty}
                          </span>
                          <button
                            type="button"
                            className="touch-btn"
                            style={styles.touchStepBtn}
                            onClick={() => updateCartQty(line.product_id, 1)}
                          >
                            +
                          </button>
                          <span style={{ color: "#94a3b8", fontSize: 12 }}>{line.unit}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 8px", color: "#cbd5e1" }}>KES {money(line.price)}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, padding: "10px 8px", color: "#2dd4bf" }}>
                        KES {money(line.qty * line.price)}
                      </td>
                      <td style={{ textAlign: "right", padding: "10px 0" }}>
                        <button
                          style={styles.btnDangerSmall}
                          className="touch-btn"
                          onClick={() => removeFromCart(line.product_id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={styles.cartFooter}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                Total: KES {money(totalAmount)}
              </div>
              <button style={styles.btnPrimary} onClick={handleCheckout}>
                Complete Sale (KES {money(totalAmount)})
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Last Receipt Print Preview */}
      {lastReceipt && (
        <div style={{ ...styles.card, marginTop: 14, border: "2px solid #0d9488" }}>
          <div style={styles.row}>
            <div>
              <strong>Receipt #{lastReceipt.id} Completed</strong>
              <div style={styles.metaText}>{lastReceipt.date}</div>
            </div>
            <button style={styles.btnGhost} onClick={() => window.print()}>
              Print Receipt
            </button>
          </div>
          <div style={{ marginTop: 10, fontSize: 14 }}>
            <div>Method: {lastReceipt.method.toUpperCase()}</div>
            {lastReceipt.reference && <div>Ref: {lastReceipt.reference}</div>}
            <div style={{ fontWeight: 700, marginTop: 4 }}>
              Total Paid: KES {money(lastReceipt.total)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── 4. Stock & FEFO Batches ──────────────────────────────────────────
function StockView({ flash, hasRole }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdj, setShowAdj] = useState(false);
  const [adjProdId, setAdjProdId] = useState("");
  const [adjQty, setAdjQty] = useState("");
  const [adjReason, setAdjReason] = useState("damaged");
  const [adjNote, setAdjNote] = useState("");

  const loadStock = async () => {
    try {
      const data = await api.pos.getProducts();
      setProducts(data);
      if (data.length > 0 && !adjProdId) setAdjProdId(data[0].id);
    } catch (err) {
      flash(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStock();
  }, []);

  const handleAdjust = async (e) => {
    e.preventDefault();
    const q = Number(adjQty);
    if (!q) return flash("Quantity cannot be 0.", true);
    try {
      await api.pos.adjustStock({
        product_id: Number(adjProdId),
        qty: q,
        reason: adjReason,
        note: adjNote.trim() || null,
      });
      flash("Stock adjustment successfully recorded.");
      setShowAdj(false);
      setAdjQty("");
      setAdjNote("");
      loadStock();
    } catch (err) {
      flash(err.message, true);
    }
  };

  return (
    <div>
      <div style={styles.viewHeader}>
        <h2 style={{ margin: 0 }}>Stock & FEFO Batch Inventory</h2>
        {hasRole("Manager", "Storekeeper", "Warehouse") && (
          <button style={styles.btnPrimary} onClick={() => setShowAdj(!showAdj)}>
            {showAdj ? "Close Adjustment" : "+ Adjust Stock"}
          </button>
        )}
      </div>

      {showAdj && (
        <div style={{ ...styles.card, marginBottom: 16 }}>
          <strong>Record Stock Adjustment</strong>
          <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 12px" }}>
            Write off damaged or expired stock with a negative quantity (-), or enter a count
            correction.
          </p>
          <form onSubmit={handleAdjust} style={styles.gridTwo}>
            <div>
              <label style={styles.label}>Product</label>
              <select
                style={styles.input}
                value={adjProdId}
                onChange={(e) => setAdjProdId(e.target.value)}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Quantity (- to remove, + to add)</label>
              <input
                style={styles.input}
                type="number"
                step="any"
                placeholder="e.g. -5"
                value={adjQty}
                onChange={(e) => setAdjQty(e.target.value)}
                required
              />
            </div>

            <div>
              <label style={styles.label}>Reason</label>
              <select
                style={styles.input}
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
              >
                <option value="damaged">Damaged Goods</option>
                <option value="expired">Expired Goods</option>
                <option value="count_correction">Count Correction</option>
                <option value="customer_return">Customer Return</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Note / Explanation</label>
              <input
                style={styles.input}
                placeholder="Details of write-off or reason..."
                value={adjNote}
                onChange={(e) => setAdjNote(e.target.value)}
              />
            </div>

            <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
              <button style={styles.btnPrimary}>Save Adjustment</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading stock levels...</p>
      ) : products.length === 0 ? (
        <div style={styles.emptyCard}>No products found. Add products in Workflow Builder / Setup.</div>
      ) : (
        <div style={{ ...styles.card, overflowX: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Product / SKU</th>
                <th style={{ textAlign: "right" }}>In Stock</th>
                <th style={{ textAlign: "right" }}>Sellable</th>
                <th style={{ textAlign: "right" }}>Cost Value</th>
                <th style={{ textAlign: "right" }}>Selling Price</th>
                <th>Next Expiry (FEFO)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>SKU: {p.sku}</div>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.qty} {p.unit}
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {p.sellable} {p.unit}
                  </td>
                  <td style={{ textAlign: "right" }}>KES {money(p.value)}</td>
                  <td style={{ textAlign: "right" }}>KES {money(p.sell_price)}</td>
                  <td>{p.next_expiry || "None"}</td>
                  <td>
                    {p.low && <span style={styles.badgeLate}>Reorder Soon</span>}{" "}
                    {p.expired_qty > 0 && (
                      <span style={styles.badgeLate}>{p.expired_qty} Expired</span>
                    )}{" "}
                    {p.expiring_soon && !p.expired_qty && (
                      <span style={styles.badgeWarn}>Expiring Soon</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── 5. Receive Delivery ──────────────────────────────────────────────
function ReceiveView({ flash }) {
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [supplierId, setSupplierId] = useState("");
  const [refNo, setRefNo] = useState("");
  const [lines, setLines] = useState([
    { product_id: "", qty: "", unit_cost: "", batch: "", expiry: "" },
  ]);

  const loadData = async () => {
    try {
      const [sups, prods] = await Promise.all([api.pos.getSuppliers(), api.pos.getProducts()]);
      setSuppliers(sups);
      setProducts(prods);
      if (sups.length > 0) setSupplierId(sups[0].id);
      if (prods.length > 0) {
        setLines([
          {
            product_id: prods[0].id,
            qty: "",
            unit_cost: prods[0].cost_price || "",
            batch: "",
            expiry: "",
          },
        ]);
      }
    } catch (err) {
      flash(err.message, true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_id: products[0]?.id || "",
        qty: "",
        unit_cost: products[0]?.cost_price || "",
        batch: "",
        expiry: "",
      },
    ]);
  };

  const updateLine = (idx, field, value) => {
    setLines(lines.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const removeLine = (idx) => {
    if (lines.length === 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supplierId || !refNo.trim()) {
      return flash("Please select a supplier and provide the delivery ref number.", true);
    }

    const cleanLines = lines.map((l) => ({
      product_id: Number(l.product_id),
      qty: Number(l.qty),
      unit_cost: Number(l.unit_cost) || 0,
      batch: l.batch?.trim() || null,
      expiry: l.expiry || null,
    }));

    if (cleanLines.some((l) => !l.product_id || l.qty <= 0)) {
      return flash("Please ensure all lines have a product and a valid quantity.", true);
    }

    try {
      const res = await api.pos.receiveStock({
        supplier_id: Number(supplierId),
        ref: refNo.trim(),
        lines: cleanLines,
      });
      flash(`Delivery saved into warehouse! Receipt #${res.id}, Total: KES ${money(res.total)}`);
      setRefNo("");
      loadData();
    } catch (err) {
      flash(err.message, true);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>Receive Inward Stock Delivery</h2>

      <div style={styles.card}>
        <form onSubmit={handleSubmit}>
          <div style={styles.gridTwo}>
            <div>
              <label style={styles.label}>Supplier</label>
              <select
                style={styles.input}
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.phone ? `(${s.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={styles.label}>Supplier Invoice / Delivery Note #</label>
              <input
                style={styles.input}
                placeholder="e.g. INV-2026-9901"
                value={refNo}
                onChange={(e) => setRefNo(e.target.value)}
                required
              />
            </div>
          </div>

          <h3 style={{ margin: "20px 0 10px" }}>Delivery Items</h3>
          {lines.map((l, idx) => (
            <div key={idx} style={styles.receiveRow}>
              <div style={{ flex: 2 }}>
                <label style={styles.label}>Product</label>
                <select
                  style={styles.input}
                  value={l.product_id}
                  onChange={(e) => updateLine(idx, "product_id", e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Qty Received</label>
                <input
                  style={styles.input}
                  type="number"
                  step="any"
                  min="0.01"
                  placeholder="Qty"
                  value={l.qty}
                  onChange={(e) => updateLine(idx, "qty", e.target.value)}
                  required
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Unit Cost (KES)</label>
                <input
                  style={styles.input}
                  type="number"
                  step="any"
                  placeholder="Cost"
                  value={l.unit_cost}
                  onChange={(e) => updateLine(idx, "unit_cost", e.target.value)}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Batch # (Opt)</label>
                <input
                  style={styles.input}
                  placeholder="Batch"
                  value={l.batch}
                  onChange={(e) => updateLine(idx, "batch", e.target.value)}
                />
              </div>

              <div style={{ flex: 1 }}>
                <label style={styles.label}>Expiry Date</label>
                <input
                  style={styles.input}
                  type="date"
                  value={l.expiry}
                  onChange={(e) => updateLine(idx, "expiry", e.target.value)}
                />
              </div>

              <button
                type="button"
                style={{ ...styles.btnDangerSmall, alignSelf: "flex-end", marginBottom: 4 }}
                onClick={() => removeLine(idx)}
              >
                ✕
              </button>
            </div>
          ))}

          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button type="button" style={styles.btnGhost} onClick={addLine}>
              + Add Item Line
            </button>
            <button style={styles.btnPrimary}>Save Inward Delivery</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── 6. Day Close & Financial Reports ─────────────────────────────────
function CloseoutView({ flash, hasRole }) {
  const [day, setDay] = useState(new Date().toISOString().split("T")[0]);
  const [report, setReport] = useState(null);
  const [countedCash, setCountedCash] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await api.pos.getSummaryReport(day);
      setReport(data);
    } catch (err) {
      flash(err.message, true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [day]);

  const handleCloseDay = async (e) => {
    e.preventDefault();
    const counted = Number(countedCash);
    if (isNaN(counted)) return flash("Please enter counted cash in drawer.", true);
    try {
      const res = await api.pos.closeDay(day, counted);
      flash(`Day closed successfully! Discrepancy: KES ${money(res.difference)}`);
      loadReport();
    } catch (err) {
      flash(err.message, true);
    }
  };

  return (
    <div>
      <div style={styles.viewHeader}>
        <h2 style={{ margin: 0 }}>Day Close & Sales Summary</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label style={{ ...styles.label, margin: 0 }}>Date:</label>
          <input
            style={{ ...styles.input, width: 160 }}
            type="date"
            value={day}
            onChange={(e) => setDay(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <p style={{ color: "#94a3b8" }}>Loading financial summary...</p>
      ) : report ? (
        <div>
          {/* Key Metric Cards */}
          <div style={styles.gridFour}>
            <div style={styles.statCard}>
              <div style={styles.statVal}>KES {money(report.revenue)}</div>
              <div style={styles.statLabel}>Total Sales</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statVal}>KES {money(report.gross_profit)}</div>
              <div style={styles.statLabel}>Gross Profit</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statVal}>{report.sales_count}</div>
              <div style={styles.statLabel}>Sales Transactions</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statVal}>KES {money(report.writeoffs)}</div>
              <div style={styles.statLabel}>Stock Write-offs</div>
            </div>
          </div>

          {/* Payment Breakdown */}
          <div style={{ ...styles.card, marginTop: 14 }}>
            <strong>Payment Method Breakdown</strong>
            <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
              <div>Cash: KES {money(report.by_method?.cash)}</div>
              <div>M-Pesa: KES {money(report.by_method?.mpesa)}</div>
              <div>Card: KES {money(report.by_method?.card)}</div>
            </div>
          </div>

          {/* Cash Drawer Reconciliation */}
          <div style={{ ...styles.card, marginTop: 14 }}>
            <strong>Cash Drawer Reconciliation</strong>
            {report.closed ? (
              <div style={{ marginTop: 8 }}>
                <span style={styles.badgeDone}>Day Closed</span>
                <div style={{ marginTop: 8 }}>
                  Expected Cash: KES {money(report.closed.expected_cash)} · Counted: KES{" "}
                  {money(report.closed.counted_cash)} · Difference:{" "}
                  <strong>KES {money(report.closed.difference)}</strong>
                </div>
              </div>
            ) : hasRole("Manager") ? (
              <form onSubmit={handleCloseDay} style={{ marginTop: 10 }}>
                <p style={{ color: "#94a3b8", fontSize: 13, margin: "0 0 10px" }}>
                  Count the cash physically in the till. It will be balanced against recorded cash
                  sales.
                </p>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    style={{ ...styles.input, maxWidth: 220 }}
                    type="number"
                    step="any"
                    placeholder="Counted cash in KES"
                    value={countedCash}
                    onChange={(e) => setCountedCash(e.target.value)}
                    required
                  />
                  <button style={styles.btnPrimary}>Reconcile & Close Day</button>
                </div>
              </form>
            ) : (
              <p style={{ color: "#94a3b8", marginTop: 8 }}>
                Not closed yet. Only a Manager can close the cash drawer.
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── 7. Workflow Builder ──────────────────────────────────────────────
function BuilderView({ flash }) {
  const [workflows, setWorkflows] = useState([]);
  const [name, setName] = useState("");
  const [fields, setFields] = useState([
    { key: "item", label: "Item Name", type: "text", required: true },
    { key: "amount", label: "Amount", type: "number", required: true },
  ]);
  const [steps, setSteps] = useState([
    { name: "Manager Approval", type: "approval", role: "Manager", due_hours: 24 },
  ]);

  const loadWorkflows = async () => {
    try {
      const data = await api.workflows.list();
      setWorkflows(data);
    } catch (err) {
      flash(err.message, true);
    }
  };

  useEffect(() => {
    loadWorkflows();
  }, []);

  const addField = () => {
    setFields([...fields, { key: "", label: "", type: "text", required: true }]);
  };

  const addStep = () => {
    setSteps([...steps, { name: "", type: "approval", role: "Finance", due_hours: 24 }]);
  };

  const handleInstallTemplate = async (template) => {
    try {
      await api.workflows.create(template);
      flash(`Template "${template.name}" published successfully!`);
      loadWorkflows();
    } catch (err) {
      flash(err.message, true);
    }
  };

  const handlePublishCustom = async (e) => {
    e.preventDefault();
    if (!name.trim()) return flash("Workflow name is required.", true);
    try {
      await api.workflows.create({
        name: name.trim(),
        fields: fields.filter((f) => f.key.trim()),
        steps: steps.filter((s) => s.name.trim()),
        transitions: [],
      });
      flash("Custom workflow published!");
      setName("");
      loadWorkflows();
    } catch (err) {
      flash(err.message, true);
    }
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>Workflow Builder & Templates</h2>

      {/* Starter Templates */}
      <div style={styles.card}>
        <strong>Install Wholesale Starter Templates</strong>
        <p style={{ color: "#94a3b8", fontSize: 13, margin: "4px 0 12px" }}>
          One-click deploy verified multi-step approvals for credit, stock verification, and
          requisitions.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.name}
              style={styles.btnGhost}
              onClick={() => handleInstallTemplate(tmpl)}
            >
              + Install &quot;{tmpl.name}&quot;
            </button>
          ))}
        </div>
      </div>

      {/* Custom Workflow Builder */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <strong>Design Custom Workflow</strong>
        <form onSubmit={handlePublishCustom} style={{ marginTop: 12 }}>
          <label style={styles.label}>Workflow Name</label>
          <input
            style={styles.input}
            placeholder="e.g. Asset Purchase Approval"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <h4 style={{ margin: "16px 0 8px" }}>Form Fields</h4>
          {fields.map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                style={styles.input}
                placeholder="Field key (e.g. budget)"
                value={f.key}
                onChange={(e) =>
                  setFields(fields.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))
                }
              />
              <input
                style={styles.input}
                placeholder="Label"
                value={f.label}
                onChange={(e) =>
                  setFields(fields.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
              />
              <select
                style={{ ...styles.input, width: 140 }}
                value={f.type}
                onChange={(e) =>
                  setFields(fields.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))
                }
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
              </select>
            </div>
          ))}
          <button type="button" style={styles.btnGhost} onClick={addField}>
            + Add Field
          </button>

          <h4 style={{ margin: "16px 0 8px" }}>Workflow Steps</h4>
          {steps.map((s, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                style={styles.input}
                placeholder="Step Name"
                value={s.name}
                onChange={(e) =>
                  setSteps(steps.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <select
                style={{ ...styles.input, width: 140 }}
                value={s.role}
                onChange={(e) =>
                  setSteps(steps.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))
                }
              >
                {[
                  "Manager",
                  "Finance",
                  "Admin",
                  "Sales",
                  "Warehouse",
                  "Storekeeper",
                  "Cashier",
                  "Requester",
                ].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <button type="button" style={styles.btnGhost} onClick={addStep}>
            + Add Step
          </button>

          <div style={{ marginTop: 16 }}>
            <button style={styles.btnPrimary}>Publish Workflow</button>
          </div>
        </form>
      </div>

      {/* Published Workflows */}
      <h3 style={{ margin: "24px 0 12px" }}>Published Workflows</h3>
      {workflows.map((w) => (
        <div key={w.id} style={styles.card}>
          <div style={styles.row}>
            <strong>
              {w.name} (v{w.version})
            </strong>
            <span style={styles.metaText}>{w.fields?.length || 0} form fields</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── 8. Team & Audit Trail ────────────────────────────────────────────
function TeamView({ flash }) {
  const [logs, setLogs] = useState([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roles, setRoles] = useState(["Requester"]);

  const [users, setUsers] = useState([]);

  const loadData = async () => {
    try {
      const [auditData, userData] = await Promise.all([api.audit.list(), api.team.listUsers()]);
      setLogs(auditData);
      setUsers(userData);
    } catch (err) {
      flash(err.message, true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!email || !password || !fullName) {
      return flash("Please fill in all team member details.", true);
    }
    try {
      await api.team.addUser({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        roles,
      });
      flash(`User ${fullName} successfully added!`);
      setFullName("");
      setEmail("");
      setPassword("");
      loadData();
    } catch (err) {
      flash(err.message, true);
    }
  };

  const toggleRole = (r) => {
    if (roles.includes(r)) setRoles(roles.filter((x) => x !== r));
    else setRoles([...roles, r]);
  };

  return (
    <div>
      <h2 style={{ margin: "0 0 16px" }}>Team & Audit Trail</h2>

      <div style={styles.card}>
        <strong>Add Team Member</strong>
        <form onSubmit={handleAddUser} style={{ marginTop: 12 }}>
          <div style={styles.gridTwo}>
            <div>
              <label style={styles.label}>Full Name</label>
              <input
                style={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Email Address</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Temporary Password</label>
              <input
                style={styles.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={styles.label}>Assigned Roles</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                {[
                  "Requester",
                  "Manager",
                  "Finance",
                  "Admin",
                  "Cashier",
                  "Storekeeper",
                  "Sales",
                  "Warehouse",
                ].map((r) => (
                  <label
                    key={r}
                    style={{
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={roles.includes(r)}
                      onChange={() => toggleRole(r)}
                    />
                    {r}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <button style={{ ...styles.btnPrimary, marginTop: 14 }}>Create User</button>
        </form>
      </div>

      <h3 style={{ margin: "24px 0 12px" }}>Team Members ({users.length})</h3>
      <div style={{ ...styles.card, overflowX: "auto" }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Assigned Roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.full_name}</strong></td>
                <td>{u.email}</td>
                <td>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {(u.roles || []).map((r) => (
                      <span key={r} style={styles.roleTag}>{r}</span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ margin: "24px 0 12px" }}>System Audit Log</h3>
      <div style={{ ...styles.card, maxHeight: 380, overflowY: "auto" }}>
        {logs.map((a, i) => (
          <div
            key={i}
            style={{
              padding: "8px 0",
              borderBottom: i < logs.length - 1 ? "1px solid #e2e8f0" : "none",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <strong>{a.action}</strong> ·{" "}
              <span style={{ color: "#94a3b8" }}>
                {a.entity} #{a.entity_id}
              </span>
              {a.detail && (
                <div style={{ fontSize: 12, color: "#475569" }}>
                  {JSON.stringify(a.detail)}
                </div>
              )}
            </div>
            <div style={styles.metaText}>{new Date(a.at + "Z").toLocaleString("en-KE")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Visual Step Progress Tracker ─────────────────────────────────────
function StepTrack({ steps = [] }) {
  if (!steps.length) return null;
  return (
    <div style={styles.trackContainer}>
      {steps.map((s, i) => {
        const isDone = s.state === "done";
        const isCurrent = s.state === "current";
        const isRejected = s.state === "rejected";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center" }}>
            {i > 0 && (
              <div
                style={{
                  ...styles.trackLink,
                  background: isDone ? "#0d9488" : "#cbd5e1",
                }}
              />
            )}
            <div style={styles.trackNode}>
              <div
                style={{
                  ...styles.trackDot,
                  background: isDone
                    ? "#0d9488"
                    : isRejected
                    ? "#ef4444"
                    : isCurrent
                    ? "#f59e0b"
                    : "#fff",
                  borderColor: isDone
                    ? "#0d9488"
                    : isRejected
                    ? "#ef4444"
                    : isCurrent
                    ? "#f59e0b"
                    : "#94a3b8",
                }}
              />
              <div style={{ fontWeight: isCurrent ? 700 : 500 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: "#94a3b8" }}>
                {s.overdue ? (
                  <span style={{ color: "#ef4444", fontWeight: 700 }}>Overdue</span>
                ) : (
                  s.role || "auto"
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Styles (Modern Morphing Glass & Responsive Touch Tokens) ─────────
const styles = {
  container: {
    maxWidth: 1140,
    margin: "0 auto",
    padding: "calc(16px + var(--sat)) 16px calc(48px + var(--sab))",
    fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
    color: "#f8fafc",
    background: "transparent",
    minHeight: "100dvh",
  },
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    height: "100dvh",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    color: "#f8fafc",
  },
  spinner: {
    width: 38,
    height: 38,
    border: "3px solid rgba(255, 255, 255, 0.15)",
    borderTopColor: "#14b8a6",
    borderRadius: "50%",
    animation: "spin 0.9s cubic-bezier(0.5, 0, 0.5, 1) infinite",
  },
  toast: {
    position: "fixed",
    top: 20,
    right: 20,
    zIndex: 9999,
    color: "#fff",
    padding: "14px 22px",
    borderRadius: 14,
    boxShadow: "0 16px 40px -5px rgba(0,0,0,0.5), 0 0 25px rgba(20, 184, 166, 0.35)",
    fontSize: 14,
    fontWeight: 700,
    backdropFilter: "blur(24px) saturate(180%)",
    WebkitBackdropFilter: "blur(24px) saturate(180%)",
    border: "1px solid rgba(255, 255, 255, 0.2)",
    maxWidth: "calc(100vw - 32px)",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "rgba(15, 23, 42, 0.72)",
    backdropFilter: "blur(24px) saturate(190%)",
    WebkitBackdropFilter: "blur(24px) saturate(190%)",
    padding: "16px 22px",
    borderRadius: 18,
    border: "1px solid rgba(255, 255, 255, 0.12)",
    marginBottom: 18,
    boxShadow: "0 14px 35px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
    flexWrap: "wrap",
    gap: 12,
  },
  logoBadge: {
    background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    color: "#ffffff",
    padding: "6px 14px",
    borderRadius: 10,
    fontWeight: 900,
    fontSize: 16,
    letterSpacing: -0.5,
    boxShadow: "0 0 20px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
    fontFamily: "'Outfit', sans-serif",
  },
  logoBadgeLarge: {
    display: "inline-block",
    background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    color: "#ffffff",
    padding: "8px 18px",
    borderRadius: 12,
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: -0.5,
    boxShadow: "0 0 25px rgba(20, 184, 166, 0.45)",
    fontFamily: "'Outfit', sans-serif",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: "#ffffff",
    fontFamily: "'Outfit', sans-serif",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 2,
  },
  userInfo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  userName: {
    fontWeight: 700,
    fontSize: 14,
    color: "#f8fafc",
  },
  roleTag: {
    background: "rgba(14, 165, 233, 0.18)",
    color: "#38bdf8",
    border: "1px solid rgba(56, 189, 248, 0.35)",
    fontSize: 11,
    fontWeight: 800,
    padding: "3px 10px",
    borderRadius: 20,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nav: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 8,
    marginBottom: 20,
    WebkitOverflowScrolling: "touch",
  },
  tab: {
    background: "rgba(255, 255, 255, 0.05)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    minHeight: 46,
    padding: "10px 18px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    color: "#cbd5e1",
    cursor: "pointer",
    whiteSpace: "nowrap",
    touchAction: "manipulation",
  },
  tabActive: {
    background: "linear-gradient(135deg, rgba(13, 148, 136, 0.9) 0%, rgba(20, 184, 166, 0.95) 100%)",
    border: "1px solid rgba(255, 255, 255, 0.25)",
    minHeight: 46,
    padding: "10px 18px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 800,
    color: "#ffffff",
    cursor: "pointer",
    whiteSpace: "nowrap",
    touchAction: "manipulation",
    boxShadow: "0 4px 18px rgba(13, 148, 136, 0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    gap: 18,
  },
  card: {
    background: "rgba(15, 23, 42, 0.68)",
    backdropFilter: "blur(24px) saturate(190%)",
    WebkitBackdropFilter: "blur(24px) saturate(190%)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 18,
    padding: "22px 24px",
    boxShadow: "0 16px 40px -10px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
    color: "#f8fafc",
  },
  emptyCard: {
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    border: "1px dashed rgba(255, 255, 255, 0.15)",
    borderRadius: 18,
    padding: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 14,
  },
  viewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    flexWrap: "wrap",
    gap: 12,
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },
  metaText: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
  dataBadge: {
    fontSize: 12,
    color: "#cbd5e1",
    background: "rgba(255, 255, 255, 0.07)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    padding: "5px 10px",
    borderRadius: 8,
    marginTop: 8,
    display: "inline-block",
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 700,
    color: "#cbd5e1",
    margin: "12px 0 5px",
    letterSpacing: 0.2,
  },
  input: {
    width: "100%",
    minHeight: 48,
    padding: "11px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.15)",
    fontSize: 16,
    boxSizing: "border-box",
    background: "rgba(11, 18, 32, 0.85)",
    color: "#f8fafc",
    touchAction: "manipulation",
    outline: "none",
  },
  inputSmall: {
    width: "100%",
    minHeight: 42,
    padding: "8px 12px",
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.15)",
    fontSize: 14,
    boxSizing: "border-box",
    background: "rgba(11, 18, 32, 0.85)",
    color: "#f8fafc",
    touchAction: "manipulation",
    outline: "none",
  },
  btnPrimary: {
    background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
    color: "#ffffff",
    border: "none",
    borderTop: "1px solid rgba(255, 255, 255, 0.35)",
    minHeight: 48,
    padding: "10px 22px",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    touchAction: "manipulation",
    boxShadow: "0 6px 20px rgba(20, 184, 166, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
  },
  btnDanger: {
    background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    color: "#ffffff",
    border: "none",
    borderTop: "1px solid rgba(255, 255, 255, 0.3)",
    minHeight: 48,
    padding: "10px 20px",
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "manipulation",
    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.35)",
  },
  btnDangerSmall: {
    background: "rgba(239, 68, 68, 0.2)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.35)",
    padding: "6px 12px",
    borderRadius: 8,
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    touchAction: "manipulation",
  },
  btnGhost: {
    background: "rgba(255, 255, 255, 0.08)",
    color: "#f8fafc",
    border: "1px solid rgba(255, 255, 255, 0.14)",
    minHeight: 46,
    padding: "10px 18px",
    borderRadius: 12,
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    touchAction: "manipulation",
  },
  touchStepBtn: {
    width: 38,
    height: 38,
    minWidth: 38,
    borderRadius: 10,
    border: "1px solid rgba(255, 255, 255, 0.18)",
    background: "rgba(255, 255, 255, 0.12)",
    fontSize: 18,
    fontWeight: 800,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    touchAction: "manipulation",
    color: "#f8fafc",
    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
  },
  productGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(145px, 1fr))",
    gap: 12,
    marginTop: 14,
  },
  productTile: {
    background: "rgba(20, 30, 50, 0.72)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    borderRadius: 16,
    padding: "14px",
    textAlign: "left",
    cursor: "pointer",
    touchAction: "manipulation",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 106,
    boxShadow: "0 8px 24px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
  },
  btnText: {
    background: "none",
    border: "none",
    color: "#2dd4bf",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    touchAction: "manipulation",
  },
  badgeLate: {
    background: "rgba(239, 68, 68, 0.22)",
    color: "#f87171",
    border: "1px solid rgba(239, 68, 68, 0.4)",
    padding: "4px 11px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  badgeWarn: {
    background: "rgba(245, 158, 11, 0.22)",
    color: "#fbbf24",
    border: "1px solid rgba(245, 158, 11, 0.4)",
    padding: "4px 11px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  badgeDone: {
    background: "rgba(16, 185, 129, 0.22)",
    color: "#34d399",
    border: "1px solid rgba(16, 185, 129, 0.4)",
    padding: "4px 11px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.3,
  },
  statusTag: {
    padding: "4px 12px",
    borderRadius: 99,
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  statusDone: {
    background: "linear-gradient(135deg, #0d9488 0%, #10b981 100%)",
    color: "#fff",
    boxShadow: "0 0 14px rgba(16, 185, 129, 0.4)",
  },
  statusRunning: {
    background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    color: "#fff",
  },
  statusBad: {
    background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
    color: "#fff",
  },
  gridTwo: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: 16,
  },
  gridFour: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  statCard: {
    background: "rgba(15, 23, 42, 0.65)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255, 255, 255, 0.1)",
    borderRadius: 16,
    padding: 18,
    boxShadow: "0 10px 28px rgba(0, 0, 0, 0.35)",
  },
  statVal: {
    fontSize: 24,
    fontWeight: 900,
    color: "#ffffff",
    fontFamily: "'Outfit', sans-serif",
  },
  statLabel: {
    fontSize: 12,
    color: "#94a3b8",
    marginTop: 3,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    color: "#f8fafc",
  },
  cartFooter: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    paddingTop: 16,
    borderTop: "1px solid rgba(255, 255, 255, 0.12)",
  },
  receiveRow: {
    display: "flex",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  trackContainer: {
    display: "flex",
    alignItems: "center",
    overflowX: "auto",
    padding: "14px 0 6px",
    marginTop: 10,
  },
  trackLink: {
    width: 28,
    height: 3,
  },
  trackNode: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    fontSize: 12,
    minWidth: 88,
  },
  trackDot: {
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid",
    marginBottom: 5,
  },
  authContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "100dvh",
    padding: "calc(16px + var(--sat)) 16px calc(24px + var(--sab))",
    background: "transparent",
  },
  onboardWrapper: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
    maxWidth: 1040,
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    boxShadow: "0 30px 70px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(13, 148, 136, 0.15)",
    border: "1px solid rgba(255, 255, 255, 0.15)",
    background: "rgba(13, 20, 36, 0.85)",
    backdropFilter: "blur(28px) saturate(190%)",
    WebkitBackdropFilter: "blur(28px) saturate(190%)",
  },
  onboardHero: {
    background: "linear-gradient(145deg, rgba(13, 148, 136, 0.85) 0%, rgba(15, 23, 42, 0.92) 55%, rgba(30, 27, 75, 0.88) 100%)",
    color: "#ffffff",
    padding: "42px 38px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    borderRight: "1px solid rgba(255, 255, 255, 0.1)",
  },
  heroLogoBadge: {
    background: "#ffffff",
    color: "#0f766e",
    fontWeight: 900,
    fontSize: 16,
    padding: "5px 14px",
    borderRadius: 10,
    display: "inline-block",
    boxShadow: "0 0 20px rgba(255, 255, 255, 0.45)",
    fontFamily: "'Outfit', sans-serif",
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    marginTop: 20,
  },
  featureCard: {
    background: "rgba(255, 255, 255, 0.07)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255, 255, 255, 0.16)",
    borderRadius: 16,
    padding: "14px 16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  onboardCard: {
    background: "rgba(15, 23, 42, 0.8)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    padding: "42px 38px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
};

