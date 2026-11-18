import { realpath } from "node:fs/promises";
import { basename, isAbsolute, join, relative, sep } from "node:path";
import { z } from "zod";
import { digest } from "../storage/ledger";
import { rpc, readDescriptor } from "./rpc";
import { tools, type Input } from "../contracts/tools";
import {
  ContextoryError,
  type Actor,
  type Entity,
  type WorkspaceInfo,
  type WorkspaceProject,
  type WorkspaceRequest,
  type WorkspaceRequestStatus,
} from "../contracts/model";
import type { Application } from "./application";

const member = z.object({
  id: z.string().min(1).max(160),
  name: z.string().trim().min(1).max(300),
  root: z.string().min(1).max(4000),
  storage: z.string().min(1).max(4000),
});
const configuration = z.object({
  clientId: z.string().min(1).max(160),
  workspaceId: z.string().min(1).max(160),
  projects: z.array(member).min(1).max(16),
});
type Member = z.infer<typeof member>;
type Context = z.infer<typeof configuration>;
const samePath = (a: string, b: string) =>
  process.platform === "win32" ? a.toLowerCase() === b.toLowerCase() : a === b;
const publicProject = ({
  id,
  name,
  root,
}: WorkspaceProject): WorkspaceProject => ({ id, name, root });

/** Active editor membership grants routing, never a global mutable project selection. */
export class WorkspaceProjects {
  private readonly contexts = new Map<string, Context>();
  constructor(private readonly app: Application) {}

  get project(): WorkspaceProject {
    const configured = [...this.contexts.values()]
      .flatMap((c) => c.projects)
      .find((p) => p.id === this.app.ledger.projectId);
    return configured
      ? publicProject(configured)
      : {
          id: this.app.ledger.projectId,
          name: basename(this.app.ledger.root),
          root: this.app.ledger.root,
        };
  }

  detach(clientId: string) {
    this.contexts.delete(clientId);
  }

  async configure(raw: unknown) {
    const input = configuration.parse(raw);
    const ids = new Set<string>(),
      roots = new Set<string>();
    const projects: Member[] = [];
    for (const p of input.projects) {
      if (!isAbsolute(p.root) || !isAbsolute(p.storage))
        throw new ContextoryError(
          "INVALID_WORKSPACE",
          "Project paths must be absolute.",
        );
      const root = await realpath(p.root),
        storage = await realpath(p.storage);
      const key = process.platform === "win32" ? root.toLowerCase() : root;
      if (ids.has(p.id) || roots.has(key))
        throw new ContextoryError(
          "INVALID_WORKSPACE",
          "Workspace projects must have distinct identities and canonical folders.",
        );
      const inside = (parent: string, child: string) => {
        const path = relative(parent, child);
        return (
          path !== ".." && !path.startsWith(`..${sep}`) && !isAbsolute(path)
        );
      };
      if (
        projects.some(
          (other) => inside(other.root, root) || inside(root, other.root),
        )
      )
        throw new ContextoryError(
          "INVALID_WORKSPACE",
          "Workspace project roots must not overlap. Open the enclosing project or separate non-nested folders.",
        );
      ids.add(p.id);
      roots.add(key);
      const project = { ...p, root, storage };
      const health = (await this.callPeer(project, "ui", "health", {})) as {
        projectId: string;
      };
      if (health.projectId !== p.id)
        throw new ContextoryError(
          "WRONG_PROJECT",
          "The project service identity changed; refresh workspace membership.",
        );
      projects.push(project);
    }
    const own = projects.find((p) => p.id === this.app.ledger.projectId);
    if (
      !own ||
      !samePath(own.root, this.app.ledger.root) ||
      !samePath(own.storage, this.app.storage)
    )
      throw new ContextoryError(
        "WRONG_PROJECT",
        "Workspace membership must include this exact project service.",
      );
    this.contexts.set(input.clientId, { ...input, projects });
    return this.info(input.workspaceId);
  }

  info(workspaceId?: string): WorkspaceInfo {
    const contexts = [
      ...new Map(
        [...this.contexts.values()].map((c) => [c.workspaceId, c]),
      ).values(),
    ];
    if (workspaceId && !contexts.some((c) => c.workspaceId === workspaceId))
      throw new ContextoryError(
        "UNKNOWN_WORKSPACE",
        "This editor workspace is not attached to the project.",
      );
    const selected = workspaceId
      ? contexts.find((c) => c.workspaceId === workspaceId)
      : contexts.length === 1
        ? contexts[0]
        : undefined;
    return {
      id: selected?.workspaceId,
      projects: selected?.projects.map(publicProject) ?? [this.project],
      contexts: contexts.map((c) => ({
        id: c.workspaceId,
        projects: c.projects.map(publicProject),
      })),
    };
  }

