import "server-only";

/**
 * Generates the base HTML shell for the PDF report, including styles and Tailwind configuration.
 * By extracting this large template string, we adhere to the 250-line rule for the core service.
 */
export function getHtmlShell(componentOutput: string, theme: "light" | "dark" = "light"): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">

<script src="https://cdn.tailwindcss.com"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">

<style>
:root {
  ${
    theme === "dark"
      ? `
    --background: #09090b;
    --foreground: #fafafa;
    --border: #27272a;
    --muted: #18181b;
    --muted-foreground: #a1a1aa;
  `
      : `
    --background: #ffffff;
    --foreground: #09090b;
    --border: #e4e4e7;
    --muted: #f4f4f5;
    --muted-foreground: #71717a;
  `
  }
}

* { box-sizing: border-box; }

/* A4 base */
html, body {
  margin: 0; padding: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  line-height: 1.6;
}

body { padding: 32px 28px !important; }

.pdf-root { width: 100%; }

/* Typography */
body { letter-spacing: 0.01em !important; }

h1 { font-size: 28px; font-weight: 900; letter-spacing: -0.01em; line-height: 1.15; margin-bottom: 24px; color: #111111; }
h2 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #737373; margin-bottom: 16px; }

/* 🔥 pagination fix */
header, section, div {
  break-inside: auto !important;
  page-break-inside: auto !important;
}

.break-inside-avoid, .break-inside-avoid-page {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
  -webkit-column-break-inside: avoid !important;
}

/* Sections */
section {
  margin-bottom: 32px !important;
  padding-bottom: 24px !important;
  border-bottom: 1px solid #f5f5f5 !important;
}
section:last-of-type { border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }

/* Metrics Grid */
.grid-cols-4 {
  display: grid !important;
  grid-template-cols: repeat(4, 1fr) !important;
  border: 1px solid #e5e5e5 !important;
  overflow: hidden !important;
  background: #fafafa !important;
}
.grid-cols-4 > div { border-right: 1px solid #e5e5e5 !important; }
.grid-cols-4 > div:last-child { border-right: none !important; }

/* Stats */
.stat-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #a3a3a3; margin-bottom: 2px; }
.stat-value { font-size: 20px; font-weight: 900; color: #111111; letter-spacing: -0.02em; }

/* Cards */
.rounded-xl { 
  border: 1px solid #f5f5f5;
  background: #ffffff;
}

/* Markdown */
.markdown-content { font-size: 13px !important; line-height: 1.7 !important; color: #404040 !important; font-weight: 500 !important; }
.markdown-content p { margin: 0 0 16px 0 !important; }
.markdown-content ul { padding-left: 20px; margin-bottom: 16px; list-style: none; }
.markdown-content li { margin-bottom: 10px; position: relative; break-inside: avoid !important; }
.markdown-content p, .markdown-content blockquote, .markdown-content pre, .markdown-content img { break-inside: avoid !important; page-break-inside: avoid !important; }
.markdown-content li::before { 
  content: "•"; position: absolute; left: -18px; color: #a3a3a3; font-weight: 800; font-size: 16px; top: -2px;
}

table, tbody, thead, tr, td, th, div, p, span { max-width: 100%; }

table {
  width: 100% !important;
  table-layout: fixed !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
  break-inside: auto !important;
}

thead, tbody, tfoot, tr, td, th {
  break-inside: avoid !important;
  page-break-inside: avoid !important;
}

th, td {
  white-space: normal !important;
  overflow-wrap: anywhere !important;
  word-break: break-word !important;
  vertical-align: top !important;
}

.markdown-content table {
  width: 100% !important;
  table-layout: fixed !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

.markdown-content th,
.markdown-content td {
  padding: 6px 8px !important;
  border: 1px solid #e5e5e5 !important;
}

@page { size: A4; margin: 10mm; }
</style>

<script>
tailwind.config = {
  theme: {
    extend: {
      colors: {
        border: "var(--border)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        muted: { DEFAULT: "var(--muted)", foreground: "var(--muted-foreground)" }
      }
    }
  }
}
</script>

</head>
<body class="${theme}">
  ${componentOutput}
</body>
</html>
`;
}
