import { test, expect, type Page } from "@playwright/test";

const projects = [
  { id: "project-alpha", name: "Alpha", root: "C:/Alpha" },
  { id: "project-beta", name: "Beta", root: "C:/Beta" },
];
const entity = (
  id: string,
  kind: string,
  title: string,
  projectId: string,
  parentId?: string,
  data: object = {},
) => ({
  id,
  kind,
  title,
  projectId,
  parentId,
  revision: 1,
  state: "active",
  data,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});
const dashboard = (
  project = projects[0],
  entities = [
    entity(
      `REQ-${project.id}`,
      "request",
      `${project.name} request`,
      project.id,
      undefined,
      { description: `${project.name} only` },
    ),
    entity(
      `MS-${project.id}`,
      "milestone",
      `${project.name} milestone`,
      project.id,
      `REQ-${project.id}`,
    ),
    entity(
      `SPEC-${project.id}`,
      "spec",
      `${project.name} specification`,
      project.id,
      `MS-${project.id}`,
      {
        description: "Owned specification",
        criteria: [{ id: "AC-1", text: "Isolated" }],
        paths: ["main.ts"],
      },
    ),
  ],
) => ({
  root: project.root,
  projectId: project.id,
  workspace: { id: "workspace:ui", projects, contexts: [] },
  sequence: 1,
  entities,
  events: [],
  recipes: [],
  connections: [],
  semantic: { ready: false, model: "", detail: "" },
});
const post = (page: Page, message: object) =>
  page.evaluate((message) => window.postMessage(message, "*"), message);
const messages = (page: Page) =>
  page.evaluate(
    () => (window as any).contextoryMessages as Record<string, any>[],
  );

test("same-name projects stay distinguishable in a narrow workspace selector", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/sidebar.html");
  const members = projects.map((p) => ({ ...p, name: "App" }));
  await post(page, {
    type: "restore",
    dashboard: {
      ...dashboard(),
      workspace: { id: "workspace:ui", projects: members, contexts: [] },
    },
  });
  const selector = page.getByLabel("Project", { exact: true });
  for (const project of members)
    await expect(selector.locator(`option[value="${project.id}"]`)).toHaveText(
      `App (${project.id.slice(-8)})`,
    );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await selector.selectOption(members[1].id);
  expect((await messages(page)).at(-1)).toMatchObject({
    type: "selectProject",
    targetProjectId: members[1].id,
  });
});

