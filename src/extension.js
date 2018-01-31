const vscode = require('vscode');
const PropertyInserter = require('./PropertyInserter');

function activate(context) {
    let inserter = new PropertyInserter();


    context.subscriptions.push(
        vscode.commands.registerCommand('phpConstructor.insert', () => inserter.insert())
    );

    context.subscriptions.push(inserter);
}

exports.activate = activate;
