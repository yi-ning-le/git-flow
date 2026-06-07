type AppHeaderProps = {
  onReset: () => void
}

export function AppHeader({ onReset }: AppHeaderProps) {
  return (
    <header className="mx-auto mb-5 flex w-full max-w-[1540px] shrink-0 flex-col items-stretch gap-6 lg:flex-row lg:items-end lg:justify-between xl:mb-4">
      <div>
        <p className="mb-2 text-[13px] font-extrabold uppercase text-muted">
          Interactive GitHub branch workflow
        </p>
        <h1 className="m-0 text-[28px] font-[760] leading-[1.12] text-text md:text-[34px]">
          可编辑 Git Workflow 时间线
        </h1>
      </div>
      <button
        className="min-h-[42px] rounded-workbench border border-border bg-surface px-4 font-extrabold text-text"
        onClick={onReset}
        type="button"
      >
        重置布局
      </button>
    </header>
  )
}
