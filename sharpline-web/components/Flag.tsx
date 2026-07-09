import { countryCodeForTeam } from "../lib/countryFlags";
import { FLAG_COMPONENTS } from "./flags";

type FlagProps = {
  teamName: string | null | undefined;
  className?: string;
  title?: string;
};

export function Flag({ teamName, className = "h-[18px] w-6 shrink-0 rounded-[2px]", title }: FlagProps) {
  const countryCode = countryCodeForTeam(teamName);
  const FlagComponent = countryCode && countryCode in FLAG_COMPONENTS ? FLAG_COMPONENTS[countryCode as keyof typeof FLAG_COMPONENTS] : null;

  if (!FlagComponent) {
    return (
      <span
        aria-label={title ?? (teamName ? `${teamName} flag unavailable` : "Flag unavailable")}
        className={`inline-block border border-border bg-text-muted/40 ${className}`}
        role="img"
      />
    );
  }

  return <FlagComponent aria-label={title ?? `${teamName} flag`} className={className} />;
}

export function TeamWithFlag({ teamName, className }: { teamName: string | null | undefined; className?: string }) {
  if (!teamName) return <span className={className}>TBD</span>;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 align-middle ${className ?? ""}`}>
      <Flag teamName={teamName} />
      <span className="truncate">{teamName}</span>
    </span>
  );
}

export function MatchWithFlags({ match }: { match: string | null | undefined }) {
  if (!match) return <>TBD</>;
  const separator = match.includes(" vs ") ? " vs " : match.includes(" v ") ? " v " : null;
  if (!separator) return <>{match}</>;
  const [home, away] = match.split(separator);
  if (!home || !away) return <>{match}</>;
  return <><TeamWithFlag teamName={home} />{separator}<TeamWithFlag teamName={away} /></>;
}
