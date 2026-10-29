// Route tests replace transport/storage; quota and caching have their own integration tests.
export function leagueServices(fetch) {
  if (!fetch) return {};
  const documents = new Map();
  return {
    "@/lib/leagueSnapshot": { fetchSavedGames: (url) => fetch(url) },
    "@/lib/documentStorage": {
      readDocument: async (name, empty) => documents.get(name) ?? empty,
      updateDocument: async (name, empty, update) => {
        const value = update(documents.get(name) ?? empty);
        documents.set(name, value);
        return value;
      },
    },
  };
}
