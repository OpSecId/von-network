# Deploying VON Network on Railway

This guide describes how to run [VON Network](https://github.com/bcgov/von-network) on [Railway](https://railway.app/). **Option 2 (all-in-one)** is the recommended way to run your own Indy ledger and Ledger Browser in a single Railway service.

---

## What you need to deploy (after you push)

1. **Push the branch**  
   Push the **`railway-deploy`** branch to your remote (e.g. `git push -u origin railway-deploy`).

2. **In Railway**  
   - Create a **new project** (or use an existing one).  
   - **Connect the repo**: Add a GitHub (or other) repo and choose the **`von-network`** repository.  
   - Select the **`railway-deploy`** branch as the branch to deploy.

3. **Set the Dockerfile**  
   In the service: **Settings** → **Build** → **Dockerfile path** → set to **`Dockerfile.railway`**.  
   (Railway will build that Dockerfile instead of auto-detecting.)

4. **Variables (optional)**  
   In **Variables**, add if you want:
   - **`LEDGER_SEED`** – 32-character secret so “Register DID” works in the Ledger Browser.  
   - For a **publicly reachable** pool (agents): **`IP`** (one domain) or **`IPS`** (four comma-separated domains). See “Making the pool publicly reachable” in Option 2 below.

5. **Deploy**  
   Trigger a deploy (push to `railway-deploy` or use **Deploy** in the dashboard). Wait 1–2 minutes for the pool to start. Use the **service URL** Railway shows (e.g. `https://von-network-production-xxxx.up.railway.app`) to open the Ledger Browser.

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
  1. **Genesis generation** (with all 4 node keys) using the **`IP`** environment variable for node addresses (default **`127.0.0.1`** — see below).
  2. All 4 Indy nodes via **supervisord** (same as `./manage start` "nodes" container).
  3. After the pool is up, the **Ledger Browser** (Python server) on `PORT`.

- The browser connects to the local pool using the generated genesis file.

**How genesis gets node addresses:** The genesis file is created by `init_genesis.sh`, which calls `von_generate_transactions` with **`-i $IP`** (or **`-s $IPS`** for a comma-separated list). In the Railway entrypoint we set **`IP=127.0.0.1`** by default, so genesis contains `127.0.0.1` for all four nodes—**no domain is used**. The Ledger Browser runs in the same container and connects to the pool at that address. You can override **`IP`** in Railway variables (e.g. to your Railway public hostname) only if you later expose the node ports (9701–9708) and want external agents to connect; for the standard all-in-one setup, leave the default so the browser talks to the local pool.

### Steps

1. **Create a Railway project** and connect your `von-network` repo (`railway-deploy` branch).

2. **Use the all-in-one Dockerfile:**
   - **Settings → Build → Dockerfile path** → `Dockerfile.railway`.

3. **Set environment variables** (optional):
   - `PORT` – set by Railway.
   - **`LEDGER_SEED`** – seed for the trust anchor. Enables "Register DID" and **Detailed Status** (validator nodes) in the UI. For these to work, the DID from this seed must exist on the ledger. The genesis created by von-network includes a **trustee** with seed **`000000000000000000000000Trustee1`**. Set **`LEDGER_SEED=000000000000000000000000Trustee1`** to use that identity (recommended for dev/demo). If you use a different seed, that DID is not on the ledger and you'll see "verkey cannot be found" for validator status—see **Troubleshooting** below.
   - For a **publicly reachable** pool (so agents can connect): set **`IP`** or **`IPS`**; see **Making the pool publicly reachable** below.
   - `LEDGER_INSTANCE_NAME`, `REGISTER_NEW_DIDS`, etc. as needed.

4. **Deploy.** First boot can take 1–2 minutes while the pool starts. Then open the service URL.

### Resource notes

- The all-in-one container is more CPU/memory intensive. On Railway, use at least a plan that allows ~1 GB RAM and enough CPU; scale up if you see OOM or timeouts.
- Ephemeral filesystem: ledger data is lost on redeploy unless you add a volume (Railway supports volumes; attach one to the service and persist `/home/indy/ledger` if you want to keep the ledger across deploys). If you mount a volume at `/home/indy/ledger`, the image runs a **root wrapper** at startup that creates `ledger/sandbox` and sets ownership to `indy`, so the app can write there.

### Static IP / public URL

**You do not need a static public IP.** The all-in-one container only exposes the Ledger Browser (one HTTP port). Railway gives you a public URL (e.g. `your-app.up.railway.app`) that may change on redeploy—that’s fine. Open that URL in a browser to use the Ledger Browser (browse ledger, view genesis, register DIDs). The Indy nodes run inside the container at `127.0.0.1` and are not exposed.

**Limitation:** External agents (e.g. Aries agents on another machine) cannot connect **directly** to your pool, because the genesis file contains `127.0.0.1` for the nodes. So this setup is for using the Ledger Browser and its “Register DID” API only. If you need external agents to talk to your pool, you’d need a different topology (e.g. multi-service with a stable hostname and exposed node ports). To allow agents to connect, set **`IP`** or **`IPS`** and expose the node ports; see **Making the pool publicly reachable** below.

### Making the pool publicly reachable (for agents)

If external agents (Aries, etc.) need to connect to your Indy pool, genesis must list **public** hostnames or IPs, and the **node ports** (9701, 9703, 9705, 9707) must be reachable. Two patterns:

**1. One domain, multiple ports**  
Expose TCP ports 8000 (Ledger Browser) and 9701, 9703, 9705, 9707 (nodes) on the same host. Set **`IP`** to your public domain (e.g. `ledger.mydomain.com`). Agents connect to `ledger.mydomain.com:9701`, `ledger.mydomain.com:9703`, etc.

**2. Different custom domains mapped to different ports**  
Map each node to its own hostname and port (e.g. `node1.mydomain.com` → 9701, `node2.mydomain.com` → 9703, `node3.mydomain.com` → 9705, `node4.mydomain.com` → 9707). Set **`IPS`** to a comma-separated list (no spaces):

```
IPS=node1.mydomain.com,node2.mydomain.com,node3.mydomain.com,node4.mydomain.com
```

Genesis will list `node1.mydomain.com:9701`, `node2.mydomain.com:9703`, and so on. The Ledger Browser can use a fifth domain/port.

**Railway:** The TCP proxy allows **one TCP port per service**, so you cannot expose all four node ports from one service. For a public pool on Railway you need either multiple services (one per node, each with a TCP proxy and domain) or a host that allows multiple TCP ports (then use pattern 1 with **`IP`**).

### Troubleshooting: "verkey cannot be found" for validator nodes

If the Ledger Browser shows **"could not authenticate, verkey for ... cannot be found"** for Node1–Node4 when loading **Detailed Status**, the trust anchor's DID (from **`LEDGER_SEED`**) is not on the ledger. The validator info request is signed by that DID; the nodes only accept DIDs that exist in the ledger.

**Fix:** Set **`LEDGER_SEED=000000000000000000000000Trustee1`** in Railway. That seed is the genesis trustee, so the DID is already on the ledger. Redeploy (or restart) and the Detailed Status and "Register DID" features will work. For production you would register your own DID using that trustee (e.g. via indy-cli) and then use your seed; for dev/demo the default trustee seed is fine.

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
- `scripts/railway-entrypoint-wrapper.sh` – root wrapper that fixes volume permissions for `/home/indy/ledger` then runs the main entrypoint as `indy`.
