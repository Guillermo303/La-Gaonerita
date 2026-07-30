export default function StepIndicator({ steps, current }) {
  const many = steps.length > 5;

  return (
    <div className="bg-white border-b border-ink-900/5">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => {
            const status = step.num < current ? 'done' : step.num === current ? 'current' : 'pending';
            return (
              <div key={step.num} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`
                    rounded-full flex items-center justify-center font-bold transition-all
                    ${many ? 'w-6 h-6 text-[10px]' : 'w-9 h-9 text-sm'}
                    ${status === 'done' ? 'bg-brand-500 text-white' : ''}
                    ${status === 'current' ? 'bg-brand-500 text-white ring-4 ring-brand-100 scale-110' : ''}
                    ${status === 'pending' ? 'bg-cream-100 text-ink-400' : ''}
                  `}>
                    {status === 'done' ? (
                      <svg className={many ? 'w-3 h-3' : 'w-4 h-4'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : step.num}
                  </div>
                  <span className={`
                    font-semibold mt-0.5 whitespace-nowrap
                    ${many ? 'text-[8px] sm:text-[10px]' : 'text-xs'}
                    ${status === 'done' ? 'text-brand-500' : ''}
                    ${status === 'current' ? 'text-ink-800' : ''}
                    ${status === 'pending' ? 'text-ink-300' : ''}
                  `}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`
                    h-0.5 mx-0.5 sm:mx-1
                    ${many ? 'w-2 sm:w-5' : 'w-10 sm:w-16'}
                    ${status === 'done' ? 'bg-brand-300' : 'bg-cream-200'}
                  `} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
