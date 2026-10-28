// Route tests replace transport/storage; quota and caching have their own integration tests.
export function leagueServices(fetch) {
  if (!fetch) return {};
  const documents = new Map();
  return {
    "@/lib/ballDontLie": { fetchBallDontLie: (url) => fetch(url) },
    "@/lib/blobStorage": {
      readBlobDocument: async (name, empty) => documents.get(name) ?? empty,
      updateBlobDocument: async (name, empty, update) => {
        const value = update(documents.get(name) ?? empty);
        documents.set(name, value);
        return value;
      },
    },
  };
}
