interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="px-8 py-5 border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-40"
      style={{ background: 'rgba(8,12,24,0.85)', backdropFilter: 'blur(20px) saturate(180%)' }}
    >
      <div>
        <h2 className="text-[21px] font-bold tracking-tight text-white leading-tight">{title}</h2>
        {subtitle && (
          <div className="text-[12.5px] text-slate-400 mt-0.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/70 inline-block" />
            {subtitle}
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2.5">{children}</div>
      )}
    </div>
  );
}
