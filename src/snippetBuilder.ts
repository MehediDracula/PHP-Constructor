import { ExtensionConfig, Visibility, VISIBILITIES } from "./types";

export function buildVisibilityChoice(defaultValue: Visibility): string {
  const others = VISIBILITIES.filter((v) => v !== defaultValue);
  return [defaultValue, ...others].join(",");
}

export function buildVisibilitySnippet(
  config: ExtensionConfig,
  placeholderIndex: number,
  kind: "property" | "constructor",
): string {
  const useChoice =
    kind === "property" ? config.choosePropertyVisibility : config.chooseConstructorVisibility;
  const defaultValue =
    kind === "property" ? config.visibility : config.constructorVisibility;

  if (useChoice) {
    return `\${${placeholderIndex}|${buildVisibilityChoice(defaultValue)}|}`;
  }

  return defaultValue;
}

export function buildNewConstructorSnippet(
  config: ExtensionConfig,
  indent: string,
  indent2: string,
): string {
  const propVisibility = buildVisibilitySnippet(config, 2, "property");
  const ctorVisibility = buildVisibilitySnippet(config, 3, "constructor");

  return (
    `${indent}${propVisibility} \\$\${1:property};\n` +
    `\n` +
    `${indent}${ctorVisibility} function __construct(\\$\${1:property})\n` +
    `${indent}{\n` +
    `${indent2}\\$this->\${1:property} = \\$\${1:property};$0\n` +
    `${indent}}`
  );
}

export function buildPropertyDeclarationSnippet(
  config: ExtensionConfig,
  indent: string,
): string {
  const propVisibility = buildVisibilitySnippet(config, 2, "property");
  return `${indent}${propVisibility} \\$\${1:property};\n\n`;
}

export function escapeSnippetDollars(text: string): string {
  return text.replace(/\$/g, "\\$");
}
