#!/bin/bash
set -e
# Run as root so we can fix volume permissions when /home/indy/ledger is mounted.
# Railway (and other platforms) often mount volumes as root; indy must own the dir.
mkdir -p /home/indy/ledger/sandbox
chown -R indy:indy /home/indy/ledger
exec runuser -u indy -- /home/indy/scripts/railway-entrypoint.sh
