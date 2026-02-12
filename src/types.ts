import * as vscode from "vscode";

export enum Visibility {
  Public = "public",
  Protected = "protected",
  Private = "private",
}

export const VISIBILITIES: readonly Visibility[] = [
  Visibility.Public,
  Visibility.Protected,
  Visibility.Private,
];

export interface ExtensionConfig {
  visibility: Visibility;
  constructorVisibility: Visibility;
  choosePropertyVisibility: boolean;
  chooseConstructorVisibility: boolean;
}

export interface ClassDeclarations {
  classLineNumber: number | null;
  traitUseLineNumber: number | null;
  lastPropertyLineNumber: number | null;
  constructorLineNumber: number | null;
  constructorRange: vscode.Range | null;
  constructorClosingLineNumber: number | null;
}

export interface ConstructorLineInfo {
  line: number;
  textLine: string;
}