test("project selection labels local requests/specs, clears drafts and rejects stale project replies", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/sidebar.html");
  await post(page, {
    type: "restore",
    projectId: projects[0].id,
    dashboard: dashboard(projects[0], [
      ...dashboard().entities,
      entity(
        "REQ-foreign",
        "request",
        "Foreign record must not render",
        projects[1].id,
      ),
    ]),
  });
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Alpha request", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Foreign record must not render")).toHaveCount(0);
  await expect(page.locator(".request-card .project-badge").first()).toHaveText(
    "Alpha",
  );
  await page.locator("summary").filter({ hasText: "Alpha milestone" }).click();
  await expect(page.locator(".spec-row .project-badge")).toHaveText("Alpha");
  await page.getByRole("button", { name: "+ New request" }).click();
  await page.getByLabel("Title", { exact: true }).fill("Private Alpha draft");
  await page
    .getByLabel("Project", { exact: true })
    .selectOption(projects[1].id);
  await expect
    .poll(async () =>
      (await messages(page)).filter((m) => m.type === "selectProject").at(-1),
    )
    .toMatchObject({
      projectId: projects[0].id,
      targetProjectId: projects[1].id,
    });
  await post(page, {
    type: "restore",
    projectId: projects[0].id,
    dashboard: dashboard(),
  });
  await expect(
    page.getByRole("heading", { name: "Switching project" }),
  ).toBeVisible();
  await post(page, {
    type: "restore",
    projectId: projects[1].id,
    dashboard: dashboard(projects[1]),
  });
  await expect(
    page.getByRole("heading", { name: "Beta request", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Alpha request", { exact: true })).toHaveCount(0);
  await post(page, {
    type: "restore",
    projectId: projects[0].id,
    dashboard: dashboard(),
  });
  await expect(
    page.getByRole("heading", { name: "Beta request", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "+ New request" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("");
  await post(page, {
    type: "flow",
    projectId: projects[0].id,
    graph: {
      root: {},
      nodes: [{ id: "wrong", label: "Alpha graph leak" }],
      edges: [],
    },
  });
  await post(page, {
    type: "notice",
    projectId: projects[0].id,
    text: "Alpha error leak",
  });
  await expect(page.getByText("Alpha error leak")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Beta request", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("cross-project form uses explicit membership and partial branches can be retried or opened by project", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 520 });
  await page.goto("/sidebar.html");
  await post(page, {
    type: "restore",
    projectId: projects[0].id,
    dashboard: dashboard(),
  });
  await page.getByRole("button", { name: "Requests", exact: true }).click();
  await page.getByRole("button", { name: "+ New request" }).click();
  await page
    .getByLabel("Title", { exact: true })
    .fill("Migrate the shared interface");
  await page
    .getByLabel("What should change?")
    .fill("Update Alpha and Beta independently");
  await expect(
    page.getByRole("checkbox", { name: "Alpha", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Alpha", exact: true }),
  ).toBeDisabled();
  await page.getByRole("checkbox", { name: "Beta", exact: true }).check();
  await page
    .getByRole("button", { name: "Create request", exact: true })
    .click();
  const creation = (await messages(page)).find(
    (m) => m.name === "contextory_workspace_request_create",
  )!;
  expect(creation).toMatchObject({
    projectId: projects[0].id,
    arguments: {
      projectIds: projects.map((p) => p.id),
      title: "Migrate the shared interface",
    },
  });
  const group = {
    id: "WREQ-ui",
    ownerProjectId: projects[0].id,
    projectIds: projects.map((p) => p.id),
    creation: {
      operationId: creation.arguments.operationId,
      title: creation.arguments.title,
      description: creation.arguments.description,
    },
  };
  const request = entity(
    "REQ-shared-alpha",
    "request",
    creation.arguments.title,
    projects[0].id,
    undefined,
    { description: creation.arguments.description, workspaceRequest: group },
  );
  await post(page, {
    type: "restore",
    projectId: projects[0].id,
    dashboard: dashboard(projects[0], [request]),
  });
  const partial = {
    ...group,
    state: "incomplete",
    partial: true,
    branches: [
      {
        project: projects[0],
        request: { id: request.id, title: request.title, state: "active" },
        specs: [],
      },
      { project: projects[1], error: "Project service unavailable" },
    ],
  };
  await post(page, {
    type: "toolResult",
    projectId: projects[0].id,
    requestId: `workspace-request:${group.id}`,
    result: partial,
  });
  await expect(
    page
      .getByRole("region", { name: "Cross-project request" })
      .getByText("incomplete", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Retry missing branches", exact: true })
    .click();
  const retry = (await messages(page))
    .filter((m) => m.name === "contextory_workspace_request_create")
    .at(-1)!;
  expect(retry.arguments).toEqual(creation.arguments);
  const status = {
    ...group,
    state: "active",
    partial: false,
    branches: [
      partial.branches[0],
      {
        project: projects[1],
        request: {
          id: "REQ-shared-beta",
          title: request.title,
          state: "active",
        },
        specs: [],
      },
    ],
  };
  await post(page, {
    type: "toolResult",
    projectId: projects[0].id,
    requestId: `workspace-request:${group.id}`,
    result: status,
  });
  await page.screenshot({ path: "artifacts/multi-root-requests.png" });
  await page.getByRole("button", { name: /Beta · active/ }).click();
  await expect
    .poll(async () =>
      (await messages(page)).filter((m) => m.type === "selectProject").at(-1),
    )
    .toMatchObject({
      projectId: projects[0].id,
      targetProjectId: projects[1].id,
      recordId: "REQ-shared-beta",
    });
});
