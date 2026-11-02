// Small timing helpers for scenes. All take seconds.
import { Easing, interpolate } from 'remotion';

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' };

/** 0→1 between a and b, eased out. */
export const p = (t, a, b, ease = Easing.out(Easing.cubic)) => interpolate(t, [a, b], [0, 1], { ...clamp, easing: ease });

/** Linear map of t from [a,b] to [from,to], clamped. */
export const map = (t, a, b, from, to, ease) => interpolate(t, [a, b], [from, to], { ...clamp, easing: ease });

/** Entrance: opacity and lift for an element that appears at `at`. */
export const enter = (t, at, dur = 0.45, lift = 40) => {
  const k = p(t, at, at + dur, Easing.bezier(0.16, 1, 0.3, 1));
  return { opacity: k, transform: `translateY(${(1 - k) * lift}px)` };
};

/** Exit: fades and drops out between at and at+dur. */
export const exit = (t, at, dur = 0.3) => {
  const k = p(t, at, at + dur, Easing.in(Easing.cubic));
  return { opacity: 1 - k, transform: `translateY(${k * -20}px)` };
};

export const both = (t, inAt, outAt, opts = {}) => {
  const a = enter(t, inAt, opts.dur, opts.lift);
  const b = outAt == null ? { opacity: 1, transform: '' } : exit(t, outAt);
  return { opacity: a.opacity * b.opacity, transform: `${a.transform} ${b.transform}` };
};

/** Overshooting entrance 0→1 (slightly past 1) between at and at+dur: native UI landing. */
export const pop = (t, at, dur = 0.45) => p(t, at, at + dur, Easing.bezier(0.2, 1.4, 0.4, 1));

/** 0→1 at `a`, back to 0 at `b`: an element that comes and goes. */
export const inOut = (t, a, b, dur = 0.3) => p(t, a, a + dur) * (1 - p(t, b, b + dur, Easing.in(Easing.cubic)));

export { Easing };
