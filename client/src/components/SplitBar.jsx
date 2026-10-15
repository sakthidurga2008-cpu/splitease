/**
 * The split bar: one line divided into parts, each part as wide as its share.
 *
 * segments: [{ key, value, tone }]
 *   tone is a CSS class suffix: "good", "bad", "rest" or "member-3".
 */
export default function SplitBar({ segments, label, size = 'm' }) {
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className={`splitbar splitbar-${size}`} role="img" aria-label={label}>
      {visible.length === 0 ? (
        <span className="splitbar-part splitbar-rest" style={{ flexGrow: 1 }} />
      ) : (
        visible.map((segment) => (
          <span
            key={segment.key}
            className={`splitbar-part splitbar-${segment.tone}`}
            style={{ flexGrow: segment.value }}
            title={segment.title}
          />
        ))
      )}
    </div>
  );
}
