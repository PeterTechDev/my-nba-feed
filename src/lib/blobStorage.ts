import { BlobNotFoundError, BlobPreconditionFailedError, get, head, put } from "@vercel/blob";

async function readDocument<T>(name: string, empty: T, forUpdate = false): Promise<{ value: T; etag?: string }> {
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) throw new Error("Blob storage is not configured");
  // Read the storage validator before the body; delivery HTTP ETags can differ.
  const metadata = forUpdate ? await head(name).catch((error) => {
    if (error instanceof BlobNotFoundError) return null;
    throw error;
  }) : null;
  const result = await get(name, { access: "private", useCache: false });
  if (!result) return { value: empty };
  if (result.statusCode !== 200) throw new Error("Blob storage could not be read");
  return { value: await new Response(result.stream).json() as T, etag: forUpdate ? metadata?.etag : result.blob.etag };
}

export async function readBlobDocument<T>(name: string, empty: T): Promise<T> {
  return (await readDocument(name, empty)).value;
}

export async function updateBlobDocument<T>(name: string, empty: T, update: (value: T) => T): Promise<T> {
  // Conditional writes prevent simultaneous publications from overwriting each other.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await readDocument(name, empty, true);
    const value = update(current.value);
    try {
      await put(name, JSON.stringify(value), {
        access: "private", addRandomSuffix: false, contentType: "application/json", cacheControlMaxAge: 60,
        ...(current.etag ? { ifMatch: current.etag } : { allowOverwrite: false }),
      });
      return value;
    } catch (error) {
      if (error instanceof BlobPreconditionFailedError) continue;
      if (!current.etag && (await readDocument(name, empty)).etag) continue;
      throw error;
    }
  }
  throw new Error("Blob storage changed concurrently. Please retry.");
}
