import * as vscode from "vscode";
import { ClassDeclarations } from "./types";
import { getConfig, getIndentation } from "./config";
import { parseDocument, getConstructorDocblock, getConstructorLine } from "./parser";
import {
  buildNewConstructorSnippet,
  buildPropertyDeclarationSnippet,
  escapeSnippetDollars,
} from "./snippetBuilder";

export async function insertConstructorProperty(): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const declarations = await parseDocument(editor.document.uri);

  if (declarations.classLineNumber === null) {
    return;
  }

  if (declarations.constructorLineNumber === null) {
    insertNewConstructor(editor, declarations);
  } else {
    insertIntoExistingConstructor(editor, declarations);
  }
}

function insertNewConstructor(
  editor: vscode.TextEditor,
  declarations: ClassDeclarations,
): void {
  const config = getConfig();
  const indent = getIndentation(editor);
  const indent2 = getIndentation(editor, 2);

  const insertLineNumber = getInsertLineNumber(declarations);
  const insertLine = editor.document.lineAt(insertLineNumber);

  editor.revealRange(insertLine.range);
  editor.selection = new vscode.Selection(
    new vscode.Position(insertLineNumber, 0),
    new vscode.Position(insertLineNumber, 0),
  );

  let snippet = buildNewConstructorSnippet(config, indent, indent2);

  const nextLine = editor.document.lineAt(insertLine.lineNumber + 1);

  if (insertLine.text.endsWith("}") || (insertLine.text === "" && !nextLine.text.endsWith("}"))) {
    snippet += "\n";
  }

  if (insertLine.text !== "" && !insertLine.text.endsWith("}")) {
    snippet += "\n\n";
  }

  editor.insertSnippet(new vscode.SnippetString(snippet));
}

function insertIntoExistingConstructor(
  editor: vscode.TextEditor,
  declarations: ClassDeclarations,
): void {
  const config = getConfig();
  const indent = getIndentation(editor);
  const indent2 = getIndentation(editor, 2);

  const insertLineNumber = getInsertLineNumber(declarations);
  const insertLine = editor.document.lineAt(insertLineNumber);

  editor.revealRange(insertLine.range);
  editor.selection = new vscode.Selection(
    new vscode.Position(insertLineNumber, 0),
    new vscode.Position(insertLineNumber, 0),
  );

  let snippet = buildPropertyDeclarationSnippet(config, indent);

  let constructorStartLineNumber = declarations.constructorRange!.start.line;
  let constructorLineText = editor.document.getText(declarations.constructorRange!);

  if (constructorLineText.endsWith("/**")) {
    snippet += getConstructorDocblock(editor.document, declarations.constructorRange!);

    const ctorLine = getConstructorLine(editor.document, declarations.constructorRange!);
    if (ctorLine) {
      constructorStartLineNumber = ctorLine.line;
      constructorLineText = ctorLine.textLine;
    }
  }

  const constructorParts = constructorLineText.split(/\((.*?)\)/);
  snippet += `${constructorParts[0]}(`;

  const previousArgs = escapeSnippetDollars(constructorParts[1] || "");

  if (previousArgs.length !== 0) {
    snippet += `${previousArgs}, `;
  }

  snippet += "\\$${1:property})";

  let constructorClosingLine: vscode.TextLine | null = null;

  for (let line = constructorStartLineNumber; line < declarations.constructorClosingLineNumber!; line++) {
    const propertyAssignment = editor.document.lineAt(line + 1);
    constructorClosingLine = propertyAssignment;
    snippet += "\n" + escapeSnippetDollars(propertyAssignment.text);
  }

  if (!constructorClosingLine) {
    return;
  }

  snippet = snippet.slice(0, -1);
  snippet += `${indent2}\\$this->\${1:property} = \\$\${1:property};$0`;
  snippet += `\n${indent}}`;

  const nextLineText = editor.document.lineAt(constructorClosingLine.lineNumber + 1).text;
  if (nextLineText !== "" && !nextLineText.endsWith("}")) {
    snippet += "\n";
  }

  const start = new vscode.Position(
    declarations.constructorRange!.start.line,
    declarations.constructorRange!.start.character,
  );
  const end = new vscode.Position(
    constructorClosingLine.range.end.line,
    constructorClosingLine.range.end.character,
  );

  editor.insertSnippet(new vscode.SnippetString(snippet), new vscode.Range(start, end));
}

function getInsertLineNumber(declarations: ClassDeclarations): number {
  const lineNumber =
    declarations.lastPropertyLineNumber ??
    declarations.traitUseLineNumber ??
    declarations.classLineNumber!;

  return lineNumber + 1;
}
