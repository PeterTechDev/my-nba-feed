"use client";

import { useTeam } from "@/hooks/useTeam";

export default function EndOfSession() {
  const { selectedTeam } = useTeam();

  return (
    <section aria-label="End of session" className="mt-2 border-t border-white/10 py-8 text-center">
      <p className="text-sm leading-6 text-white/80">
        You’re up to date with the {selectedTeam.name}. You can head out.
      </p>
    </section>
  );
}
