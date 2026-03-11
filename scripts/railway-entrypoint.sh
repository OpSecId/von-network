#!/bin/bash
set -e

# All-in-one: run 4 Indy nodes + Ledger Browser in one container.
# Genesis: set IP/IPS for node addresses; optionally NODE_HOST + CLIENT_HOSTS for split client/node endpoints (e.g. Railway domain→port).

cd /home/indy
export HOST="${HOST:-0.0.0.0}"
export NODE_NUM="1 2 3 4"

# Genesis: NODE_HOST = internal host for node-to-node (node_ip/node_port). If set, genesis is generated with it; then CLIENT_HOSTS patch can set client_ip/client_port for public.
if [ -n "$NODE_HOST" ]; then
  export IP="$NODE_HOST"
  unset IPS DOCKERHOST
fi
if [ -z "$IP" ] && [ -z "$IPS" ]; then
  export IP="${IP:-127.0.0.1}"
  unset IPS DOCKERHOST
fi

if [ ! -d "/home/indy/ledger/sandbox/keys" ]; then
  echo "Ledger does not exist - Creating genesis and keys..."
  bash ./scripts/init_genesis.sh
  if [ -n "$CLIENT_HOSTS" ]; then
    echo "Patching genesis client endpoints (CLIENT_HOSTS)..."
    export GENESIS_FILE="${GENESIS_FILE:-/home/indy/ledger/sandbox/pool_transactions_genesis}"
    python3 /home/indy/scripts/patch_genesis_client_endpoints.py
  fi
fi

# Same supervisord setup as scripts/start_nodes.sh
cat <<EOF > supervisord.conf
[supervisord]
logfile = /tmp/supervisord.log
logfile_maxbytes = 50MB
logfile_backups=10
loglevel = info
pidfile = /tmp/supervisord.pid
nodaemon = true
minfds = 1024
minprocs = 200
umask = 022
user = indy
identifier = supervisor
directory = /tmp
nocleanup = true
childlogdir = /tmp
strip_ansi = false

[program:node1]
command=start_indy_node Node1 $HOST 9701 $HOST 9702
directory=/home/indy
stdout_logfile=/tmp/node1.log
stderr_logfile=/tmp/node1.log

[program:node2]
command=start_indy_node Node2 $HOST 9703 $HOST 9704
directory=/home/indy
stdout_logfile=/tmp/node2.log
stderr_logfile=/tmp/node2.log

[program:node3]
command=start_indy_node Node3 $HOST 9705 $HOST 9706
directory=/home/indy
stdout_logfile=/tmp/node3.log
stderr_logfile=/tmp/node3.log

[program:node4]
command=start_indy_node Node4 $HOST 9707 $HOST 9708
directory=/home/indy
stdout_logfile=/tmp/node4.log
stderr_logfile=/tmp/node4.log
EOF

echo "Starting Indy nodes..."
supervisord -c supervisord.conf &

echo "Waiting for pool to be ready..."
for i in $(seq 1 30); do
  if python3 -c "
import asyncio
import indy_vdr
from indy_vdr import open_pool
indy_vdr.set_protocol_version(2)
async def check():
    try:
        pool = await open_pool(transactions_path='/home/indy/ledger/sandbox/pool_transactions_genesis')
        pool.close()
        return True
    except Exception:
        return False
exit(0 if asyncio.run(check()) else 1)
" 2>/dev/null; then
    echo "Pool is ready."
    break
  fi
  if [ $i -eq 30 ]; then
    echo "Timeout waiting for pool; starting webserver anyway."
    break
  fi
  sleep 2
done

echo "Starting Ledger Browser..."
exec python -m server.server
