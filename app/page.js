"use client";
import { useEffect, useState, useMemo } from "react";
import { api, getStoredToken, setStoredToken, enableDemoMode, disableDemoMode, isDemoMode } from "../lib/api";
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
    disableDemoMode();
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

      {isDemoMode() && (
        <div
          style={{
            background: "rgba(245, 158, 11, 0.16)",
            border: "1px solid rgba(245, 158, 11, 0.45)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            padding: "10px 18px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 10,
            color: "#fef3c7",
            fontSize: 13,
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚡</span>
            <span>
              <strong>{lang === "so" ? "QAABKA TIJAABADA (DEMO MODE):" : "PREVIEW DEMO MODE:"}</strong>{" "}
              {lang === "so"
                ? "Dhammaan POS-ka, Iibka, Alaabta FEFO iyo Oggolaanshaha waxay ku shaqeynayaan xog tijaabo ah bilaa server."
                : "POS till, wholesale catalog, FEFO batches and approvals are running in interactive preview mode without needing a cloud server."}
            </span>
          </div>
          <button
            type="button"
            className="touch-btn"
            onClick={handleLogout}
            style={{
              background: "rgba(245, 158, 11, 0.3)",
              border: "1px solid rgba(245, 158, 11, 0.6)",
              color: "#ffffff",
              borderRadius: 8,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {lang === "so" ? "Ka Bax Tijaabada" : "Exit Preview"}
          </button>
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
        {tab === "pos" && <PosView flash={flash} user={user} t={t} lang={lang} />}
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
  const [backendOffline, setBackendOffline] = useState(false);

  const isVercelHost = typeof window !== "undefined" && window.location.hostname.includes("vercel.app");

  const enterDemo = async () => {
    enableDemoMode();
    flash(lang === "so" ? "Waxaad gashay 'Demo Mode' (Tijaabo Toos ah)! Dhammaan shaashadaha waa furan yihiin." : "Entered Instant Demo Mode! All features active.");
    await onLoginSuccess();
  };

  const fillDemo = () => {
    setIsRegister(false);
    setEmail("testadmin@acme.co.ke");
    setPassword("password123");
    flash(lang === "so" ? "Xogtii Demo Admin waa la shubay! Guji 'Gal Nidaamka' ama 'Gal Demo Mode'." : "Demo Admin credentials loaded! Click Sign In or Launch Demo.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return flash(lang === "so" ? "Fadlan geli email-ka iyo furaha sirta." : "Please fill in email and password.", true);
    setBusy(true);
    setBackendOffline(false);
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
      if (err.message && (err.message.includes("offline") || err.message.includes("Backend") || isVercelHost)) {
        setBackendOffline(true);
      }
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

          {/* 1-Click Instant Demo Button */}
          <button
            type="button"
            className="touch-btn"
            onClick={enterDemo}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: 12,
              background: "linear-gradient(135deg, rgba(20, 184, 166, 0.3) 0%, rgba(13, 148, 136, 0.5) 100%)",
              border: "1px solid rgba(45, 212, 191, 0.6)",
              color: "#2dd4bf",
              fontSize: 13,
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 16,
              boxShadow: "0 0 18px rgba(45, 212, 191, 0.2)",
            }}
          >
            <span style={{ fontSize: 16 }}>⚡</span>
            <span>{lang === "so" ? "Gal 'Demo Mode' Hadda (Tijaabo Bilaa Server)" : "Launch Instant Demo Mode (No Server Needed)"}</span>
          </button>

          {(backendOffline || isVercelHost) && (
            <div
              style={{
                background: "rgba(245, 158, 11, 0.14)",
                border: "1px solid rgba(245, 158, 11, 0.45)",
                borderRadius: 12,
                padding: "12px 14px",
                marginBottom: 16,
                fontSize: 12,
                lineHeight: 1.5,
                color: "#fef3c7",
              }}
            >
              <div style={{ fontWeight: 800, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span>⚠️</span>
                <span>{lang === "so" ? "Xogta Server-ka (Vercel Cloud vs Local):" : "Server Notice (Vercel Cloud vs Local):"}</span>
              </div>
              <div>
                {lang === "so"
                  ? "Vercel wuxuu hayaa qeybta hore (Frontend). Backend-ka Python (FastAPI) wuxuu ku dhex shaqeeyaa kombuyuutarkaaga (127.0.0.1:8000), Vercel-na toos uma gaari karo. Riix badhanka kore ee 'Gal Demo Mode Hadda ⚡' si aad u gasho adigoon server u baahnayn."
                  : "Vercel hosts the frontend. The Python FastAPI backend runs on your local machine (127.0.0.1:8000). Click 'Launch Instant Demo Mode ⚡' above to test immediately without a cloud backend."}
              </div>
            </div>
          )}

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

// ── Audio Synthesis for POS (No external audio files needed) ─────────
function playPosBeep(freq = 880, duration = 0.08) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playPosCashChime() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = "triangle";
      const start = ctx.currentTime + idx * 0.07;
      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.22);
      osc.start(start);
      osc.stop(start + 0.22);
    });
  } catch {}
}

// ── 3. Touch Screen POS & All Print System (Multi-Device) ─────────────
function PosView({ flash, user, t, lang = "so" }) {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Multi-cart state: 3 independent customer carts
  const [carts, setCarts] = useState([[], [], []]);
  const [activeCartIdx, setActiveCartIdx] = useState(0);
  const cart = carts[activeCartIdx] || [];

  // Station / Till identity
  const [station, setStation] = useState("Till 1 (Main Cashier)");
  const [showStationPicker, setShowStationPicker] = useState(false);

  // Manual & Touch Add State
  const [selectedPid, setSelectedPid] = useState("");
  const [qty, setQty] = useState(1);
  const [customerId, setCustomerId] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");

  // Touch Numpad & Quick Tender
  const [tendered, setTendered] = useState("");
  const [showNumpad, setShowNumpad] = useState(true);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [barcodeInput, setBarcodeInput] = useState("");

  // Printing & Receipt Modal
  const [lastReceipt, setLastReceipt] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printFormat, setPrintFormat] = useState("thermal80"); // thermal80 | thermal58 | dispatch | labels | invoiceA4
  const [autoPrint, setAutoPrint] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Multi-Device Wi-Fi Hub
  const [showDeviceHub, setShowDeviceHub] = useState(false);
  const [syncNotice, setSyncNotice] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(Date.now());

  // Load Station and Settings from LocalStorage
  useEffect(() => {
    try {
      const savedStation = localStorage.getItem("icash_pos_station");
      if (savedStation) setStation(savedStation);
      const savedAutoPrint = localStorage.getItem("icash_autoprint");
      if (savedAutoPrint !== null) setAutoPrint(savedAutoPrint === "true");
    } catch {}
  }, []);

  const changeStation = (newStation) => {
    setStation(newStation);
    setShowStationPicker(false);
    try {
      localStorage.setItem("icash_pos_station", newStation);
    } catch {}
    flash(lang === "so" ? `Qalabka waxaa loo bedelay: ${newStation}` : `POS Station set to: ${newStation}`);
  };

  const loadPos = async (silent = false) => {
    try {
      const [prods, custs] = await Promise.all([api.pos.getProducts(), api.pos.getCustomers()]);
      setProducts(prods);
      setCustomers(custs);
      setLastSyncTime(Date.now());
      if (prods.length > 0 && !selectedPid) setSelectedPid(prods[0].id);
    } catch (err) {
      if (!silent) flash(err.message, true);
    }
  };

  // Initial load
  useEffect(() => {
    loadPos();
  }, []);

  // Multi-Device Cross-Tab & Cross-Device Live Sync
  useEffect(() => {
    let bc;
    try {
      bc = new BroadcastChannel("icash_pos_sync");
      bc.onmessage = (event) => {
        if (event.data?.type === "SALE_COMPLETED") {
          loadPos(true);
          setSyncNotice(
            lang === "so"
              ? `⚡ Xogta waa la cusbooneysiiyay: Iib #${event.data.saleId} oo ka dhacay ${event.data.station}`
              : `⚡ Real-time Sync: Sale #${event.data.saleId} completed at ${event.data.station}`
          );
          setTimeout(() => setSyncNotice(null), 4000);
        }
      };
    } catch {}

    // Background polling every 4.5s for devices across local Wi-Fi network
    const timer = setInterval(() => {
      loadPos(true);
    }, 4500);

    return () => {
      try { bc?.close(); } catch {}
      clearInterval(timer);
    };
  }, [lang]);

  // Barcode Scanner Listener (Hardware USB & Bluetooth barcode guns)
  useEffect(() => {
    let buffer = "";
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      // Don't intercept if user is typing in regular text inputs other than barcode box
      const targetTag = e.target.tagName;
      if (targetTag === "INPUT" && e.target.id !== "barcode-scan-input") {
        return;
      }
      if (targetTag === "TEXTAREA" || targetTag === "SELECT") {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 70) {
        buffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter" && buffer.trim().length > 1) {
        e.preventDefault();
        handleBarcodeMatch(buffer.trim());
        buffer = "";
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const handleBarcodeMatch = (code) => {
    const clean = code.trim().toLowerCase();
    const found = products.find(
      (p) =>
        (p.sku && p.sku.toLowerCase() === clean) ||
        p.name.toLowerCase().includes(clean) ||
        String(p.id) === clean
    );

    if (found) {
      if (soundEnabled) playPosBeep(980, 0.09);
      quickAddProduct(found);
      flash(lang === "so" ? `Baarkoodh: ${found.name} waa lagu daray!` : `Scanned: ${found.name} added!`);
      setBarcodeInput("");
    } else {
      if (soundEnabled) playPosBeep(320, 0.15);
      flash(lang === "so" ? `Lama helin badeeco baarkoodhkeedu yahay "${code}".` : `No product found for barcode "${code}".`, true);
    }
  };

  // Cart operations for active cart
  const updateActiveCart = (newCart) => {
    setCarts((prev) => {
      const copy = [...prev];
      copy[activeCartIdx] = newCart;
      return copy;
    });
  };

  const quickAddProduct = (prod) => {
    if (prod.sellable <= 0) {
      if (soundEnabled) playPosBeep(300, 0.12);
      return flash(`${prod.name} bakhaarka kama buuxdo (Out of stock).`, true);
    }
    const existing = cart.find((l) => l.product_id === prod.id);
    const totalQty = (existing ? existing.qty : 0) + 1;
    if (totalQty > prod.sellable) {
      return flash(`Tirada kama badnaan karto alaabta jirta (${prod.sellable} ${prod.unit}).`, true);
    }

    if (soundEnabled) playPosBeep(880, 0.06);

    if (existing) {
      updateActiveCart(cart.map((l) => (l.product_id === prod.id ? { ...l, qty: totalQty } : l)));
    } else {
      updateActiveCart([
        ...cart,
        {
          product_id: prod.id,
          name: prod.name,
          sku: prod.sku || `SKU-${prod.id}`,
          unit: prod.unit,
          qty: 1,
          price: prod.sell_price,
        },
      ]);
    }
  };

  const updateCartQty = (pid, delta) => {
    const prod = products.find((p) => p.id === pid);
    if (!prod) return;
    const updated = cart
      .map((item) => {
        if (item.product_id !== pid) return item;
        const newQty = Math.round((item.qty + delta) * 1000) / 1000;
        if (newQty <= 0) return null;
        if (newQty > prod.sellable) {
          flash(`Kama badnaan karto alaabta jirta (${prod.sellable} ${prod.unit}).`, true);
          return item;
        }
        return { ...item, qty: newQty };
      })
      .filter(Boolean);

    if (soundEnabled) playPosBeep(750, 0.05);
    updateActiveCart(updated);
  };

  const removeFromCart = (pid) => {
    if (soundEnabled) playPosBeep(440, 0.08);
    updateActiveCart(cart.filter((l) => l.product_id !== pid));
  };

  const clearCurrentCart = () => {
    if (cart.length === 0) return;
    updateActiveCart([]);
    setTendered("");
    flash(lang === "so" ? "Qasnadda hadda waa la banneeyay." : "Current cart cleared.");
  };

  const addToCartManual = () => {
    const prod = products.find((p) => p.id === Number(selectedPid));
    if (!prod) return;
    const q = Number(qty);
    if (!q || q <= 0) return flash("Tiradu waa inay ka weynaato eber.", true);

    const existing = cart.find((l) => l.product_id === prod.id);
    const totalQty = (existing ? existing.qty : 0) + q;
    if (totalQty > prod.sellable) {
      return flash(`Kama badnaan karto alaabta jirta (${prod.sellable} ${prod.unit}).`, true);
    }

    if (soundEnabled) playPosBeep(880, 0.06);

    if (existing) {
      updateActiveCart(cart.map((l) => (l.product_id === prod.id ? { ...l, qty: totalQty } : l)));
    } else {
      updateActiveCart([
        ...cart,
        {
          product_id: prod.id,
          name: prod.name,
          sku: prod.sku || `SKU-${prod.id}`,
          unit: prod.unit,
          qty: q,
          price: prod.sell_price,
        },
      ]);
    }
    setQty(1);
  };

  const totalAmount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty * item.price, 0),
    [cart]
  );

  // Live change calculations
  const numTendered = Number(tendered) || 0;
  const changeDue = Math.max(0, numTendered - totalAmount);
  const remainingDue = Math.max(0, totalAmount - numTendered);

  // Numpad key tap
  const handleNumpadPress = (char) => {
    if (soundEnabled) playPosBeep(620, 0.03);
    if (char === "C") {
      setTendered("");
    } else if (char === "BACK") {
      setTendered((prev) => prev.slice(0, -1));
    } else if (char === ".") {
      if (!tendered.includes(".")) setTendered((prev) => (prev ? prev + "." : "0."));
    } else {
      setTendered((prev) => prev + char);
    }
  };

  const addQuickPreset = (amount) => {
    if (soundEnabled) playPosBeep(700, 0.04);
    if (amount === "EXACT") {
      setTendered(String(totalAmount));
    } else {
      setTendered((prev) => String((Number(prev) || 0) + amount));
    }
  };

  // Complete checkout
  const handleCheckout = async () => {
    if (cart.length === 0) return flash(lang === "so" ? "Qasnadda hadda waxba kuma jiraan." : "Sale cart is empty.", true);
    if (method !== "cash" && !reference.trim()) {
      return flash(
        lang === "so"
          ? "Fadlan geli koodhka fariinta M-Pesa/EVC ama lambarka kaadhka."
          : "Please enter transaction reference or card slip number.",
        true
      );
    }

    try {
      const payload = {
        customer_id: customerId ? Number(customerId) : null,
        method,
        reference: reference.trim() || null,
        lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty })),
      };

      const res = await api.pos.sell(payload);
      if (soundEnabled) playPosCashChime();

      // Broadcast sale completion across all browser tabs & network clients
      try {
        const bc = new BroadcastChannel("icash_pos_sync");
        bc.postMessage({
          type: "SALE_COMPLETED",
          saleId: res.id,
          station,
          timestamp: Date.now(),
        });
        bc.close();
      } catch {}

      const custObj = customers.find((c) => c.id === Number(customerId));
      const receiptObj = {
        id: res.id,
        total: res.total,
        cart: [...cart],
        method,
        reference: reference.trim(),
        station,
        cashier: user?.full_name || "iCash Cashier",
        customer: custObj ? custObj.name : (lang === "so" ? "Macmiil Caadi ah" : "Walk-in Customer"),
        customerPhone: custObj?.phone || "",
        tendered: numTendered > 0 ? numTendered : res.total,
        change: changeDue,
        date: new Date().toLocaleString(lang === "so" ? "so-SO" : "en-KE"),
        timestamp: new Date().toISOString(),
      };

      setLastReceipt(receiptObj);
      setPrintModalOpen(true);

      // Auto-Print trigger
      if (autoPrint) {
        setTimeout(() => {
          window.print();
        }, 350);
      }

      // Clear current cart and reset inputs
      updateActiveCart([]);
      setTendered("");
      setReference("");
      loadPos(true);
      flash(
        lang === "so"
          ? `Iib #${res.id} waa la dhammaystiray! Wadarta: KES ${money(res.total)}`
          : `Sale #${res.id} completed successfully! Total: KES ${money(res.total)}`
      );
    } catch (err) {
      flash(err.message, true);
    }
  };

  // Product categories filtering
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery === "" ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (categoryFilter === "all") return true;
    if (categoryFilter === "grains") return p.name.toLowerCase().includes("rice") || p.name.toLowerCase().includes("bariis") || p.name.toLowerCase().includes("sugar") || p.name.toLowerCase().includes("sonkor");
    if (categoryFilter === "oils") return p.name.toLowerCase().includes("oil") || p.name.toLowerCase().includes("saliid") || p.name.toLowerCase().includes("pasta") || p.name.toLowerCase().includes("baasto");
    if (categoryFilter === "beverages") return p.name.toLowerCase().includes("milk") || p.name.toLowerCase().includes("caano") || p.name.toLowerCase().includes("water") || p.name.toLowerCase().includes("biyo");
    return true;
  });

  const triggerDirectPrint = (format) => {
    setPrintFormat(format);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  return (
    <div>
      {/* Real-time Sync & Live Station Status Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
          background: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(18px)",
          padding: "10px 16px",
          borderRadius: 14,
          border: "1px solid rgba(255, 255, 255, 0.1)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Active Station Badge & Selector */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="touch-btn sync-pulse"
              onClick={() => setShowStationPicker(!showStationPicker)}
              style={{
                background: "linear-gradient(135deg, rgba(13, 148, 136, 0.3) 0%, rgba(20, 184, 166, 0.5) 100%)",
                border: "1px solid rgba(45, 212, 191, 0.5)",
                color: "#2dd4bf",
                borderRadius: 10,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
              <span>{station}</span>
              <span style={{ fontSize: 10, opacity: 0.7 }}>▼</span>
            </button>

            {showStationPicker && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  marginTop: 6,
                  zIndex: 999,
                  background: "#0b1220",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: 12,
                  padding: 6,
                  boxShadow: "0 18px 40px rgba(0,0,0,0.7)",
                  minWidth: 220,
                }}
              >
                <div style={{ padding: "6px 10px", fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>
                  {lang === "so" ? "Dooro Qalabkaaga" : "Select Register"}
                </div>
                {[
                  "🖥️ Till 1 (Main Cashier)",
                  "💻 Till 2 (Counter Express)",
                  "📱 Tablet 1 (Floor Sales)",
                  "📦 Warehouse (Stock Dispatch)",
                  "🛒 Mobile POS 1",
                ].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="touch-btn"
                    onClick={() => changeStation(s)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      background: station === s ? "rgba(20, 184, 166, 0.25)" : "transparent",
                      color: station === s ? "#2dd4bf" : "#e2e8f0",
                      border: "none",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "block",
                      marginBottom: 2,
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Live Sync Indicator */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8" }}>
            <span style={{ color: "#10b981" }}>●</span>
            <span>{lang === "so" ? "Isku-Xir Toos ah (Live Sync Active)" : "Multi-Device Live Sync Active"}</span>
          </div>

          {syncNotice && (
            <div style={{ background: "rgba(16, 185, 129, 0.2)", color: "#34d399", border: "1px solid rgba(16, 185, 129, 0.4)", borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 700 }}>
              {syncNotice}
            </div>
          )}
        </div>

        {/* Action Controls: Multi-Device Hub, Sound, Auto-Print */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Sound Toggle */}
          <button
            type="button"
            className="touch-btn"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Sound ON" : "Sound OFF"}
            style={{
              background: soundEnabled ? "rgba(20, 184, 166, 0.2)" : "rgba(255,255,255,0.05)",
              color: soundEnabled ? "#2dd4bf" : "#94a3b8",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 9,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {soundEnabled ? "🔊 Beep ON" : "🔇 Beep OFF"}
          </button>

          {/* Auto Print Toggle */}
          <button
            type="button"
            className="touch-btn"
            onClick={() => {
              const val = !autoPrint;
              setAutoPrint(val);
              try { localStorage.setItem("icash_autoprint", String(val)); } catch {}
            }}
            style={{
              background: autoPrint ? "rgba(20, 184, 166, 0.2)" : "rgba(255,255,255,0.05)",
              color: autoPrint ? "#2dd4bf" : "#94a3b8",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 9,
              padding: "6px 10px",
              fontSize: 12,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span>🖨️</span>
            <span>{autoPrint ? "Auto-Print ON" : "Auto-Print OFF"}</span>
          </button>

          {/* Connect Other Devices / Wi-Fi LAN Hub */}
          <button
            type="button"
            className="touch-btn"
            onClick={() => setShowDeviceHub(true)}
            style={{
              background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: 9,
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 10px rgba(2, 132, 199, 0.3)",
            }}
          >
            <span>📲</span>
            <span>{lang === "so" ? "Ku Xir Qalab Kale" : "Connect Devices"}</span>
          </button>
        </div>
      </div>

      {/* Multi-Cart Tabs (Hold / Switch Orders) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "inline-flex", background: "rgba(0,0,0,0.35)", padding: 4, borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)" }}>
          {[0, 1, 2].map((idx) => {
            const count = carts[idx]?.length || 0;
            const isActive = activeCartIdx === idx;
            return (
              <button
                key={idx}
                type="button"
                className="touch-btn"
                onClick={() => setActiveCartIdx(idx)}
                style={{
                  background: isActive ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "transparent",
                  color: isActive ? "#ffffff" : "#94a3b8",
                  border: "none",
                  borderRadius: 9,
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  boxShadow: isActive ? "0 2px 10px rgba(13, 148, 136, 0.4)" : "none",
                }}
              >
                <span>🛒 {lang === "so" ? `Dalab #${idx + 1}` : `Order #${idx + 1}`}</span>
                {count > 0 && (
                  <span
                    style={{
                      background: isActive ? "rgba(0,0,0,0.35)" : "rgba(20, 184, 166, 0.4)",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 900,
                      padding: "1px 6px",
                      borderRadius: 99,
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Barcode Scanner Box */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ position: "relative", minWidth: 260 }}>
            <input
              id="barcode-scan-input"
              style={{
                ...styles.input,
                margin: 0,
                paddingLeft: 34,
                fontSize: 13,
                height: 40,
                background: "rgba(0,0,0,0.4)",
                borderColor: "rgba(45, 212, 191, 0.4)",
              }}
              placeholder={lang === "so" ? "Sawir Baarkoodh / Geli SKU..." : "Scan Barcode or enter SKU..."}
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && barcodeInput.trim()) {
                  e.preventDefault();
                  handleBarcodeMatch(barcodeInput.trim());
                }
              }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>
              🏷️
            </span>
          </div>
          <button
            type="button"
            className="touch-btn"
            onClick={() => barcodeInput.trim() && handleBarcodeMatch(barcodeInput.trim())}
            style={{
              background: "rgba(20, 184, 166, 0.25)",
              color: "#2dd4bf",
              border: "1px solid rgba(45, 212, 191, 0.5)",
              borderRadius: 10,
              padding: "0 14px",
              height: 40,
              fontWeight: 800,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {lang === "so" ? "Raadi" : "Scan"}
          </button>
        </div>
      </div>

      {/* Main Touch POS Grid & Cart Section */}
      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 0.95fr", gap: 16 }} className="grid-two-responsive">
        {/* Left Side: Category Filters & Touch Product Tiles */}
        <div style={styles.card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <strong style={{ fontSize: 16, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
              ⚡ {lang === "so" ? "Badeecadaha Taabashada (Touch Screen)" : "Touch Screen Catalog"}
            </strong>

            {/* Live Search */}
            <input
              style={{
                ...styles.input,
                margin: 0,
                padding: "6px 12px",
                fontSize: 12,
                maxWidth: 180,
                background: "rgba(0,0,0,0.3)",
              }}
              placeholder={lang === "so" ? "Raadi alaab..." : "Search products..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 6, marginBottom: 12 }}>
            {[
              { id: "all", label: lang === "so" ? "Dhammaan" : "All" },
              { id: "grains", label: lang === "so" ? "Bariis & Sonkor" : "Grains & Sugar" },
              { id: "oils", label: lang === "so" ? "Saliid & Cunto" : "Oils & Food" },
              { id: "beverages", label: lang === "so" ? "Caano & Biyo" : "Drinks & Dairy" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                className="touch-btn"
                onClick={() => setCategoryFilter(cat.id)}
                style={{
                  background: categoryFilter === cat.id ? "rgba(20, 184, 166, 0.3)" : "rgba(255,255,255,0.05)",
                  color: categoryFilter === cat.id ? "#2dd4bf" : "#94a3b8",
                  border: categoryFilter === cat.id ? "1px solid rgba(45, 212, 191, 0.6)" : "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 20,
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Product Tiles Grid */}
          <div style={styles.productGrid} className="pos-grid-responsive">
            {filteredProducts.map((p) => {
              const inStock = p.sellable > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  className="touch-btn glass-hover"
                  style={{
                    ...styles.productTile,
                    opacity: inStock ? 1 : 0.45,
                    border: inStock ? "1px solid rgba(255,255,255,0.12)" : "1px dashed rgba(239, 68, 68, 0.3)",
                    textAlign: "left",
                    minHeight: 110,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                  onClick={() => quickAddProduct(p)}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 4 }}>
                      <strong style={{ fontSize: 13, color: "#ffffff", display: "block", lineHeight: 1.3 }}>{p.name}</strong>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: inStock ? "#94a3b8" : "#f87171" }}>
                        {p.sellable} {p.unit} {lang === "so" ? "haray" : "left"}
                      </span>
                      {p.sku && (
                        <span style={{ fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "1px 5px", borderRadius: 4, color: "#cbd5e1" }}>
                          {p.sku}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 800, color: "#2dd4bf", fontSize: 14 }}>
                      KES {money(p.sell_price)}
                    </span>
                    <span style={{ background: "rgba(20, 184, 166, 0.2)", color: "#2dd4bf", borderRadius: "50%", width: 22, height: 22, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900 }}>
                      +
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Manual Bulk Add Form (Collapsible/Inline) */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: 2, minWidth: 160 }}>
                <label style={styles.label}>{lang === "so" ? "Xulo Alaab & Tiro" : "Manual Bulk Select"}</label>
                <select
                  style={{ ...styles.input, margin: 0 }}
                  value={selectedPid}
                  onChange={(e) => setSelectedPid(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.sellable} {p.unit} · KES {money(p.sell_price)}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: 90 }}>
                <label style={styles.label}>{lang === "so" ? "Tirada" : "Quantity"}</label>
                <input
                  style={{ ...styles.input, margin: 0 }}
                  type="number"
                  step="any"
                  min="0.001"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                />
              </div>

              <button
                type="button"
                style={{ ...styles.btnGhost, height: 44, padding: "0 16px" }}
                className="touch-btn"
                onClick={addToCartManual}
              >
                + {lang === "so" ? "Ku dar" : "Add"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Active Cart, Touch Numpad & Fast Checkout */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Cart Table Card */}
          <div style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <strong style={{ fontSize: 16, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
                🛒 {lang === "so" ? `Alaabta Dalab #${activeCartIdx + 1}` : `Order #${activeCartIdx + 1} Cart`}
              </strong>
              {cart.length > 0 && (
                <button
                  type="button"
                  className="touch-btn"
                  onClick={clearCurrentCart}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#f87171",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: 8,
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {lang === "so" ? "Banneey Qasnadda" : "Clear Cart"}
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "#94a3b8" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🛒</div>
                <div>{lang === "so" ? "Qasnadda hadda waxba kuma jiraan." : "Cart is empty."}</div>
                <div style={{ fontSize: 12, marginTop: 4, color: "#64748b" }}>
                  {lang === "so" ? "Badeecad taabo ama baarkoodh sawir si aad ugu darto." : "Tap a product on the left or scan a barcode."}
                </div>
              </div>
            ) : (
              <div>
                <div className="table-responsive-wrapper" style={{ maxHeight: 220, overflowY: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.12)", color: "#94a3b8", fontSize: 12 }}>
                        <th style={{ textAlign: "left", paddingBottom: 6 }}>{lang === "so" ? "Badeecada" : "Item"}</th>
                        <th style={{ textAlign: "center", paddingBottom: 6 }}>{lang === "so" ? "Tiro" : "Qty"}</th>
                        <th style={{ textAlign: "right", paddingBottom: 6 }}>{lang === "so" ? "Wadar" : "Total"}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((line) => (
                        <tr key={line.product_id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                          <td style={{ padding: "8px 0" }}>
                            <strong style={{ color: "#ffffff", fontSize: 13, display: "block" }}>{line.name}</strong>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>@ KES {money(line.price)}</span>
                          </td>
                          <td style={{ textAlign: "center", whiteSpace: "nowrap", padding: "8px 0" }}>
                            <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                              <button
                                type="button"
                                className="touch-btn"
                                style={styles.touchStepBtn}
                                onClick={() => updateCartQty(line.product_id, -1)}
                              >
                                -
                              </button>
                              <span style={{ minWidth: 26, textAlign: "center", fontWeight: 800, color: "#ffffff", fontSize: 13 }}>
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
                            </div>
                          </td>
                          <td style={{ textAlign: "right", fontWeight: 700, padding: "8px 4px", color: "#2dd4bf", fontSize: 13 }}>
                            KES {money(line.qty * line.price)}
                          </td>
                          <td style={{ textAlign: "right", padding: "8px 0" }}>
                            <button
                              style={{ ...styles.btnDangerSmall, padding: "3px 7px" }}
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

                {/* Total Display */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    marginTop: 10,
                    background: "rgba(0,0,0,0.3)",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <span style={{ fontSize: 14, color: "#94a3b8", fontWeight: 700 }}>
                    {lang === "so" ? "Wadarta Guud:" : "Grand Total:"}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#2dd4bf", fontFamily: "'Outfit', sans-serif" }}>
                    KES {money(totalAmount)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Customer & Payment Method Selector */}
          <div style={styles.card}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={styles.label}>{lang === "so" ? "Macmiilka" : "Customer"}</label>
                <select
                  style={{ ...styles.input, margin: 0 }}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                >
                  <option value="">{lang === "so" ? "Macmiil Caadi ah" : "Walk-in Customer"}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={styles.label}>{lang === "so" ? "Habka Bixinta" : "Payment Method"}</label>
                <select
                  style={{ ...styles.input, margin: 0 }}
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  <option value="cash">💵 {lang === "so" ? "Kaash (Cash)" : "Cash"}</option>
                  <option value="mpesa">📱 M-Pesa / EVC / Sahal</option>
                  <option value="card">💳 {lang === "so" ? "Kaadhka Bangiga" : "Bank Card"}</option>
                  <option value="credit">📑 {lang === "so" ? "Deyr / Akoon" : "Store Credit"}</option>
                </select>
              </div>
            </div>

            {method !== "cash" && (
              <div style={{ marginTop: 10 }}>
                <label style={styles.label}>
                  {method === "mpesa" ? (lang === "so" ? "Koodhka Fariinta M-Pesa/EVC" : "M-Pesa Reference") : (lang === "so" ? "Lambarka Rasiidka Kaadhka" : "Card Slip Ref")}
                </label>
                <input
                  style={{ ...styles.input, margin: 0 }}
                  placeholder="e.g. QKH7189XYZ"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Touch Screen Numpad & Change Calculator (When Cash Selected) */}
          {method === "cash" && cart.length > 0 && (
            <div style={styles.card}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <strong style={{ fontSize: 14, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
                  🔢 {lang === "so" ? "Kiboodhka Taabashada & Celinta (Numpad)" : "Touch Numpad & Change Due"}
                </strong>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => setShowNumpad(!showNumpad)}
                  style={{ background: "transparent", border: "none", color: "#2dd4bf", fontSize: 11, cursor: "pointer", fontWeight: 700 }}
                >
                  {showNumpad ? (lang === "so" ? "Qari ▲" : "Hide ▲") : (lang === "so" ? "Muuji ▼" : "Show ▼")}
                </button>
              </div>

              {/* Tendered and Change Summary Bar */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 10,
                  background: "rgba(0,0,0,0.35)",
                  padding: "8px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{lang === "so" ? "La Dhiibtay (Tendered):" : "Tendered:"}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#f8fafc" }}>
                    KES {tendered ? money(tendered) : "0.00"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>{lang === "so" ? "La Celiyo (Change Due):" : "Change Due:"}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: changeDue > 0 ? "#34d399" : "#94a3b8" }}>
                    KES {money(changeDue)}
                  </div>
                </div>
              </div>

              {/* Quick Cash Preset Buttons */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => addQuickPreset("EXACT")}
                  style={{
                    background: "rgba(20, 184, 166, 0.3)",
                    color: "#2dd4bf",
                    border: "1px solid rgba(45, 212, 191, 0.5)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  ✓ {lang === "so" ? "Dhab ah (Exact)" : "Exact"}
                </button>
                {[100, 200, 500, 1000, 2000].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="touch-btn"
                    onClick={() => addQuickPreset(amt)}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      color: "#e2e8f0",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    +{amt}
                  </button>
                ))}
              </div>

              {/* Touch Numpad Grid */}
              {showNumpad && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 6,
                  }}
                >
                  {["1", "2", "3", "C", "4", "5", "6", "BACK", "7", "8", "9", "00", ".", "0", "000"].map((btn) => {
                    const isSpecial = btn === "C" || btn === "BACK";
                    return (
                      <button
                        key={btn}
                        type="button"
                        className="touch-btn glass-hover"
                        onClick={() => handleNumpadPress(btn)}
                        style={{
                          background: isSpecial ? "rgba(239, 68, 68, 0.2)" : "rgba(255,255,255,0.08)",
                          color: isSpecial ? "#f87171" : "#ffffff",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "10px 0",
                          fontSize: 15,
                          fontWeight: 800,
                          cursor: "pointer",
                          minHeight: 44,
                        }}
                      >
                        {btn === "BACK" ? "⌫" : btn}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Checkout Button */}
          <button
            type="button"
            className="touch-btn"
            style={{
              ...styles.btnPrimary,
              width: "100%",
              padding: "14px 20px",
              fontSize: 16,
              minHeight: 52,
              boxShadow: "0 0 25px rgba(20, 184, 166, 0.4)",
              opacity: cart.length === 0 ? 0.5 : 1,
            }}
            disabled={cart.length === 0}
            onClick={handleCheckout}
          >
            {lang === "so"
              ? `Dhammaystir Iibka · KES ${money(totalAmount)} ⚡`
              : `Complete Sale · KES ${money(totalAmount)} ⚡`}
          </button>
        </div>
      </div>

      {/* ── ALL PRINT MODAL (Screen Preview & Direct Print) ──────────────── */}
      {printModalOpen && lastReceipt && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#0c1322",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 580,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            {/* Header with Print Format Tabs */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.3)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong style={{ fontSize: 17, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
                  🖨️ {lang === "so" ? `Daabacaadda Iibka #${lastReceipt.id}` : `Print Sale #${lastReceipt.id}`}
                </strong>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => setPrintModalOpen(false)}
                  style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              {/* Format Switcher Pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {[
                  { id: "thermal80", label: "🧾 80mm Thermal POS" },
                  { id: "thermal58", label: "📱 58mm Mobile Slip" },
                  { id: "dispatch", label: "📦 Dispatch Pick Slip" },
                  { id: "labels", label: "🏷️ Barcode Labels" },
                  { id: "invoiceA4", label: "📄 A4 Tax Invoice" },
                ].map((fmt) => (
                  <button
                    key={fmt.id}
                    type="button"
                    className="touch-btn"
                    onClick={() => setPrintFormat(fmt.id)}
                    style={{
                      background: printFormat === fmt.id ? "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)" : "rgba(255,255,255,0.06)",
                      color: printFormat === fmt.id ? "#ffffff" : "#94a3b8",
                      border: "none",
                      borderRadius: 8,
                      padding: "6px 11px",
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Receipt Preview (High Contrast Thermal / A4 Paper look) */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#1e293b", display: "flex", justifyContent: "center" }}>
              {/* 80mm Thermal Receipt */}
              {printFormat === "thermal80" && (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    width: 320,
                    padding: "16px 14px",
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: 12,
                    lineHeight: 1.35,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ textAlign: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 900, fontSize: 16, letterSpacing: -0.5 }}>iCash Wholesale & POS</div>
                    <div>Bakaara Market / Nairobi Gate 4</div>
                    <div>Tel: +252 61 5000111 / +254 700 000000</div>
                    <div>PIN / VAT: P051289304Z</div>
                    <div style={{ margin: "6px 0", borderBottom: "1px dashed #000" }}></div>
                    <div style={{ fontWeight: 800 }}>TAX INVOICE / RECEIPT #{lastReceipt.id}</div>
                    <div style={{ fontSize: 11 }}>{lastReceipt.date}</div>
                    <div style={{ fontSize: 11 }}>Station: {lastReceipt.station}</div>
                    <div style={{ fontSize: 11 }}>Cashier: {lastReceipt.cashier}</div>
                    <div style={{ fontSize: 11 }}>Customer: {lastReceipt.customer}</div>
                    <div style={{ margin: "6px 0", borderBottom: "1px dashed #000" }}></div>
                  </div>

                  {/* Items Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
                        <th>ITEM</th>
                        <th style={{ textAlign: "center" }}>QTY</th>
                        <th style={{ textAlign: "right" }}>PRICE</th>
                        <th style={{ textAlign: "right" }}>AMT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastReceipt.cart.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ padding: "4px 0" }}>{item.name}</td>
                          <td style={{ textAlign: "center" }}>{item.qty}</td>
                          <td style={{ textAlign: "right" }}>{money(item.price)}</td>
                          <td style={{ textAlign: "right" }}>{money(item.qty * item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ margin: "8px 0", borderBottom: "1px dashed #000" }}></div>

                  {/* Totals Breakdown */}
                  <div style={{ fontSize: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>SUBTOTAL:</span>
                      <span>KES {money(lastReceipt.total * 0.95)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>VAT (5%):</span>
                      <span>KES {money(lastReceipt.total * 0.05)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 900, fontSize: 14, margin: "4px 0" }}>
                      <span>TOTAL:</span>
                      <span>KES {money(lastReceipt.total)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>PAID ({lastReceipt.method.toUpperCase()}):</span>
                      <span>KES {money(lastReceipt.tendered)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                      <span>CHANGE DUE:</span>
                      <span>KES {money(lastReceipt.change)}</span>
                    </div>
                    {lastReceipt.reference && (
                      <div style={{ fontSize: 10, marginTop: 4 }}>Ref: {lastReceipt.reference}</div>
                    )}
                  </div>

                  <div style={{ margin: "8px 0", borderBottom: "1px dashed #000" }}></div>

                  {/* Monospace Barcode & QR representation */}
                  <div style={{ textAlign: "center", fontSize: 10, marginTop: 6 }}>
                    <div style={{ letterSpacing: 3, fontWeight: 900, fontSize: 14 }}>||||| | |||| || |||||| | ||||</div>
                    <div style={{ marginTop: 2 }}>*ICASH-{lastReceipt.id}-{Date.now().toString().slice(-4)}*</div>
                    <div style={{ marginTop: 8, fontStyle: "italic" }}>
                      {lang === "so"
                        ? "Waad ku mahadsan tahay ganacsigaaga!"
                        : "Thank you for shopping with us!"}
                    </div>
                    <div>Goods once sold are not returnable after 48h.</div>
                  </div>
                </div>
              )}

              {/* 58mm Mobile Thermal Receipt */}
              {printFormat === "thermal58" && (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    width: 230,
                    padding: "12px 10px",
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: 10,
                    lineHeight: 1.25,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ textAlign: "center", fontWeight: 800, fontSize: 13 }}>iCash POS (58mm)</div>
                  <div style={{ textAlign: "center", fontSize: 9 }}>Mogadishu / Nairobi Hub</div>
                  <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
                  <div>RCPT: #{lastReceipt.id} | {lastReceipt.station}</div>
                  <div>DATE: {lastReceipt.date}</div>
                  <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
                  {lastReceipt.cart.map((item, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                      <span>{item.name.slice(0, 16)} x{item.qty}</span>
                      <span>{money(item.qty * item.price)}</span>
                    </div>
                  ))}
                  <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}>
                    <span>TOTAL:</span>
                    <span>KES {money(lastReceipt.total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>PAID:</span>
                    <span>KES {money(lastReceipt.tendered)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>CHANGE:</span>
                    <span>KES {money(lastReceipt.change)}</span>
                  </div>
                  <div style={{ textAlign: "center", marginTop: 8, fontSize: 9 }}>
                    * THANK YOU *
                  </div>
                </div>
              )}

              {/* Warehouse Dispatch Slip */}
              {printFormat === "dispatch" && (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    width: 360,
                    padding: "18px 16px",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 12,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 16 }}>WAREHOUSE PICK & DISPATCH</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>Order Ref #{lastReceipt.id} · {lastReceipt.station}</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11 }}>
                      <div>{lastReceipt.date}</div>
                      <strong>PRIORITY: NORMAL</strong>
                    </div>
                  </div>

                  <div style={{ marginBottom: 10, fontSize: 11, background: "#f1f5f9", padding: 8, borderRadius: 4 }}>
                    <div><strong>Customer:</strong> {lastReceipt.customer}</div>
                    <div><strong>Dispatch To:</strong> Loading Bay / Counter Delivery</div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: "#e2e8f0", textAlign: "left" }}>
                        <th style={{ padding: "4px 6px" }}>[✓]</th>
                        <th style={{ padding: "4px 6px" }}>ITEM</th>
                        <th style={{ padding: "4px 6px" }}>SKU</th>
                        <th style={{ padding: "4px 6px", textAlign: "right" }}>QTY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastReceipt.cart.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #cbd5e1" }}>
                          <td style={{ padding: "6px" }}>[ ]</td>
                          <td style={{ padding: "6px", fontWeight: 700 }}>{item.name}</td>
                          <td style={{ padding: "6px", fontSize: 10 }}>{item.sku || `SKU-${item.product_id}`}</td>
                          <td style={{ padding: "6px", textAlign: "right", fontWeight: 800 }}>{item.qty} {item.unit || "unit"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ borderTop: "1px dashed #000", paddingTop: 10, marginTop: 12, fontSize: 11, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <div>Picked By: _______________</div>
                      <div style={{ marginTop: 6 }}>Sign: ___________________</div>
                    </div>
                    <div>
                      <div>Verified By: ____________</div>
                      <div style={{ marginTop: 6 }}>Driver/Customer: ________</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Barcode Shelf Price Labels Sheet */}
              {printFormat === "labels" && (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    width: 380,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  {lastReceipt.cart.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: "1.5px solid #000",
                        padding: 8,
                        borderRadius: 6,
                        textAlign: "center",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#475569", margin: "2px 0" }}>
                        SKU: {item.sku || `PRD-${item.product_id}`}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: "#0f766e", margin: "4px 0" }}>
                        KES {money(item.price)}
                      </div>
                      <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2 }}>
                        ||| || |||| | |||||
                      </div>
                      <div style={{ fontSize: 8, color: "#64748b" }}>FEFO Expiry: 2027-06-30</div>
                    </div>
                  ))}
                </div>
              )}

              {/* A4 Tax Invoice */}
              {printFormat === "invoiceA4" && (
                <div
                  style={{
                    background: "#ffffff",
                    color: "#000000",
                    width: 440,
                    padding: 24,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    fontSize: 11,
                    boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #0d9488", paddingBottom: 10, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 18, color: "#0d9488" }}>iCash Wholesale Ltd</div>
                      <div>Industrial Area / Bakaara Hub</div>
                      <div>Tel: +252 61 5000111 / +254 700 000000</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>COMMERCIAL INVOICE</div>
                      <div>Inv #: INV-{lastReceipt.id.toString().padStart(6, "0")}</div>
                      <div>Date: {lastReceipt.date}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12, background: "#f8fafc", padding: 10, borderRadius: 6 }}>
                    <div>
                      <strong>Bill To:</strong>
                      <div>{lastReceipt.customer}</div>
                      <div>{lastReceipt.customerPhone || "Walk-in Retailer"}</div>
                    </div>
                    <div>
                      <strong>Payment Terms:</strong>
                      <div>Method: {lastReceipt.method.toUpperCase()}</div>
                      <div>Station: {lastReceipt.station}</div>
                    </div>
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10, marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: "#0d9488", color: "#fff", textAlign: "left" }}>
                        <th style={{ padding: "5px" }}>Item Description</th>
                        <th style={{ padding: "5px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "5px", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "5px", textAlign: "right" }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lastReceipt.cart.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                          <td style={{ padding: "6px 5px", fontWeight: 600 }}>{item.name}</td>
                          <td style={{ padding: "6px 5px", textAlign: "center" }}>{item.qty} {item.unit}</td>
                          <td style={{ padding: "6px 5px", textAlign: "right" }}>KES {money(item.price)}</td>
                          <td style={{ padding: "6px 5px", textAlign: "right", fontWeight: 700 }}>KES {money(item.qty * item.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
                    <div style={{ width: 180, fontSize: 11 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                        <span>Subtotal:</span>
                        <span>KES {money(lastReceipt.total * 0.95)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                        <span>VAT (5%):</span>
                        <span>KES {money(lastReceipt.total * 0.05)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 13, borderTop: "1px solid #000", paddingTop: 4 }}>
                        <span>Total Paid:</span>
                        <span>KES {money(lastReceipt.total)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #cbd5e1", paddingTop: 10, fontSize: 10, color: "#64748b" }}>
                    <div>Authorized Signature: __________________</div>
                    <div>Official Stamp: [               ]</div>
                  </div>
                </div>
              )}
            </div>

            {/* Print Action Bar */}
            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "rgba(0,0,0,0.3)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                Format: <strong>{printFormat}</strong>
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => setPrintModalOpen(false)}
                  style={{
                    background: "rgba(255,255,255,0.1)",
                    color: "#e2e8f0",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 16px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  {lang === "so" ? "Xir" : "Close"}
                </button>

                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => window.print()}
                  style={{
                    background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 22px",
                    fontSize: 14,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 0 20px rgba(20, 184, 166, 0.4)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span>🖨️</span>
                  <span>{lang === "so" ? "Daabac Hadda (Print Now)" : "Print Now"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MULTI-DEVICE WI-FI LAN CONNECTION HUB MODAL ─────────────────── */}
      {showDeviceHub && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#0c1322",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              borderRadius: 18,
              width: "100%",
              maxWidth: 540,
              padding: 24,
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ fontSize: 24 }}>📲</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: 18, color: "#ffffff", fontFamily: "'Outfit', sans-serif" }}>
                    {lang === "so" ? "Xarunta Qalabka Kala Duwan (Multi-Device Hub)" : "Multi-Device Network Hub"}
                  </h3>
                  <div style={{ fontSize: 12, color: "#94a3b8" }}>
                    {lang === "so" ? "Sida iPads, Telefoonno & Sunmi POS loogu xiro hal mar" : "Connect several tablets & POS terminals to one database"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="touch-btn"
                onClick={() => setShowDeviceHub(false)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: 20, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {/* Local Network URL Card */}
            <div
              style={{
                background: "rgba(13, 148, 136, 0.15)",
                border: "1px solid rgba(45, 212, 191, 0.4)",
                borderRadius: 12,
                padding: "14px 16px",
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, color: "#2dd4bf", fontWeight: 800, textTransform: "uppercase", marginBottom: 4 }}>
                🌐 {lang === "so" ? "Cinwaanka Wi-Fi-ga ee Qalabka Kale Ka Furan Karto:" : "Local Wi-Fi Address for Other Devices:"}
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: 18,
                  fontWeight: 900,
                  color: "#ffffff",
                  background: "rgba(0,0,0,0.4)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>http://192.168.0.100:3005</span>
                <button
                  type="button"
                  className="touch-btn"
                  onClick={() => {
                    if (typeof navigator !== "undefined" && navigator.clipboard) {
                      navigator.clipboard.writeText("http://192.168.0.100:3005");
                      flash(lang === "so" ? "Link-ga waa la koobiyeeyay!" : "Link copied to clipboard!");
                    }
                  }}
                  style={{
                    background: "rgba(20, 184, 166, 0.3)",
                    border: "none",
                    borderRadius: 6,
                    padding: "4px 8px",
                    color: "#2dd4bf",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Step-by-Step Instructions */}
            <div style={{ fontSize: 13, lineHeight: 1.6, color: "#cbd5e1", marginBottom: 16 }}>
              <div style={{ fontWeight: 800, color: "#ffffff", marginBottom: 8 }}>
                {lang === "so" ? "Tallaabooyinka Xiriirinta (Fudud & Degdeg ah):" : "How to Connect Other Devices:"}
              </div>
              <ol style={{ margin: 0, paddingLeft: 20 }}>
                <li>
                  {lang === "so"
                    ? "Hubi in iPad-ka, Tablet-ka ama Telefoonka uu ku xiran yahay isla Wi-Fi-ga kombuyuutarkani ku xiran yahay."
                    : "Ensure your iPad, tablet, or phone is connected to the same Wi-Fi network as this computer."}
                </li>
                <li>
                  {lang === "so"
                    ? "Browser-ka Safari ama Chrome ka fur cinwaanka kore: http://192.168.0.100:3005."
                    : "Open Safari or Chrome on the tablet and visit: http://192.168.0.100:3005."}
                </li>
                <li>
                  {lang === "so"
                    ? "Dooro Register-kaaga (tusaale: 'Till 2' ama 'Tablet 1')."
                    : "Select your station register (e.g. 'Till 2' or 'Tablet 1')."}
                </li>
                <li>
                  {lang === "so"
                    ? "Dhammaan iibka ka dhaca qalab kasta isla ilbiriqsiga ayaa lagu wadaagayaa (Real-time Broadcast Sync)!"
                    : "All sales completed on any device sync in real-time across all terminals without conflict!"}
                </li>
              </ol>
            </div>

            {/* Currently Online Tills Status */}
            <div style={{ background: "rgba(0,0,0,0.3)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 12, color: "#94a3b8", fontWeight: 700, marginBottom: 8 }}>
                🟢 {lang === "so" ? "Qalabka Hadda Diyaarka ah (Active Terminals):" : "Active Terminals Status:"}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#34d399" }}>
                  <span>●</span> <span>{station} (Hadda furan)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#38bdf8" }}>
                  <span>●</span> <span>Till 2 (Express Counter)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#a78bfa" }}>
                  <span>●</span> <span>Tablet 1 (Floor Runner)</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#fbbf24" }}>
                  <span>●</span> <span>Warehouse (Stock Dispatch)</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: "right", marginTop: 18 }}>
              <button
                type="button"
                className="touch-btn"
                onClick={() => setShowDeviceHub(false)}
                style={{
                  background: "linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 10,
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {lang === "so" ? "Waan Fahmay ✓" : "Got It ✓"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ISOLATED CLEAN PRINT VIEW FOR BROWSER / THERMAL PRINTERS ─────── */}
      {lastReceipt && (
        <div className="print-only">
          {printFormat === "thermal58" ? (
            <div className="receipt-58mm">
              <div style={{ textAlign: "center", fontWeight: "bold", fontSize: 12 }}>iCash Wholesale</div>
              <div style={{ textAlign: "center", fontSize: 9 }}>Mogadishu / Nairobi</div>
              <div style={{ textAlign: "center", fontSize: 9 }}>Tel: +252 61 5000111</div>
              <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
              <div>RCPT: #{lastReceipt.id} | {lastReceipt.station}</div>
              <div>DATE: {lastReceipt.date}</div>
              <div>CASHIER: {lastReceipt.cashier}</div>
              <div>CUSTOMER: {lastReceipt.customer}</div>
              <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
              {lastReceipt.cart.map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", margin: "2px 0" }}>
                  <span>{item.name.slice(0, 16)} x{item.qty}</span>
                  <span>{money(item.qty * item.price)}</span>
                </div>
              ))}
              <div style={{ borderBottom: "1px dashed #000", margin: "4px 0" }}></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                <span>TOTAL:</span>
                <span>KES {money(lastReceipt.total)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>PAID:</span>
                <span>KES {money(lastReceipt.tendered)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>CHANGE:</span>
                <span>KES {money(lastReceipt.change)}</span>
              </div>
              <div style={{ textAlign: "center", marginTop: 8, fontSize: 8 }}>
                * MAHADSANID / THANK YOU *
              </div>
            </div>
          ) : printFormat === "dispatch" ? (
            <div className="invoice-a4" style={{ padding: "10mm" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #000", paddingBottom: 8, marginBottom: 12 }}>
                <div>
                  <h2 style={{ margin: 0 }}>WAREHOUSE PICK & DISPATCH SLIP</h2>
                  <div>Order Reference: #{lastReceipt.id} | Station: {lastReceipt.station}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div>Date: {lastReceipt.date}</div>
                  <div>Customer: {lastReceipt.customer}</div>
                </div>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: "#eee", textAlign: "left" }}>
                    <th style={{ padding: 6, border: "1px solid #ccc" }}>CHECK</th>
                    <th style={{ padding: 6, border: "1px solid #ccc" }}>ITEM DESCRIPTION</th>
                    <th style={{ padding: 6, border: "1px solid #ccc" }}>SKU</th>
                    <th style={{ padding: 6, border: "1px solid #ccc", textAlign: "right" }}>QTY REQUIRED</th>
                  </tr>
                </thead>
                <tbody>
                  {lastReceipt.cart.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 6, border: "1px solid #ccc", textAlign: "center" }}>[  ]</td>
                      <td style={{ padding: 6, border: "1px solid #ccc", fontWeight: "bold" }}>{item.name}</td>
                      <td style={{ padding: 6, border: "1px solid #ccc" }}>{item.sku || `PRD-${item.product_id}`}</td>
                      <td style={{ padding: 6, border: "1px solid #ccc", textAlign: "right", fontWeight: "bold" }}>{item.qty} {item.unit || "unit"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20, paddingTop: 10, borderTop: "1px dashed #000" }}>
                <div>Storekeeper Sign: _____________________</div>
                <div>Driver / Loading Sign: _________________</div>
              </div>
            </div>
          ) : printFormat === "labels" ? (
            <div className="labels-sheet">
              {lastReceipt.cart.map((item, idx) => (
                <div key={idx} style={{ border: "1.5px solid #000", padding: 8, borderRadius: 4, textAlign: "center" }}>
                  <div style={{ fontWeight: "bold", fontSize: 11 }}>{item.name}</div>
                  <div style={{ fontSize: 9 }}>SKU: {item.sku || `SKU-${item.product_id}`}</div>
                  <div style={{ fontSize: 16, fontWeight: "bold", margin: "4px 0" }}>KES {money(item.price)}</div>
                  <div style={{ fontSize: 10, letterSpacing: 2 }}>|||| ||| |||| | ||</div>
                  <div style={{ fontSize: 8 }}>EXP: 2027-06-30</div>
                </div>
              ))}
            </div>
          ) : (
            /* 80mm Standard Thermal Receipt (Default) */
            <div className="receipt-80mm">
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: "bold", fontSize: 15 }}>iCash Wholesale & Flow</div>
                <div>Bakaara Market / Nairobi Gate 4</div>
                <div>Tel: +252 61 5000111 / +254 700 000000</div>
                <div>PIN/VAT: P051289304Z</div>
                <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>
                <div style={{ fontWeight: "bold" }}>TAX INVOICE / RECEIPT #{lastReceipt.id}</div>
                <div>Date: {lastReceipt.date}</div>
                <div>Station: {lastReceipt.station}</div>
                <div>Cashier: {lastReceipt.cashier}</div>
                <div>Customer: {lastReceipt.customer}</div>
                <div style={{ borderBottom: "1px dashed #000", margin: "5px 0" }}></div>
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
                    <th>ITEM</th>
                    <th style={{ textAlign: "center" }}>QTY</th>
                    <th style={{ textAlign: "right" }}>PRICE</th>
                    <th style={{ textAlign: "right" }}>AMT</th>
                  </tr>
                </thead>
                <tbody>
                  {lastReceipt.cart.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: "3px 0" }}>{item.name}</td>
                      <td style={{ textAlign: "center" }}>{item.qty}</td>
                      <td style={{ textAlign: "right" }}>{money(item.price)}</td>
                      <td style={{ textAlign: "right" }}>{money(item.qty * item.price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ borderBottom: "1px dashed #000", margin: "6px 0" }}></div>

              <div style={{ fontSize: 11 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>SUBTOTAL:</span>
                  <span>KES {money(lastReceipt.total * 0.95)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>VAT (5%):</span>
                  <span>KES {money(lastReceipt.total * 0.05)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: 13, margin: "3px 0" }}>
                  <span>TOTAL:</span>
                  <span>KES {money(lastReceipt.total)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>PAID ({lastReceipt.method.toUpperCase()}):</span>
                  <span>KES {money(lastReceipt.tendered)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span>CHANGE:</span>
                  <span>KES {money(lastReceipt.change)}</span>
                </div>
              </div>

              <div style={{ borderBottom: "1px dashed #000", margin: "6px 0" }}></div>

              <div style={{ textAlign: "center", fontSize: 9, marginTop: 4 }}>
                <div style={{ letterSpacing: 3, fontWeight: "bold", fontSize: 13 }}>||||| | |||| || |||||| | ||||</div>
                <div>*ICASH-{lastReceipt.id}-{Date.now().toString().slice(-4)}*</div>
                <div style={{ marginTop: 4 }}>Mahadsanid / Thank you for your business!</div>
                <div>Goods once sold are not returnable after 48h.</div>
              </div>
            </div>
          )}
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

