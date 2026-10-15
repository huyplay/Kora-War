export interface DeploymentRule {
  enabled: boolean;
  clearance: number;
  rearDefenseWidth: number;
}
/** Seed/migration only. Active matches read the locked board module. */
export function defaultDeploymentRule(): DeploymentRule {
  return { enabled: true, clearance: 0.6, rearDefenseWidth: 1.2 };
}
export function validateDeploymentRule(value: DeploymentRule, spawnWidth: number) {
  if (
    !value ||
    typeof value.enabled !== 'boolean' ||
    Object.keys(value).some((k) => !['enabled', 'clearance', 'rearDefenseWidth'].includes(k)) ||
    !Number.isFinite(value.clearance) ||
    value.clearance < 0.05 ||
    value.clearance > 2 ||
    !Number.isFinite(value.rearDefenseWidth) ||
    value.rearDefenseWidth < 0.2 ||
    value.rearDefenseWidth > Math.min(3, spawnWidth)
  )
    throw new Error('Gameplay board.deployment không hợp lệ.');
}
