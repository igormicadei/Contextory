import { createHash } from 'node:crypto';
export function nativeRegistration(root: string, proxy: string, descriptor: string) {
  return {
    name: `relay_workspace_${createHash('sha256').update(root).digest('hex').slice(0, 12)}`,
    config: { type: 'stdio', command: 'node', args: [proxy, descriptor] }
  };
}
