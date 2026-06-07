import type {
  Branch,
  Edge,
  EdgeKind,
  NodeKind,
  Position,
  WorkflowNode,
  WorkflowTemplate,
} from './types'

export const canvasSize = {
  width: 1120,
  height: 980,
}

export const timelineLayout = {
  axisX: 42,
  branchCenterGap: 108,
}

export const nodeBounds = {
  minX: timelineLayout.axisX + timelineLayout.branchCenterGap,
  maxX: canvasSize.width - 90,
  minY: 86,
  maxY: canvasSize.height - 70,
}

export const branches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '生产环境',
    policy: '只接受通过保护规则的合并；tag 或 release 记录从这里产生。',
  },
  {
    id: 'staging',
    label: 'staging',
    x: 330,
    color: '#1769aa',
    environment: '预生产环境',
    policy: '承接集成验证、UAT 和性能回归；需要定义与 main 的同步规则。',
  },
  {
    id: 'develop',
    label: 'develop',
    x: 520,
    color: '#5247c7',
    environment: '开发环境',
    policy: '承接开发集成；如果当前是 GitHub Flow，引入它会增加一条长期分支。',
  },
  {
    id: 'feature',
    label: 'feature / fix',
    x: 770,
    color: '#77766e',
    environment: '主题分支',
    policy: '短生命周期工作分支；拖得越远离 main，越需要明确回合并与清理规则。',
  },
]

export const initialWorkflowNodes: WorkflowNode[] = [
  {
    id: 'main-head',
    label: 'main HEAD',
    kind: 'commit',
    branch: 'main',
    description: '当前生产基线。移动它等价于改变生产合并点或上线时机。',
  },
  {
    id: 'develop-head',
    label: 'develop sync',
    kind: 'commit',
    branch: 'develop',
    description: '开发集成点。拖到 main 附近表示收敛到 GitHub Flow 或 Trunk-based。',
  },
  {
    id: 'staging-cut',
    label: 'staging',
    kind: 'gate',
    branch: 'staging',
    description: '预生产切线。拖动它会改变验证发生在哪个分支以及验证提前/延后。',
  },
  {
    id: 'staging-tests',
    label: 'staging 验证\n集成测试\nUAT / 性能',
    kind: 'gate',
    branch: 'staging',
    description: '质量门禁。越靠近 main，发布前检查越晚；越靠近 develop，反馈越早。',
  },
  {
    id: 'ci',
    label: 'CI 自动化\n单测 + lint',
    kind: 'gate',
    branch: 'develop',
    description: '自动化检查。拖到 feature 表示 PR 本地化检查，拖到 staging 表示集成门禁。',
  },
  {
    id: 'release-110',
    label: 'v1.1.0',
    kind: 'tag',
    branch: 'main',
    description: '正常发布标签。拖动可模拟 release tag、staging tag 或开发版本标记。',
  },
  {
    id: 'hotfix',
    label: 'hotfix 分支\nmain + staging + develop',
    kind: 'hotfix',
    branch: 'feature',
    description: '紧急修复路径。拖到不同 branch 会改变 hotfix 的回合并范围。',
  },
  {
    id: 'release-111',
    label: 'v1.1.1 🔥',
    kind: 'tag',
    branch: 'main',
    description: '紧急修复发布。拖得越靠后表示修复等待越久。',
  },
]

export const initialPositions: Record<string, Position> = {
  'main-head': { x: 150, y: 120 },
  'develop-head': { x: 520, y: 120 },
  'staging-cut': { x: 330, y: 245 },
  'staging-tests': { x: 330, y: 430 },
  ci: { x: 520, y: 610 },
  'release-110': { x: 150, y: 610 },
  hotfix: { x: 770, y: 770 },
  'release-111': { x: 150, y: 890 },
}

