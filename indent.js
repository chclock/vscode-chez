"use strict";
exports.__esModule = true;
var vscode = require("vscode");
var re = /\s*\((\S+)\s+.*/;
var identiSet = new Set(["if", "cond"]);

function newlineAndIndent(textEditor, edit, args) {
    // Get rid of any user selected text, since a selection is
    // always deleted whenever ENTER is pressed.
    // This should always happen first
    if (!textEditor.selection.isEmpty) {
        edit["delete"](textEditor.selection);
        // Make sure we get rid of the selection range.
        textEditor.selection = new vscode.Selection(textEditor.selection.start, textEditor.selection.start);
    }
    var position = textEditor.selection.active;
    var tabSize = textEditor.options.tabSize;
    var pointRow = position.line;
    var pointCol = position.character;
    var insertionPoint = new vscode.Position(pointRow, pointCol);
    var toInsert = '\n';

    var opSatck = [];
    var colStack = [-tabSize];
    var rowStack = [-tabSize];
    var laskCol = -tabSize;
    var lastOp = -1;
    var indent;

    function saveLastValue() {
        rowStack.pop();
        laskCol = colStack.pop();
        lastOp = opSatck.pop();
    }

    function loopBrackets(lines, linesLength) {
        var isString = false;

        for (var row = 0; row < linesLength; row += 1) {
            var line = lines[row];
            var lineLength = line.length;
            for (var col = 0; col < lineLength; col += 1) {
                var c = line[col];

                if (isString) {
                    if (c == '"') {
                        isString = false;
                    }
                    continue;
                }

                switch(c){
                    case '"': isString = true; break;
                    case "(": pushStack(opSatck, colStack, rowStack, 0, col, row); lastOp = -1; break;
                    case "[": pushStack(opSatck, colStack, rowStack, 1, col, row); lastOp = -1; break;
                    case "{": pushStack(opSatck, colStack, rowStack, 2, col, row); lastOp = -1; break;
                    case ")": if (valueEqual(0, opSatck)) saveLastValue(); break;
                    case "]": if (valueEqual(1, opSatck)) saveLastValue(); break;
                    case "}": if (valueEqual(2, opSatck)) saveLastValue(); break;
                }
            }
        }
    }
    
    try {
        if (textEditor.document.languageId === 'scheme') {
            var lines = textEditor.document.getText(new vscode.Range(0, 0, pointRow, pointCol)).split("\n");
            var linesLength = lines.length;

            loopBrackets(lines, linesLength);


            var colStackTop = colStack[colStack.length-1];
            indent = colStackTop + tabSize;
            // special handling alignment
            // indicate that there are closed brackets in front
            if (colStackTop >= 0 && lastOp >= 0){
                var row = rowStack.pop();
                var col =  colStack.pop();
                var text = textEditor.document.getText(new vscode.Range(row, col, pointRow, pointCol));
                // If [] or {} direct align
                if (lastOp > 0) {
                    indent = laskCol;
                } else {
                    var identifer = text.match(re);
                    if (identifer && identiSet.has(identifer[1])) {
                        indent = laskCol;
                    }
                }
            }

            toInsert += ' '.repeat(indent);
            var currentLine = textEditor.document.lineAt(pointRow).text;
            if (extendCommentToNextLine(currentLine, pointCol)) {
                toInsert = toInsert + '; ';
            }
        }
    }  catch (e) {
        console.log(e);
    } finally {
        edit.insert(insertionPoint, toInsert);
        textEditor.revealRange(new vscode.Range(position, new vscode.Position(position.line + 2, 0)));
    }
}
exports.newlineAndIndent = newlineAndIndent;

// Current line is a comment line, and we should make the next one commented too.
function extendCommentToNextLine(line, pos) {
    if (line.trim().startsWith(';') && line.slice(pos).trim().length && line.slice(0, pos).trim().length) {
        return true;
    }
    return false;
}
exports.extendCommentToNextLine = extendCommentToNextLine;

function pushStack(opSatck, colStack, rowStack, num, col, row) {
    opSatck.push(num);
    colStack.push(col);
    rowStack.push(row);
}

function valueEqual(num, opSatck) {
    if (opSatck[opSatck.length-1] != num) {
        return false;
    } else {
        return true;
    }
}
