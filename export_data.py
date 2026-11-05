import sys, json, base64
sys.path.insert(0,'/home/claude/rngdle')
import numpy as np, sweep
from badges import BADGES, N
M=sweep.compute(); counts,eps,pay,totals=sweep.score_all(M)
u,c=np.unique(totals,return_counts=True)
print("distinct totals",len(u))
def varint(x):
    o=bytearray()
    while True:
        b=x&127; x>>=7
        if x: o.append(b|128)
        else: o.append(b); return o
buf=bytearray()
prev=0
for v,k in zip(u.tolist(),c.tolist()):
    buf+=varint(v-prev); buf+=varint(k); prev=v
d={"eps":{b.name:int(e) for b,e in zip(BADGES,eps)},"counts":{b.name:int(k) for b,k in zip(BADGES,counts)},"dist":base64.b64encode(bytes(buf)).decode()}
json.dump(d,open('src/game/data.json','w'),ensure_ascii=False,separators=(',',':'))
print("dist bytes",len(d['dist']))
top=np.argsort(-totals,kind='stable')[:30].tolist()
print(top[:12])
