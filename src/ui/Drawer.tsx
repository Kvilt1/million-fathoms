import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ALL_BADGES, BADGE_TIERS, BY_NAME, TIERS, MAX_ROLL, ROLLS, fmt, pctText, randomRoll, scoreRoll } from '../game/score';
import { SETS, setDone } from '../game/sets';
import {
  useGame, closeDrawer, setTab, setCheck, watch, setOpt, wipe, Sound, type Tab,
} from '../game/controller';
import { Icon, Row, Outranked, cssVars } from './parts';

const TABS: [Tab, string][] = [['log', 'Log'], ['codex', 'Badges'], ['sets', 'Sets'], ['check', 'Check a number'], ['how', 'How it scores'], ['settings', 'Settings']];

export function Drawer() {
  const { V } = useGame();
  const { open, tab } = V.drawer;
  const pane = useRef<HTMLDivElement>(null);
  // Badge filters and the reset prompt live here so they survive closing and reopening the drawer.
  const [codex, setCodex] = useState({ tierF: 'all', own: 'all', q: '' });
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (open) pane.current?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { if (pane.current) pane.current.scrollTop = 0; }, [open, tab]);

  return (
    <div className="drawer" id="drawer" hidden={!open} onClick={e => { if (e.target === e.currentTarget) closeDrawer(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Game details">
        <div className="tabs" role="tablist" id="tabs">
          {TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={k === tab} data-tab={k} onClick={() => { setConfirm(false); Sound.ui(); setTab(k); }}>{l}</button>
          ))}
          <button className="close" id="drawerClose" aria-label="Close" onClick={closeDrawer}>×</button>
        </div>
        <div className="pane" id="pane" tabIndex={-1} ref={pane}>
          {open && (
            tab === 'log' ? <PaneLog /> :
            tab === 'codex' ? <PaneCodex f={codex} set={p => setCodex({ ...codex, ...p })} /> :
            tab === 'sets' ? <PaneSets /> :
            tab === 'check' ? <PaneCheck /> :
            tab === 'how' ? <PaneHow /> :
            <PaneSettings confirm={confirm} setConfirm={setConfirm} />
          )}
        </div>
      </div>
    </div>
  );
}

function PaneLog() {
  const { S } = useGame();
  if (!S.rolls) return <p className="empty">No rolls yet. Close this and press Roll, and every number you land will be listed here.</p>;
  const max = Math.max(...S.tiers, 1), top = S.best!;
  const rarest = Object.keys(S.badges).map(n => BY_NAME.get(n)!).sort((a, b) => b.ep - a.ep)[0];
  return <>
    <div className="cards3">
      <div className="mini"><b>{fmt(S.rolls)}</b><span>Rolls</span></div>
      <div className="mini"><b>{fmt(S.life)}</b><span>Lifetime EP</span></div>
      <div className="mini"><b>{fmt(S.life / S.rolls)}</b><span>Average EP</span></div>
      <div className="mini"><b>{fmt(top.n)}</b><span>Best roll, {fmt(top.total)} EP</span></div>
      <div className="mini"><b>{rarest ? rarest.name : 'None'}</b><span>Rarest badge found</span></div>
    </div>
    <div className="tiersbars">
      {TIERS.map((t, i) => <div key={t.name} className="tb" style={cssVars({ '--c': t.color })}><b>{t.name}</b><div className="bar"><i style={{ width: `${100 * S.tiers[i] / max}%` }} /></div><span>{fmt(S.tiers[i])}</span></div>).reverse()}
    </div>
    <h3>Latest rolls</h3>
    <table>
      <thead><tr><th>Number</th><th className="r">EP</th><th>Tier</th><th className="r">New</th></tr></thead>
      <tbody>{S.log.map((l, i) => (
        <tr key={i} className="go" data-n={l.n} onClick={() => setTab('check', l.n)}>
          <td>{fmt(l.n)}</td><td className="r">{fmt(l.t)}</td><td style={{ color: TIERS[l.k].color }}>{TIERS[l.k].name}</td><td className="r">{l.f || ''}</td>
        </tr>
      ))}</tbody>
    </table>
  </>;
}

