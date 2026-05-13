const Crosshairs = ({ opacity = 1 }) => {
  // Place crosshairs in a grid pattern across the viewport
  const cells = []
  const cols = 6
  const rows = 5
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <div
          key={`${r}-${c}`}
          className="absolute select-none"
          style={{
            left: `${(c + 0.5) * (100 / cols)}%`,
            top: `${(r + 0.5) * (100 / rows)}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {/* Horizontal line */}
          <div
            style={{
              position: 'absolute',
              left: -6,
              top: 0,
              width: 12,
              height: 1,
              background: 'rgba(255,255,255,0.25)',
            }}
          />
          {/* Vertical line */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -6,
              width: 1,
              height: 12,
              background: 'rgba(255,255,255,0.25)',
            }}
          />
        </div>
      )
    }
  }
  return (
    <div className="pointer-events-none fixed inset-0 z-10" style={{ opacity }}>
      {cells}
    </div>
  )
}

export default Crosshairs
