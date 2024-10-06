import { standings } from "../../../../mock-data/tab-content";
import {
  StyledStandingsTab,
  Table,
  TableRow,
  TableHeader,
} from "./StandingsTab.styles";

export const StandingsTab = () => {
  return (
    <StyledStandingsTab>
      <h3>NBA Standings</h3>
      <Table>
        <thead>
          <tr>
            <TableHeader>Team</TableHeader>
            <TableHeader>Wins</TableHeader>
            <TableHeader>Losses</TableHeader>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <TableRow key={team.team}>
              <td>{team.team}</td>
              <td>{team.wins}</td>
              <td>{team.losses}</td>
            </TableRow>
          ))}
        </tbody>
      </Table>
    </StyledStandingsTab>
  );
};
