#!/usr/bin/env python3
"""
Patch pool_transactions_genesis so client_ip and client_port use public
endpoints (CLIENT_HOSTS, CLIENT_PORT) while node_ip/node_port stay internal.
Reads from GENESIS_FILE; overwrites it in place.
"""
import json
import os
import sys

GENESIS_FILE = os.getenv("GENESIS_FILE", "/home/indy/ledger/sandbox/pool_transactions_genesis")
CLIENT_HOSTS = os.getenv("CLIENT_HOSTS", "")
CLIENT_PORT = int(os.getenv("CLIENT_PORT", "443"))

def main():
    if not CLIENT_HOSTS:
        print("CLIENT_HOSTS not set; skipping genesis client endpoint patch.", file=sys.stderr)
        return 0
    hosts = [h.strip() for h in CLIENT_HOSTS.split(",") if h.strip()]
    if len(hosts) != 4:
        print("CLIENT_HOSTS must be exactly 4 comma-separated hostnames.", file=sys.stderr)
        return 1
    if not os.path.isfile(GENESIS_FILE):
        print("Genesis file not found:", GENESIS_FILE, file=sys.stderr)
        return 1
    with open(GENESIS_FILE, "r") as f:
        lines = f.readlines()
    out = []
    node_index = 0
    for raw in lines:
        line = raw.strip()
        if not line:
            out.append(raw)
            continue
        try:
            txn = json.loads(line)
        except json.JSONDecodeError:
            out.append(raw)
            continue
        txn_data = txn.get("txn", {}).get("data", {}).get("data", {})
        alias = txn_data.get("alias")
        if alias and alias.startswith("Node") and alias in ("Node1", "Node2", "Node3", "Node4"):
            txn_data["client_ip"] = hosts[node_index]
            txn_data["client_port"] = CLIENT_PORT
            node_index += 1
        out.append(json.dumps(txn) + "\n")
    with open(GENESIS_FILE, "w") as f:
        f.writelines(out)
    print("Patched genesis client endpoints: %s (port %s)" % (hosts, CLIENT_PORT), file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(main())
