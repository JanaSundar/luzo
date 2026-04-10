/**
 * ANSI color codes for browser use (bypasses colorette's TTY check).
 * Compatible with ansi-to-react for rendering in React.
 */
const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
  italic: "\u001b[3m",
  underline: "\u001b[4m",
  // Foreground
  black: "\u001b[30m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  yellow: "\u001b[33m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",
  cyan: "\u001b[36m",
  white: "\u001b[37m",
  gray: "\u001b[90m",
} as const;

function ansiColor(code: string) {
  return (text: string | number) => `${code}${String(text)}${ANSI.reset}`;
}

export const browserColors = {
  black: ansiColor(ANSI.black),
  red: ansiColor(ANSI.red),
  green: ansiColor(ANSI.green),
  yellow: ansiColor(ANSI.yellow),
  blue: ansiColor(ANSI.blue),
  magenta: ansiColor(ANSI.magenta),
  cyan: ansiColor(ANSI.cyan),
  white: ansiColor(ANSI.white),
  gray: ansiColor(ANSI.gray),
};
