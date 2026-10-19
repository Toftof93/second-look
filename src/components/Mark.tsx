// Two lenses: the first look, and the second one that catches what the first missed.
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="12" cy="16" r="8.5" stroke="currentColor" strokeOpacity="0.45" strokeWidth="2" />
      <circle cx="20" cy="16" r="8.5" stroke="var(--amber)" strokeWidth="2.4" />
      <circle cx="20" cy="16" r="2.6" fill="var(--amber)" />
    </svg>
  );
}
