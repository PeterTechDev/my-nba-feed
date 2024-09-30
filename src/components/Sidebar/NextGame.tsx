import { format } from "date-fns";
import { NextGameProps } from "../../mock-data/types";

export function NextGame({ date, opponent, location }: NextGameProps) {
  const formattedDate = format(new Date(date), "MMMM do, yyyy, h:mm a");

  return (
    <div>
      <h3>Next game</h3>
      <p>{formattedDate}</p>
      <p>vs {opponent}</p>
      <p>at {location}</p>
    </div>
  );
}