export const initialEdges: Edge[] = [
  {
    id: 'edge-main-develop',
    from: 'main-head',
    to: 'develop-head',
    kind: 'merge',
    label: '同步基线',
  },
  {
    id: 'edge-develop-staging',
    from: 'develop-head',
    to: 'staging-cut',
    kind: 'sync',
    label: 'develop -> staging',
  },
  {
    id: 'edge-staging-tests',
    from: 'staging-cut',
    to: 'staging-tests',
    kind: 'merge',
    label: '验证推进',
  },
  { id: 'edge-tests-ci', from: 'staging-tests', to: 'ci', kind: 'sync', label: '反馈到开发' },
  { id: 'edge-ci-release', from: 'ci', to: 'release-110', kind: 'candidate', label: '发布候选' },
  {
    id: 'edge-release-hotfix',
    from: 'release-110',
    to: 'hotfix',
    kind: 'hotfix',
    label: '紧急 hotfix',
  },
  {
    id: 'edge-hotfix-release',
    from: 'hotfix',
    to: 'release-111',
    kind: 'hotfix',
    label: '合并上线',
  },
  {
    id: 'edge-hotfix-staging',
    from: 'hotfix',
    to: 'staging-tests',
    kind: 'hotfix',
    label: '回合并 staging',
  },
  { id: 'edge-hotfix-ci', from: 'hotfix', to: 'ci', kind: 'hotfix', label: '回合并 develop' },
]

const githubFlowBranches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '生产主线',
    policy: '所有变更通过 PR 合入 main；main 始终保持可发布。',
  },
  {
    id: 'review',
    label: 'pull request',
    x: 390,
    color: '#1769aa',
    environment: '评审与检查',
    policy: '承载代码评审、CI 和预览环境；合并前必须完成自动化检查。',
  },
  {
    id: 'feature',
    label: 'feature / fix',
    x: 650,
    color: '#77766e',
    environment: '短期分支',
    policy: '从 main 拉出，保持小批量和短生命周期，避免长期偏离主线。',
  },
]

const githubFlowNodes: WorkflowNode[] = [
  {
    id: 'gh-main',
    label: 'main HEAD',
    kind: 'commit',
    branch: 'main',
    description: '当前可发布主线。GitHub Flow 中 main 是唯一长期分支。',
  },
  {
    id: 'gh-feature',
    label: 'feature work',
    kind: 'commit',
    branch: 'feature',
    description: '小批量功能或修复。完成后尽快提交 PR。',
  },
  {
    id: 'gh-ci',
    label: 'PR checks\nCI + review',
    kind: 'gate',
    branch: 'review',
    description: '合并前的自动化检查与代码评审。',
  },
  {
    id: 'gh-preview',
    label: 'preview deploy',
    kind: 'gate',
    branch: 'review',
    description: '在 PR 上验证交互、接口和回归风险。',
  },
  {
    id: 'gh-release',
    label: 'deploy main',
    kind: 'tag',
    branch: 'main',
    description: 'main 合入后直接发布或进入自动发布流水线。',
  },
]

const githubFlowPositions: Record<string, Position> = {
  'gh-main': { x: 150, y: 130 },
  'gh-feature': { x: 650, y: 260 },
  'gh-ci': { x: 390, y: 420 },
  'gh-preview': { x: 390, y: 590 },
  'gh-release': { x: 150, y: 780 },
}

const githubFlowEdges: Edge[] = [
  {
    id: 'gh-edge-main-feature',
    from: 'gh-main',
    to: 'gh-feature',
    kind: 'merge',
    label: '从 main 拉分支',
  },
  {
    id: 'gh-edge-feature-ci',
    from: 'gh-feature',
    to: 'gh-ci',
    kind: 'candidate',
    label: '打开 PR',
  },
  { id: 'gh-edge-ci-preview', from: 'gh-ci', to: 'gh-preview', kind: 'sync', label: '预览验证' },
  {
    id: 'gh-edge-preview-release',
    from: 'gh-preview',
    to: 'gh-release',
    kind: 'merge',
    label: '合并并发布',
  },
]

const trunkBasedBranches: Branch[] = [
  {
    id: 'trunk',
    label: 'trunk',
    x: 150,
    color: '#08705f',
    environment: '主干',
    policy: '所有变更快速集成到主干；通过小批量提交和自动化测试控制风险。',
  },
  {
    id: 'flags',
    label: 'feature flags',
    x: 380,
    color: '#1769aa',
    environment: '运行时开关',
    policy: '未完成能力通过开关隐藏，避免长期分支。',
  },
  {
    id: 'release',
    label: 'release',
    x: 620,
    color: '#5247c7',
    environment: '发布稳定线',
    policy: '仅在需要冻结、补丁或分批发布时短暂存在。',
  },
]

