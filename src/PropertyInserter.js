const vscode = require('vscode');

module.exports = class PropertyInserter {
    async insert() {
        let activeDocument = this.activeDocument().uri;

        if (activeDocument === undefined) {
            return;
        }

        let declarations = await this.getDeclarations(activeDocument);

        if (declarations.constructorLineNumber === null) {
            this.insertConstructor(declarations);
        } else {
            this.insertConstructorProperty(declarations);
        }
    }

    async getDeclarations(activeDocument) {
        let declarations = {
            classLineNumber: null,
            traitUseLineNumber: null,
            lastPropertyLineNumber: null,
            constructorLineNumber: null,
            constructorRange: null,
            constructorClosingLineNumber: null,
        };

        let doc = await vscode.workspace.openTextDocument(activeDocument);

        for (let line = 0; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/class \w/.test(textLine)) {
                let lineNumber = line;

                // If class closing brace isn't inline then increment lineNumber
                if (! textLine.endsWith('{')){
                    lineNumber++;
                }

                declarations.classLineNumber = lineNumber;
            }

            if (declarations.classLineNumber !== null && /use .+?;/.test(textLine)) {
                declarations.traitUseLineNumber = line;
            }

            if (/(public|protected|private|static) \$/.test(textLine)) {
                declarations.lastPropertyLineNumber = line;
            }

            if (/function __construct\(/.test(textLine)) {
                declarations.constructorLineNumber = line;
                declarations.constructorRange = doc.lineAt(line).range;
            }

            if (declarations.constructorLineNumber !== null && /[ \t].+}/.test(textLine)) {
                declarations.constructorClosingLineNumber = line;

                // If constructor is found no need to parse anymore.
                break;
            }
        }

        return declarations;
    }

    insertConstructor(declarations) {
        let insertLine = this.gotoLine(declarations);

        let snippet = '\n';

        if (! declarations.lastPropertyLineNumber && ! declarations.traitUseLineNumber) {
            // If no property and trait uses is found then no need need prepend a line break.
            snippet = '';
        }

        snippet += `\t${this.config('visibility')}` + ' \\$${1:property};\n\n' +
        '\tpublic function __construct(\\$${1:property})\n' +
        '\t{\n' +
            '\t\t\\$this->${1:property} = \\$${1:property};$0\n' +
        '\t}';

        let nextLineOfInsertLineText = this.activeEditor().document.lineAt(insertLine).text;

        // If there is no new line after insert line then append new line.
        if (nextLineOfInsertLineText !== '') {
            snippet += '\n';
        }

        // If there is no new line after insert line and is not
        // class closing brace then append another new line.
        if (nextLineOfInsertLineText !== '' && ! nextLineOfInsertLineText.endsWith('}')) {
            snippet += '\n';
        }

        this.activeEditor().insertSnippet(
            new vscode.SnippetString(snippet)
        );
    }

    insertConstructorProperty(declarations) {
        this.gotoLine(declarations);

        let snippet = `\t${this.config('visibility')}` + ' \\$${1:property};\n\n';

        let constructorLineText = this.activeEditor().document.getText(declarations.constructorRange);

        // Split constructor arguments.
        let consturctor = constructorLineText.split(/\((.+?)\)/);

        // Escape all "$" signs of constructor arguments otherwise
        // vscode will assume "$" sign is a snippet placeholder.
        let previousVars = consturctor[1].replace(/\$/g, '\\$');

        // Merge constructor line with new snippet placeholder.
        snippet += `${consturctor[0]}(${previousVars}\,\ \\$\${1:property})`;

        let constructorClosingLine;

        // Append all previous property assignments to the snippet.
        for (var line = declarations.constructorRange.start.line; line < declarations.constructorClosingLineNumber; line++) {
            let propertyAssignment = this.activeEditor().document.lineAt(line + 1);

            constructorClosingLine = propertyAssignment;

            // Escape all "$" signs of property assignments.
            snippet += '\n' + propertyAssignment.text.replace(/\$/g, '\\$');
        }

        // Slice constructor closing brace.
        snippet = snippet.slice(0, -1);

        snippet += '\t\\$this->${1:property} = \\$${1:property};$0';
        snippet += '\n\t}';

        let nextLineOfConstructorClosing = this.activeEditor().document.lineAt(constructorClosingLine.lineNumber + 1).text;

        // If there is no new line after constructor closing brace then append
        // new line except if the next line is not class closing brace.
        if (nextLineOfConstructorClosing !== '' && ! nextLineOfConstructorClosing.endsWith('}')) {
            snippet += '\n';
        }

        let start = new vscode.Position(
            declarations.constructorRange.start.line,
            declarations.constructorRange.start.character
        );

        let end = new vscode.Position(
            constructorClosingLine.range.end.line,
            constructorClosingLine.range.end.character
        );

        this.activeEditor().insertSnippet(
            new vscode.SnippetString(snippet),
            new vscode.Range(start, end)
        );
    }

    gotoLine(declarations) {
        let insertLine = this.getInsertLine(declarations);

        let line = this.activeEditor().document.lineAt(insertLine);
        this.activeEditor().revealRange(line.range);

        let newPosition = new vscode.Position(line.lineNumber, 0);
        this.activeEditor().selection = new vscode.Selection(newPosition, newPosition);

        return insertLine;
    }

    getInsertLine(declarations) {
        let lineNumber = declarations.lastPropertyLineNumber || declarations.traitUseLineNumber || declarations.classLineNumber;

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
