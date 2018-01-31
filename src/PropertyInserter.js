const vscode = require('vscode');

module.exports = class PropertyInserter {
    async insert() {
        let activeDocument = this.activeDocument().uri;

        if (activeDocument === undefined) {
            return;
        }

        let declarations = await this.getDeclarations(activeDocument);

        if (declarations.constructorLine === null) {
            this.insertConstructor(declarations);
        } else {
            this.insertConstructorProperty(declarations);
        }
    }

    async getDeclarations(activeDocument) {
        let declarations = {
            classLine: null,
            useLine: null,
            lastPropertyLine: null,
            constructorLine: null,
            constructorRange: null,
            constructorClosingBraceLine: null,
        };

        let doc = await vscode.workspace.openTextDocument(activeDocument);

        for (let line = 0; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/class\s/.test(textLine)) {
                let lineNumber = line;

                if (! textLine.endsWith('{')){
                    lineNumber++;
                }

                declarations.classLine = lineNumber;
            }

            if (declarations.classLine !== null && /use\s/.test(textLine)) {
                declarations.useLine = line;
            }

            if (/(public|protected|private|static)\s\$/.test(textLine)) {
                declarations.lastPropertyLine = line;
            }

            if (/function __construct\(/.test(textLine)) {
                declarations.constructorLine = line;
                declarations.constructorRange = doc.lineAt(line).range;
            }

            if (declarations.constructorLine !== null && /}$/.test(textLine)) {
                declarations.constructorClosingBraceLine = line;

                break;
            }
        }

        return declarations;
    }

    insertConstructor(declarations) {
        this.gotoLine(declarations);

        let snippet = `\n\t${this.config('visibility')}` + ' \\$${1:property};\n\n' +
        '\tpublic function __construct(\\$${1:property})\n' +
        '\t{\n' +
        '\t\t\\$this->${1:property} = \\$${1:property};$0\n' +
        '\t}\n';

        this.activeEditor().insertSnippet(
            new vscode.SnippetString(snippet)
        );
    }

    insertConstructorProperty(declarations) {
        this.gotoLine(declarations);

        let snippet = `\t${this.config('visibility')}` + ' \\$${1:property};\n\n';

        let textLine = this.activeEditor().document.getText(declarations.constructorRange);
        let splitted = textLine.split(/\((.+?)\)/);

        let previousVars = splitted[1].replace(/\$/g, '\\\$');

        snippet += `${splitted[0]}(${previousVars}\,\ \\$\${1:property})`;

        let lastStatementRange;

        for (var line = declarations.constructorRange.start.line; line < declarations.constructorClosingBraceLine; line++) {
            let textLine = this.activeEditor().document.lineAt(line + 1);

            lastStatementRange = textLine.range;

            snippet += '\n' + textLine.text.replace(/\$/g, '\\\$');
        }

        snippet = snippet.slice(0, -1);

        snippet += '\t\\$this->${1:property} = \\$${1:property};$0';
        snippet += '\n\t}';

        let start = new vscode.Position(
            declarations.constructorRange.start.line,
            declarations.constructorRange.start.character
        );

        let end = new vscode.Position(
            lastStatementRange.end.line,
            lastStatementRange.end.character
        );

        this.activeEditor().insertSnippet(
            new vscode.SnippetString(snippet),
            new vscode.Range(start, end)
        );
    }

    gotoLine(declarations) {
        let lineNumber = this.getInsertLine(declarations);

        let line = this.activeEditor().document.lineAt(lineNumber);
        this.activeEditor().revealRange(line.range);

        let newPosition = new vscode.Position(line.lineNumber, 0);
        this.activeEditor().selection = new vscode.Selection(newPosition, newPosition);
    }

    getInsertLine(declarations) {
        let lineNumber = declarations.lastPropertyLine || declarations.useLine || declarations.classLine;

        return ++lineNumber;
    }

    activeEditor() {
        return vscode.window.activeTextEditor;
    }

    activeDocument() {
        return this.activeEditor().document;
    }

    config(key) {
        return vscode.workspace.getConfiguration('phpConstructor').get(key);
    }
}
