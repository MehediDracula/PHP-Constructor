import * as vscode from "vscode";
import { ClassDeclarations, ConstructorLineInfo } from "./types";

const PATTERNS = {
  classOrTrait: /^(final |abstract )?(class|trait) \w/,
  traitUse: /use .+?;/,
  property: /(public|protected|private|static) \$/,
  constant: /const \w+\s+?=/,
  constructor: /function __construct/,
  closingBrace: /[ \t].+}/,
};

export async function parseDocument(documentUri: vscode.Uri): Promise<ClassDeclarations> {
  const declarations: ClassDeclarations = {
    classLineNumber: null,
    traitUseLineNumber: null,
    lastPropertyLineNumber: null,
    constructorLineNumber: null,
    constructorRange: null,
    constructorClosingLineNumber: null,
  };

  const doc = await vscode.workspace.openTextDocument(documentUri);

  for (let line = 0; line < doc.lineCount; line++) {
    const textLine = doc.lineAt(line).text;

    if (declarations.classLineNumber === null && PATTERNS.classOrTrait.test(textLine)) {
      declarations.classLineNumber = textLine.endsWith("{") ? line : line + 1;
    }

    if (declarations.classLineNumber !== null && PATTERNS.traitUse.test(textLine)) {
      declarations.traitUseLineNumber = line;
    }

    if (PATTERNS.property.test(textLine) || PATTERNS.constant.test(textLine)) {
      declarations.lastPropertyLineNumber = findPropertyLastLine(doc, line);
    }

    if (PATTERNS.constructor.test(textLine)) {
      declarations.constructorLineNumber = line;
      declarations.constructorRange = findConstructorRange(doc, line);
    }

    if (declarations.constructorLineNumber !== null && PATTERNS.closingBrace.test(textLine)) {
      declarations.constructorClosingLineNumber = line;
      break;
    }
  }

  return declarations;
}

function findPropertyLastLine(doc: vscode.TextDocument, startLine: number): number {
  for (let line = startLine; line < doc.lineCount; line++) {
    if (doc.lineAt(line).text.endsWith(";")) {
      return line;
    }
  }
  return startLine;
}

function findConstructorRange(doc: vscode.TextDocument, constructorLine: number): vscode.Range {
  if (constructorLine > 0 && doc.lineAt(constructorLine - 1).text.trimEnd().endsWith("*/")) {
    for (let line = constructorLine - 1; line >= 0; line--) {
      if (doc.lineAt(line).text.trimStart().startsWith("/**")) {
        return doc.lineAt(line).range;
      }
    }
  }

  return doc.lineAt(constructorLine).range;
}

export function getConstructorDocblock(doc: vscode.TextDocument, range: vscode.Range): string {
  let docblock = "";

  for (let line = range.start.line; line < doc.lineCount; line++) {
    const textLine = doc.lineAt(line).text;

    if (PATTERNS.constructor.test(textLine)) {
      break;
    }

    docblock += textLine + "\n";
  }

  return docblock.replace(/\$/g, "\\$");
}

export function getConstructorLine(
  doc: vscode.TextDocument,
  range: vscode.Range,
): ConstructorLineInfo | null {
  for (let line = range.start.line; line < doc.lineCount; line++) {
    const textLine = doc.lineAt(line).text;

    if (PATTERNS.constructor.test(textLine)) {
      return { line, textLine };
    }
  }

  return null;
}
