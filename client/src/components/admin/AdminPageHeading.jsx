export default function AdminPageHeading({ title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200/80 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.035em] text-mayden-dark lg:text-[1.8rem]">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
