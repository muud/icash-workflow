"""Mtiririko API scaffold: auth, workflow versions, request/task engine, audit.
Runs on SQLite by default; set DATABASE_URL (postgresql+psycopg://...) for Postgres.
Set JWT_SECRET in production, or tokens are invalidated on every restart."""
import os, hmac, hashlib, secrets, threading, datetime as dt
from contextlib import asynccontextmanager
from typing import Any, Literal, Optional
import jwt
from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from sqlalchemy import (create_engine, select, func, String, Integer, ForeignKey, JSON,
                        DateTime, Table, Column, Date, Float, UniqueConstraint, or_)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship, sessionmaker, Session

DB_URL = os.getenv("DATABASE_URL", "sqlite:///./mtiririko.db")
SECRET = os.getenv("JWT_SECRET") or "mtiririko_dev_jwt_secret_fallback_key_2026"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False} if DB_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(engine, expire_on_commit=False)
now = lambda: dt.datetime.now(dt.timezone.utc).replace(tzinfo=None)  # naive UTC

class Base(DeclarativeBase): pass
user_roles = Table("user_roles", Base.metadata,
    Column("user_id", ForeignKey("users.id"), primary_key=True),
    Column("role_id", ForeignKey("roles.id"), primary_key=True))

class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True); name: Mapped[str]
class Role(Base):
    __tablename__ = "roles"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); name: Mapped[str]
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    email: Mapped[str] = mapped_column(String, unique=True); full_name: Mapped[str]; pw: Mapped[str]
    roles: Mapped[list[Role]] = relationship(secondary=user_roles, lazy="selectin")
class Workflow(Base):
    __tablename__ = "workflows"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); name: Mapped[str]
class Version(Base):
    __tablename__ = "workflow_versions"
    id: Mapped[int] = mapped_column(primary_key=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflows.id"))
    version: Mapped[int]; status: Mapped[str]; fields: Mapped[list] = mapped_column(JSON)
class Step(Base):
    __tablename__ = "steps"
    id: Mapped[int] = mapped_column(primary_key=True)
    version_id: Mapped[int] = mapped_column(ForeignKey("workflow_versions.id"))
    name: Mapped[str]; type: Mapped[str]; role: Mapped[Optional[str]]; position: Mapped[int]
    config: Mapped[dict] = mapped_column(JSON, default=dict)
class Transition(Base):
    __tablename__ = "transitions"
    id: Mapped[int] = mapped_column(primary_key=True)
    from_step_id: Mapped[int] = mapped_column(ForeignKey("steps.id"))
    to_step_id: Mapped[Optional[int]] = mapped_column(ForeignKey("steps.id"))  # None = finish
    condition: Mapped[Optional[dict]] = mapped_column(JSON); priority: Mapped[int] = mapped_column(default=0)
class Request(Base):
    __tablename__ = "requests"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"))
    version_id: Mapped[int] = mapped_column(ForeignKey("workflow_versions.id"))
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    data: Mapped[dict] = mapped_column(JSON); status: Mapped[str] = mapped_column(default="running")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    closed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
class Task(Base):
    __tablename__ = "tasks"
    id: Mapped[int] = mapped_column(primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("requests.id"))
    step_id: Mapped[int] = mapped_column(ForeignKey("steps.id"))
    assignee_role: Mapped[str]; outcome: Mapped[Optional[str]]; comment: Mapped[Optional[str]]
    actor_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
    completed_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime)
class Audit(Base):
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int]; actor_id: Mapped[Optional[int]]; action: Mapped[str]
    entity: Mapped[str]; entity_id: Mapped[int]; detail: Mapped[Optional[dict]] = mapped_column(JSON)
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)

Base.metadata.create_all(engine)

# ── auth helpers ────────────────────────────────────────────────────
def hash_pw(pw, salt=None):
    salt = salt or secrets.token_hex(8)
    return f"{salt}${hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 200_000).hex()}"
def check_pw(pw, stored): return hmac.compare_digest(hash_pw(pw, stored.split("$")[0]), stored)
def token_for(u): return jwt.encode({"sub": str(u.id), "exp": now() + dt.timedelta(hours=12)}, SECRET, "HS256")
def get_db():
    with SessionLocal() as db: yield db
bearer = HTTPBearer()
def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer), db: Session = Depends(get_db)):
    try: u = db.get(User, int(jwt.decode(cred.credentials, SECRET, ["HS256"])["sub"]))
    except Exception: u = None
    if not u: raise HTTPException(401, "Invalid or expired token")
    return u
rolenames = lambda u: {r.name for r in u.roles}
def need_admin(u):
    if "Admin" not in rolenames(u): raise HTTPException(403, "Admin role required")

def audit(db, tenant_id, actor, action, entity, entity_id, detail=None):
    db.add(Audit(tenant_id=tenant_id, actor_id=actor.id if actor else None, action=action,
                 entity=entity, entity_id=entity_id, detail=detail))

