export default function Logo({ size = 'm' }) {
  return (
    <span className={`logo logo-${size}`}>
      <span className="logo-mark" aria-hidden>
        <i />
        <i />
      </span>
      SplitEase
    </span>
  );
}
