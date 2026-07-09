import { Nav } from "../../components/Nav";
import { TournamentBracket } from "../../components/TournamentBracket";
import { getWorldCupBracket } from "../../lib/worldCupBracketFeed";

export const revalidate = 3600;

export default async function BracketPage() {
  const data = await getWorldCupBracket();
  return <main><Nav /><TournamentBracket data={data} /></main>;
}
