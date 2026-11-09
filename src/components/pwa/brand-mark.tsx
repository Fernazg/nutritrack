/** App icon artwork, rendered by ImageResponse (inline styles only). */
export function BrandMark({ size }: { size: number }) {
  const ring = Math.round(size * 0.5);
  const stroke = Math.max(2, Math.round(size * 0.085));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1f9d63",
      }}
    >
      <div
        style={{
          width: ring,
          height: ring,
          borderRadius: "50%",
          border: `${stroke}px solid #ffffff`,
          borderTopColor: "rgba(255,255,255,0.35)",
          display: "flex",
        }}
      />
    </div>
  );
}