# ── workflow engine ─────────────────────────────────────────────────
OPS = {">": lambda a, b: a > b, ">=": lambda a, b: a >= b, "<": lambda a, b: a < b,
       "<=": lambda a, b: a <= b, "==": lambda a, b: a == b, "!=": lambda a, b: a != b}
def matches(cond, data):
    if not cond: return True
    a, b = data.get(cond["field"]), cond["value"]
    try: a, b = float(a), float(b)
    except (TypeError, ValueError): pass
    try: return OPS[cond["op"]](a, b)
    except Exception: return False

def next_step(db, req, step):
    """First matching transition wins; otherwise the next step by position; None = finish."""
    for t in db.scalars(select(Transition).where(Transition.from_step_id == step.id).order_by(Transition.priority)):
        if matches(t.condition, req.data):
            return db.get(Step, t.to_step_id) if t.to_step_id else None
    return db.scalar(select(Step).where(Step.version_id == step.version_id, Step.position == step.position + 1))

def enter(db, req, step):
    while step:
        if step.type in ("approval", "task"):
            t = Task(request_id=req.id, step_id=step.id, assignee_role=step.role); db.add(t); db.flush()
            audit(db, req.tenant_id, None, "task.created", "task", t.id, {"step": step.name, "role": step.role})
            return
        audit(db, req.tenant_id, None, f"step.{step.type}", "request", req.id,
              {"step": step.name, "config": step.config})   # webhook delivery: add a queue worker here
        step = next_step(db, req, step)
    req.status, req.closed_at = "done", now()
    audit(db, req.tenant_id, None, "request.completed", "request", req.id)

# ── schemas ─────────────────────────────────────────────────────────
class FieldIn(BaseModel):
    key: str; label: str; type: Literal["text", "number", "date", "select"] = "text"
    required: bool = True; options: Optional[list[str]] = None
class StepIn(BaseModel):
    name: str; type: Literal["approval", "task", "notify", "webhook"]
    role: Optional[str] = None; config: dict = {}
    due_hours: Optional[int] = Field(default=None, gt=0)   # deadline for approval/task steps
class TransIn(BaseModel):
    from_pos: int; to_pos: Optional[int] = None; condition: Optional[dict] = None; priority: int = 0
class WorkflowIn(BaseModel):
    name: str; fields: list[FieldIn]; steps: list[StepIn]; transitions: list[TransIn] = []
class TenantIn(BaseModel):
    tenant_name: str; email: str; full_name: str; password: str
class LoginIn(BaseModel): email: str; password: str
class UserIn(BaseModel): email: str; full_name: str; password: str; roles: list[str]
class RequestIn(BaseModel): workflow_id: int; data: dict[str, Any]
class ActIn(BaseModel): comment: Optional[str] = None

def due_of(task, step):
    h = (step.config or {}).get("due_hours")
    return task.created_at + dt.timedelta(hours=h) if h else None

def remind_overdue(db):
    """Write one 'task.overdue' audit event per late task and log it. Plug email/SMS/WhatsApp in here."""
    seen = set(db.scalars(select(Audit.entity_id).where(Audit.action == "task.overdue")))
    n = 0
    for t, r, s in list(db.execute(select(Task, Request, Step).join(Request, Request.id == Task.request_id)
                                   .join(Step, Step.id == Task.step_id).where(Task.outcome.is_(None)))):
        due = due_of(t, s)
        if due and due < now() and t.id not in seen:
            audit(db, r.tenant_id, None, "task.overdue", "task", t.id,
                  {"request": r.id, "step": s.name, "role": t.assignee_role})
            print(f"[reminder] '{s.name}' on request {r.id} is overdue for {t.assignee_role}")
            n += 1
    db.commit(); return n

@asynccontextmanager
async def lifespan(app):
    stop = threading.Event()
    def loop():   # single worker only, or several workers would each run this
        while not stop.wait(int(os.getenv("REMINDER_SECONDS", "300"))):
            try:
                with SessionLocal() as db: remind_overdue(db)
            except Exception as e: print("reminder error:", e)
    threading.Thread(target=loop, daemon=True).start()
    yield
    stop.set()

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Mtiririko API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3005",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3005",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
DEFAULT_ROLES = ["Requester", "Manager", "Finance", "Admin", "Cashier", "Storekeeper", "Sales", "Warehouse"]

@app.post("/auth/register-tenant", status_code=201)
def register(b: TenantIn, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.email == b.email.lower())): raise HTTPException(409, "Email already registered")
    t = Tenant(name=b.tenant_name); db.add(t); db.flush()
    roles = {n: Role(tenant_id=t.id, name=n) for n in DEFAULT_ROLES}; db.add_all(roles.values())
    u = User(tenant_id=t.id, email=b.email.lower(), full_name=b.full_name, pw=hash_pw(b.password),
             roles=[roles["Admin"], roles["Requester"]]); db.add(u); db.flush()
    audit(db, t.id, u, "tenant.created", "tenant", t.id); db.commit()
    return {"token": token_for(u)}