  private context(workspaceId?: string): Context {
    const info = this.info(workspaceId);
    if (!info.id)
      throw new ContextoryError(
        "WORKSPACE_SCOPE_REQUIRED",
        info.contexts.length
          ? "Multiple workspaces are attached; supply workspaceId explicitly."
          : "Cross-project operations require an attached editor workspace.",
      );
    return [...this.contexts.values()].find((c) => c.workspaceId === info.id)!;
  }

  private async callPeer(
    project: Member,
    role: string,
    method: string,
    params: object,
    timeout = 30000,
  ): Promise<unknown> {
    const path = join(project.storage, `${role}.json`);
    const descriptor = await readDescriptor(path);
    if (descriptor.role !== role || !samePath(descriptor.root, project.root))
      throw new ContextoryError(
        "WRONG_PROJECT",
        "The service descriptor does not belong to the selected project and role.",
      );
    if (method !== "health") {
      const health = await rpc<{ projectId: string }>(path, "health", {}, 1500);
      if (health.projectId !== project.id)
        throw new ContextoryError(
          "WRONG_PROJECT",
          "The selected project's identity changed; refresh workspace membership.",
        );
    }
    return rpc(path, method, params, timeout);
  }

  async route(
    projectId: string,
    workspaceId: string | undefined,
    name: string,
    args: object,
    actor: Actor,
  ) {
    const context = this.context(workspaceId);
    const project = context.projects.find((p) => p.id === projectId);
    if (!project)
      throw new ContextoryError(
        "UNKNOWN_PROJECT",
        "Select an active workspace project from contextory_workspace_get.",
      );
    // Remove projectId before dispatch: the target never forwards the same call again.
    const { projectId: _project, ...arguments_ } = args as Record<
      string,
      unknown
    >;
    return this.callPeer(
      project,
      actor.human ? "ui" : actor.provider!,
      "tools/call",
      {
        name,
        arguments: { ...arguments_, workspaceId: context.workspaceId },
      },
      name.startsWith("contextory_release") || name === "contextory_version_get"
        ? 300000
        : 120000,
    );
  }

  localBranch(groupId: string) {
    const request = this.app.ledger
      .all("request")
      .find(
        (r) =>
          (r.data.workspaceRequest as WorkspaceRequest | undefined)?.id ===
          groupId,
      );
    if (!request) return undefined;
    const milestones = new Set(
      this.app.ledger
        .all("milestone")
        .filter((m) => m.parentId === request.id)
        .map((m) => m.id),
    );
    return {
      project: this.project,
      request: { id: request.id, title: request.title, state: request.state },
      specs: this.app.ledger
        .all("spec")
        .filter((s) => milestones.has(s.parentId ?? ""))
        .map((s) => ({ id: s.id, title: s.title, state: s.state })),
    };
  }

