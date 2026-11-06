import { useEffect, useState } from "react";
import { Logo, Wordmark } from "./Logo";

/**
 * Single premium splash: magnetic logo assembly -> snap -> neon pulse ->
 * wordmark -> tagline. ~2s, transform/opacity only, reduced-motion safe.
 * App data loads in parallel; this never blocks initialization.
 */
export function Splash({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const timings = reduced ? [200, 400, 650] : [1350, 1650, 2000];
    const timers = timings.map((ms, i) => window.setTimeout(() => setStep(i + 1), ms));
    const done = window.setTimeout(onDone, reduced ? 750 : 2050);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background px-8">
      <Logo assembling className="h-32 w-32" />
      <div className="mt-10 h-9">
        {step >= 1 && <Wordmark className="anim-rise text-4xl" />}
      </div>
      <p className="mt-2 h-5 text-sm text-muted-foreground">
        {step >= 2 && <span className="anim-rise">Watch. Create. Vibe. Earn.</span>}
      </p>
    </div>
  );
}
