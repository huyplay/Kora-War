/** Presentation dimensions follow the rendered model, including dense formations and spawning. */
export function unitVisualMetrics(height: number, scale: number, radius = 0.7) {
  return {
    pickRadius: radius * scale,
    bodyHeight: height * scale,
    barY: Math.max(0.45, height * scale + 0.25),
    barScale: Math.max(0.45, Math.min(1, scale)),
  };
}