const trunkBasedNodes: WorkflowNode[] = [
  {
    id: 'tb-trunk',
    label: 'trunk HEAD',
    kind: 'commit',
    branch: 'trunk',
    description: '团队共同工作的主干，要求持续保持绿色。',
  },
  {
    id: 'tb-small-change',
    label: 'small change',
    kind: 'commit',
    branch: 'flags',
    description: '小步提交，必要时用 feature flag 隔离未完成能力。',
  },
  {
    id: 'tb-ci',
    label: 'fast CI\nunit + smoke',
    kind: 'gate',
    branch: 'trunk',
    description: '主干合入前后的快速反馈门禁。',
  },
  {
    id: 'tb-release',
    label: 'release cut',
    kind: 'gate',
    branch: 'release',
    description: '从主干切出可发布候选，减少冻结时间。',
  },
  {
    id: 'tb-prod',
    label: 'prod deploy',
    kind: 'tag',
    branch: 'trunk',
    description: '从绿色主干或短期 release 分支发布。',
  },
]

const trunkBasedPositions: Record<string, Position> = {
  'tb-trunk': { x: 150, y: 120 },
  'tb-small-change': { x: 380, y: 270 },
  'tb-ci': { x: 150, y: 440 },
  'tb-release': { x: 620, y: 620 },
  'tb-prod': { x: 150, y: 820 },
}

const trunkBasedEdges: Edge[] = [
  {
    id: 'tb-edge-trunk-change',
    from: 'tb-trunk',
    to: 'tb-small-change',
    kind: 'sync',
    label: '小步变更',
  },
  {
    id: 'tb-edge-change-ci',
    from: 'tb-small-change',
    to: 'tb-ci',
    kind: 'merge',
    label: '快速集成',
  },
  {
    id: 'tb-edge-ci-release',
    from: 'tb-ci',
    to: 'tb-release',
    kind: 'candidate',
    label: '候选发布',
  },
  {
    id: 'tb-edge-release-prod',
    from: 'tb-release',
    to: 'tb-prod',
    kind: 'merge',
    label: '发布上线',
  },
]

const gitlabFlowBranches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '集成主线',
    policy: '功能合入 main 后按环境分支逐级推进。',
  },
  {
    id: 'staging',
    label: 'staging',
    x: 360,
    color: '#1769aa',
    environment: '预生产',
    policy: '承接 UAT、回归和发布候选验证。',
  },
  {
    id: 'production',
    label: 'production',
    x: 590,
    color: '#a33a16',
    environment: '生产',
    policy: '只接受从 staging 推进的已验证变更。',
  },
  {
    id: 'feature',
    label: 'feature / fix',
    x: 820,
    color: '#77766e',
    environment: '短期分支',
    policy: '从 main 创建，通过合并请求进入主线。',
  },
]

const gitlabFlowNodes: WorkflowNode[] = [
  {
    id: 'gl-main',
    label: 'main integration',
    kind: 'commit',
    branch: 'main',
    description: '已完成评审的集成主线。',
  },
  {
    id: 'gl-feature',
    label: 'feature MR',
    kind: 'commit',
    branch: 'feature',
    description: '功能或修复通过 MR 合入 main。',
  },
  {
    id: 'gl-staging',
    label: 'staging deploy\nUAT + regression',
    kind: 'gate',
    branch: 'staging',
    description: '把 main 的变更推进到预生产环境验证。',
  },
  {
    id: 'gl-prod',
    label: 'production deploy',
    kind: 'tag',
    branch: 'production',
    description: '从 staging 推进到生产。',
  },
  {
    id: 'gl-hotfix',
    label: 'production hotfix',
    kind: 'hotfix',
    branch: 'production',
    description: '生产修复需要回合并 main，避免环境分支分叉。',
  },
]

const gitlabFlowPositions: Record<string, Position> = {
  'gl-main': { x: 150, y: 130 },
  'gl-feature': { x: 820, y: 280 },
  'gl-staging': { x: 360, y: 470 },
  'gl-prod': { x: 590, y: 690 },
  'gl-hotfix': { x: 590, y: 850 },
}

const gitlabFlowEdges: Edge[] = [
  {
    id: 'gl-edge-feature-main',
    from: 'gl-feature',
    to: 'gl-main',
    kind: 'merge',
    label: 'MR 合入 main',
  },
  {
    id: 'gl-edge-main-staging',
    from: 'gl-main',
    to: 'gl-staging',
    kind: 'candidate',
    label: '推进 staging',
  },
  {
    id: 'gl-edge-staging-prod',
    from: 'gl-staging',
    to: 'gl-prod',
    kind: 'merge',
    label: '推进 production',
  },
  {
    id: 'gl-edge-hotfix-main',
    from: 'gl-hotfix',
    to: 'gl-main',
    kind: 'hotfix',
    label: 'hotfix 回合并',
  },
]

