# iCash Workflow

Original workflow / business-process platform prototype, inspired by the idea of tools like iMaster. Starter use case: a cash and carry wholesaler.

## Features (prototype)
- Workflow builder: name a workflow, add ordered steps, assign each step to a role
- Start a workflow and track it step by step
- Task inbox: each role sees its own tasks and can approve or reject
- Demo login with users you can change in `lib/users.js` or via env vars

Data is stored in the browser (localStorage) for now. The next step is a real backend (database + API).

## Run
```bash
npm install
npm run dev
```

## Demo logins
Default password for all demo users is `demo123`.
- admin (role: Admin)
- sales (role: Sales)
- finance (role: Finance)
- warehouse (role: Warehouse)

Change them in `lib/users.js`. Optionally set `NEXT_PUBLIC_DEMO_PASSWORD` to override the shared password.

## Deploy
Import this repo in Vercel. No extra configuration needed.
