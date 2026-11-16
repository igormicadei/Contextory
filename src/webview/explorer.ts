import { escape, button } from "./html";

export interface MapNode {
  id: string;
  label: string;
  kind: string;
  detail?: string;
  level?: number;
}
export interface MapEdge {
  from: string;
  to: string;
  kind: string;
  label?: string;
}

/** A bounded, deterministic view model. Extraction stays outside the renderer. */
export function explorerSvg(
  nodes: MapNode[],
  edges: MapEdge[],
  selected: string,
  action: string,
  label: string,
  className = "",
) {
  const ids = new Set(nodes.map((n) => n.id));
  const links = edges.filter((e) => ids.has(e.from) && ids.has(e.to));
  const connected = new Set([selected]);
  for (const e of links)
    if (e.from === selected || e.to === selected) {
      connected.add(e.from);
      connected.add(e.to);
    }
  // Breadth-first layers remain stable across selection and theme changes.
  const levels = new Map<string, number>();
  const targets = new Set(links.map((e) => e.to));
  const roots = nodes.filter((n) => !targets.has(n.id));
  const queue = (roots.length ? roots : nodes.slice(0, 1)).map((n) => n.id);
  for (const id of queue) levels.set(id, 0);
  for (let i = 0; i < queue.length; i++)
    for (const edge of links.filter((e) => e.from === queue[i]))
      if (!levels.has(edge.to)) {
        levels.set(edge.to, Math.min(12, (levels.get(edge.from) ?? 0) + 1));
        queue.push(edge.to);
      }
  const slots = new Map<number, number>();
  const positions = new Map(
    nodes.map((n) => {
      const level = n.level ?? levels.get(n.id) ?? 0;
      const row = slots.get(level) ?? 0;
      slots.set(level, row + 1);
      return [n.id, { x: 28 + level * 300, y: 34 + row * 118 }];
    }),
  );
  const width = Math.max(460, ...[...positions.values()].map((p) => p.x + 276));
  const height = Math.max(
    240,
    ...[...positions.values()].map((p) => p.y + 110),
  );
  return `<svg class="explorer-diagram ${className}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="${escape(label)}"><defs><marker id="map-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z"/></marker></defs>${links
    .map((e) => {
      const a = positions.get(e.from)!,
        b = positions.get(e.to)!;
      const x1 = a.x + 240,
        x2 = b.x,
        y1 = a.y + 39,
        y2 = b.y + 39;
      const backward = x2 <= x1;
      const d =
        e.from === e.to
          ? `M${a.x + 180},${a.y} C${a.x + 180},${a.y - 30} ${a.x + 60},${a.y - 30} ${a.x + 60},${a.y}`
          : backward
            ? `M${x1},${y1} C${x1 + 48},${y1 - 65} ${x2 - 48},${y2 - 65} ${x2},${y2}`
            : `M${x1},${y1} C${x1 + 32},${y1} ${x2 - 32},${y2} ${x2},${y2}`;
      const related = selected && (e.from === selected || e.to === selected);
      return `<g class="graph-edge ${escape(e.kind)} ${e.label?.includes("· inferred") ? "inferred" : ""} ${related ? "related" : selected ? "dimmed" : ""}"><title>${escape(`${nodes.find((n) => n.id === e.from)?.label} → ${nodes.find((n) => n.id === e.to)?.label}: ${e.label ?? e.kind}`)}</title><path d="${d}" marker-end="url(#map-arrow)"/><text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - (backward ? 30 : 7)}" text-anchor="middle">${escape(e.label ?? e.kind)}</text></g>`;
    })
    .join("")}${nodes
    .map((n) => {
      const p = positions.get(n.id)!;
      const trim = (s: string, max: number) =>
        escape(s.length > max ? `${s.slice(0, max - 1)}…` : s);
      return `<g class="graph-node ${escape(n.kind)} ${n.id === selected ? "selected" : selected && !connected.has(n.id) ? "dimmed" : ""}" transform="translate(${p.x},${p.y})" role="button" tabindex="0" aria-pressed="${n.id === selected}" aria-label="${escape(n.label)}" data-action="${action}" data-id="${escape(n.id)}"><title>${escape(n.label)}${n.detail ? ` — ${escape(n.detail)}` : ""}</title><rect width="240" height="78" rx="10"/><text x="15" y="20" class="node-kind">${escape(n.kind.replaceAll("_", " "))}</text><text x="15" y="43" class="node-name">${trim(n.label, 31)}</text><text x="15" y="63" class="node-location">${trim(n.detail ?? "Select to explore", 37)}</text></g>`;
    })
    .join("")}</svg>`;
}

export function mapToolbar(id: string) {
  return `<div class="map-tools" role="group" aria-label="Map viewport"><span class="muted">Drag background to pan · Ctrl + wheel to zoom</span><div>${button("mapZoom", "−", `data-map="${id}" data-factor="0.8" aria-label="Zoom out"`, "small")}${button("mapZoom", "+", `data-map="${id}" data-factor="1.25" aria-label="Zoom in"`, "small")}${button("mapFit", "Fit", `data-map="${id}" aria-label="Fit map to view"`, "small")}${button("mapReset", "100%", `data-map="${id}" aria-label="Reset map zoom"`, "small")}</div></div>`;
}

const viewports = new Map<
  string,
  { scale: number; left: number; top: number }
>();
export function zoomMap(id: string, factor?: number, fit = false) {
  const canvas = document.getElementById(id),
    svg = canvas?.querySelector("svg");
  if (!canvas || !svg) return;
  const width = svg.viewBox.baseVal.width,
    height = svg.viewBox.baseVal.height;
  const old = viewports.get(id)?.scale ?? 1;
  const scale = Math.max(
    0.01,
    Math.min(
      2.5,
      fit
        ? Math.min(
            (canvas.clientWidth - 20) / width,
            (canvas.clientHeight - 20) / height,
          )
        : factor
          ? old * factor
          : 1,
    ),
  );
  const left =
    ((canvas.scrollLeft + canvas.clientWidth / 2) / old) * scale -
    canvas.clientWidth / 2;
  const top =
    ((canvas.scrollTop + canvas.clientHeight / 2) / old) * scale -
    canvas.clientHeight / 2;
  svg.setAttribute("width", String(width * scale));
  svg.setAttribute("height", String(height * scale));
  canvas.scrollLeft = fit ? 0 : Math.max(0, left);
  canvas.scrollTop = fit ? 0 : Math.max(0, top);
  viewports.set(id, { scale, left: canvas.scrollLeft, top: canvas.scrollTop });
}

export function saveMapViewports() {
  document
    .querySelectorAll<HTMLElement>(".map-canvas[id]")
    .forEach((canvas) => {
      const svg = canvas.querySelector("svg");
      if (svg)
        viewports.set(canvas.id, {
          scale: Number(svg.getAttribute("width")) / svg.viewBox.baseVal.width,
          left: canvas.scrollLeft,
          top: canvas.scrollTop,
        });
    });
}
export function restoreMapViewports() {
  document
    .querySelectorAll<HTMLElement>(".map-canvas[id]")
    .forEach((canvas) => {
      const state = viewports.get(canvas.id),
        svg = canvas.querySelector("svg");
      if (!state || !svg) return;
      svg.setAttribute(
        "width",
        String(svg.viewBox.baseVal.width * state.scale),
      );
      svg.setAttribute(
        "height",
        String(svg.viewBox.baseVal.height * state.scale),
      );
      canvas.scrollLeft = state.left;
      canvas.scrollTop = state.top;
    });
}

export function bindMapInteraction(app: HTMLElement) {
  app.addEventListener(
    "wheel",
    (event) => {
      const canvas = (event.target as Element).closest<HTMLElement>(
        ".map-canvas",
      );
      if (!canvas || !event.ctrlKey) return;
      event.preventDefault();
      zoomMap(canvas.id, event.deltaY < 0 ? 1.12 : 1 / 1.12);
    },
    { passive: false },
  );
  let drag:
    | { canvas: HTMLElement; x: number; y: number; left: number; top: number }
    | undefined;
  app.addEventListener("pointerdown", (event) => {
    const target = event.target as Element;
    const canvas = target.closest<HTMLElement>(".map-canvas");
    if (!canvas || target.closest("[data-action]") || event.button !== 0)
      return;
    drag = {
      canvas,
      x: event.clientX,
      y: event.clientY,
      left: canvas.scrollLeft,
      top: canvas.scrollTop,
    };
    canvas.setPointerCapture(event.pointerId);
  });
  app.addEventListener("pointermove", (event) => {
    if (!drag) return;
    drag.canvas.scrollLeft = drag.left - event.clientX + drag.x;
    drag.canvas.scrollTop = drag.top - event.clientY + drag.y;
  });
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
    app.addEventListener(type, () => {
      drag = undefined;
    });
}
