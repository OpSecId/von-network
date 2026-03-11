# Deploying VON Network on Railway

This guide describes how to run [VON Network](https://github.com/bcgov/von-network) on [Railway](https://railway.app/). **Option 2 (all-in-one)** is the recommended way to run your own Indy ledger and Ledger Browser in a single Railway service.

---

## Quick start (Option 2 — all-in-one)

**What you get:** A full VON Network (4 Indy nodes + Ledger Browser) at one URL. Your own dev/demo ledger.

1. **Create a Railway project** and connect your `von-network` repo. Use the **`railway-deploy`** branch.

2. **Set the Dockerfile:** **Settings → Build → Dockerfile path** → **`Dockerfile.railway`**.

3. **(Optional)** In **Variables**, add **`LEDGER_SEED`** (e.g. a 32-character secret) so the "Authenticate a New DID" / Register DID feature works in the Ledger Browser.

4. **Deploy.** First boot can take 1–2 minutes while the pool starts. Open the generated service URL to use the Ledger Browser (browse ledger, view genesis, register DIDs).

That's it. No `GENESIS_URL` needed—the container generates its own genesis and runs the pool locally.

---

## Options overview

| Option | What runs | Use case | Complexity |
|--------|-----------|----------|------------|
| **2. All-in-one container** ✓ | Full Indy pool (4 nodes) + Ledger Browser in **one** Railway service | **Your own private dev/demo ledger** at one URL | Medium |
| **1. Ledger Browser only** | Just the web UI + API; connects to an **existing** Indy ledger (e.g. BCovrin Test) | Browse/monitor a public test net | Low |
| **3. Multi-service** | Separate services for nodes and webserver | Closer to production topology; more setup | High |

---

## Option 2: All-in-one container (recommended — full network + browser)

Run the **entire** VON Network (four Indy nodes + Ledger Browser) in a **single** Railway service. This is the recommended option when you want your own ledger.

- **Pros:** One URL, one service, your own ledger and browser together.  
- **Cons:** Heavier (4 nodes + server in one container), longer startup, not suitable for production. Ideal for demos or personal dev.

### How it works

- A single container starts:
  1. Genesis generation (with all 4 node keys) for `127.0.0.1`.
  2. All 4 Indy nodes via **supervisord** (same as `./manage start` "nodes" container).
  3. After the pool is up, the **Ledger Browser** (Python server) on `PORT`.

- The browser connects to the local pool using the generated genesis file.

### Steps

1. **Create a Railway project** and connect your `von-network` repo (`railway-deploy` branch).

2. **Use the all-in-one Dockerfile:**
   - **Settings → Build → Dockerfile path** → `Dockerfile.railway`.

3. **Set environment variables** (optional):
   - `PORT` – set by Railway.
   - `LEDGER_SEED` – seed for the trust anchor (enables "Register DID" in the UI).
   - `LEDGER_INSTANCE_NAME`, `REGISTER_NEW_DIDS`, etc. as needed.

4. **Deploy.** First boot can take 1–2 minutes while the pool starts. Then open the service URL.

### Resource notes

- The all-in-one container is more CPU/memory intensive. On Railway, use at least a plan that allows ~1 GB RAM and enough CPU; scale up if you see OOM or timeouts.
- Ephemeral filesystem: ledger data is lost on redeploy unless you add a volume (Railway supports volumes; attach one to the service and persist `/home/indy/ledger` if you want to keep the ledger across deploys).

---

## Option 1: Ledger Browser only

Run only the **Ledger Browser** and point it at an existing network (e.g. BCovrin Test). No Indy nodes run on Railway. Use this when you only need to browse or register DIDs on a public test net.

- **Pros:** Simple, one Dockerfile, one service, low resource use.  
- **Cons:** You don't run your own ledger; you depend on the external ledger's availability and policy.

### Steps

1. **Create a Railway project** and connect your `von-network` repo (use the `railway-deploy` branch).

2. **Use the browser-only Dockerfile:**
   - In Railway: **Settings → Build → Dockerfile path** → set to `Dockerfile.railway.browser`.

3. **Set environment variables** (Railway dashboard or `railway.toml`):
   - `GENESIS_URL` – URL of the pool's genesis file (e.g. `https://test.bcovrin.vonx.io/genesis`).
   - `LEDGER_SEED` – (optional) Seed for the trust anchor that can register new DIDs on that ledger.
   - `PORT` – Railway sets this automatically; the server listens on it.
   - Optional: `LEDGER_INSTANCE_NAME`, `REGISTER_NEW_DIDS`, etc. (see main [README](README.md)).

4. **Deploy.** Railway builds the image and runs the server. Open the generated URL to use the Ledger Browser.

### Example

- **GENESIS_URL:** `https://test.bcovrin.vonx.io/genesis`  
- **LEDGER_SEED:** (optional, from your test net operator)  
- **PORT:** leave default (Railway injects it).

---

## Option 3: Multi-service (nodes + webserver separate)

Run the **nodes** as one (or more) services and the **Ledger Browser** as another, similar to docker-compose.

- **Pros:** Clear separation, can scale or replace components.  
- **Cons:** You must configure discovery (how the browser finds the nodes). Railway gives each service a hostname; you need to put the nodes’ hostnames into the genesis file the browser uses. That usually means:
  - Building genesis **after** deploy (e.g. from a CI step or script that uses Railway’s service hostnames), or
  - Using a fixed domain and pointing it at the node service.

This option is not preconfigured in this repo; use it only if you need a multi-service layout and are ready to handle genesis generation and service discovery.

---

## Summary

- **Recommended (your own ledger):** Option 2 (all-in-one) with **`Dockerfile.railway`** — one URL, full network + Ledger Browser.
- **Browse an existing test net only:** Option 1 with `Dockerfile.railway.browser` and `GENESIS_URL` pointing to that net.
- **Branch:** Use the **`railway-deploy`** branch; it contains the Railway Dockerfiles and this guide.

---

## Files added on `railway-deploy` branch

- `RAILWAY_DEPLOY.md` (this file) – plan and options.
- `Dockerfile.railway` – all-in-one (nodes + Ledger Browser).
- `Dockerfile.railway.browser` – Ledger Browser only.
- `scripts/railway-entrypoint.sh` – entrypoint for the all-in-one container.
