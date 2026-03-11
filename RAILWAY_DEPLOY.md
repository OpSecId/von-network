# Deploying VON Network on Railway

This guide describes how to run [VON Network](https://github.com/bcgov/von-network) on [Railway](https://railway.app/) and gives you **three deployment options**.

---

## Options overview

| Option | What runs | Use case | Complexity |
|--------|-----------|----------|------------|
| **1. Ledger Browser only** | Just the web UI + API; connects to an **existing** Indy ledger (e.g. BCovrin Test) | Browse/monitor a public test net, register DIDs on it | Low |
| **2. All-in-one container** | Full Indy pool (4 nodes) + Ledger Browser in **one** Railway service | Your own private dev/demo ledger on a single URL | Medium |
| **3. Multi-service** | Separate Railway services for nodes and webserver (docker-compose style) | Closer to production topology; more setup | High |

---

## Option 1: Ledger Browser only (recommended to start)

Run only the **Ledger Browser** and point it at an existing network (e.g. BCovrin Test). No Indy nodes run on Railway.

- **Pros:** Simple, one Dockerfile, one service, low resource use.  
- **Cons:** You don’t run your own ledger; you depend on the external ledger’s availability and policy.

### Steps

1. **Create a Railway project** and connect your `von-network` repo (use the `railway-deploy` branch).

2. **Use the browser-only Dockerfile:**
   - In Railway: **Settings → Build → Dockerfile path** → set to `Dockerfile.railway.browser`.

3. **Set environment variables** (Railway dashboard or `railway.toml`):
   - `GENESIS_URL` – URL of the pool’s genesis file (e.g. `https://test.bcovrin.vonx.io/genesis`).
   - `LEDGER_SEED` – (optional) Seed for the trust anchor that can register new DIDs on that ledger.
   - `PORT` – Railway sets this automatically; the server listens on it.
   - Optional: `LEDGER_INSTANCE_NAME`, `REGISTER_NEW_DIDS`, etc. (see main [README](README.md)).

4. **Deploy.** Railway builds the image and runs the server. Open the generated URL to use the Ledger Browser.

### Example

- **GENESIS_URL:** `https://test.bcovrin.vonx.io/genesis`  
- **LEDGER_SEED:** (optional, from your test net operator)  
- **PORT:** leave default (Railway injects it).

---

## Option 2: All-in-one container (full network + browser)

Run the **entire** VON Network (four Indy nodes + Ledger Browser) in a **single** Railway service.

- **Pros:** One URL, one service, your own ledger and browser together.  
- **Cons:** Heavier (4 nodes + server in one container), longer startup, not suitable for production. Ideal for demos or personal dev.

### How it works

- A single container starts:
  1. Genesis generation (with all 4 node keys) for `127.0.0.1`.
  2. All 4 Indy nodes via **supervisord** (same as `./manage start` “nodes” container).
  3. After the pool is up, the **Ledger Browser** (Python server) on `PORT`.

- The browser connects to the local pool using the generated genesis file.

### Steps

1. **Create a Railway project** and connect your `von-network` repo (`railway-deploy` branch).

2. **Use the all-in-one Dockerfile:**
   - **Settings → Build → Dockerfile path** → `Dockerfile.railway`.

3. **Set environment variables** (optional):
   - `PORT` – set by Railway.
   - `LEDGER_SEED` – seed for the trust anchor (enables “Register DID” in the UI).
   - `LEDGER_INSTANCE_NAME`, `REGISTER_NEW_DIDS`, etc. as needed.

4. **Deploy.** First boot can take 1–2 minutes while the pool starts. Then open the service URL.

### Resource notes

- The all-in-one container is more CPU/memory intensive. On Railway, use at least a plan that allows ~1 GB RAM and enough CPU; scale up if you see OOM or timeouts.
- Ephemeral filesystem: ledger data is lost on redeploy unless you add a volume (Railway supports volumes; attach one to the service and persist `/home/indy/ledger` if you want to keep the ledger across deploys).

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

- **Quickest path:** Option 1 (Ledger Browser only) with `Dockerfile.railway.browser` and `GENESIS_URL` pointing to an existing test net.
- **Your own ledger on one URL:** Option 2 (all-in-one) with `Dockerfile.railway`.
- **Branch:** Use the `railway-deploy` branch; it contains the Railway Dockerfiles and this guide.

---

## Files added on `railway-deploy` branch

- `RAILWAY_DEPLOY.md` (this file) – plan and options.
- `Dockerfile.railway` – all-in-one (nodes + Ledger Browser).
- `Dockerfile.railway.browser` – Ledger Browser only.
- `scripts/railway-entrypoint.sh` – entrypoint for the all-in-one container.
