/* End-of-dive and Mythic cards. */
import { useEffect, useRef, useState } from 'react';
import { TIERS, ROLLS, fmt, rollsBelow } from '../game/score';
import { useGame, closeFinish, diveAgain } from '../game/controller';
import { cssVars } from './parts';

export function Finish() {
  const { V, S } = useGame();
  const f = V.finish;
  const first = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { setCopied(null); first.current?.focus(); }, [f]);
  if (!f) return <div className="finish" id="finish" hidden />;

  if (f.kind === 'mythic') {
    const r = f.r, top = r.paid.slice().sort((a, b) => b.ep - a.ep)[0];
    return (
      <div className="finish" id="finish">
        <div style={cssVars({ '--c': TIERS[6].color })}>
          <div className="eyebrow">Mythic roll</div><h2>Hadal Trench</h2><div className="big">{fmt(r.n)}</div>
          <p>{fmt(r.total)} EP at {fmt(r.fm)} fathoms. Biggest badge: {top.icon} {top.name}.</p>
          <p>Only {fmt(ROLLS - rollsBelow(r.total))} of 1,000,001 rolls reach this score or better.</p>
          <div className="row-btns"><button className="btn cyan" id="fClose" ref={first} onClick={closeFinish}>Keep diving</button></div>
        </div>
      </div>
    );
  }
  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(f.share).then(() => setCopied('Copied'), () => setCopied('Copy failed')); else setCopied('Copy failed');
  };
  return (
    <div className="finish" id="finish">
      <div style={cssVars({ '--c': TIERS[f.tier].color })}>
        <div className="eyebrow">10 rolls</div><h2>Dive complete</h2><div className="big">{fmt(f.total)} EP</div>
        <p>{f.best ? 'Your best dive so far.' : `Your best dive is ${fmt(S.bestDive)} EP.`} Average depth {fmt(f.avgFm)} fathoms, in the {TIERS[f.tier].zone}.</p>
        <p>Deepest roll: {fmt(f.top.n)}, {TIERS[f.top.tier].name}, {fmt(f.top.total)} EP.</p>
        <p className="squares">{f.squares}</p>
        <div className="row-btns">
          <button className="btn" id="fAgain" ref={first} onClick={diveAgain}>Dive again</button>
          <button className="btn ghost" id="fCopy" onClick={copy}>{copied ?? 'Copy result'}</button>
          <button className="btn ghost" id="fClose" onClick={closeFinish}>Close</button>
        </div>
      </div>
    </div>
  );
}