type CodexF = { tierF: string; own: string; q: string };
function PaneCodex({ f, set }: { f: CodexF; set: (p: Partial<CodexF>) => void }) {
  const { S } = useGame();
  const found = Object.keys(S.badges).length, q = f.q.trim().toLowerCase();
  const list = ALL_BADGES.filter(b => (f.tierF === 'all' || b.tier === +f.tierF) && (f.own === 'all' || (f.own === 'found') === !!S.badges[b.name]) && (!q || (b.name + ' ' + b.desc).toLowerCase().includes(q))).sort((a, b) => a.ep - b.ep);
  return <>
    <div className="filters">
      <input className="search" id="cSearch" placeholder="Search 233 badges" aria-label="Search badges" value={f.q} onChange={e => set({ q: e.target.value })} />
      <button className="chip" data-own="all" aria-pressed={f.own === 'all'} onClick={() => set({ own: 'all' })}>All</button>
      <button className="chip" data-own="found" aria-pressed={f.own === 'found'} onClick={() => set({ own: 'found' })}>Found {found}</button>
      <button className="chip" data-own="missing" aria-pressed={f.own === 'missing'} onClick={() => set({ own: 'missing' })}>Missing {233 - found}</button>
    </div>
    <div className="filters">
      <button className="chip" data-tierf="all" aria-pressed={f.tierF === 'all'} onClick={() => set({ tierF: 'all' })}>Any rarity</button>
      {BADGE_TIERS.map((t, i) => <button key={t} className="chip" style={cssVars({ '--c': TIERS[i + 1].color })} data-tierf={i} aria-pressed={f.tierF === String(i)} onClick={() => set({ tierF: String(i) })}>{t}</button>)}
    </div>
    <div id="cGrid">
      {!list.length ? <p className="empty">No badges match. Clear the search or pick another filter.</p> : (
        <div className="grid">{list.map(b => {
          const hits = S.badges[b.name] || 0, odds = ROLLS / b.count;
          return (
            <div key={b.name} className={`card ${hits ? '' : 'locked'}`} style={cssVars({ '--c': TIERS[b.tier + 1].color })}>
              <Icon b={b} /><span className="nm">{b.name}</span><span className="ds">{b.desc}</span>
              <span className="ft"><span><b>{fmt(b.ep)}</b> EP</span><span>1 in {odds < 10 ? odds.toFixed(1) : fmt(odds)}</span><span>{hits ? fmt(hits) + '×' : 'Not found'}</span></span>
            </div>
          );
        })}</div>
      )}
    </div>
  </>;
}

function PaneSets() {
  const { S } = useGame();
  return <>
    <p>Sets group badges into collections. They don't change your score. Finish all 16 for bragging rights.</p>
    <div className="sets">{SETS.map(s => {
      const n = setDone(S, s), full = n === s.members.length;
      return (
        <div key={s.name} className="set">
          <h4>{s.name}<span>{n}/{s.members.length}</span></h4>
          <div className="bar"><i style={{ width: `${100 * n / s.members.length}%`, ...(full ? { background: 'var(--gold)', boxShadow: '0 0 8px var(--gold)' } : {}) }} /></div>
          <p>{s.desc} {s.members.map((m, i) => <span key={m}>{i > 0 && ', '}{S.badges[m] ? <b>{m}</b> : m}</span>)}</p>
        </div>
      );
    })}</div>
  </>;
}

function PaneCheck() {
  const { V } = useGame();
  const n = V.drawer.checkN;
  const [input, setInput] = useState(n == null ? '' : String(n));
  const [bad, setBad] = useState(false);
  const run = (v: string | number) => {
    const clean = String(v).replace(/[,\s]/g, ''), num = Number(clean);
    if (!/^\d+$/.test(clean) || num > MAX_ROLL) { setBad(true); setCheck(null); return; }
    setBad(false); setCheck(num); Sound.blip(1);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); run(input); };
  let body;
  if (bad) body = <p className="empty">That is not a roll. Enter a whole number from 0 to 1,000,000.</p>;
  else if (n == null) body = <p className="empty">Enter any whole number from 0 to 1,000,000 to see what it would score. Checking a number never adds to your stats.</p>;
  else {
    const r = scoreRoll(n), t = TIERS[r.tier];
    body = <>
      <div className="result-head" style={cssVars({ '--tier': t.color })}>{fmt(r.n)}: {fmt(r.total)} EP, {t.name}</div>
      <p><b>{t.zone}</b>, {fmt(r.fm)} fathoms. Beats <b>{pctText(r.pct)}%</b> of rolls. {r.earned.length} badges earned, {r.paid.length} paid.</p>
      <button className="btn" id="cWatch" onClick={() => watch(n)}>Watch this dive</button>
      <ul className="haul-list" style={{ padding: '8px 0 0' }}>
        {r.paid.slice().sort((a, b) => b.ep - a.ep).map(b => <Row key={b.name} row={{ b, isNew: false, animate: false, key: b.name }} />)}
        <Outranked list={r.outranked} />
      </ul>
    </>;
  }
  return <>
    <form className="check-form" id="cForm" onSubmit={submit}>
      <label htmlFor="cInput" className="sr">Number to check</label>
      <input id="cInput" inputMode="numeric" autoComplete="off" placeholder="61287" value={input} onChange={e => setInput(e.target.value)} />
      <button className="btn" type="submit">Check</button>
      <button className="btn ghost" type="button" id="cRand" onClick={() => { const v = randomRoll(); setInput(String(v)); run(v); }}>Random</button>
    </form>
    <div id="cBody">{body}</div>
  </>;
}

