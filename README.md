# Git Flow Visual Editor

An editable Git workflow timeline for mapping branches, quality gates, release tags, and hotfix back-merge paths as an interactive diagram.

This is a single-page app. The current editing state lives in browser memory, so it is best suited for workflow design discussions, release process reviews, branch strategy comparisons, and team demos.

![Git workflow editor](./src/assets/hero.png)

## Features

- Visual Git workflow timeline: branch lanes run horizontally, and vertical movement represents time.
- Draggable nodes: nodes snap to the nearest branch lane and update their branch assignment.
- Draggable branch lanes: reposition a branch lane and move its nodes along with it.
- Node editing: supports commit, gate, tag, and hotfix nodes with editable labels, types, branches, and descriptions.
- Edge editing: supports merge, sync, candidate, and hotfix relationships that can be added, updated, or deleted.
- Relation handle dragging: drag from the selected node to another node to create a new outgoing relationship.
- Safe deletion behavior: deleting a node also removes edges that reference it; the app keeps at least one node and one branch.
- Workflow templates: includes Git Flow, GitHub Flow, Trunk-based, GitLab Flow, Release Train, Feature Branch, Forking, OneFlow, and GitOps.
- Change impact log: records branch movement, timing changes, and workflow impact after node moves.
- Optimized rendering: uses PixiJS for branches, nodes, and edges when available, with a DOM/SVG fallback.

## Tech Stack

- Vite
- React 19
- TypeScript
- Tailwind CSS v4
- Radix UI Dialog / Tabs / Tooltip
- PixiJS
- Vitest + Testing Library
- oxlint / oxfmt

## Local Development

This project uses Bun for dependency management and scripts.

```sh
bun install
bun run dev
```

Common commands:

```sh
bun run build
bun run lint
bun run test
bun run format:check
bun run preview
```

## Project Structure

```txt
src/
  App.tsx                         # App shell that composes the canvas, editor panel, and node dialog
  workflowData.ts                 # Initial data, workflow templates, canvas dimensions, and enum config
  workflowUtils.ts                # Snapping, layout, impact descriptions, and utility helpers
  hooks/
    useWorkflowModel.ts           # Core state logic for nodes, branches, edges, and templates
  components/
    WorkflowCanvas.tsx            # Workflow canvas container
    PixiGraphLayer.tsx            # Pixi rendering integration layer
    EditorPanel.tsx               # Right-side editing panel
    NodeDialog.tsx                # Create / edit node dialog
    editor/                       # Node, edge, branch distribution, and change log tabs
    workflow-canvas/              # Canvas interactions, hit testing, node layer, and edge layers
  pixi/
    PixiGraphRenderer.ts          # Low-level PixiJS renderer
    graphRenderData.ts            # Converts workflow state into render data
```

## Usage

- Click a node to select it. The right panel shows the current node, branch, outgoing edge, and impact summary.
- Drag a node to change its branch lane and timing position.
- With a node selected, drag its relation handle to another node to create a relationship.
- Right-click empty canvas space to create a node; right-click a node to edit it.
- Use the "Edges" tab to edit relationship source, target, type, and label.
- Use the "Distribution" tab to edit branch name, color, position, environment, and policy.
- Click "Reset layout" to restore the current template to its initial state.

## Pre-release Checks

Before submitting or publishing changes, run:

```sh
bun run build
bun run lint
bun run test
```

For UI changes, also verify manually:

- No horizontal page overflow on desktop or mobile.
- Node dragging still snaps to branch lanes.
- Relation handle dragging can create relationships.
- Node create, edit, delete, and edge editing still work.

## Notes

The current version does not include a backend, accounts, cloud sync, or persistent storage. Refreshing the page clears the current editing session.
