import { ToolDefinition, ToolContext, ToolResult } from "./types.js";

interface WebFetchInput {
  url: string;
}

export const webFetchTool: ToolDefinition<WebFetchInput> = {
  name: "web_fetch",
  description: "Fetch and extract text content from a URL. Useful for reading documentation or external references.",
  riskLevel: "low",
  isReadOnly: true,
  inputSchemaDescription: `{ "url": "The full HTTP/HTTPS URL to fetch." }`,
  async execute(input: WebFetchInput, _context: ToolContext): Promise<ToolResult> {
    if (!input.url) {
      return { ok: false, output: "Missing 'url' in input." };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const response = await fetch(input.url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        return { ok: false, output: `HTTP Error: ${response.status} ${response.statusText}` };
      }

      const contentType = response.headers.get("content-type") || "";
      let text = await response.text();

      // If HTML, strip tags
      if (contentType.includes("text/html")) {
        // Remove scripts and styles completely
        text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
        text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
        // Remove all other tags
        text = text.replace(/<[^>]+>/g, " ");
        // Collapse multiple whitespaces/newlines into a single space/newline
        text = text.replace(/[ \t]+/g, " ");
        text = text.replace(/\n\s*\n/g, "\n");
        text = text.trim();
      }

      // Truncate to save context
      if (text.length > 8000) {
        text = text.substring(0, 8000) + "\n... [TRUNCATED to 8000 chars]";
      }

      return { ok: true, output: text };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return { ok: false, output: "Fetch timed out after 10 seconds." };
      }
      return { ok: false, output: `Failed to fetch URL: ${err.message || String(err)}` };
    }
  }
};