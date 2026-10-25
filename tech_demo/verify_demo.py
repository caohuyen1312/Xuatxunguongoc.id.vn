#!/usr/bin/env python3
"""XuatXu offline HASH DEMONSTRATION ONLY. It does NOT verify blockchain."""
import csv, hashlib, pathlib, sys
p=pathlib.Path(__file__).parent/'DEMO_HASH_CHAIN.csv'
with p.open(encoding='utf-8-sig',newline='') as f: rows=list(csv.DictReader(f))
prior='GENESIS_SHA256_SIM_ONLY'
for i,r in enumerate(rows,1):
    digest=hashlib.sha256((prior+'|'+r['canonical_payload']).encode('utf-8')).hexdigest()
    assert r['previous_hash']==prior, f'Wrong predecessor at record {i}'
    assert r['sha256']==digest, f'Hash mismatch at record {i}'
    assert r['onchain_verified']=='False', 'Never label SHA demo on-chain'
    prior=digest
print('PASS: ',len(rows),' synthetic events. SHA-256 chain is internally consistent; not blockchain.')
