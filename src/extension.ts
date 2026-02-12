import * as vscode from "vscode";
import { insertConstructorProperty } from "./constructorInserter";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("phpConstructor.insert", () => {
      insertConstructorProperty();
    }),
  );
}

export function deactivate(): void {}
