export function getResourceName(appName: string, stage: string, suffix: string): string {
  return `${appName}-${stage}-${suffix}`;
}