const releaseTrainBranches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '集成主线',
    policy: '持续接收已完成变更；未赶上本班车的改动等待下一趟 train。',
  },
  {
    id: 'train',
    label: 'release train',
    x: 360,
    color: '#1769aa',
    environment: '固定发布窗口',
    policy: '按固定节奏从 main 发车，发车后只接受稳定性修复。',
  },
  {
    id: 'stabilize',
    label: 'stabilize',
    x: 590,
    color: '#5247c7',
    environment: '稳定化',
    policy: '执行回归、风险评估和候选版本收敛，避免继续塞入新功能。',
  },
  {
    id: 'feature',
    label: 'feature queue',
    x: 820,
    color: '#77766e',
    environment: '下一班候车区',
    policy: '未进入当前 train 的功能继续在短期分支或队列中等待下一轮。',
  },
]

const releaseTrainNodes: WorkflowNode[] = [
  {
    id: 'rt-main',
    label: 'main ready',
    kind: 'commit',
    branch: 'main',
    description: '已合入主线、等待下一次固定发车窗口的变更集合。',
  },
  {
    id: 'rt-queue',
    label: 'feature queue\nnext train',
    kind: 'gate',
    branch: 'feature',
    description: '没有赶上当前窗口的功能留到下一班车，避免破坏本次发布节奏。',
  },
  {
    id: 'rt-departure',
    label: 'train departure\ncode freeze',
    kind: 'gate',
    branch: 'train',
    description: '发布列车发车点。发车后只允许修复阻塞发布的问题。',
  },
  {
    id: 'rt-regression',
    label: 'stabilization\nregression + sign-off',
    kind: 'gate',
    branch: 'stabilize',
    description: '集中回归、验收和风险签核。问题修复要回到 train 并同步 main。',
  },
  {
    id: 'rt-candidate',
    label: 'release candidate',
    kind: 'tag',
    branch: 'train',
    description: '候选版本标记，用于最终验收和发布准备。',
  },
  {
    id: 'rt-prod',
    label: 'scheduled deploy',
    kind: 'tag',
    branch: 'main',
    description: '按发布窗口上线。下一班 train 可以继续从 main 发车。',
  },
  {
    id: 'rt-hotfix',
    label: 'train blocker\nhotfix',
    kind: 'hotfix',
    branch: 'stabilize',
    description: '只处理阻塞本班车发布的问题，修复后需要同步回 main。',
  },
]

const releaseTrainPositions: Record<string, Position> = {
  'rt-main': { x: 150, y: 120 },
  'rt-queue': { x: 820, y: 245 },
  'rt-departure': { x: 360, y: 360 },
  'rt-regression': { x: 590, y: 540 },
  'rt-candidate': { x: 360, y: 700 },
  'rt-prod': { x: 150, y: 850 },
  'rt-hotfix': { x: 590, y: 860 },
}

const releaseTrainEdges: Edge[] = [
  {
    id: 'rt-edge-main-departure',
    from: 'rt-main',
    to: 'rt-departure',
    kind: 'candidate',
    label: '固定窗口发车',
  },
  { id: 'rt-edge-queue-main', from: 'rt-queue', to: 'rt-main', kind: 'sync', label: '下一班候选' },
  {
    id: 'rt-edge-departure-regression',
    from: 'rt-departure',
    to: 'rt-regression',
    kind: 'merge',
    label: '进入稳定化',
  },
  {
    id: 'rt-edge-regression-candidate',
    from: 'rt-regression',
    to: 'rt-candidate',
    kind: 'candidate',
    label: '生成 RC',
  },
  {
    id: 'rt-edge-candidate-prod',
    from: 'rt-candidate',
    to: 'rt-prod',
    kind: 'merge',
    label: '按窗口发布',
  },
  {
    id: 'rt-edge-hotfix-candidate',
    from: 'rt-hotfix',
    to: 'rt-candidate',
    kind: 'hotfix',
    label: '阻塞修复入列',
  },
  {
    id: 'rt-edge-hotfix-main',
    from: 'rt-hotfix',
    to: 'rt-main',
    kind: 'hotfix',
    label: '修复同步 main',
  },
]

