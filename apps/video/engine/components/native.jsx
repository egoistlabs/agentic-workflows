// T4: small, light, native-looking UI for talking-head overlays. Generic on
// purpose: never a real brand's UI or logo. Each one is drawn at a given state;
// scenes drive the state from cue times (`useTime().abs`) and place it with `Zone`.
// `example` adds a small "example" tag. Off by default: the rules never label invented examples (R4, X7).
import { Img, staticFile } from 'remotion';
import { useBrand } from '../context.jsx';

const INK = '#1c1c1e';
const SUB = '#6e6e73';
const SURFACE = { background: 'rgba(250,250,250,.96)', boxShadow: '0 18px 50px rgba(0,0,0,.28), 0 2px 6px rgba(0,0,0,.12)', color: INK };
const FONT = '-apple-system, "SF Pro Text", Inter, "Helvetica Neue", Arial, sans-serif';

const Example = ({ show, style }) =>
  show ? <span style={{ fontSize: 16, color: '#aeaeb2', fontWeight: 600, ...style }}>{show === true ? 'example' : show}</span> : null;

/** A light rounded surface; the base of the other components. */
export const NativeCard = ({ radius = 22, padding = '20px 22px', style, children }) => (
  <div style={{ ...SURFACE, borderRadius: radius, padding, fontFamily: FONT, ...style }}>{children}</div>
);

/**
 * iOS-style notification banner: app icon, app name, time, title and body.
 * `amount` is shown bold before the body; `blur` hides it (amounts the brief can't state).
 */
export const Notification = ({ app = 'BANK', icon = '$', iconBg = '#34c759', time = 'now', title, amount, body, blur = false, width = 860, example, style }) => (
  <NativeCard radius={34} padding="22px 26px" style={{ display: 'flex', alignItems: 'center', gap: 22, width, ...style }}>
    <div style={{ width: 76, height: 76, flex: 'none', borderRadius: 18, background: iconBg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 800 }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26, color: SUB, fontWeight: 600 }}>
        <span>{app} <Example show={example} style={{ marginLeft: 8 }} /></span>
        <span>{time}</span>
      </div>
      {title && <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4 }}>{title}</div>}
      <div style={{ fontSize: 34, fontWeight: 500, color: '#3a3a3c' }}>
        {amount && <span style={{ fontWeight: 800, color: INK, filter: blur ? 'blur(9px)' : undefined }}>{amount}</span>}
        {amount && body ? ' ' : ''}
        {body}
      </div>
    </div>
  </NativeCard>
);

/**
 * Identical banners stacking behind the top one ("same thing, again and again").
 * `layers`: one 0–1 progress per card behind (0 hidden, 1 settled).
 */
export const NotificationStack = ({ layers = [], width = 860, height = 160, children }) => {
  const drop = layers.reduce((s, k) => s + k * 6, 0);
  return (
    <div style={{ position: 'relative', width }}>
      {layers.map((k, i) => (
        <div key={i} style={{ position: 'absolute', left: 0, top: 0, width, height, borderRadius: 34, background: 'rgba(235,235,235,.9)', boxShadow: '0 10px 30px rgba(0,0,0,.2)',
          opacity: k * 0.85, transform: `translateY(${k * (28 + i * 14)}px) scale(${1 - k * (0.05 + i * 0.03)})` }} />
      ))}
      <div style={{ position: 'relative', transform: `translateY(${drop}px)` }}>{children}</div>
    </div>
  );
};

const STATUS = { 'To Do': ['#e5e5ea', '#3a3a3c'], 'In Progress': ['#d6e4ff', '#0a50d6'], Done: ['#d3f5dc', '#1a7f37'] };

const Pill = ({ bg, color, children }) => (
  <span style={{ display: 'inline-block', padding: '6px 14px', borderRadius: 999, fontSize: 22, fontWeight: 700, background: bg, color }}>{children}</span>
);

/** A work ticket with a status pill: To Do, In Progress or Done. */
export const Ticket = ({ id = 'TASK-101', title, status = 'To Do', assignee = 'You', example = false, style }) => {
  const [bg, color] = STATUS[status] ?? STATUS['To Do'];
  return (
    <NativeCard style={style}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: SUB }}>{id}</span>
        <Example show={example} />
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, margin: '8px 0 14px', lineHeight: 1.15 }}>{title}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Pill bg={bg} color={color}>{status}</Pill>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 20, color: SUB }}>
          <span style={{ width: 28, height: 28, borderRadius: 14, background: '#ff9f0a', display: 'inline-block' }} /> {assignee}
        </span>
      </div>
    </NativeCard>
  );
};

/** Wraps part of a text in an accent highlight; `k` 0–1 fades it in. */
export const Highlight = ({ k = 1, children }) => {
  const b = useBrand();
  const accent = b.accent ?? '#22d3ee';
  return (
    <span style={{ fontWeight: 800, padding: '0 6px', borderRadius: 8, background: `color-mix(in srgb, ${accent} ${Math.round(30 * k)}%, transparent)`, color: k > 0.5 ? accent : INK }}>
      {children}
    </span>
  );
};

/** A generic social post: avatar, name, meta line, text and counts. */
export const SocialPost = ({ name, meta = '2h', avatar, text, likes, comments, example = false, style }) => (
  <NativeCard style={style}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      {avatar ? <Img src={staticFile(avatar)} style={{ width: 52, height: 52, borderRadius: 26, objectFit: 'cover' }} />
        : <div style={{ width: 52, height: 52, borderRadius: 26, background: 'linear-gradient(135deg,#5e5ce6,#bf5af2)' }} />}
      <div>
        <div style={{ fontSize: 24, fontWeight: 700 }}>{name}</div>
        <div style={{ fontSize: 18, color: SUB }}>{meta}{example ? ' · ' : ''}<Example show={example} style={{ fontSize: 18 }} /></div>
      </div>
    </div>
    <div style={{ fontSize: 28, fontWeight: 500, marginTop: 14, lineHeight: 1.3 }}>{text}</div>
    {(likes || comments) && (
      <div style={{ display: 'flex', gap: 22, marginTop: 14, fontSize: 20, color: SUB }}>
        {likes && <span>♥ {likes}</span>}
        {comments && <span>{comments} comments</span>}
      </div>
    )}
  </NativeCard>
);

