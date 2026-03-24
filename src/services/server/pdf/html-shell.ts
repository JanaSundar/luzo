import "server-only";

const PDF_STYLES = `
:root {
  --background-light: #ffffff;
  --foreground-light: #09090b;
  --border-light: #e4e4e7;
  --muted-light: #f4f4f5;
  --muted-foreground-light: #71717a;
  --background-dark: #09090b;
  --foreground-dark: #fafafa;
  --border-dark: #27272a;
  --muted-dark: #18181b;
  --muted-foreground-dark: #a1a1aa;
}

body.light {
  --background: var(--background-light);
  --foreground: var(--foreground-light);
  --border: var(--border-light);
  --muted: var(--muted-light);
  --muted-foreground: var(--muted-foreground-light);
}

body.dark {
  --background: var(--background-dark);
  --foreground: var(--foreground-dark);
  --border: var(--border-dark);
  --muted: var(--muted-dark);
  --muted-foreground: var(--muted-foreground-dark);
}

* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  background: var(--background);
  color: var(--foreground);
  font-family: Inter, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
}
body { padding: 32px 28px !important; }
h1 { margin: 0; font-size: 28px; font-weight: 600; line-height: 1.15; letter-spacing: -0.02em; }
h2 { margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.08em; }
p { margin: 0; }
header, section, div, ul, li, table, tr, td, th { break-inside: auto !important; page-break-inside: auto !important; }
.pdf-root { width: 100%; }
.w-full { width: 100%; }
.space-y-6 > * + * { margin-top: 24px; }
.space-y-5 > * + * { margin-top: 20px; }
.space-y-4 > * + * { margin-top: 16px; }
.space-y-3 > * + * { margin-top: 12px; }
.space-y-2 { display: flex; flex-direction: column; gap: 8px; }
.mb-10 { margin-bottom: 40px; }
.mb-8 { margin-bottom: 32px; }
.mb-6 { margin-bottom: 24px; }
.mb-5 { margin-bottom: 20px; }
.mb-3 { margin-bottom: 12px; }
.mt-10 { margin-top: 40px; }
.mt-5 { margin-top: 20px; }
.mt-2 { margin-top: 8px; }
.mt-1 { margin-top: 4px; }
.px-0 { padding-left: 0; padding-right: 0; }
.px-1 { padding-left: 4px; padding-right: 4px; }
.px-3 { padding-left: 12px; padding-right: 12px; }
.px-4 { padding-left: 16px; padding-right: 16px; }
.px-5 { padding-left: 20px; padding-right: 20px; }
.py-0 { padding-top: 0; padding-bottom: 0; }
.py-2 { padding-top: 8px; padding-bottom: 8px; }
.py-3 { padding-top: 12px; padding-bottom: 12px; }
.py-4 { padding-top: 16px; padding-bottom: 16px; }
.py-5 { padding-top: 20px; padding-bottom: 20px; }
.pt-4 { padding-top: 16px; }
.pb-6 { padding-bottom: 24px; }
.text-foreground, .text-foreground\\/80, .text-foreground\\/75, .text-foreground\\/70 { color: var(--foreground); }
.text-muted-foreground, .text-muted-foreground\\/40 { color: var(--muted-foreground); }
.bg-background, .bg-background\\/75, .bg-background\\/80, .bg-background\\/90 { background: var(--background); }
.bg-muted\\/5, .bg-muted\\/10, .bg-muted\\/15, .bg-muted\\/20 { background: color-mix(in srgb, var(--muted) 60%, transparent); }
.border, .border-b, .border-t, .border-r { border-color: var(--border); border-style: solid; }
.border { border-width: 1px; }
.border-b { border-bottom-width: 1px; }
.border-t { border-top-width: 1px; }
.border-r { border-right-width: 1px; }
.rounded-xl, .rounded-2xl, .rounded-\\[1\\.5rem\\], .rounded-\\[1\\.35rem\\], .rounded-\\[2rem\\] { border-radius: 16px; }
.overflow-hidden { overflow: hidden; }
.break-inside-avoid, .break-inside-avoid-page { break-inside: avoid !important; page-break-inside: avoid !important; }
.flex { display: flex; }
.grid { display: grid; }
.grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.grid-cols-\\[minmax\\(0\\,2\\.6fr\\)_0\\.7fr_0\\.8fr_0\\.9fr\\] { grid-template-columns: minmax(0, 2.6fr) 0.7fr 0.8fr 0.9fr; }
.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }
.gap-4 { gap: 16px; }
.gap-2\\.5 { gap: 10px; }
.gap-2 { gap: 8px; }
.font-semibold { font-weight: 600; }
.font-bold, .font-black { font-weight: 700; }
.font-medium { font-weight: 500; }
.font-mono { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
.uppercase { text-transform: uppercase; }
.tracking-tight { letter-spacing: -0.02em; }
.tracking-widest { letter-spacing: 0.18em; }
.leading-tight { line-height: 1.2; }
.leading-none { line-height: 1; }
.tabular-nums { font-variant-numeric: tabular-nums; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.break-all { word-break: break-all; }
.whitespace-normal { white-space: normal; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.last\\:border-r-0:last-child { border-right-width: 0; }
.last\\:mb-0:last-child { margin-bottom: 0; }
.last\\:border-b-0:last-child { border-bottom-width: 0; }
.last\\:pb-0:last-child { padding-bottom: 0; }
.markdown-content { font-size: 13px; line-height: 1.7; color: #404040; font-weight: 500; }
.markdown-content p { margin: 0 0 16px; }
.markdown-content ul { margin: 0 0 16px; padding-left: 20px; }
.markdown-content li { margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; }
th, td { vertical-align: top; overflow-wrap: anywhere; }
footer { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-foreground); }
@page { size: A4; margin: 10mm; }
`;

export function getHtmlShell(componentOutput: string, theme: "light" | "dark" = "light"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>${PDF_STYLES}</style>
</head>
<body class="${theme}">
${componentOutput}
</body>
</html>`;
}
