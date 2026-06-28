'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

/* ════════════════════ EDITABLE SLIDE DATA ════════════════════ */
interface Slide {
  label: string;
  before: number;
  after: number;
  status: string;
}
const SLIDES: Slide[] = [
  { label: 'CV Score', before: 62, after: 84, status: 'ATS Readiness: Strong' },
  { label: 'JD Match', before: 48, after: 79, status: 'Keyword Alignment: Improved' },
  { label: 'Recruiter Scan', before: 55, after: 88, status: 'Impact Clarity: High' },
  { label: 'Skills Fit', before: 51, after: 81, status: 'Role Match: Strong' },
  { label: 'Interview Readiness', before: 58, after: 86, status: 'Story Strength: Better' },
];
const TITLE = 'Scan your CV in seconds';
const DESC =
  'Instant feedback on ATS readability, role clarity, keywords, impact metrics, and recruiter scan strength.';
const INTERVAL_MS = 2000;
/* ══════════════════════════════════════════════════════════════ */

/** Keyframes for ambient motion (not in globals.css). Injected once. */
const KEYFRAMES = `
@keyframes cvDrift {
  0%   { transform: translate(-4%, -3%) scale(1); }
  50%  { transform: translate(5%, 4%) scale(1.08); }
  100% { transform: translate(-2%, 6%) scale(1.04); }
}
@keyframes cvSheen { 0%,65% { left: -60%; } 100% { left: 130%; } }
@keyframes cvDotPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
  50%     { box-shadow: 0 0 0 5px rgba(255,255,255,0.12); }
}
.cv-drift {
  background:
    radial-gradient(40% 40% at 30% 25%, rgba(91,99,214,0.55), transparent 60%),
    radial-gradient(45% 45% at 75% 80%, rgba(120,130,240,0.40), transparent 60%);
  animation: cvDrift 16s cubic-bezier(0.22,1,0.36,1) infinite alternate;
}
.cv-sheen {
  left: -60%;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.12), transparent);
  animation: cvSheen 6s ease-in-out infinite;
}
.cv-dot-pulse { animation: cvDotPulse 2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cv-drift, .cv-sheen, .cv-dot-pulse { animation: none !important; }
}
`;

/** Tween an integer from its current value to `to` over ~600ms (respects reduced motion). */
function useTweenedNumber(to: number, reduced: boolean) {
  const [val, setVal] = useState(to);
  const fromRef = useRef(to);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (reduced || from === to) {
      setVal(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const dur = 600;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(step);
      else fromRef.current = to;
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      fromRef.current = to;
    };
  }, [to, reduced]);

  return val;
}

export function AuthValueSlider({
  className = '',
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Auto-advance with a layered fade-out → swap → fade-in (pauses on hover/focus/hidden tab).
  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || document.hidden) return;
      setLeaving(true);
      window.setTimeout(() => {
        setActive((i) => (i + 1) % SLIDES.length);
        setLeaving(false);
      }, reduced ? 0 : 280);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, [reduced]);

  function jumpTo(i: number) {
    if (i === active) return;
    setLeaving(true);
    window.setTimeout(() => {
      setActive(i);
      setLeaving(false);
    }, reduced ? 0 : 280);
  }

  const slide = SLIDES[active];
  const before = useTweenedNumber(slide.before, reduced);
  const after = useTweenedNumber(slide.after, reduced);
  const fade = leaving ? 'opacity-0 translate-y-2.5' : 'opacity-100 translate-y-0';

  return (
    <div
      className={`relative flex h-full min-h-[34rem] flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-[#232a6c] via-[#2b3486] to-[#4650b0] p-8 text-white shadow-[0_30px_80px_-30px_rgba(35,42,108,0.55)] sm:p-10 ${compact ? 'p-5 sm:p-6' : ''} ${className}`}
      onMouseEnter={() => { pausedRef.current = true; }}
      onMouseLeave={() => { pausedRef.current = false; }}
      onFocusCapture={() => { pausedRef.current = true; }}
      onBlurCapture={() => { pausedRef.current = false; }}
    >
      <style>{KEYFRAMES}</style>

      {/* Ambient drifting radial glow */}
      <div aria-hidden className="cv-drift pointer-events-none absolute inset-[-40%] -z-10" />

      {/* Preview badge */}
      <span className="absolute right-6 top-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white/90 backdrop-blur-sm">
        <Sparkles className="h-3.5 w-3.5" /> CareerSignal Preview
      </span>

      {/* Heading */}
      <div className={`transition-all duration-500 ease-out ${fade}`}>
        <h2 className={`${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-extrabold leading-snug tracking-tight`}>
          {TITLE}
        </h2>
        {!compact && <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#b9c0ee] sm:text-base">{DESC}</p>}
      </div>

      {/* Score panel */}
      <div
        aria-live="polite"
        className={`relative ${compact ? 'mt-5 p-4' : 'mt-8 p-6 sm:p-7'} overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-500 ease-out ${fade}`}
      >
        {/* moving sheen */}
        <div aria-hidden className="cv-sheen pointer-events-none absolute top-0 h-full w-1/2 -skew-x-12" />

        <div className="flex items-baseline justify-between gap-4">
          <span className={`${compact ? 'text-sm' : 'text-base sm:text-lg'} text-[#b9c0ee]`}>{slide.label}</span>
          <span className={`${compact ? 'text-xl' : 'text-2xl sm:text-3xl'} font-extrabold tabular-nums tracking-tight`}>
            {before} <span className="mx-1 font-semibold text-white/70">→</span>
            <span className="text-[#2faf5b]">{after}</span>
            <span className="text-[0.6em] font-bold text-white/55">/100</span>
          </span>
        </div>

        {/* Before bar */}
        <div className={compact ? 'mt-4' : 'mt-5'}>
          <div className="mb-2 flex justify-between text-sm text-[#b9c0ee]">
            <span>Before</span>
            <span className="font-semibold tabular-nums text-white">{before}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#e8a73a] transition-[width] duration-700 ease-out"
              style={{ width: `${slide.before}%` }}
            />
          </div>
        </div>

        {/* After bar */}
        <div className={compact ? 'mt-3' : 'mt-4'}>
          <div className="mb-2 flex justify-between text-sm text-[#b9c0ee]">
            <span>After improvements</span>
            <span className="font-semibold tabular-nums text-white">{after}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#2faf5b] transition-[width] duration-700 ease-out"
              style={{ width: `${slide.after}%` }}
            />
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-[#2faf5b]">{slide.status}</p>
      </div>

      {/* Pagination dots */}
      <div className={`${compact ? 'mt-5' : 'mt-8'} flex items-center gap-2.5`} role="tablist" aria-label="Choose preview">
        {SLIDES.map((s, i) => (
          <button
            key={s.label}
            type="button"
            role="tab"
            aria-label={`Show ${s.label}`}
            aria-selected={i === active ? 'true' : 'false'}
            onClick={() => jumpTo(i)}
            className={`h-2.5 rounded-full transition-all duration-300 ease-out ${
              i === active ? 'cv-dot-pulse w-8 bg-white' : 'w-2.5 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
