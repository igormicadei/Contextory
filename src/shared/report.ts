import { allSpecs, progress, providerName, requestStatus, requestStatusLabels, type DemoState } from './model';
export function report(state: DemoState, live = false): string {
  const p = progress(allSpecs(state));
  return [live ? '# Relay implementation report' : '# Relay preview report', '', live ? '> Evidence from configured checks and request worktree commits. Review branch diffs before integration.' : '> DEMO DATA. No implementation, tests, commits, or pushes were performed by this preview.', '', `Completed ${live ? '' : 'demo '}specs: ${p.completed}/${p.total}. Requests awaiting planning are excluded from this count.`, '', ...state.requests.flatMap(r => [
    `## ${r.id}: ${r.title}`, '', `Provider: ${providerName(r.provider)}. Status: ${requestStatusLabels[requestStatus(state, r)]}.`, '',
    ...state.decisions.filter(d => d.requestId === r.id).flatMap(d => [`Decision: ${d.question}`, `Answer: ${d.answer?.text ?? 'Pending'}`, '']),
    ...state.submissions.filter(s => s.requestId === r.id).flatMap(s => [`Message (${s.outcome}; routing preview): ${s.text}`, `Selection: ${s.choice.provider} / ${s.choice.model} / ${s.choice.effort} (sample catalog).`, `Local attachment metadata: ${s.attachments.map(a => a.name).join(', ') || 'None'}.`, '']),
    ...r.milestones.flatMap(m => [
      `### ${m.id}: ${m.title}`, '', `${live ? 'Branch' : 'Sample branch'}: \`${m.branch}\``, '', ...m.specs.flatMap(s => [
        `- **${s.id}** — ${s.title} (v${s.revision}; ${s.status})`,
        ...s.commits.map(c => `  - ${live ? 'Commit' : 'Sample commit'} \`${c.sha}\`, spec v${c.revision}, ${c.pushed ? 'pushed' : 'local'}.`),
        ...s.checks.map(c => `  - ${c.kind}: ${c.name} — ${c.status}, spec v${c.revision}.`)
      ]), ''
    ]), r.note ?? '', ''
  ])].join('\n');
}
