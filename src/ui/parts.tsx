/* Small pieces shared by the haul list, the drawer and the check panel. */
import type { CSSProperties } from 'react';
import { TIERS, badgeColor, fmt, type Badge } from '../game/score';
import type { HaulRow, NowView } from '../game/controller';

export const cssVars = (v: Record<string, string>) => v as CSSProperties;

const SEG = window.Intl && Intl.Segmenter ? new Intl.Segmenter('en', { granularity: 'grapheme' }) : null;
export function Icon({ b, base }: { b: Badge; base: number }) {
  const n = SEG ? [...SEG.segment(b.icon)].length : 1;
  return <span className="ic" aria-hidden="true" style={{ fontSize: Math.round(base * [1, 1, .72, .5, .4][Math.min(n, 4)]) }}>{b.icon}</span>;
}

export function Row({ row }: { row: HaulRow }) {
  const { b, isNew, animate } = row;
  return (
    <li className={`row ${b.ep >= 10000 ? 'big' : ''} ${animate ? 'in' : ''}`} style={cssVars({ '--c': badgeColor(b.ep) })}>
      <Icon b={b} base={20} />
      <span className="nm">{b.name}{isNew && <span className="new">New</span>}<span className="ds">{b.desc}</span></span>
      <span className="pts">+{fmt(b.ep)}</span>
    </li>
  );
}

export function Outranked({ list }: { list: Badge[] }) {
  if (!list.length) return null;
  return <li className="outranked">Outranked in family, no EP: {list.map((b, i) => <span key={b.name}>{i > 0 && ', '}<s>{b.name}</s></span>)}</li>;
}

export function Ladder() {
  return (
    <div className="ladder">
      {TIERS.map((t, i) => (
        <div key={t.name} style={cssVars({ '--c': t.color })}><b>{t.name}</b><span>{t.zone}</span><i>{i ? fmt(t.floor) + '+' : 'under 2,087'}</i></div>
      )).reverse()}
    </div>
  );
}

/* The badge being revealed: name and EP up top, what earned it underneath, plus a note saying what the
   lit digits mean when it isn't simply "these digits". */
const STYLE_NOTE = { digits: '', ends: 'first and last digit', tail: 'the ending', whole: 'the whole number' };
export function Now({ now }: { now: NowView }) {
  if ('outranked' in now) return (
    <div className="now dim" id="now">
      <div className="now-name">Outranked<span className="now-ep">no EP</span></div>
      <div className="now-desc">{now.outranked.map((b, i) => <span key={b.name}>{i > 0 && ', '}<s>{b.name}</s></span>)}</div>
    </div>
  );
  const { b, isNew, style } = now, note = STYLE_NOTE[style];
  return (
    <div className="now" id="now" style={cssVars({ '--c': badgeColor(b.ep) })}>
      <div className="now-name"><Icon b={b} base={24} /><span className="nm">{b.name}</span>{isNew && <span className="new">New</span>}<span className="now-ep">+{fmt(b.ep)}</span></div>
      <div className="now-desc">{b.desc}{note && <span className="now-note"> · {note}</span>}</div>
    </div>
  );
}
