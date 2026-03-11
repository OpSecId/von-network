#!/usr/bin/env python3
"""
Write a copy of the genesis file with client_ip/client_port set to internal
endpoints (127.0.0.1 and 9702, 9704, 9706, 9708) so the Ledger Browser and
pool checks can connect from inside the container. Does not modify the
original genesis file. Used when CLIENT_HOSTS is set (one canonical genesis
on disk with public endpoints; this is the connection-only view).
"""
import json
import os
import sys

GENESIS_FILE = os.getenv("GENESIS_FILE", "/home/indy/ledger/sandbox/pool_transactions_genesis")
INTERNAL_GENESIS_PATH = os.getenv("INTERNAL_GENESIS_PATH", "/tmp/pool_genesis_internal")
INTERNAL_CLIENT_IP = os.getenv("INTERNAL_CLIENT_IP", "127.0.0.1")
INTERNAL_CLIENT_PORTS = [9702, 9704, 9706, 9708]  # Node1–Node4 client ports

def main():
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
        if alias and alias in ("Node1", "Node2", "Node3", "Node4"):
            txn_data["client_ip"] = INTERNAL_CLIENT_IP
            txn_data["client_port"] = INTERNAL_CLIENT_PORTS[node_index]
            node_index += 1
        out.append(json.dumps(txn) + "\n")
    with open(INTERNAL_GENESIS_PATH, "w") as f:
        f.writelines(out)
    print("Wrote internal genesis for pool connection: %s" % INTERNAL_GENESIS_PATH, file=sys.stderr)
    return 0

if __name__ == "__main__":
    sys.exit(main())
