// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
var indent = require("./indent");
var keywrods = require("./keywords");
var rainbow = require("./rainbow-brackets");

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    var discolored = vscode.workspace.getConfiguration("vscode-chez").get("discolorBracketInString");
    rainbow.activateRainbowBrackets(context, discolored);
    var provider = registerCompletionItemProvider();
    var config = vscode.languages.setLanguageConfiguration('scheme', configuration);
    var disposable = vscode.commands.registerTextEditorCommand('schemeIndent.newlineAndIndent', indent.newlineAndIndent);
    context.subscriptions.push(config, provider, disposable);
}

var configuration = {
    wordPattern: /[\w\-\.:<>\*][\w\d\.\\/\-\?<>\*!]+/,
}

function registerCompletionItemProvider() {
    return vscode.languages.registerCompletionItemProvider('scheme', {
        provideCompletionItems: function (document, position, token, context) {
            var completionList = [];
            for (const item of keywrods.keywords) {
                completionList.push(new vscode.CompletionItem(item))
            }
            return completionList;
        }
    });
}

exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;
