/* The Mythic card, shown after a roll lands in the Hadal Trench. */
import { useEffect, useRef } from 'react';
import { ROLLS, fmt, rollsBelow } from '../game/score';
import { useGame, closeFinish } from '../game/controller';
import { Box, BigText } from './parts';

export function Finish() {
  const { V } = useGame();
  const f = V.finish;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => { first.current?.focus(); }, [f]);
  if (!f) return <div className="finish" id="finish" hidden />;

  const r = f.r, top = r.paid.slice().sort((a, b) => b.ep - a.ep)[0];
  return (
    <div className="finish" id="finish">
      <div>
        <Box title="signal from the deep" foot="top 1%" />
        <div className="eyebrow">Mythic roll</div><h2>Hadal Trench</h2>
        <div className="big" aria-label={fmt(r.n)}><BigText text={fmt(r.n)} /></div>
        <p>{fmt(r.total)} EP at {fmt(r.fm)} fathoms. Biggest badge: {top.name}.</p>
        <p>Only {fmt(ROLLS - rollsBelow(r.total))} of 1,000,001 rolls reach this score or better.</p>
        <div className="row-btns"><button className="btn cyan" id="fClose" ref={first} onClick={closeFinish}>Keep diving</button></div>
      </div>
    </div>
  );
}
