interface FunnelProgressProps {
  currentStep: 1 | 2 | 3 | 4 | 5;
}

const STEPS = [
  "Tell us about you",
  "Know your market",
  "Find your angle",
  "Make your ad image",
  "Write your ad copy",
] as const;

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5">
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function FunnelProgress({ currentStep }: FunnelProgressProps) {
  return (
    <div className="mb-6 w-full">
      <div className="flex items-start">
        {STEPS.map((label, index) => {
          const stepNumber = (index + 1) as FunnelProgressProps["currentStep"];
          const isCompleted = stepNumber < currentStep;
          const isActive = stepNumber === currentStep;
          const isUpcoming = stepNumber > currentStep;
          const connectorActive = stepNumber < currentStep;

          return (
            <div key={label} className="flex flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center text-center">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all md:h-9 md:w-9 md:text-sm"
                  style={{
                    background: isCompleted ? "#0866FF" : isActive ? "#D97706" : "#E4E6EB",
                    color: isUpcoming ? "#64748B" : "#FFFFFF",
                    boxShadow: isActive ? "0 0 18px rgba(217,119,6,0.45)" : "none",
                  }}
                >
                  {isCompleted ? <CheckIcon /> : stepNumber}
                </div>
                <span
                  className={`${isActive ? "block" : "hidden md:block"} mt-2 max-w-[80px] break-words text-xs font-semibold leading-tight md:max-w-none`}
                  style={{ color: isUpcoming ? "#64748B" : "#1C1E21" }}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="mt-3 hidden h-px flex-1 md:mt-4 md:block" style={{ background: connectorActive ? "#0866FF" : "#E4E6EB" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