  branch(raw: Record<string, unknown>, actor: Actor): Entity {
    const context = this.context(String(raw.workspaceId ?? ""));
    const group = z
      .object({
        id: z.string().regex(/^WREQ-[a-f0-9]{32}$/),
        ownerProjectId: z.string().min(1).max(160),
        projectIds: z.array(z.string().min(1).max(160)).min(2).max(16),
        creation: z.object({
          operationId: z.string().min(8).max(160),
          title: z.string().min(1).max(300),
          description: z.string().min(1).max(12000),
        }),
      })
      .parse(raw.group);
    if (
      !group.projectIds.includes(this.project.id) ||
      !group.projectIds.includes(group.ownerProjectId) ||
      new Set(group.projectIds).size !== group.projectIds.length ||
      group.projectIds.some((id) => !context.projects.some((p) => p.id === id))
    )
      throw new ContextoryError(
        "INVALID_PROJECT_SCOPE",
        "Every request participant must be an explicit member of this workspace.",
      );
    const request = tools.contextory_request_change.schema.parse(raw.request);
    if (
      group.id !==
        `WREQ-${digest({ owner: group.ownerProjectId, operationId: group.creation.operationId }).slice(0, 32)}` ||
      request.operationId !==
        `workspace:${digest({ group: group.id, project: this.project.id })}` ||
      request.title !== group.creation.title ||
      request.description !== group.creation.description
    )
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        "Coordinated branches must retain their original request and operation identity.",
      );
    if (request.action !== "create")
      throw new ContextoryError(
        "INVALID_ARGUMENT",
        "A coordinated branch must be created explicitly.",
      );
    return this.app.workflow.request(request, actor, group);
  }

  async create(
    input: Input<"contextory_workspace_request_create">,
    workspaceId: string | undefined,
    actor: Actor,
  ): Promise<WorkspaceRequestStatus> {
    const context = this.context(workspaceId);
    const projectIds = [...new Set(input.projectIds)];
    if (
      projectIds.length !== input.projectIds.length ||
      !projectIds.includes(this.project.id) ||
      projectIds.some((id) => !context.projects.some((p) => p.id === id))
    )
      throw new ContextoryError(
        "INVALID_PROJECT_SCOPE",
        "Choose distinct active projects including this server's project.",
      );
    const group: WorkspaceRequest = {
      id: `WREQ-${digest({ owner: this.project.id, operationId: input.operationId }).slice(0, 32)}`,
      ownerProjectId: this.project.id,
      projectIds,
      creation: {
        operationId: input.operationId,
        title: input.title,
        description: input.description,
      },
    };
    // Own branch first retains durable group membership even when a peer fails.
    const ordered = [
      this.project.id,
      ...projectIds.filter((id) => id !== this.project.id),
    ];
    for (const id of ordered) {
      const request = {
        action: "create",
        operationId: `workspace:${digest({ group: group.id, project: id })}`,
        title: input.title,
        description: input.description,
      };
      try {
        const raw = { workspaceId: context.workspaceId, group, request };
        if (id === this.project.id) this.branch(raw, actor);
        else
          await this.callPeer(
            context.projects.find((p) => p.id === id)!,
            actor.human ? "ui" : actor.provider!,
            "workspace.branch.create",
            raw,
          );
      } catch (error) {
        if (id === this.project.id) throw error;
        // Partial creation is durable, visible and retried only on an explicit call.
        return this.status(
          group,
          context,
          actor,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
    return this.status(group, context, actor);
  }

  async get(
    groupId: string | undefined,
    workspaceId: string | undefined,
    actor: Actor,
  ) {
    const info = this.info(workspaceId);
    if (!groupId) return { project: this.project, ...info };
    const request = this.app.ledger
      .all("request")
      .find(
        (r) =>
          (r.data.workspaceRequest as WorkspaceRequest | undefined)?.id ===
          groupId,
      );
    if (!request)
      throw new ContextoryError(
        "NOT_FOUND",
        "This project has no branch of that workspace request.",
      );
    return this.status(
      request.data.workspaceRequest as WorkspaceRequest,
      this.context(workspaceId),
      actor,
    );
  }

  private async status(
    group: WorkspaceRequest,
    context: Context,
    actor: Actor,
    creationError?: string,
  ): Promise<WorkspaceRequestStatus> {
    const branches = await Promise.all(
      group.projectIds.map(
        async (id): Promise<WorkspaceRequestStatus["branches"][number]> => {
          const project = context.projects.find((p) => p.id === id);
          if (!project)
            return {
              project: { id, name: id, root: "" },
              error: "Project is no longer in this workspace.",
            };
          try {
            const branch =
              id === this.project.id
                ? this.localBranch(group.id)
                : ((await this.callPeer(
                    project,
                    actor.human ? "ui" : actor.provider!,
                    "workspace.branch.get",
                    { workspaceId: context.workspaceId, groupId: group.id },
                    3000,
                  )) as ReturnType<WorkspaceProjects["localBranch"]>);
            return (
              branch ?? {
                project: publicProject(project),
                error: "Request branch has not been created.",
              }
            );
          } catch (error) {
            return {
              project: publicProject(project),
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      ),
    );
    const partial =
      Boolean(creationError) || branches.some((b) => !b.request || b.error);
    return {
      ...group,
      branches,
      partial,
      ...(creationError ? { error: creationError } : {}),
      state: partial
        ? "incomplete"
        : branches.every((b) => b.request?.state === "completed")
          ? "completed"
          : "active",
    };
  }

  assertContext(workspaceId: string) {
    this.context(workspaceId);
  }
}
