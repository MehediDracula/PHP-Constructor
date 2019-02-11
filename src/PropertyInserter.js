const vscode = require('vscode');

class PropertyInserter {
    async insert() {
        let activeDocument = this.activeDocument().uri;

        if (activeDocument === undefined) {
            return;
        }

        let declarations = await this.getDeclarations(activeDocument);

        if (declarations.classLineNumber === null) {
            return;
        }

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

            if (/^(final |abstract )?(class|trait) \w/.test(textLine)) {
                let lineNumber = line;

                // If class closing brace isn't inline then increment lineNumber.
                if (! textLine.endsWith('{')) {
                    lineNumber++;
                }

                declarations.classLineNumber = lineNumber;
            }

            if (declarations.classLineNumber !== null && /use .+?;/.test(textLine)) {
                declarations.traitUseLineNumber = line;
            }

            if (
                /(public|protected|private|static) \$/.test(textLine) ||
                /const \w+\s+?=/.test(textLine)
            ) {
                declarations.lastPropertyLineNumber = this.findPropertyLastLine(doc, line);
            }

            if (/function __construct/.test(textLine)) {
                declarations.constructorLineNumber = line;

                declarations.constructorRange = this.findConstructorRange(doc, line);
            }

            if (declarations.constructorLineNumber !== null && /[ \t].+}/.test(textLine)) {
                declarations.constructorClosingLineNumber = line;

                // If constructor is found then no need to parse anymore.
                break;
            }
        }

        return declarations;
    }

    insertConstructor(declarations) {
        let insertLine = this.gotoLine(declarations);

        let snippet = '\n';

        if (! declarations.lastPropertyLineNumber && ! declarations.traitUseLineNumber) {
            // If no property and trait uses is found then no need to prepend a line break.
            snippet = '';
        }

        snippet = this.getIndentation();

        if (this.config('choosePropertyVisibility', false)) {
            snippet += '${2|' + this.getVisibilityChoice(this.config('visibility', 'protected'))+'|}';
        } else {
            snippet += this.config('visibility', 'protected');
        }

        snippet += ' \\$${1:property};\n\n' + this.getIndentation();

        if (this.config('chooseConstructorVisibility', false)) {
            snippet += '${3|' + this.getVisibilityChoice(this.config('constructorVisibility', 'public'))+'|}';
        } else {
            snippet += this.config('constructorVisibility', 'public');
        }

        snippet += ' function __construct(\\$${1:property})\n' +
            this.getIndentation() + '{\n' +
            this.getIndentation(2) + '\\$this->${1:property} = \\$${1:property};$0\n' +
            this.getIndentation() + '}';

        let nextLineOfInsertLine = this.activeEditor().document.lineAt(insertLine.lineNumber + 1);

        // If insert line is class closing brace or insert line is empty and
        // next line is not class closing brace then add one new line.
        if (
            insertLine.text.endsWith('}') ||
            (insertLine.text === '' && ! nextLineOfInsertLine.text.endsWith('}'))
        ) {
            snippet += '\n';
        }

        if (insertLine.text !== '' && ! insertLine.text.endsWith('}')) {
            //Insert line is not empty and next line is not class closing brace so add two new line.
            snippet += '\n\n';
        }

        this.activeEditor().insertSnippet(
            new vscode.SnippetString(snippet)
        );
    }

    async insertConstructorProperty(declarations) {
        this.gotoLine(declarations);

        let snippet = this.getIndentation();

        if (this.config('choosePropertyVisibility', false)) {
            snippet += '${2|'+this.getVisibilityChoice(this.config('visibility', 'protected'))+'|}';
        } else {
            snippet += this.config('visibility', 'protected');
        }

        snippet += ' \\$${1:property};\n\n';

        let constructorStartLineNumber = declarations.constructorRange.start.line;
        let constructorLineText = this.activeEditor().document.getText(declarations.constructorRange);

        if (constructorLineText.endsWith('/**')) {
            snippet += await this.getConstructorDocblock(declarations.constructorRange);

            let constructor = await this.getConstructorLine(declarations.constructorRange);

            constructorStartLineNumber = constructor.line;
            constructorLineText = constructor.textLine;
        }

        // Split constructor arguments.
        let constructor = constructorLineText.split(/\((.*?)\)/);

        snippet += `${constructor[0]}(`;

        // Escape all "$" signs of constructor arguments otherwise
        // vscode will assume "$" sign is a snippet placeholder.
        let previousArgs = constructor[1].replace(/\$/g, '\\$');

        if (previousArgs.length !== 0)  {
            // Add previous constructor arguments.
            snippet += `${previousArgs}\, `;
        }

        snippet += '\\$\${1:property})';

        let constructorClosingLine;

        // Add all previous property assignments to the snippet.
        for (let line = constructorStartLineNumber; line < declarations.constructorClosingLineNumber; line++) {
            let propertyAssignment = this.activeEditor().document.lineAt(line + 1);

            constructorClosingLine = propertyAssignment;

            // Escape all "$" signs of property assignments.
            snippet += '\n' + propertyAssignment.text.replace(/\$/g, '\\$');
        }

        // Slice constructor closing brace.
        snippet = snippet.slice(0, -1);

        snippet += this.getIndentation() + '\\$this->${1:property} = \\$${1:property};$0';
        snippet += '\n' + this.getIndentation() +'}';

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
        let insertLineNumber = this.getInsertLine(declarations);

        let insertLine = this.activeEditor().document.lineAt(insertLineNumber);
        this.activeEditor().revealRange(insertLine.range);

        let newPosition = new vscode.Position(insertLineNumber, 0);
        this.activeEditor().selection = new vscode.Selection(newPosition, newPosition);

        return insertLine;
    }

    getInsertLine(declarations) {
        let lineNumber = declarations.lastPropertyLineNumber || declarations.traitUseLineNumber || declarations.classLineNumber;

        return ++lineNumber;
    }

    findPropertyLastLine(doc, line) {
        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (textLine.endsWith(';')) {
                return line;
            }
        }
    }

    constructorHasDocBlock(doc, line) {
        return doc.lineAt(line).text.endsWith('*/');
    }

    findConstructorRange(doc, line) {
        if (! doc.lineAt(line - 1).text.endsWith('*/')) {
            // Constructor doesn't have any docblock.
            return doc.lineAt(line).range;
        }

        for (line; line < doc.lineCount; line--) {
            let textLine = doc.lineAt(line).text;

            if (textLine.endsWith('/**')) {
                return doc.lineAt(line).range;
            }
        }
    }

    async getConstructorDocblock(range) {
        let doc = await vscode.workspace.openTextDocument(this.activeDocument().uri);

        let line = range.start.line;

        let docblock = '';

        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/function __construct/.test(textLine)) {
                break;
            }

            docblock += `${textLine}\n`;
        }

        return docblock.replace(/\$/g, '\\$');
    }

    async getConstructorLine(range) {
        let doc = await vscode.workspace.openTextDocument(this.activeDocument().uri);

        let line = range.start.line;

        for (line; line < doc.lineCount; line++) {
            let textLine = doc.lineAt(line).text;

            if (/function __construct/.test(textLine)) {
                return { line, textLine };
            }
        }
    }

    activeEditor() {
        return vscode.window.activeTextEditor;
    }

    activeDocument() {
        return this.activeEditor().document;
    }

    getIndentation(level = 1) {
        let singleLevel;
        let activeResource = vscode.window.activeTextEditor.document.uri;

        if (! vscode.workspace.getConfiguration('editor', activeResource).get('insertSpaces')) {
            singleLevel = '\t';
        } else {
            singleLevel = ' '.repeat(vscode.workspace.getConfiguration('editor', activeResource).get('tabSize'));
        }

        return singleLevel.repeat(level);
    }

    getVisibilityChoice(defaultValue) {
        let visibilityChoices = ['public', 'protected', 'private'];

        if (visibilityChoices.indexOf(defaultValue) !== -1) {
            visibilityChoices.splice(visibilityChoices.indexOf(defaultValue), 1);
        }

        return [defaultValue, ...visibilityChoices].join(',');
    }

    config(key, defaultValue) {
        let config = vscode.workspace.getConfiguration('phpConstructor').get(key);

        if (! config) {
            return defaultValue;
        }

        return config;
    }
}

module.exports = PropertyInserter;
