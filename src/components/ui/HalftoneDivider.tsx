export function HalftoneDivider({ my = 0 }: { my?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        height: 0,
        borderTop: "2px dotted #1a1a1a",
        marginTop: my,
        marginBottom: my,
      }}
    />
  );
}
