import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";

export async function markdownToHtml(markdown: string) {
  const result = await unified().use(remarkParse).use(remarkGfm).use(remarkHtml).process(markdown);
  return result.toString();
}
