// Route tests replace transport/storage; quota and caching have their own integration tests.
export function leagueServices(fetch) {
  if (!fetch) return {};
  const documents = new Map();
  return {
    "@/lib/ballDontLie": { fetchBallDontLie: (url) => fetch(url) },
    "@/lib/digestStorage": {
      readDigestDocument: async (name, empty) => documents.get(name) ?? empty,
      updateDigestDocument: async (name, empty, update) => {
        const value = update(documents.get(name) ?? empty);
        documents.set(name, value);
        return value;
      },
    },
  };
}
export async function publishStandings(route) {
  const response = await route.POST({ headers: new Headers({ authorization: "Bearer fixture-publisher" }) });
  if (response.status && response.status !== 200) throw new Error(`Fixture publication failed (${response.status})`);
}
