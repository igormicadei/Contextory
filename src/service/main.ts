import { startService } from "./server";
const [root, storage, workerPath, embeddingDirectory] = process.argv.slice(2);
if (!root || !storage || !workerPath || !embeddingDirectory)
  throw new Error(
    "Usage: service <absolute workspace> <storage> <worker> <embeddings>",
  );
const service = await startService({
  root,
  storage,
  workerPath,
  embeddingDirectory,
});
process.stdout.write(JSON.stringify({ ready: true }) + "\n");
process.on("SIGTERM", () => {
  void service.close();
});
process.on("SIGINT", () => {
  void service.close();
});