const featureBranchBranches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '稳定主线',
    policy: '只接受评审完成且测试通过的短期 feature branch 合并。',
  },
  {
    id: 'review',
    label: 'review',
    x: 390,
    color: '#1769aa',
    environment: '代码评审',
    policy: '所有主题分支通过 PR/MR 进入评审和自动化检查。',
  },
  {
    id: 'feature',
    label: 'feature',
    x: 650,
    color: '#77766e',
    environment: '主题开发',
    policy: '每个功能或修复独立分支，保持短生命周期并频繁同步 main。',
  },
  {
    id: 'release',
    label: 'release',
    x: 850,
    color: '#5247c7',
    environment: '可选发布线',
    policy: '仅在需要批量发布或冻结时短暂使用。',
  },
]

const featureBranchNodes: WorkflowNode[] = [
  {
    id: 'fb-main',
    label: 'main baseline',
    kind: 'commit',
    branch: 'main',
    description: '稳定主线，作为所有主题分支的起点。',
  },
  {
    id: 'fb-feature',
    label: 'feature branch',
    kind: 'commit',
    branch: 'feature',
    description: '单一功能或修复的短期分支。',
  },
  {
    id: 'fb-review',
    label: 'PR review\nCI checks',
    kind: 'gate',
    branch: 'review',
    description: '代码评审和自动化检查，用于控制合入质量。',
  },
  {
    id: 'fb-merge',
    label: 'merge to main',
    kind: 'commit',
    branch: 'main',
    description: '评审完成后合入 main。',
  },
  {
    id: 'fb-release',
    label: 'optional release',
    kind: 'tag',
    branch: 'release',
    description: '需要固定发布节奏时从 main 形成发布候选。',
  },
]

const featureBranchPositions: Record<string, Position> = {
  'fb-main': { x: 150, y: 120 },
  'fb-feature': { x: 650, y: 270 },
  'fb-review': { x: 390, y: 450 },
  'fb-merge': { x: 150, y: 650 },
  'fb-release': { x: 850, y: 820 },
}

const featureBranchEdges: Edge[] = [
  {
    id: 'fb-edge-main-feature',
    from: 'fb-main',
    to: 'fb-feature',
    kind: 'sync',
    label: '创建主题分支',
  },
  {
    id: 'fb-edge-feature-review',
    from: 'fb-feature',
    to: 'fb-review',
    kind: 'candidate',
    label: '提交 PR/MR',
  },
  {
    id: 'fb-edge-review-merge',
    from: 'fb-review',
    to: 'fb-merge',
    kind: 'merge',
    label: '评审通过合入',
  },
  {
    id: 'fb-edge-merge-release',
    from: 'fb-merge',
    to: 'fb-release',
    kind: 'candidate',
    label: '可选发布候选',
  },
]

const forkingBranches: Branch[] = [
  {
    id: 'upstream',
    label: 'upstream',
    x: 150,
    color: '#08705f',
    environment: '上游仓库',
    policy: '维护者控制合入权限，保护主仓库历史。',
  },
  {
    id: 'maintainer',
    label: 'maintainer review',
    x: 390,
    color: '#1769aa',
    environment: '维护者评审',
    policy: '对外部贡献执行代码评审、CI 和权限边界检查。',
  },
  {
    id: 'fork',
    label: 'contributor fork',
    x: 650,
    color: '#77766e',
    environment: '贡献者 fork',
    policy: '贡献者在自己的 fork 中开发，通过 PR 请求合入 upstream。',
  },
  {
    id: 'release',
    label: 'release',
    x: 850,
    color: '#5247c7',
    environment: '上游发布',
    policy: '维护者从 upstream main 生成发布版本。',
  },
]

const forkingNodes: WorkflowNode[] = [
  {
    id: 'fk-upstream',
    label: 'upstream main',
    kind: 'commit',
    branch: 'upstream',
    description: '项目官方主线，通常只有维护者有写权限。',
  },
  {
    id: 'fk-fork',
    label: 'fork sync',
    kind: 'commit',
    branch: 'fork',
    description: '贡献者 fork 从 upstream 同步基线。',
  },
  {
    id: 'fk-topic',
    label: 'topic branch',
    kind: 'commit',
    branch: 'fork',
    description: '贡献者在 fork 内创建主题分支完成变更。',
  },
  {
    id: 'fk-pr',
    label: 'pull request',
    kind: 'gate',
    branch: 'maintainer',
    description: '贡献者向 upstream 发起 PR。',
  },
  {
    id: 'fk-review',
    label: 'maintainer review\nCI + security',
    kind: 'gate',
    branch: 'maintainer',
    description: '维护者检查质量、授权边界和安全风险。',
  },
  {
    id: 'fk-release',
    label: 'upstream release',
    kind: 'tag',
    branch: 'release',
    description: '合入 upstream 后由维护者发布。',
  },
]