function PaneHow() {
  return <>
    <h3>The roll</h3><p>Each press draws a whole number from 0 to 1,000,000 with your browser's secure random generator. All <b>1,000,001</b> outcomes are equally likely, and nothing you do changes the odds.</p>
    <h3>Badges</h3><p>Your number is tested against <b>233</b> rules. A badge is worth 100 divided by its chance of appearing, so a 1-in-10 badge pays 1,000 EP and a one-in-a-million badge pays about 100 million. On average every badge pays the same 100 EP per roll. Rare ones just pay it all at once.</p>
    <h3>Families</h3><p>168 badges sit in 39 families of related patterns. In each family only the highest-value badge pays. The others still go in your collection and show as outranked.</p>
    <h3>Rarity and depth</h3><p>Your total EP is ranked against every possible roll. That rank sets your tier, and your tier sets how deep the lead sinks. The deepest roll in the game reaches 5,960 fathoms, the depth of the Challenger Deep.</p>
    <div style={{ overflowX: 'auto' }}>
      <table className="lad2">
        <thead><tr><th>Tier</th><th>Zone</th><th className="r">EP from</th><th>Share of rolls</th></tr></thead>
        <tbody>{TIERS.map((t, i) => <tr key={t.name}><td style={{ color: t.color }}>{t.name}</td><td>{t.zone}</td><td className="r">{i ? fmt(t.floor) : '1,759'}</td><td>{t.note}</td></tr>).reverse()}</tbody>
      </table>
    </div>
    <h3>Badge rarity</h3><p>Common appears on over 10% of rolls, Uncommon on 1 to 10%, Rare on 0.1 to 1%, Epic on 0.01 to 0.1%, Anomaly on 0.001 to 0.01%, and Mythic on less than 0.001%.</p>
    <h3>About this game</h3><p>Million Fathoms is an unofficial offline fan practice game based on the scoring of the daily game RNGdle. It has no connection to RNGdle, and rolls here don't count towards any account there. Badge rules were rebuilt from publicly shared data, so a score could occasionally differ from the real game.</p>
  </>;
}

function PaneSettings({ confirm, setConfirm }: { confirm: boolean; setConfirm: (v: boolean) => void }) {
  const { S } = useGame();
  const o = S.opts;
  return (
    <div className="settings">
      <label>Sound <input type="checkbox" id="oSound" checked={o.sound} onChange={e => setOpt('sound', e.target.checked)} /></label>
      <label>Volume <input type="range" id="oVol" min="0" max="1" step=".05" value={o.vol} onChange={e => setOpt('vol', +e.target.value)} onPointerUp={() => Sound.ping(4, 1)} onKeyUp={() => Sound.ping(4, 1)} /></label>
      <label>Ambient hum <input type="checkbox" id="oAmb" checked={o.ambient} onChange={e => setOpt('ambient', e.target.checked)} /></label>
      <label>Screen shake and particles <input type="checkbox" id="oFx" checked={o.effects} onChange={e => setOpt('effects', e.target.checked)} /></label>
      <p style={{ margin: '6px 0 0' }}>Keys: Space or Enter rolls and skips, A toggles auto, 1, 2 and 3 set speed, M mutes, B opens badges, Esc closes this panel.</p>
      <p style={{ margin: 0 }}>Your progress is saved in this browser only. {S.rolls ? `It holds ${fmt(S.rolls)} rolls.` : ''}</p>
      <div id="resetBox">
        {confirm
          ? <><p style={{ color: 'var(--foam)' }}>Erase all rolls, badges and sets? This can't be undone.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn danger" id="oWipe" onClick={() => { wipe(); setConfirm(false); }}>Erase everything</button>
              <button className="btn ghost" id="oKeep" onClick={() => setConfirm(false)}>Keep my progress</button>
            </div></>
          : <button className="btn ghost" id="oReset" onClick={() => setConfirm(true)}>Reset progress</button>}
      </div>
    </div>
  );
}
