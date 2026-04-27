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
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all"
                  style={{
                    background: isCompleted ? "#2B7EC9" : isActive ? "#F5A623" : "#1E2D45",
                    color: isUpcoming ? "#475569" : "#FFFFFF",
                    boxShadow: isActive ? "0 0 18px rgba(245,166,35,0.45)" : "none",
                  }}
                >
                  {isCompleted ? <CheckIcon /> : stepNumber}
                </div>
                <span
                  className={`${isActive ? "block" : "hidden md:block"} mt-2 text-[10px] font-semibold leading-tight`}
                  style={{ color: isUpcoming ? "#475569" : "#FFFFFF" }}
                >
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className="mt-4 h-px flex-1" style={{ background: connectorActive ? "#2B7EC9" : "#1E2D45" }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