const forkingPositions: Record<string, Position> = {
  'fk-upstream': { x: 150, y: 120 },
  'fk-fork': { x: 650, y: 230 },
  'fk-topic': { x: 650, y: 380 },
  'fk-pr': { x: 390, y: 540 },
  'fk-review': { x: 390, y: 700 },
  'fk-release': { x: 850, y: 850 },
}

const forkingEdges: Edge[] = [
  {
    id: 'fk-edge-upstream-fork',
    from: 'fk-upstream',
    to: 'fk-fork',
    kind: 'sync',
    label: '同步 upstream',
  },
  {
    id: 'fk-edge-fork-topic',
    from: 'fk-fork',
    to: 'fk-topic',
    kind: 'merge',
    label: '创建贡献分支',
  },
  { id: 'fk-edge-topic-pr', from: 'fk-topic', to: 'fk-pr', kind: 'candidate', label: '提交 PR' },
  { id: 'fk-edge-pr-review', from: 'fk-pr', to: 'fk-review', kind: 'merge', label: '维护者评审' },
  {
    id: 'fk-edge-review-release',
    from: 'fk-review',
    to: 'fk-release',
    kind: 'merge',
    label: '合入并发布',
  },
]

const oneFlowBranches: Branch[] = [
  {
    id: 'main',
    label: 'main',
    x: 150,
    color: '#08705f',
    environment: '单一长期主线',
    policy: '所有功能最终合入 main；release 分支短暂存在。',
  },
  {
    id: 'release',
    label: 'release',
    x: 390,
    color: '#1769aa',
    environment: '短期发布分支',
    policy: '用于稳定化、版本标记和发布修复，发布后回合并 main。',
  },
  {
    id: 'feature',
    label: 'feature',
    x: 650,
    color: '#77766e',
    environment: '短期功能分支',
    policy: '从 main 创建，完成后合入 main，而不是长期 develop。',
  },
  {
    id: 'hotfix',
    label: 'hotfix',
    x: 850,
    color: '#a33a16',
    environment: '紧急修复',
    policy: '紧急修复从发布点或 main 创建，必须回合并 main。',
  },
]

const oneFlowNodes: WorkflowNode[] = [
  {
    id: 'of-main',
    label: 'main',
    kind: 'commit',
    branch: 'main',
    description: 'OneFlow 保留单一长期主线，不使用长期 develop。',
  },
  {
    id: 'of-feature',
    label: 'feature work',
    kind: 'commit',
    branch: 'feature',
    description: '短期功能分支，完成后直接合入 main。',
  },
  {
    id: 'of-main-merge',
    label: 'merge main',
    kind: 'commit',
    branch: 'main',
    description: '功能完成后回到 main，持续保持主线可集成。',
  },
  {
    id: 'of-release',
    label: 'release branch',
    kind: 'gate',
    branch: 'release',
    description: '发布前短暂切出，用于稳定化和版本准备。',
  },
  {
    id: 'of-tag',
    label: 'version tag',
    kind: 'tag',
    branch: 'release',
    description: '发布版本标记。',
  },
  {
    id: 'of-hotfix',
    label: 'hotfix backmerge',
    kind: 'hotfix',
    branch: 'hotfix',
    description: '发布修复必须回合并 main，避免单一主线丢失修复。',
  },
]

const oneFlowPositions: Record<string, Position> = {
  'of-main': { x: 150, y: 120 },
  'of-feature': { x: 650, y: 260 },
  'of-main-merge': { x: 150, y: 430 },
  'of-release': { x: 390, y: 590 },
  'of-tag': { x: 390, y: 760 },
  'of-hotfix': { x: 850, y: 860 },
}

const oneFlowEdges: Edge[] = [
  {
    id: 'of-edge-main-feature',
    from: 'of-main',
    to: 'of-feature',
    kind: 'sync',
    label: '从 main 分支',
  },
  {
    id: 'of-edge-feature-main',
    from: 'of-feature',
    to: 'of-main-merge',
    kind: 'merge',
    label: '合入 main',
  },
  {
    id: 'of-edge-main-release',
    from: 'of-main-merge',
    to: 'of-release',
    kind: 'candidate',
    label: '切 release',
  },
  { id: 'of-edge-release-tag', from: 'of-release', to: 'of-tag', kind: 'merge', label: '发布标记' },
  {
    id: 'of-edge-hotfix-main',
    from: 'of-hotfix',
    to: 'of-main-merge',
    kind: 'hotfix',
    label: '修复回 main',
  },
]

