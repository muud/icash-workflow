import os
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
if os.path.exists("test.db"): os.remove("test.db")
from fastapi.testclient import TestClient
from main import app
c = TestClient(app)
H = lambda t: {"Authorization": f"Bearer {t}"}

admin = c.post("/auth/register-tenant", json={"tenant_name": "Acme Kenya", "email": "a@acme.co.ke",
        "full_name": "Amina", "password": "pw123456"}).json()["token"]
for email, roles in [("staff@acme.co.ke", ["Requester"]), ("mgr@acme.co.ke", ["Manager"]), ("fin@acme.co.ke", ["Finance"])]:
    assert c.post("/users", headers=H(admin), json={"email": email, "full_name": email, "password": "pw123456", "roles": roles}).status_code == 201
tok = lambda e: c.post("/auth/login", json={"email": e, "password": "pw123456"}).json()["token"]
staff, mgr, fin = tok("staff@acme.co.ke"), tok("mgr@acme.co.ke"), tok("fin@acme.co.ke")

# Purchase order: under 100,000 KES skips the budget check.
wf = c.post("/workflows", headers=H(admin), json={"name": "Purchase order",
    "fields": [{"key": "item", "label": "Item"}, {"key": "amount_kes", "label": "Amount (KES)", "type": "number"}],
    "steps": [{"name": "Manager approval", "type": "approval", "role": "Manager"},
              {"name": "Budget check", "type": "approval", "role": "Finance"},
              {"name": "Supplier notified", "type": "notify"}],
    "transitions": [{"from_pos": 0, "to_pos": 2, "condition": {"field": "amount_kes", "op": "<=", "value": 100000}, "priority": 0}]}).json()["id"]

def run(amount):
    rid = c.post("/requests", headers=H(staff), json={"workflow_id": wf, "data": {"item": "Laptops", "amount_kes": amount}}).json()["id"]
    tid = c.get("/tasks", headers=H(mgr)).json()[-1]["id"]
    assert c.post(f"/tasks/{tid}/approve", headers=H(staff)).status_code == 403   # requester cannot approve
    return rid, tid

rid, tid = run(50000)
assert c.post(f"/tasks/{tid}/approve", headers=H(mgr)).json()["request_status"] == "done"
assert c.get("/tasks", headers=H(fin)).json() == []
assert [s["state"] for s in c.get("/requests", headers=H(admin)).json()[0]["steps"]] == ["done", "skipped", "done"]  # branch skipped budget check                               # finance never saw it

rid, tid = run(500000)
assert c.post(f"/tasks/{tid}/approve", headers=H(mgr)).json()["request_status"] == "running"
ftid = c.get("/tasks", headers=H(fin)).json()[0]["id"]
assert c.post(f"/tasks/{ftid}/approve", headers=H(mgr)).status_code == 403        # manager cannot act on finance task
assert c.post(f"/tasks/{ftid}/approve", headers=H(fin)).json()["request_status"] == "done"

rid, tid = run(20000)
assert c.post(f"/tasks/{tid}/reject", headers=H(mgr)).json()["request_status"] == "rejected"
assert c.post("/requests", headers=H(staff), json={"workflow_id": wf, "data": {"item": "x"}}).status_code == 422
# Due dates: a late task is flagged, sorted first, and reminded exactly once.
from datetime import timedelta
from main import SessionLocal, Task, remind_overdue
quick = {"name": "Quick sign-off", "fields": [{"key": "note", "label": "Note"}],
         "steps": [{"name": "Sign off", "type": "approval", "role": "Manager", "due_hours": 1}]}
assert c.post("/workflows", headers=H(admin), json={**quick, "name": "Bad", "steps": [{**quick["steps"][0], "due_hours": 0}]}).status_code == 422
wf2 = c.post("/workflows", headers=H(admin), json=quick).json()["id"]
rid2 = c.post("/requests", headers=H(staff), json={"workflow_id": wf2, "data": {"note": "hi"}}).json()["id"]
item = [x for x in c.get("/tasks", headers=H(mgr)).json() if x["request_id"] == rid2][0]
assert item["overdue"] is False and item["due_at"]
with SessionLocal() as db:
    tk = db.get(Task, item["id"]); tk.created_at -= timedelta(hours=2); db.commit()
inbox = c.get("/tasks", headers=H(mgr)).json()
assert inbox[0]["request_id"] == rid2 and inbox[0]["overdue"] is True
assert next(r for r in c.get("/requests", headers=H(admin)).json() if r["id"] == rid2)["steps"][0]["overdue"] is True
with SessionLocal() as db:
    assert remind_overdue(db) == 1 and remind_overdue(db) == 0
assert "task.overdue" in [a["action"] for a in c.get("/audit", headers=H(admin)).json()]
print("statuses:", [r["status"] for r in c.get("/requests", headers=H(admin)).json()])
print("audit rows:", len(c.get("/audit", headers=H(admin)).json()))
print("ALL CHECKS PASSED")