@app.post("/auth/login")
def login(b: LoginIn, db: Session = Depends(get_db)):
    u = db.scalar(select(User).where(User.email == b.email.lower()))
    if not u or not check_pw(b.password, u.pw): raise HTTPException(401, "Wrong email or password")
    return {"token": token_for(u)}

@app.get("/me")
def me(u: User = Depends(current_user)):
    return {"id": u.id, "email": u.email, "full_name": u.full_name, "roles": sorted(rolenames(u))}

@app.post("/users", status_code=201)
def add_user(b: UserIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need_admin(u)
    have = set(db.scalars(select(Role.name).where(Role.tenant_id == u.tenant_id)))
    for n in DEFAULT_ROLES:            # older companies get the newer default roles on demand
        if n not in have: db.add(Role(tenant_id=u.tenant_id, name=n))
    db.flush()
    rs = list(db.scalars(select(Role).where(Role.tenant_id == u.tenant_id, Role.name.in_(b.roles))))
    if len(rs) != len(set(b.roles)): raise HTTPException(400, "Unknown role in list")
    if db.scalar(select(User).where(User.email == b.email.lower())): raise HTTPException(409, "Email already registered")
    n = User(tenant_id=u.tenant_id, email=b.email.lower(), full_name=b.full_name, pw=hash_pw(b.password), roles=rs)
    db.add(n); db.flush(); audit(db, u.tenant_id, u, "user.created", "user", n.id); db.commit()
    return {"id": n.id}

@app.get("/users")
def list_users(u: User = Depends(current_user), db: Session = Depends(get_db)):
    need_admin(u)
    users = db.scalars(select(User).where(User.tenant_id == u.tenant_id).order_by(User.id))
    return [{"id": x.id, "email": x.email, "full_name": x.full_name, "roles": sorted(rolenames(x))} for x in users]

def make_version(db, tenant_id, wf, b: WorkflowIn):
    if not b.steps: raise HTTPException(400, "A workflow needs at least one step")
    valid = set(db.scalars(select(Role.name).where(Role.tenant_id == tenant_id)))
    for s in b.steps:
        if s.type in ("approval", "task") and s.role not in valid:
            raise HTTPException(400, f"Step '{s.name}' needs a valid role")
    n = len(b.steps)
    for t in b.transitions:
        if not 0 <= t.from_pos < n or (t.to_pos is not None and not 0 <= t.to_pos < n):
            raise HTTPException(400, "Transition points to a step that does not exist")
    for old in db.scalars(select(Version).where(Version.workflow_id == wf.id, Version.status == "published")):
        old.status = "archived"
    last = db.scalar(select(func.max(Version.version)).where(Version.workflow_id == wf.id)) or 0
    v = Version(workflow_id=wf.id, version=last + 1, status="published", fields=[f.model_dump() for f in b.fields])
    db.add(v); db.flush()
    steps = [Step(version_id=v.id, name=s.name, type=s.type, role=s.role, position=i,
             config={**s.config, **({"due_hours": s.due_hours} if s.due_hours else {})})
             for i, s in enumerate(b.steps)]
    db.add_all(steps); db.flush()
    for t in b.transitions:
        db.add(Transition(from_step_id=steps[t.from_pos].id, condition=t.condition, priority=t.priority,
                          to_step_id=None if t.to_pos is None else steps[t.to_pos].id))
    return v

@app.post("/workflows", status_code=201)
def create_workflow(b: WorkflowIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need_admin(u)
    wf = Workflow(tenant_id=u.tenant_id, name=b.name); db.add(wf); db.flush()
    v = make_version(db, u.tenant_id, wf, b)
    audit(db, u.tenant_id, u, "workflow.published", "workflow", wf.id, {"version": v.version}); db.commit()
    return {"id": wf.id, "version": v.version}

@app.post("/workflows/{wid}/versions", status_code=201)
def new_version(wid: int, b: WorkflowIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need_admin(u); wf = db.get(Workflow, wid)
    if not wf or wf.tenant_id != u.tenant_id: raise HTTPException(404, "Workflow not found")
    v = make_version(db, u.tenant_id, wf, b)   # running requests keep their old version
    audit(db, u.tenant_id, u, "workflow.published", "workflow", wf.id, {"version": v.version}); db.commit()
    return {"id": wf.id, "version": v.version}

@app.get("/workflows")
def list_workflows(u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = (select(Workflow, Version).join(Version, Version.workflow_id == Workflow.id)
         .where(Workflow.tenant_id == u.tenant_id, Version.status == "published"))
    return [{"id": w.id, "name": w.name, "version": v.version, "fields": v.fields} for w, v in db.execute(q)]

def progress(db, req):
    """Per-step state for the flow track: done, current, rejected, pending, or skipped (branch not taken)."""
    steps = list(db.scalars(select(Step).where(Step.version_id == req.version_id).order_by(Step.position)))
    tasks = {t.step_id: t for t in db.scalars(select(Task).where(Task.request_id == req.id))}
    auto = {a.detail.get("step") for a in db.scalars(select(Audit).where(
        Audit.tenant_id == req.tenant_id, Audit.entity == "request", Audit.entity_id == req.id,
        Audit.action.in_(("step.notify", "step.webhook")))) if a.detail}
    out = []
    for s in steps:
        t = tasks.get(s.id)
        if t: state = "current" if not t.outcome else ("rejected" if t.outcome == "rejected" else "done")
        elif s.name in auto: state = "done"
        else: state = "pending" if req.status == "running" else "skipped"
        due = due_of(t, s) if t and not t.outcome else None
        out.append({"name": s.name, "type": s.type, "role": s.role, "state": state, "overdue": bool(due and due < now())})
    return out

@app.post("/requests", status_code=201)
def create_request(b: RequestIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    wf = db.get(Workflow, b.workflow_id)
    if not wf or wf.tenant_id != u.tenant_id: raise HTTPException(404, "Workflow not found")
    v = db.scalar(select(Version).where(Version.workflow_id == wf.id, Version.status == "published"))
    missing = [f["label"] for f in v.fields if f["required"] and str(b.data.get(f["key"], "")).strip() == ""]
    if missing: raise HTTPException(422, f"Missing required fields: {', '.join(missing)}")
    r = Request(tenant_id=u.tenant_id, version_id=v.id, requester_id=u.id, data=b.data); db.add(r); db.flush()
    audit(db, u.tenant_id, u, "request.created", "request", r.id)
    enter(db, r, db.scalar(select(Step).where(Step.version_id == v.id, Step.position == 0)))
    db.commit(); return {"id": r.id, "status": r.status}

@app.get("/requests")
def list_requests(u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = (select(Request, Workflow.name).join(Version, Version.id == Request.version_id)
         .join(Workflow, Workflow.id == Version.workflow_id)
         .where(Request.tenant_id == u.tenant_id).order_by(Request.id.desc()))
    if "Admin" not in rolenames(u): q = q.where(Request.requester_id == u.id)
    return [{"id": r.id, "workflow": n, "status": r.status, "data": r.data, "created_at": r.created_at.isoformat(), "steps": progress(db, r)}
            for r, n in list(db.execute(q))]

@app.get("/tasks")
def inbox(u: User = Depends(current_user), db: Session = Depends(get_db)):
    q = (select(Task, Request, Step).join(Request, Request.id == Task.request_id)
         .join(Step, Step.id == Task.step_id)
         .where(Request.tenant_id == u.tenant_id, Task.outcome.is_(None)).order_by(Task.id))
    if "Admin" not in rolenames(u): q = q.where(Task.assignee_role.in_(rolenames(u)))
    out = []
    for t, r, s in list(db.execute(q)):
        due = due_of(t, s)
        out.append({"id": t.id, "request_id": r.id, "step": s.name, "type": s.type, "role": t.assignee_role,
                    "data": r.data, "created_at": t.created_at.isoformat(), "steps": progress(db, r),
                    "due_at": due.isoformat() if due else None, "overdue": bool(due and due < now())})
    return sorted(out, key=lambda x: (not x["overdue"], x["due_at"] or "9", x["id"]))   # overdue first

def resolve(db, u, tid, action, comment):
    t = db.get(Task, tid); r = db.get(Request, t.request_id) if t else None
    if not t or r.tenant_id != u.tenant_id: raise HTTPException(404, "Task not found")
    if t.outcome: raise HTTPException(409, "Task already handled")
    if t.assignee_role not in rolenames(u) and "Admin" not in rolenames(u):
        raise HTTPException(403, f"This task is assigned to the {t.assignee_role} role")
    step = db.get(Step, t.step_id)
    allowed = {"approval": ("approve", "reject"), "task": ("complete",)}[step.type]
    if action not in allowed: raise HTTPException(400, f"A {step.type} step accepts: {', '.join(allowed)}")
    t.outcome = {"approve": "approved", "reject": "rejected", "complete": "completed"}[action]
    t.comment, t.actor_id, t.completed_at = comment, u.id, now()
    audit(db, r.tenant_id, u, f"task.{t.outcome}", "task", t.id, {"request": r.id, "step": step.name})
    if action == "reject":
        r.status, r.closed_at = "rejected", now()
        audit(db, r.tenant_id, u, "request.rejected", "request", r.id)
    else: enter(db, r, next_step(db, r, step))
    db.commit(); return {"request_status": r.status}

@app.post("/tasks/{tid}/{action}")
def act(tid: int, action: Literal["approve", "reject", "complete"], b: ActIn = ActIn(),
        u: User = Depends(current_user), db: Session = Depends(get_db)):
    return resolve(db, u, tid, action, b.comment)

@app.get("/audit")
def audit_log(u: User = Depends(current_user), db: Session = Depends(get_db)):
    need_admin(u)
    return [{"at": a.at.isoformat(), "action": a.action, "entity": a.entity, "entity_id": a.entity_id,
             "actor_id": a.actor_id, "detail": a.detail}
            for a in db.scalars(select(Audit).where(Audit.tenant_id == u.tenant_id).order_by(Audit.id.desc()).limit(200))]

# ── serve the web UI from the same origin (no CORS needed) ──────────
from fastapi.responses import FileResponse
@app.get("/", include_in_schema=False)
def home(): return FileResponse(os.path.join(os.path.dirname(__file__), "index.html"))


# ══ Cash & carry wholesale: delivery entry → stock lots → sale → adjustments → day close → report ══
class Supplier(Base):
    __tablename__ = "suppliers"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); name: Mapped[str]; phone: Mapped[Optional[str]]
class Customer(Base):
    __tablename__ = "customers"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); name: Mapped[str]
    phone: Mapped[Optional[str]]; kind: Mapped[Optional[str]]          # retailer, restaurant, hotel...
class Product(Base):
    __tablename__ = "products"
    __table_args__ = (UniqueConstraint("tenant_id", "sku"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); sku: Mapped[str]; name: Mapped[str]; unit: Mapped[str]
    cost_price: Mapped[float] = mapped_column(Float, default=0.0)      # last purchase cost
    sell_price: Mapped[float] = mapped_column(Float, default=0.0); reorder_level: Mapped[float] = mapped_column(Float, default=0.0)
class Receipt(Base):                                                    # a delivery entered into the warehouse
    __tablename__ = "receipts"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); supplier_id: Mapped[int] = mapped_column(ForeignKey("suppliers.id"))
    ref: Mapped[str]; received_by: Mapped[int] = mapped_column(ForeignKey("users.id")); at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
class Lot(Base):                                                        # stock is tracked per batch, so cost and expiry stay exact
    __tablename__ = "lots"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    receipt_id: Mapped[Optional[int]] = mapped_column(ForeignKey("receipts.id")); batch: Mapped[Optional[str]]
    expiry: Mapped[Optional[dt.date]] = mapped_column(Date); qty_in: Mapped[float] = mapped_column(Float)
    qty_left: Mapped[float] = mapped_column(Float); unit_cost: Mapped[float] = mapped_column(Float)
class Sale(Base):
    __tablename__ = "sales"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"))
    cashier_id: Mapped[int] = mapped_column(ForeignKey("users.id")); method: Mapped[str]; reference: Mapped[Optional[str]]
    total: Mapped[float] = mapped_column(Float, default=0.0); cogs: Mapped[float] = mapped_column(Float, default=0.0)
    at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
class SaleLine(Base):
    __tablename__ = "sale_lines"
    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sales.id")); product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    qty: Mapped[float] = mapped_column(Float); unit_price: Mapped[float] = mapped_column(Float); cogs: Mapped[float] = mapped_column(Float)
class Adjustment(Base):
    __tablename__ = "adjustments"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    qty: Mapped[float] = mapped_column(Float); reason: Mapped[str]; note: Mapped[Optional[str]]; value: Mapped[float] = mapped_column(Float, default=0.0)
    by: Mapped[int] = mapped_column(ForeignKey("users.id")); at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
class DayClose(Base):
    __tablename__ = "day_closes"
    __table_args__ = (UniqueConstraint("tenant_id", "day"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id")); day: Mapped[str]
    expected_cash: Mapped[float] = mapped_column(Float); counted_cash: Mapped[float] = mapped_column(Float); difference: Mapped[float] = mapped_column(Float)
    closed_by: Mapped[int] = mapped_column(ForeignKey("users.id")); at: Mapped[dt.datetime] = mapped_column(DateTime, default=now)
Base.metadata.create_all(engine)   # creates the tables above (safe on an existing database)

def need(u, *roles):
    if not rolenames(u) & (set(roles) | {"Admin"}): raise HTTPException(403, f"Requires role: {' or '.join(roles)}")
def own(db, model, oid, u):
    o = db.get(model, oid)
    if not o or o.tenant_id != u.tenant_id: raise HTTPException(404, f"{model.__name__} not found")
    return o
def lots_q(tid, pid, sellable_only):
    q = select(Lot).where(Lot.tenant_id == tid, Lot.product_id == pid, Lot.qty_left > 0)
    if sellable_only: q = q.where(or_(Lot.expiry.is_(None), Lot.expiry >= now().date()))   # expired stock cannot be sold
    return q.order_by(Lot.expiry.is_(None), Lot.expiry, Lot.id)                            # first-expiry-first-out
def sellable(db, tid, pid): return sum(l.qty_left for l in db.scalars(lots_q(tid, pid, True)))
def take_fefo(db, tid, pid, qty, sellable_only=True):
    """Remove qty from lots, earliest expiry first. Returns the cost of the goods removed."""
    cost, left = 0.0, qty
    for lot in list(db.scalars(lots_q(tid, pid, sellable_only))):
        use = min(lot.qty_left, left); lot.qty_left -= use; cost += use * lot.unit_cost; left -= use
        if left <= 1e-9: break
    return round(cost, 2)
def day_range(day):
    off = dt.timedelta(hours=int(os.getenv("TZ_OFFSET_HOURS", "3")))   # 3 = East Africa Time
    try: d = dt.date.fromisoformat(day) if day else (now() + off).date()
    except ValueError: raise HTTPException(400, "Day must look like 2026-09-29")
    start = dt.datetime.combine(d, dt.time.min) - off
    return d.isoformat(), start, start + dt.timedelta(days=1)

class SupIn(BaseModel): name: str; phone: Optional[str] = None
class CusIn(BaseModel): name: str; phone: Optional[str] = None; kind: Optional[str] = None
class ProdIn(BaseModel):
    sku: str; name: str; unit: str = "pc"; sell_price: float = Field(ge=0)
    cost_price: float = Field(0, ge=0); reorder_level: float = Field(0, ge=0)
class RLine(BaseModel):
    product_id: int; qty: float = Field(gt=0); unit_cost: float = Field(ge=0)
    batch: Optional[str] = None; expiry: Optional[dt.date] = None
class RecIn(BaseModel): supplier_id: int; ref: str; lines: list[RLine] = Field(min_length=1)
class SLine(BaseModel): product_id: int; qty: float = Field(gt=0); unit_price: Optional[float] = Field(default=None, ge=0)
class SaleIn(BaseModel):
    customer_id: Optional[int] = None; method: Literal["cash", "mpesa", "card"]
    reference: Optional[str] = None; lines: list[SLine] = Field(min_length=1)
class AdjIn(BaseModel):
    product_id: int; qty: float; reason: Literal["damaged", "expired", "count_correction", "customer_return"]; note: Optional[str] = None
class CloseIn(BaseModel): day: str; counted_cash: float = Field(ge=0)

@app.post("/suppliers", status_code=201)
def add_supplier(b: SupIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager"); s = Supplier(tenant_id=u.tenant_id, name=b.name.strip(), phone=b.phone); db.add(s); db.flush()
    audit(db, u.tenant_id, u, "supplier.created", "supplier", s.id, {"name": s.name}); db.commit(); return {"id": s.id}
@app.get("/suppliers")
def list_suppliers(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": s.id, "name": s.name, "phone": s.phone} for s in db.scalars(select(Supplier).where(Supplier.tenant_id == u.tenant_id).order_by(Supplier.name))]
@app.post("/customers", status_code=201)
def add_customer(b: CusIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager", "Cashier"); c = Customer(tenant_id=u.tenant_id, name=b.name.strip(), phone=b.phone, kind=b.kind); db.add(c); db.flush()
    audit(db, u.tenant_id, u, "customer.created", "customer", c.id, {"name": c.name}); db.commit(); return {"id": c.id}
@app.get("/customers")
def list_customers(u: User = Depends(current_user), db: Session = Depends(get_db)):
    return [{"id": c.id, "name": c.name, "phone": c.phone, "kind": c.kind} for c in db.scalars(select(Customer).where(Customer.tenant_id == u.tenant_id).order_by(Customer.name))]

@app.post("/products", status_code=201)
def add_product(b: ProdIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager")
    if db.scalar(select(Product).where(Product.tenant_id == u.tenant_id, Product.sku == b.sku.strip())): raise HTTPException(409, "That SKU already exists")
    p = Product(tenant_id=u.tenant_id, sku=b.sku.strip(), name=b.name.strip(), unit=b.unit.strip() or "pc", cost_price=b.cost_price,
                sell_price=b.sell_price, reorder_level=b.reorder_level); db.add(p); db.flush()
    audit(db, u.tenant_id, u, "product.created", "product", p.id, {"sku": p.sku, "name": p.name}); db.commit(); return {"id": p.id}
@app.get("/products")
def list_products(u: User = Depends(current_user), db: Session = Depends(get_db)):
    today = now().date(); soon = today + dt.timedelta(days=30); out = []
    for p in db.scalars(select(Product).where(Product.tenant_id == u.tenant_id).order_by(Product.name)):
        lots = list(db.scalars(select(Lot).where(Lot.product_id == p.id, Lot.qty_left > 0)))
        qty = sum(l.qty_left for l in lots); dated = [l for l in lots if l.expiry]
        expired = sum(l.qty_left for l in dated if l.expiry < today)
        out.append({"id": p.id, "sku": p.sku, "name": p.name, "unit": p.unit, "cost_price": p.cost_price, "sell_price": p.sell_price,
                    "reorder_level": p.reorder_level, "qty": round(qty, 3), "sellable": round(qty - expired, 3),
                    "value": round(sum(l.qty_left * l.unit_cost for l in lots), 2), "expired_qty": round(expired, 3),
                    "next_expiry": min(l.expiry for l in dated).isoformat() if dated else None,
                    "expiring_soon": any(today <= l.expiry <= soon for l in dated), "low": qty <= p.reorder_level})
    return out

@app.post("/receipts", status_code=201)
def receive(b: RecIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Storekeeper", "Manager"); sup = own(db, Supplier, b.supplier_id, u)
    if db.scalar(select(Receipt).where(Receipt.tenant_id == u.tenant_id, Receipt.supplier_id == sup.id, Receipt.ref == b.ref.strip())):
        raise HTTPException(409, "This supplier invoice number was already entered")   # stops double entry
    rc = Receipt(tenant_id=u.tenant_id, supplier_id=sup.id, ref=b.ref.strip(), received_by=u.id); db.add(rc); db.flush(); total = 0.0
    for l in b.lines:
        p = own(db, Product, l.product_id, u)
        if l.expiry and l.expiry < now().date(): raise HTTPException(400, f"{p.name} is already expired")
        db.add(Lot(tenant_id=u.tenant_id, product_id=p.id, receipt_id=rc.id, batch=l.batch, expiry=l.expiry, qty_in=l.qty, qty_left=l.qty, unit_cost=l.unit_cost))
        p.cost_price = l.unit_cost; total += l.qty * l.unit_cost
    audit(db, u.tenant_id, u, "receipt.created", "receipt", rc.id, {"supplier": sup.name, "ref": rc.ref, "total": round(total, 2)})
    db.commit(); return {"id": rc.id, "total": round(total, 2)}

@app.post("/sales", status_code=201)
def sell(b: SaleIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Cashier", "Manager"); tid = u.tenant_id
    if b.method != "cash" and not (b.reference or "").strip(): raise HTTPException(400, "Enter the M-Pesa code or card slip number")
    if b.customer_id: own(db, Customer, b.customer_id, u)
    agg = {}
    for l in b.lines: agg[l.product_id] = agg.get(l.product_id, 0) + l.qty
    prods = {pid: own(db, Product, pid, u) for pid in agg}
    for pid, q in agg.items():
        if sellable(db, tid, pid) + 1e-9 < q: raise HTTPException(409, f"Not enough sellable stock for {prods[pid].name}")
    s = Sale(tenant_id=tid, customer_id=b.customer_id, cashier_id=u.id, method=b.method, reference=(b.reference or "").strip() or None); db.add(s); db.flush()
    total = cogs = 0.0
    for l in b.lines:
        p = prods[l.product_id]; price = p.sell_price if l.unit_price is None else l.unit_price
        if abs(price - p.sell_price) > 1e-9: need(u, "Manager")        # only a manager may change a price at the till
        c = take_fefo(db, tid, p.id, l.qty)
        db.add(SaleLine(sale_id=s.id, product_id=p.id, qty=l.qty, unit_price=price, cogs=c)); total += l.qty * price; cogs += c
    s.total, s.cogs = round(total, 2), round(cogs, 2)
    audit(db, tid, u, "sale.created", "sale", s.id, {"total": s.total, "method": s.method}); db.commit()
    return {"id": s.id, "total": s.total}

@app.get("/sales/{sid}")
def sale_detail(sid: int, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Cashier", "Manager", "Finance"); s = own(db, Sale, sid, u)
    lines = [{"product": db.get(Product, l.product_id).name, "qty": l.qty, "unit_price": l.unit_price, "line_total": round(l.qty * l.unit_price, 2)}
             for l in db.scalars(select(SaleLine).where(SaleLine.sale_id == s.id))]
    return {"id": s.id, "at": s.at.isoformat(), "method": s.method, "reference": s.reference, "total": s.total,
            "customer": db.get(Customer, s.customer_id).name if s.customer_id else "Walk-in", "cashier": db.get(User, s.cashier_id).full_name, "lines": lines}

@app.get("/sales")
def list_sales(limit: int = 50, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Cashier", "Manager", "Finance")
    sales = db.scalars(select(Sale).where(Sale.tenant_id == u.tenant_id).order_by(Sale.id.desc()).limit(limit))
    return [{"id": s.id, "at": s.at.isoformat(), "method": s.method, "reference": s.reference,
             "total": s.total, "customer_id": s.customer_id, "cashier_id": s.cashier_id} for s in sales]

@app.post("/adjustments", status_code=201)
def adjust(b: AdjIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager", "Storekeeper"); p = own(db, Product, b.product_id, u)
    if b.qty == 0: raise HTTPException(400, "Quantity cannot be zero")
    if b.reason in ("damaged", "expired") and b.qty > 0: raise HTTPException(400, f"'{b.reason}' must remove stock (use a negative quantity)")
    value = 0.0
    if b.qty < 0:
        if sum(l.qty_left for l in db.scalars(lots_q(u.tenant_id, p.id, False))) + 1e-9 < -b.qty: raise HTTPException(409, "That is more than the stock on hand")
        value = take_fefo(db, u.tenant_id, p.id, -b.qty, sellable_only=False)
    else:
        db.add(Lot(tenant_id=u.tenant_id, product_id=p.id, qty_in=b.qty, qty_left=b.qty, unit_cost=p.cost_price)); value = -round(b.qty * p.cost_price, 2)
    a = Adjustment(tenant_id=u.tenant_id, product_id=p.id, qty=b.qty, reason=b.reason, note=b.note, value=value, by=u.id); db.add(a); db.flush()
    audit(db, u.tenant_id, u, "stock.adjusted", "adjustment", a.id, {"product": p.name, "qty": b.qty, "reason": b.reason}); db.commit()
    return {"id": a.id}

@app.post("/day-close", status_code=201)
def close_day(b: CloseIn, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager"); d, start, end = day_range(b.day)
    if db.scalar(select(DayClose).where(DayClose.tenant_id == u.tenant_id, DayClose.day == d)): raise HTTPException(409, "This day is already closed")
    exp = round(db.scalar(select(func.coalesce(func.sum(Sale.total), 0)).where(Sale.tenant_id == u.tenant_id, Sale.method == "cash", Sale.at >= start, Sale.at < end)) or 0, 2)
    dc = DayClose(tenant_id=u.tenant_id, day=d, expected_cash=exp, counted_cash=b.counted_cash, difference=round(b.counted_cash - exp, 2), closed_by=u.id); db.add(dc); db.flush()
    audit(db, u.tenant_id, u, "day.closed", "day_close", dc.id, {"day": d, "expected": exp, "counted": b.counted_cash, "difference": dc.difference}); db.commit()
    return {"day": d, "expected_cash": exp, "counted_cash": b.counted_cash, "difference": dc.difference}

@app.get("/reports/summary")
def summary(day: Optional[str] = None, u: User = Depends(current_user), db: Session = Depends(get_db)):
    need(u, "Manager", "Finance"); tid = u.tenant_id; d, start, end = day_range(day)
    ss = list(db.scalars(select(Sale).where(Sale.tenant_id == tid, Sale.at >= start, Sale.at < end).order_by(Sale.id)))
    by = {"cash": 0.0, "mpesa": 0.0, "card": 0.0}
    for s in ss: by[s.method] += s.total
    names = {p.id: p.name for p in db.scalars(select(Product).where(Product.tenant_id == tid))}; top = {}
    for l in db.scalars(select(SaleLine).where(SaleLine.sale_id.in_([s.id for s in ss]))): top[l.product_id] = top.get(l.product_id, 0) + l.qty * l.unit_price
    prods = list_products(u, db); rev = round(sum(s.total for s in ss), 2); cogs = round(sum(s.cogs for s in ss), 2)
    wo = db.scalar(select(func.coalesce(func.sum(Adjustment.value), 0)).where(Adjustment.tenant_id == tid, Adjustment.at >= start, Adjustment.at < end, Adjustment.qty < 0)) or 0
    dc = db.scalar(select(DayClose).where(DayClose.tenant_id == tid, DayClose.day == d))
    return {"day": d, "sales_count": len(ss), "revenue": rev, "cogs": cogs, "gross_profit": round(rev - cogs, 2), "writeoffs": round(wo, 2),
            "by_method": {k: round(v, 2) for k, v in by.items()},
            "top_products": [{"name": names[k], "revenue": round(v, 2)} for k, v in sorted(top.items(), key=lambda x: -x[1])[:5]],
            "low_stock": [{"name": p["name"], "qty": p["qty"], "unit": p["unit"], "reorder_level": p["reorder_level"]} for p in prods if p["low"]],
            "expiry_watch": [{"name": p["name"], "next_expiry": p["next_expiry"], "expired_qty": p["expired_qty"]} for p in prods if p["expiring_soon"] or p["expired_qty"]],
            "sales": [{"id": s.id, "at": s.at.isoformat(), "method": s.method, "total": s.total} for s in ss][-100:],
            "closed": {"expected_cash": dc.expected_cash, "counted_cash": dc.counted_cash, "difference": dc.difference} if dc else None}