const gitOpsBranches: Branch[] = [
  {
    id: 'app',
    label: 'app repo',
    x: 150,
    color: '#08705f',
    environment: '应用代码',
    policy: '代码变更通过 PR 合入应用仓库主线。',
  },
  {
    id: 'ci',
    label: 'CI artifact',
    x: 360,
    color: '#1769aa',
    environment: '构建产物',
    policy: '主线变更生成不可变镜像、包或版本标记。',
  },
  {
    id: 'env',
    label: 'env repo',
    x: 590,
    color: '#5247c7',
    environment: '环境配置仓库',
    policy: '环境变更通过 Git 审计，声明期望部署状态。',
  },
  {
    id: 'cluster',
    label: 'cluster',
    x: 820,
    color: '#a33a16',
    environment: '运行环境',
    policy: '自动同步器从 Git 拉取期望状态并应用到环境。',
  },
]

const gitOpsNodes: WorkflowNode[] = [
  {
    id: 'go-app',
    label: 'app merge',
    kind: 'commit',
    branch: 'app',
    description: '应用代码完成评审后合入主线。',
  },
  {
    id: 'go-build',
    label: 'build artifact\nimage + SBOM',
    kind: 'gate',
    branch: 'ci',
    description: 'CI 构建不可变产物，并生成安全和可追溯信息。',
  },
  {
    id: 'go-version',
    label: 'image tag',
    kind: 'tag',
    branch: 'ci',
    description: '版本或镜像 tag 成为部署输入。',
  },
  {
    id: 'go-env-pr',
    label: 'env PR\nversion bump',
    kind: 'gate',
    branch: 'env',
    description: '通过环境仓库 PR 更新目标版本。',
  },
  {
    id: 'go-sync',
    label: 'sync controller',
    kind: 'gate',
    branch: 'cluster',
    description: '控制器把 Git 中的期望状态同步到集群。',
  },
  {
    id: 'go-prod',
    label: 'prod state',
    kind: 'tag',
    branch: 'cluster',
    description: '运行环境达到目标版本。',
  },
  {
    id: 'go-rollback',
    label: 'rollback commit',
    kind: 'hotfix',
    branch: 'env',
    description: '回滚通过环境仓库提交完成，保持 Git 审计链路。',
  },
]

const gitOpsPositions: Record<string, Position> = {
  'go-app': { x: 150, y: 120 },
  'go-build': { x: 360, y: 280 },
  'go-version': { x: 360, y: 430 },
  'go-env-pr': { x: 590, y: 570 },
  'go-sync': { x: 820, y: 710 },
  'go-prod': { x: 820, y: 860 },
  'go-rollback': { x: 590, y: 860 },
}

