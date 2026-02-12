import * as vscode from "vscode";
import { ExtensionConfig, Visibility, VISIBILITIES } from "./types";

const SECTION = "phpConstructor";

function isVisibility(value: unknown): value is Visibility {
  return typeof value === "string" && VISIBILITIES.includes(value as Visibility);
}

export function getConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);

  const rawVisibility = cfg.get<string>("visibility");
  const rawConstructorVisibility = cfg.get<string>("constructorVisibility");

  return {
    visibility: isVisibility(rawVisibility) ? rawVisibility : Visibility.Protected,
    constructorVisibility: isVisibility(rawConstructorVisibility)
      ? rawConstructorVisibility
      : Visibility.Public,
    choosePropertyVisibility: cfg.get<boolean>("choosePropertyVisibility") ?? false,
    chooseConstructorVisibility: cfg.get<boolean>("chooseConstructorVisibility") ?? false,
  };
}

export function getIndentation(editor: vscode.TextEditor, level: number = 1): string {
  const resource = editor.document.uri;
  const editorCfg = vscode.workspace.getConfiguration("editor", resource);

  const insertSpaces = editorCfg.get<boolean>("insertSpaces", true);
  const tabSize = editorCfg.get<number>("tabSize", 4);

  const singleLevel = insertSpaces ? " ".repeat(tabSize) : "\t";
  return singleLevel.repeat(level);
}
