import { useEffect, useRef } from 'react';
import { compact, fmt, pctText } from '../game/score';
import { setsComplete } from '../game/sets';
import {
  useGame, start, rollNext, setSpeed, setMode, openDrawer, toggleSound, tabsFor, Sound, G, HOTKEY, type Mode,
} from '../game/controller';
import type { Speed } from '../game/save';
import { LEVELS } from '../descent/levels';
import { sizeAt } from '../descent/score';
import { Row, Outranked, Ladder, Now, LevelBar, DepthLadder, Box, Logo, Clock, Hist } from './parts';
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
          <h1 className="brand" aria-label="Million Fathoms"><Logo /><span className="who" aria-hidden="true">lead@<b>fathom</b>:~$</span></h1>
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
          <Clock />
          <button className="icon-btn" id="btnSound" aria-pressed={S.opts.sound} aria-label="Sound" onClick={toggleSound}>[snd:{S.opts.sound ? 'on' : '--'}]</button>
        </div>

        <section className="console" aria-label="Roll console">
          <div className="machine">
            <Box title="/dev/lead0" right={`0..${desc ? sizeAt(V.lvl.depth) - 1 : 1000000}`} />
            <div className="reels" id="reels" ref={reels} aria-hidden="true" />
            <div className="hex" id="hex" aria-hidden="true" />
          </div>
          {desc && <LevelBar />}
          <div className="readout">
            <Box title="ep" />
            <div className="ep" id="ep" />
            <div className="tierbar" id="tierbar" aria-hidden="true" />
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
            <button className={G.busy ? 'roll busy' : 'roll'} id="btnRoll" onClick={() => { Sound.init(); rollNext(); }}><span id="rollLabel">{V.rollLabel}</span><kbd>space</kbd></button>
            <div className="tools">
              <div className="seg" role="group" aria-label="Speed">
                {SPEEDS.map(([k, l]) => <button key={k} data-speed={k} aria-pressed={S.opts.speed === k} onClick={ui(() => setSpeed(k))}>{l}</button>)}
              </div>
              {!desc && <Hist />}
            </div>
          </div>
        </section>

        <section className="haul" aria-label="Badges on this roll">
          <Box title={<h2 id="haulTitle">{V.haulTitle}</h2>} right={V.haulCount && <span id="haulCount">{V.haulCount}</span>} />
          <ul className="haul-list" id="haul">
            <li className="cmd" aria-hidden="true">$ <b>{V.haul ? 'tail -f roll.log' : desc ? 'cat descent.chart' : 'cat depth.chart'}</b></li>
            {V.haul
              ? <>{V.haul.rows.map(r => <Row key={r.key} row={r} />)}<Outranked list={V.haul.outranked} /></>
              : desc
                ? <li><DepthLadder /><p className="hint">Start with one reel. Badges earn EP, EP fills the level bar, and every fifth level adds a reel and opens the next zone.</p></li>
                : <li><Ladder /><p className="hint">Each badge your number earns adds EP, and EP drags the lead deeper. Reach the Hadal Trench and you're in the top 1% of all rolls.</p></li>}
            {!G.busy && <li className="cmd" aria-hidden="true">$ <span className="cur" /></li>}
          </ul>
        </section>

        <nav className="dock" aria-label="Sections">
          {tabsFor(V.mode).map(k => (
            <button key={k} data-open={k} onClick={() => { Sound.init(); openDrawer(k); }}>
              <kbd aria-hidden="true">{HOTKEY[k]}</kbd>
              <span className="lb">{DOCK[k]}</span>
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
