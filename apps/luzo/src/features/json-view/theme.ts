import type { ThemeRegistration } from "shiki";

export interface JsonPalette {
  background: string;
  foreground: string;
  border: string;
  gutter: string;
  gutterActive: string;
  lineHover: string;
  search: string;
  searchActive: string;
  string: string;
  key: string;
  number: string;
  boolean: string;
  null: string;
  punctuation: string;
}

export const lightJsonPalette: JsonPalette = {
  background: "#f7f9fc",
  foreground: "#172033",
  border: "#d7dfeb",
  gutter: "#64748b",
  gutterActive: "#0f172a",
  lineHover: "#eef4ff",
  search: "#f6d365",
  searchActive: "#f2b84b",
  string: "#9a3412",
  key: "#0f766e",
  number: "#1d4ed8",
  boolean: "#7c3aed",
  null: "#c2410c",
  punctuation: "#475569",
};

export const darkJsonPalette: JsonPalette = {
  background: "#0f172a",
  foreground: "#cccccc",
  border: "#1f2b45",
  gutter: "#7f8da3",
  gutterActive: "#f8fafc",
  lineHover: "#13203a",
  search: "#7c5c14",
  searchActive: "#b7831d",
  string: "#ce9178",
  key: "#9cdcfe",
  number: "#b5cea8",
  boolean: "#569cd6",
  null: "#569cd6",
  punctuation: "#d4d4d4",
};

export function createJsonTheme(
  name: string,
  type: "light" | "dark",
  palette: JsonPalette,
): ThemeRegistration {
  return {
    name,
    type,
    colors: {
      "editor.background": palette.background,
      "editor.foreground": palette.foreground,
    },
    settings: [
      { settings: { foreground: palette.foreground } },
      { scope: ["support.type.property-name.json"], settings: { foreground: palette.key } },
      { scope: ["string.quoted.double.json"], settings: { foreground: palette.string } },
      { scope: ["constant.numeric.json"], settings: { foreground: palette.number } },
      { scope: ["constant.language.json"], settings: { foreground: palette.boolean } },
      { scope: ["keyword.other.null.json"], settings: { foreground: palette.null } },
      {
        scope: [
          "punctuation",
          "punctuation.definition.string.begin.json",
          "punctuation.definition.string.end.json",
          "punctuation.separator.key-value.json",
          "punctuation.separator.array.json",
          "punctuation.separator.dictionary.json",
        ],
        settings: { foreground: palette.punctuation },
      },
    ],
  };
}

export const lightJsonTheme = createJsonTheme("luzo-playground-light", "light", lightJsonPalette);
export const darkJsonTheme = createJsonTheme("luzo-playground-dark", "dark", darkJsonPalette);