const gitOpsEdges: Edge[] = [
  { id: 'go-edge-app-build', from: 'go-app', to: 'go-build', kind: 'merge', label: '触发构建' },
  {
    id: 'go-edge-build-version',
    from: 'go-build',
    to: 'go-version',
    kind: 'candidate',
    label: '产物标记',
  },
  {
    id: 'go-edge-version-env',
    from: 'go-version',
    to: 'go-env-pr',
    kind: 'merge',
    label: '更新环境仓库',
  },
  { id: 'go-edge-env-sync', from: 'go-env-pr', to: 'go-sync', kind: 'sync', label: '同步期望状态' },
  { id: 'go-edge-sync-prod', from: 'go-sync', to: 'go-prod', kind: 'merge', label: '环境收敛' },
  {
    id: 'go-edge-rollback-sync',
    from: 'go-rollback',
    to: 'go-sync',
    kind: 'hotfix',
    label: '回滚同步',
  },
]

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'git-flow',
    label: 'Git Flow',
    description: '长期 develop + staging + main，适合发布窗口明确的团队。',
    branches,
    nodes: initialWorkflowNodes,
    edges: initialEdges,
    positions: initialPositions,
    selectedNodeId: 'staging-tests',
  },
  {
    id: 'github-flow',
    label: 'GitHub Flow',
    description: 'main + PR 检查，适合持续交付和短周期变更。',
    branches: githubFlowBranches,
    nodes: githubFlowNodes,
    edges: githubFlowEdges,
    positions: githubFlowPositions,
    selectedNodeId: 'gh-ci',
  },
  {
    id: 'trunk-based',
    label: 'Trunk-based',
    description: '小步合入主干，用 feature flags 管理未完成能力。',
    branches: trunkBasedBranches,
    nodes: trunkBasedNodes,
    edges: trunkBasedEdges,
    positions: trunkBasedPositions,
    selectedNodeId: 'tb-ci',
  },
  {
    id: 'gitlab-flow',
    label: 'GitLab Flow',
    description: 'main 逐级推进 staging 和 production，适合环境分支发布。',
    branches: gitlabFlowBranches,
    nodes: gitlabFlowNodes,
    edges: gitlabFlowEdges,
    positions: gitlabFlowPositions,
    selectedNodeId: 'gl-staging',
  },
  {
    id: 'release-train',
    label: 'Release Train',
    description: '固定发车窗口收拢变更，发车后稳定化并按节奏上线。',
    branches: releaseTrainBranches,
    nodes: releaseTrainNodes,
    edges: releaseTrainEdges,
    positions: releaseTrainPositions,
    selectedNodeId: 'rt-departure',
  },
  {
    id: 'feature-branch',
    label: 'Feature Branch',
    description: '每个功能独立短期分支，经 PR/MR 检查后合入主线。',
    branches: featureBranchBranches,
    nodes: featureBranchNodes,
    edges: featureBranchEdges,
    positions: featureBranchPositions,
    selectedNodeId: 'fb-review',
  },
  {
    id: 'forking',
    label: 'Forking',
    description: '贡献者 fork 开发，维护者通过 upstream PR 控制合入。',
    branches: forkingBranches,
    nodes: forkingNodes,
    edges: forkingEdges,
    positions: forkingPositions,
    selectedNodeId: 'fk-review',
  },
  {
    id: 'one-flow',
    label: 'OneFlow',
    description: '单一长期 main，release 分支只在发布稳定化期间存在。',
    branches: oneFlowBranches,
    nodes: oneFlowNodes,
    edges: oneFlowEdges,
    positions: oneFlowPositions,
    selectedNodeId: 'of-release',
  },
  {
    id: 'gitops',
    label: 'GitOps',
    description: '应用仓库产出版本，环境仓库声明部署状态并自动同步。',
    branches: gitOpsBranches,
    nodes: gitOpsNodes,
    edges: gitOpsEdges,
    positions: gitOpsPositions,
    selectedNodeId: 'go-env-pr',
  },
]

export const branchById = new Map(branches.map((branch) => [branch.id, branch]))

export const edgeKinds: EdgeKind[] = ['merge', 'sync', 'candidate', 'hotfix']
export const nodeKinds: NodeKind[] = ['commit', 'gate', 'tag', 'hotfix']

export const edgeClass: Record<EdgeKind, string> = {
  merge: 'stroke-[#4f46c8] [stroke-width:3]',
  sync: 'stroke-[#1769aa] [stroke-width:3] [stroke-dasharray:10_8]',
  hotfix: 'stroke-[#a33a16] [stroke-width:3.5]',
  candidate: 'stroke-[#8c8a82] [stroke-width:3] [stroke-dasharray:7_7]',
}

export const markerFill: Record<EdgeKind, string> = {
  merge: '#4f46c8',
  sync: '#1769aa',
  hotfix: '#a33a16',
  candidate: '#8c8a82',
}

export const nodeKindClass: Record<NodeKind, string> = {
  commit: 'h-[42px] w-[42px] border-transparent bg-transparent p-0 text-transparent',
  gate: 'min-h-[42px] min-w-[150px] bg-[#edf6ff] px-3 py-2 text-[#0e4c8a]',
  tag: 'min-h-[42px] min-w-[92px] bg-[#e8f7f2] px-3 py-2 text-[#08705f]',
  hotfix: 'min-h-[42px] min-w-[228px] bg-[#fff0ea] px-3 py-2 text-[#a33a16]',
}

export const fieldClass =
  'min-h-9 w-full rounded-md border border-border bg-surface px-2.5 py-2 text-sm text-text outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-[rgba(22,124,128,0.32)]'

export const labelClass = 'grid gap-1.5 text-xs font-extrabold text-muted'
