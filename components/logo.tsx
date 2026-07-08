export function Logo({ size = 28 }: { size?: number }) {
  const zoom = 2;
  const offset = `-${((zoom - 1) / zoom) * 50}%`;
  return (
    <div style={{ width: size, height: size, borderRadius: Math.round(size * 0.25), overflow: "hidden", flexShrink: 0 }}>
      <img
        src="/icon-192.png"
        alt="Mnemora"
        style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%`, objectFit: "cover", marginLeft: offset, marginTop: offset }}
      />
    </div>
  );
}