/**
 * A small browser window. `tiles`: one 0–1 progress per project tile filling in;
 * or pass children for the page body. `compact` puts the tiles in one short row.
 */
export const BrowserCard = ({ url = 'example.dev', title = 'Projects', tiles = [], compact = false, example, children, style }) => (
  <NativeCard radius={20} padding={0} style={{ overflow: 'hidden', ...style }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: '#ececf0' }}>
      {['#ff5f57', '#febc2e', '#28c840'].map((x) => <span key={x} style={{ width: 14, height: 14, borderRadius: 7, background: x }} />)}
      <span style={{ marginLeft: 8, fontSize: 18, color: SUB, background: '#fff', borderRadius: 8, padding: '2px 12px' }}>{url}</span>
      <Example show={example} style={{ marginLeft: 'auto' }} />
    </div>
    {children ?? (
      <div style={{ padding: 16, display: 'grid', gridTemplateColumns: compact ? `repeat(${tiles.length || 1}, 1fr)` : '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1', fontSize: 26, fontWeight: 800 }}>{title}</div>
        {tiles.map((s, i) => (
          <div key={i} style={{ height: compact ? 64 : 82, borderRadius: 12, background: ['#ffd6c9', '#d6e4ff', '#d3f5dc', '#fff1c2'][i % 4], opacity: s, transform: `scale(${0.7 + 0.3 * s})`,
            gridColumn: !compact && i === tiles.length - 1 && tiles.length % 2 === 1 ? '1 / 3' : undefined }} />
        ))}
      </div>
    )}
  </NativeCard>
);

/**
 * A job/action card with a button that gets pressed, and toasts stacking under it.
 * `toasts`: one 0–1 progress per toast.
 */
export const ApplyButton = ({ title, label = 'Apply', pressed = false, toasts = [], toastText = 'Application sent', example, style }) => (
  <div style={{ fontFamily: FONT, ...style }}>
    <NativeCard radius={20} padding={22} style={{ textAlign: 'center' }}>
      {title && <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 14 }}>{title}</div>}
      <div style={{ display: 'inline-block', padding: '14px 48px', borderRadius: 14, background: '#0a84ff', color: '#fff', fontSize: 30, fontWeight: 800, transform: `scale(${pressed ? 0.92 : 1})` }}>{label}</div>
      {example && <div style={{ marginTop: 8 }}><Example show={example} /></div>}
    </NativeCard>
    {toasts.map((s, i) => (
      <NativeCard key={i} radius={16} padding="12px 18px" style={{ marginTop: 10, fontSize: 24, fontWeight: 700, opacity: s, transform: `translateY(${(1 - s) * 30}px)` }}>
        <span style={{ color: '#1a7f37' }}>✓</span> {toastText}
      </NativeCard>
    ))}
  </div>
);

/**
 * A real supplied logo or photo as a slightly tilted polaroid. `aspect` (width/height)
 * sizes the photo before it loads, so a Zone can place it.
 */
export const Polaroid = ({ src, caption, rotate = 4, aspect = 1, style }) => (
  <div style={{ background: '#fff', padding: `16px 16px ${caption ? 16 : 54}px`, borderRadius: 6, boxShadow: '0 18px 44px rgba(0,0,0,.3)', transform: `rotate(${rotate}deg)`, fontFamily: FONT, ...style }}>
    <Img src={staticFile(src)} style={{ width: '100%', aspectRatio: aspect, objectFit: 'contain', display: 'block' }} />
    {caption && <div style={{ marginTop: 12, fontSize: 24, fontWeight: 600, color: INK, textAlign: 'center' }}>{caption}</div>}
  </div>
);

const PLATFORM = {
  facebook: { button: '#0866ff', name: '#050505', sub: '#65676b', label: 'Facebook page', done: '✓ Following' },
  instagram: { button: '#0095f6', name: '#000', sub: '#737373', label: 'Instagram', done: 'Following' },
};

/** Follow pill for the CTA: avatar, name, platform line, and a Follow button that taps to Following. */
export const FollowPill = ({ platform = 'facebook', avatar, name, sub, following = false, tap = 1, style }) => {
  const p = PLATFORM[platform] ?? PLATFORM.facebook;
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 18, padding: '14px 16px 14px 14px', borderRadius: 24, background: 'rgba(255,255,255,.97)', boxShadow: '0 12px 36px rgba(0,0,0,.25)', fontFamily: FONT, ...style }}>
      {avatar ? <Img src={staticFile(avatar)} style={{ width: 72, height: 72, borderRadius: 36, objectFit: 'cover' }} />
        : <div style={{ width: 72, height: 72, borderRadius: 36, background: '#d1d5db' }} />}
      <div style={{ lineHeight: 1.15 }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: p.name }}>{name}</div>
        <div style={{ fontSize: 22, color: p.sub }}>{sub ?? p.label}</div>
      </div>
      <span style={{ marginLeft: 8, padding: '12px 26px', borderRadius: 12, fontSize: 28, fontWeight: 700, transform: `scale(${tap})`,
        background: following ? '#e4e6eb' : p.button, color: following ? '#050505' : '#fff' }}>{following ? p.done : 'Follow'}</span>
    </div>
  );
};
