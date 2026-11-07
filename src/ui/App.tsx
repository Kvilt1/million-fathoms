import { useEffect, useRef } from 'react';
import { compact, fmt, pctText } from '../game/score';
import { setsComplete } from '../game/sets';
import {
  useGame, start, rollNext, setSpeed, setMode, openDrawer, toggleSound, tabsFor, Sound, type Mode,
} from '../game/controller';
import type { Speed } from '../game/save';
import { LEVELS } from '../descent/levels';
import { Row, Outranked, Ladder, Now, LevelBar, DepthLadder } from './parts';
import { Drawer } from './Drawer';
import { Finish } from './Finish';

const SPEEDS: [Speed, string][] = [['show', 'Normal'], ['fast', 'Fast']];
const MODES: [Mode, string][] = [['classic', 'Classic'], ['descent', 'Descent']];
const DOCK: Record<string, string> = { log: 'Log', codex: 'Badges', sets: 'Sets', check: 'Check', how: 'How', settings: 'Settings', levels: 'Levels' };

export function App() {
  const { V, S, D } = useGame();
  const scene = useRef<HTMLCanvasElement>(null), fx = useRef<HTMLCanvasElement>(null), reels = useRef<HTMLDivElement>(null);
  useEffect(() => { start({ scene: scene.current!, fx: fx.current!, reels: reels.current! }); }, []);

  const desc = V.mode === 'descent';
  const found = Object.keys(desc ? D.badges : S.badges).length;
  const ui = (f: () => void) => () => { Sound.init(); Sound.ui(); f(); };
  const m = V.meta;

  return (
    <>
      <canvas id="scene" ref={scene} aria-hidden="true" />
      <div className="app" id="app">
        <div className="top">
          <h1 className="brand" style={{ margin: 0 }}>Million Fathoms</h1>
          <div className="seg mode" role="group" aria-label="Mode" id="modeSwitch">
            {MODES.map(([k, l]) => <button key={k} data-mode={k} aria-pressed={V.mode === k} onClick={ui(() => setMode(k))}>{l}</button>)}
          </div>
          {desc
            ? <div className="stats">
              <div className="stat" id="dDepth"><b>{V.lvl.depth}/6</b><span>Reels</span></div>
              <div className="stat" id="dLevel"><b>{V.lvl.level}/{LEVELS}</b><span>Level</span></div>
              <div className="stat opt" id="dXp"><b>{compact(D.xp)}</b><span>XP</span></div>
              <div className="stat opt" id="dRolls"><b>{fmt(D.rolls)}</b><span>Rolls</span></div>
              <div className="stat" id="sBadges"><b>{found}/233</b><span>Badges</span></div>
            </div>
            : <div className="stats">
              <div className="stat" id="sRolls"><b>{fmt(S.rolls)}</b><span>Rolls</span></div>
              <div className="stat opt" id="sBest"><b>{compact(S.best ? S.best.total : 0)}</b><span>Best EP</span></div>
              <div className="stat opt" id="sLife"><b>{compact(S.life)}</b><span>Lifetime EP</span></div>
              <div className="stat" id="sBadges"><b>{found}/233</b><span>Badges</span></div>
            </div>}
          <button className="icon-btn" id="btnSound" aria-pressed={S.opts.sound} aria-label="Sound" onClick={toggleSound}>
            <svg viewBox="0 0 20 16" aria-hidden="true">
              <path d="M2 6h3l4-4v12l-4-4H2z" />
              {S.opts.sound
                ? <g id="soundWaves"><rect x="11" y="6" width="2" height="4" /><rect x="14" y="4" width="2" height="8" /><rect x="17" y="2" width="2" height="12" /></g>
                : <g><rect x="12" y="4" width="2" height="2" /><rect x="16" y="4" width="2" height="2" /><rect x="14" y="7" width="2" height="2" /><rect x="12" y="10" width="2" height="2" /><rect x="16" y="10" width="2" height="2" /></g>}
            </svg>
          </button>
        </div>

        <section className="console" aria-label="Roll console">
          <div className="machine">
            <div className="reels" id="reels" ref={reels} aria-hidden="true" />
          </div>
          {desc && <LevelBar />}
          <div className="readout">
            <div className="ep" id="ep" />
            {V.now ? <Now key={V.now.key} now={V.now} /> : <>
              <div key={V.stamp.hit} className={'stamp' + (V.stamp.mythic ? ' t6' : '') + (V.stamp.hit ? ' hit' : '')} id="stamp">{V.stamp.text}</div>
              <div className="meta" id="meta">
                {'text' in m ? m.text : m.depth
                  ? <><b>{m.zone}</b>, {fmt(m.fm)} fathoms. Beats <b>{pctText(m.pct)}%</b> of depth {m.depth} rolls.</>
                  : <><b>{m.zone}</b>, {fmt(m.fm)} fathoms. Beats <b>{pctText(m.pct)}%</b> of rolls.</>}
              </div>
            </>}
          </div>
          <div className="controls">
            <button className="roll" id="btnRoll" onClick={() => { Sound.init(); rollNext(); }}><span id="rollLabel">{V.rollLabel}</span><kbd>Space</kbd></button>
            <div className="tools">
              <div className="seg" role="group" aria-label="Speed">
                {SPEEDS.map(([k, l]) => <button key={k} data-speed={k} aria-pressed={S.opts.speed === k} onClick={ui(() => setSpeed(k))}>{l}</button>)}
              </div>
            </div>
          </div>
        </section>

        <section className="haul" aria-label="Badges on this roll">
          <header><h2 id="haulTitle">{V.haulTitle}</h2><span id="haulCount">{V.haulCount}</span></header>
          <ul className="haul-list" id="haul">
            {V.haul
              ? <>{V.haul.rows.map(r => <Row key={r.key} row={r} />)}<Outranked list={V.haul.outranked} /></>
              : desc
                ? <li><DepthLadder /><p className="hint">Start with one reel. Badges earn EP, EP fills the level bar, and every fifth level adds a reel and opens the next zone.</p></li>
                : <li><Ladder /><p className="hint">Each badge your number earns adds EP, and EP drags the lead deeper. Reach the Hadal Trench and you're in the top 1% of all rolls.</p></li>}
          </ul>
        </section>

        <nav className="dock" aria-label="Sections">
          {tabsFor(V.mode).map(k => (
            <button key={k} data-open={k} onClick={() => { Sound.init(); openDrawer(k); }}>
              {DOCK[k]}
              {k === 'codex' && <em id="dockBadges">{found}/233</em>}
              {k === 'sets' && <em id="dockSets">{setsComplete(S)}/16</em>}
              {k === 'check' && <span className="lg"> a number</span>}
              {k === 'how' && <span className="lg"> it scores</span>}
            </button>
          ))}
        </nav>
      </div>
      <canvas id="fx" ref={fx} aria-hidden="true" />
      <div className="whiteout" id="whiteout" />
      <div className="zone-flash" id="zoneFlash" aria-hidden="true" />
      <div className="toasts" id="toasts">{V.toasts.map(t => <div key={t.id} className="toast">{t.text}</div>)}</div>
      <div className="sr" aria-live="polite" id="live">{V.live}</div>
      <Drawer />
      <Finish />
    </>
  );
}
