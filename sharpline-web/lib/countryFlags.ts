export const TEAM_TO_COUNTRY_CODE: Record<string, string> = {
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

export function countryCodeForTeam(teamName: string | null | undefined) {
  if (!teamName) return null;
  return TEAM_TO_COUNTRY_CODE[teamName.trim()] ?? null;
}
