"use client";
import { useEffect, useState } from "react";
import { USERS, ROLES } from "../lib/users";
import { TEMPLATES } from "../lib/templates";

const KEY = "icash-workflow-v1";
const uid = () => Math.random().toString(36).slice(2, 9);

const card = { background: "#fff", border: "1px solid #e2e5ea", borderRadius: 8, padding: 16, marginBottom: 12 };
const btn = { padding: "6px 12px", borderRadius: 6, border: "1px solid #c5cad3", background: "#fff", cursor: "pointer" };
const primary = { ...btn, background: "#1f6feb", borderColor: "#1f6feb", color: "#fff" };
const input = { padding: 8, borderRadius: 6, border: "1px solid #c5cad3", width: "100%", boxSizing: "border-box" };

export default function Page() {
  const [db, setDb] = useState({ workflows: TEMPLATES, instances: [] });
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("inbox");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setDb(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
  }, [db, ready]);

  if (!user) return <Login onLogin={setUser} />;

  const myTasks = db.instances.filter(
    (i) => i.status === "active" && i.steps[i.current].role === user.role
  );

  return (
    <div style={{ maxWidth: 820, margin: "0 auto", padding: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>iCash Workflow</h2>
        <div>
          {user.username} ({user.role}){" "}
          <button style={btn} onClick={() => setUser(null)}>Log out</button>
        </div>
      </header>
      <nav style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {[["inbox", `Task inbox (${myTasks.length})`], ["builder", "Workflow builder"], ["runs", "All runs"]].map(([k, l]) => (
          <button key={k} style={tab === k ? primary : btn} onClick={() => setTab(k)}>{l}</button>
        ))}
      </nav>
      {tab === "inbox" && <Inbox tasks={myTasks} user={user} db={db} setDb={setDb} />}
      {tab === "builder" && <Builder db={db} setDb={setDb} />}
      {tab === "runs" && <Runs db={db} />}
    </div>
  );
}

function Login({ onLogin }) {
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const submit = () => {
    const found = USERS.find((x) => x.username === u.trim() && x.password === p);
    if (found) onLogin(found); else setErr("Wrong username or password");
  };
  return (
    <div style={{ maxWidth: 320, margin: "80px auto", ...card }}>
      <h2 style={{ marginTop: 0 }}>iCash Workflow</h2>
      <p style={{ color: "#5b6470", fontSize: 14 }}>Demo login. Try admin / demo123</p>
      <input style={{ ...input, marginBottom: 8 }} placeholder="Username" value={u} onChange={(e) => setU(e.target.value)} />
      <input style={{ ...input, marginBottom: 8 }} type="password" placeholder="Password" value={p} onChange={(e) => setP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} />
      {err && <div style={{ color: "#c62828", marginBottom: 8 }}>{err}</div>}
      <button style={primary} onClick={submit}>Log in</button>
    </div>
  );
}

function Inbox({ tasks, user, db, setDb }) {
  const act = (id, approve) =>
    setDb((d) => ({
      ...d,
      instances: d.instances.map((i) => {
        if (i.id !== id) return i;
        const log = [...i.log, { by: user.username, step: i.steps[i.current].title, result: approve ? "approved" : "rejected" }];
        if (!approve) return { ...i, status: "rejected", log };
        if (i.current + 1 >= i.steps.length) return { ...i, status: "done", log };
        return { ...i, current: i.current + 1, log };
      }),
    }));

  const [wfId, setWfId] = useState("");
  const [title, setTitle] = useState("");
  const start = () => {
    const wf = db.workflows.find((w) => w.id === wfId);
    if (!wf) return;
    setDb((d) => ({
      ...d,
      instances: [...d.instances, { id: uid(), name: title.trim() || wf.name, workflow: wf.name, steps: wf.steps, current: 0, status: "active", log: [] }],
    }));
    setTitle("");
  };

  return (
    <div>
      <div style={card}>
        <b>Start a workflow</b>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select style={input} value={wfId} onChange={(e) => setWfId(e.target.value)}>
            <option value="">Choose workflow...</option>
            {db.workflows.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <input style={input} placeholder="Title (e.g. customer name)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <button style={primary} onClick={start}>Start</button>
        </div>
      </div>
      {tasks.length === 0 && <p style={{ color: "#5b6470" }}>No tasks for the {user.role} role.</p>}
      {tasks.map((t) => (
        <div key={t.id} style={card}>
          <b>{t.name}</b> <span style={{ color: "#5b6470" }}>({t.workflow})</span>
          <div style={{ margin: "6px 0" }}>Step {t.current + 1}/{t.steps.length}: {t.steps[t.current].title}</div>
          <button style={primary} onClick={() => act(t.id, true)}>Approve</button>{" "}
          <button style={btn} onClick={() => act(t.id, false)}>Reject</button>
        </div>
      ))}
    </div>
  );
}

function Builder({ db, setDb }) {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState([{ title: "", role: ROLES[0] }]);
  const upd = (i, patch) => setSteps((s) => s.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const save = () => {
    const clean = steps.filter((s) => s.title.trim());
    if (!name.trim() || clean.length === 0) return;
    setDb((d) => ({ ...d, workflows: [...d.workflows, { id: uid(), name: name.trim(), steps: clean }] }));
    setName("");
    setSteps([{ title: "", role: ROLES[0] }]);
  };
  return (
    <div>
      <div style={card}>
        <b>New workflow</b>
        <input style={{ ...input, margin: "8px 0" }} placeholder="Workflow name" value={name} onChange={(e) => setName(e.target.value)} />
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
            <input style={input} placeholder={`Step ${i + 1} title`} value={s.title} onChange={(e) => upd(i, { title: e.target.value })} />
            <select style={{ ...input, width: 160 }} value={s.role} onChange={(e) => upd(i, { role: e.target.value })}>
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
            <button style={btn} onClick={() => setSteps((x) => x.filter((_, j) => j !== i))}>x</button>
          </div>
        ))}
        <button style={btn} onClick={() => setSteps((s) => [...s, { title: "", role: ROLES[0] }])}>+ Add step</button>{" "}
        <button style={primary} onClick={save}>Save workflow</button>
      </div>
      {db.workflows.map((w) => (
        <div key={w.id} style={card}>
          <b>{w.name}</b>
          <div style={{ color: "#5b6470", fontSize: 14 }}>{w.steps.map((s) => `${s.title} (${s.role})`).join(" > ")}</div>
        </div>
      ))}
    </div>
  );
}

function Runs({ db }) {
  if (db.instances.length === 0) return <p style={{ color: "#5b6470" }}>No runs yet.</p>;
  return (
    <div>
      {db.instances.map((i) => (
        <div key={i.id} style={card}>
          <b>{i.name}</b> <span style={{ color: "#5b6470" }}>({i.workflow}) - {i.status}</span>
          {i.status === "active" && <div>Waiting on: {i.steps[i.current].title} ({i.steps[i.current].role})</div>}
          {i.log.map((l, k) => <div key={k} style={{ fontSize: 13, color: "#5b6470" }}>{l.step}: {l.result} by {l.by}</div>)}
        </div>
      ))}
    </div>
  );
}
