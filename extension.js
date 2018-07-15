// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
    var discolored = vscode.workspace.getConfiguration("vscode-chez").get("discolorBracketInString");
    activateRainbowBrackets(context, discolored);
    context.subscriptions.push(vscode.languages.setLanguageConfiguration('scheme', configuration));
    // vscode.workspace.getConfiguration().update('editor.tabSize', 2, vscode.ConfigurationTarget.Global);
}

function activateRainbowBrackets(context, discolored) {
    var roundBracketsColor = ["#e6b422", "#c70067", "#00a960", "#fc7482"];
    var squareBracketsColor = ["#33ccff", "#8080ff", "#0073a8"];
    var squigglyBracketsColor = ["#d4d4aa", "#d1a075", "#9c6628"];
    var roundBracketsDecorationTypes = [];
    var squareBracketsDecorationTypes = [];
    var squigglyBracketsDecorationTypes = [];
    for (var index in roundBracketsColor) {
        roundBracketsDecorationTypes.push(vscode.window.createTextEditorDecorationType({
            color: roundBracketsColor[index]
        }));
    }
    for (var index in squareBracketsColor) {
        squareBracketsDecorationTypes.push(vscode.window.createTextEditorDecorationType({
            color: squareBracketsColor[index]
        }));
    }
    for (var index in squigglyBracketsColor) {
        squigglyBracketsDecorationTypes.push(vscode.window.createTextEditorDecorationType({
            color: squigglyBracketsColor[index]
        }));
    }
    var isolatedRightBracketsDecorationTypes = vscode.window.createTextEditorDecorationType({
        color: "#e2041b"
    });
    var activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        rainbowBrackets();
    }
    vscode.window.onDidChangeActiveTextEditor(function (editor) {
        activeEditor = editor;
        if (editor) {
            rainbowBrackets();
        }
    }, null, context.subscriptions);
    vscode.workspace.onDidChangeTextDocument(function (event) {
        if (activeEditor && event.document === activeEditor.document) {
            rainbowBrackets();
        }
    }, null, context.subscriptions);

    function rainbowBrackets() {
        if (!activeEditor) {
            return;
        }
        var text = activeEditor.document.getText();
        var regEx = /[\(\)\[\]\{\}]/g;
        var match;
        var roundBracketsColorCount = 0;
        var squareBracketsColorCount = 0;
        var squigglyBracketsColorCount = 0;
        var leftRoundBracketsStack = [];
        var leftSquareBracketsStack = [];
        var leftSquigglyBracketsStack = [];
        var roundBracketsDecorationTypeMap = {};
        var squareBracketsDecorationTypeMap = {};
        var squigglyBracketsDecorationTypeMap = {};
        for (var index in roundBracketsDecorationTypes) {
            roundBracketsDecorationTypeMap[index] = [];
        };
        for (var index in squareBracketsDecorationTypes) {
            squareBracketsDecorationTypeMap[index] = [];
        };
        for (var index in squigglyBracketsDecorationTypes) {
            squigglyBracketsDecorationTypeMap[index] = [];
        };
        var rightBracketsDecorationTypes = [];
        var roundCalculate;
        var squareCalculate;
        var squigglyCalculate;
        var stringIndexList = discolored ? getStringIndexList(text) : null;
        while (match = regEx.exec(text)) {
            if (match.index - 2 > -1 && text.substr(match.index - 2, 2) === "#\\") {
                continue;
            }
            if (discolored && ifIndexInString(match.index, stringIndexList)) {
                continue;
            }
            var startPos = activeEditor.document.positionAt(match.index);
            var endPos = activeEditor.document.positionAt(match.index + 1);
            var decoration = {
                range: new vscode.Range(startPos, endPos),
                hoverMessage: null
            };

            switch (match[0]) {
                case '(':
                    roundCalculate = roundBracketsColorCount;
                    leftRoundBracketsStack.push(roundCalculate);
                    roundBracketsColorCount++;
                    if (roundBracketsColorCount >= roundBracketsColor.length) {
                        roundBracketsColorCount = 0;
                    }
                    roundBracketsDecorationTypeMap[roundCalculate].push(decoration);
                    break;
                case ')':
                    if (leftRoundBracketsStack.length > 0) {
                        roundCalculate = leftRoundBracketsStack.pop();
                        roundBracketsColorCount = roundCalculate;
                        roundBracketsDecorationTypeMap[roundCalculate].push(decoration);
                    } else {
                        rightBracketsDecorationTypes.push(decoration);
                    }
                    break;
                case '[':
                    squareCalculate = squareBracketsColorCount;
                    leftSquareBracketsStack.push(squareCalculate);
                    squareBracketsColorCount++;
                    if (squareBracketsColorCount >= squareBracketsColor.length) {
                        squareBracketsColorCount = 0;
                    }
                    squareBracketsDecorationTypeMap[squareCalculate].push(decoration);
                    break;
                case ']':
                    if (leftSquareBracketsStack.length > 0) {
                        squareCalculate = leftSquareBracketsStack.pop();
                        squareBracketsColorCount = squareCalculate;
                        squareBracketsDecorationTypeMap[squareCalculate].push(decoration);
                    } else {
                        rightBracketsDecorationTypes.push(decoration);
                    }
                    break;
                case '{':
                    squigglyCalculate = squigglyBracketsColorCount;
                    leftSquigglyBracketsStack.push(squigglyCalculate);
                    squigglyBracketsColorCount++;
                    if (squigglyBracketsColorCount >= squigglyBracketsColor.length) {
                        squigglyBracketsColorCount = 0;
                    }
                    squigglyBracketsDecorationTypeMap[squigglyCalculate].push(decoration);
                    break;
                case '}':
                    if (leftSquigglyBracketsStack.length > 0) {
                        squigglyCalculate = leftSquigglyBracketsStack.pop();
                        squigglyBracketsColorCount = squigglyCalculate;
                        squigglyBracketsDecorationTypeMap[squigglyCalculate].push(decoration);
                    } else {
                        rightBracketsDecorationTypes.push(decoration);
                    }
                    break;
                default:
            }
        }
        for (var index in roundBracketsDecorationTypes) {
            activeEditor.setDecorations(roundBracketsDecorationTypes[index], roundBracketsDecorationTypeMap[index]);
        }
        for (var index in squareBracketsDecorationTypes) {
            activeEditor.setDecorations(squareBracketsDecorationTypes[index], squareBracketsDecorationTypeMap[index]);
        }
        for (var index in squigglyBracketsDecorationTypes) {
            activeEditor.setDecorations(squigglyBracketsDecorationTypes[index], squigglyBracketsDecorationTypeMap[index]);
        }
        activeEditor.setDecorations(isolatedRightBracketsDecorationTypes, rightBracketsDecorationTypes);
    }
}

function getStringIndexList(text) {
    // var regEx = /(?<!\\)"[\s\S]*?(?<!\\)"/g;
    text = text.replace(/#\\"/ig, "iii").replace(/\\\\"/ig, "ii\"").replace(/\\"/ig, "ii")
    var regEx = /"[\s\S]*?"/g;
    var match;
    var lst = []
    while (match = regEx.exec(text)) {
        lst.push([match.index, match.index + match[0].length - 1])
    }
    return lst;
}

function ifIndexInString(index, indexList) {
    if (!indexList)
        return false;
    for (var i in indexList) {
        var ary = indexList[i];
        if (index > ary[0] && index < ary[1])
            return true;
    }
    return false;
}

var configuration = {
    wordPattern: /[\w\-\.:<>\*][\w\d\.\\/\-\?<>\*!]+/,
    indentationRules: {
        decreaseIndentPattern: undefined,
        increaseIndentPattern: /^\s*\(.*[^)]\s*$/
    }
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}
exports.deactivate = deactivate;