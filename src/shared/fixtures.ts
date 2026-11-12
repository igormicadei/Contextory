import { indexingDecision, type DemoState, type Spec, type SpecStatus } from './model';
function spec(id: string, title: string, status: SpecStatus, description: string, criteria: string[]): Spec {
  const passed = status === 'completed';
  return { id, title, status, description, revision: 1, criteria, amendments: [],
    checks: [
      { name: 'Component behavior', kind: 'unit', status: passed ? 'passed' : 'pending', revision: 1, detail: 'Validation, state changes, and error handling.' },
      { name: 'Account settings flow', kind: 'browser', status: passed ? 'passed' : 'pending', revision: 1, detail: 'Save a profile, handle a rejected save, and navigate with the keyboard.' },
      { name: 'Responsive containment', kind: 'layout', status: passed ? 'passed' : 'pending', revision: 1, detail: 'No unintended overflow at 320, 768, and 1440 px; long labels and error states included.' }
    ],
    commits: passed ? [{ sha: id.endsWith('001') ? 'a71c9e2' : 'b82d0f3', subject: title, revision: 1, pushed: true }] : []
  };
}
export function createDemo(): DemoState {
  return { schema: 3, decisions: [indexingDecision()], submissions: [], nextRequest: 4, selected: 'SPEC-003', expanded: ['REQ-001', 'MS-001'], paused: false,
    messages: [
      { id: 'chat-seed-user', role: 'user', text: 'Where are we with the workspace changes?', time: '2026-11-10T12:03:00Z', kind: 'message', requestIds: [] },
      { id: 'chat-seed-assistant', role: 'assistant', text: 'Account settings is in browser and overflow checks. Search is waiting for your indexing decision, and the workspace activity log is queued.', time: '2026-11-10T12:03:01Z', kind: 'message', requestIds: ['REQ-001', 'REQ-002', 'REQ-003'] }
    ],
    requests: [
      { id: 'REQ-001', title: 'Improve account settings', provider: 'codex', milestones: [
        { id: 'MS-001', title: 'Profile & security', branch: 'relay/req-001/profile-security', specs: [
          spec('SPEC-001', 'Profile form & validation', 'completed', 'Let people edit their display name and email. Preserve unsaved values after a failed save.', ['Name and email validation explain how to fix invalid input.', 'A failed save preserves the entered values.']),
          spec('SPEC-002', 'Password update flow', 'completed', 'Add a password update dialog with useful success and error states.', ['The dialog supports keyboard navigation and returns focus on close.', 'An invalid password does not close the dialog.']),
          spec('SPEC-003', 'Responsive states & overflow', 'testing', 'Keep the account settings usable on narrow screens, including long labels, validation errors, and loading states.', ['No unexpected horizontal scrolling at supported viewport widths.', 'Dialogs and form controls stay inside their intended containers.', 'Save, cancel, validation, and keyboard flows pass in Playwright.'])
        ] },
        { id: 'MS-002', title: 'Preferences & notifications', branch: 'relay/req-001/preferences', specs: [
          spec('SPEC-004', 'Notification preferences', 'queued', 'Persist notification choices and show save feedback.', ['Saved choices survive a page reload.']),
          spec('SPEC-005', 'Theme & locale settings', 'queued', 'Respect the selected theme and locale throughout settings.', ['Theme and locale updates apply without losing unsaved form input.'])
        ] }
      ] },
      { id: 'REQ-002', title: 'Make project search faster', provider: 'claude', note: 'Waiting for a decision on the search indexing strategy.', milestones: [
        { id: 'MS-003', title: 'Search foundation', branch: 'relay/req-002/search', specs: [
          spec('SPEC-006', 'Search performance baseline', 'completed', 'Record repeatable search timings against representative project sizes.', ['The report records dataset size, environment, and repeated measurements.']),
          spec('SPEC-007', 'Incremental indexing', 'blocked', 'Choose an indexing strategy after reviewing the measured baseline.', ['The indexing strategy and invalidation rules are documented.']),
          spec('SPEC-008', 'Search result interactions', 'queued', 'Preserve keyboard selection as results update.', ['Arrow keys, Enter, and Escape work while results change.'])
        ] }
      ] },
      { id: 'REQ-003', title: 'Add a workspace activity log', provider: 'codex', milestones: [
        { id: 'MS-004', title: 'Activity timeline', branch: 'relay/req-003/activity', specs: [
          spec('SPEC-009', 'Persist implementation events', 'queued', 'Store ordered events with stable task associations.', ['Repeated delivery of an event does not create duplicates.']),
          spec('SPEC-010', 'Filter & inspect activity', 'queued', 'Filter the timeline by request and event kind.', ['Changing filters preserves keyboard focus.']),
          spec('SPEC-011', 'Export a progress report', 'queued', 'Export verified work with links to commits and evidence.', ['The report distinguishes pushed and integrated changes.'])
        ] }
      ] }
    ],
    events: [
      { id: 'seed-3', time: '2026-11-10T12:03:00Z', text: 'SPEC-003 started browser and overflow checks.', kind: 'info' },
      { id: 'seed-2', time: '2026-11-10T12:02:00Z', text: 'SPEC-002 verified and pushed · b82d0f3.', kind: 'success' },
      { id: 'seed-1', time: '2026-11-10T12:01:00Z', text: 'REQ-002 needs an indexing decision.', kind: 'warning' }
    ]
  };
}
