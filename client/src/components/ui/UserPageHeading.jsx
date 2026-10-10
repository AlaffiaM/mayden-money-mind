export default function UserPageHeading({ title, subtitle, action }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4 border-b border-gray-200/80 pb-5">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.035em] text-mayden-dark sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-gray-500">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
