const TEAM_TO_COUNTRY_CODE: Record<string, string> = {
  Algeria: "DZ", Argentina: "AR", Australia: "AU", Austria: "AT", Belgium: "BE",
  "Bosnia and Herzegovina": "BA", Brazil: "BR", "Cabo Verde": "CV", "Cape Verde": "CV",
  Cameroon: "CM", Canada: "CA", Chile: "CL", Colombia: "CO", "Costa Rica": "CR",
  "Côte d'Ivoire": "CI", "Ivory Coast": "CI", Croatia: "HR", Curaçao: "CW",
  "Czech Republic": "CZ", Denmark: "DK", "DR Congo": "CD", Ecuador: "EC",
  Egypt: "EG", England: "GB-ENG", France: "FR", Germany: "DE", Ghana: "GH",
  Haiti: "HT", Iran: "IR", "IR Iran": "IR", Iraq: "IQ", Italy: "IT", Japan: "JP",
  Jordan: "JO", "Korea Republic": "KR", "South Korea": "KR", Mexico: "MX",
  Morocco: "MA", Netherlands: "NL", "New Zealand": "NZ", Nigeria: "NG", Norway: "NO",
  Panama: "PA", Paraguay: "PY", Peru: "PE", Poland: "PL", Portugal: "PT", Qatar: "QA",
  "Saudi Arabia": "SA", Scotland: "GB-SCT", Senegal: "SN", Serbia: "RS", Slovakia: "SK",
  Slovenia: "SI", "South Africa": "ZA", Spain: "ES", Sweden: "SE", Switzerland: "CH",
  Tunisia: "TN", Turkey: "TR", Türkiye: "TR", Ukraine: "UA", Uruguay: "UY",
  USA: "US", "United States": "US", "United States of America": "US", Uzbekistan: "UZ",
  Wales: "GB-WLS",
};

const SUBDIVISION_FLAGS: Record<string, string> = {
  "GB-ENG": "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  "GB-SCT": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "GB-WLS": "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
};

export function countryCodeForTeam(teamName: string | null | undefined) {
  if (!teamName) return null;
  return TEAM_TO_COUNTRY_CODE[teamName.trim()] ?? null;
}

export function flagEmojiForCountryCode(countryCode: string | null | undefined) {
  if (!countryCode) return "🏳️";
  if (SUBDIVISION_FLAGS[countryCode]) return SUBDIVISION_FLAGS[countryCode];
  const code = countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(code)) return "🏳️";
  return [...code].map((char) => String.fromCodePoint(127397 + char.charCodeAt(0))).join("");
}

export function flagForTeam(teamName: string | null | undefined) {
  return flagEmojiForCountryCode(countryCodeForTeam(teamName));
}

export function teamWithFlag(teamName: string | null | undefined) {
  if (!teamName) return "TBD";
  return `${flagForTeam(teamName)} ${teamName}`;
}

export function formatMatchWithFlags(match: string | null | undefined) {
  if (!match) return "TBD";
  const separator = match.includes(" vs ") ? " vs " : match.includes(" v ") ? " v " : null;
  if (!separator) return match;
  const [home, away] = match.split(separator);
  if (!home || !away) return match;
  return `${teamWithFlag(home)}${separator}${teamWithFlag(away)}`;
}
