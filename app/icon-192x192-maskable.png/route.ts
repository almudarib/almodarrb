import { readFile } from "fs/promises";
import path from "path";

export async function GET() {
  const filePath = path.join(process.cwd(), "app", "logo (1).png");
  const data = await readFile(filePath);
  return new Response(data, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable"
    }
  });
}
