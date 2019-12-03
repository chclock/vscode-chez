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
    var indent;
    var lastOp = -1;
    var lastCol = -1;

    function saveLastValue() {
        rowStack.pop();
        lastCol = colStack.pop();
        lastOp = opSatck.pop();
    }

    function loopBrackets(lines, linesLength) {
        var isString = false;
        var commentPrefix = "";
        var escapedChar = false;
        var commentNum = 0;

        for (var row = 0; row < linesLength; row += 1) {
            var line = lines[row];
            var lineLength = line.length;
            for (var col = 0; col < lineLength; col += 1) {
                var c = line[col];

                if (isString) {
                    if (c == '"' && !escapedChar) {
                        isString = false;
                        continue;
                    }
                    if (escapedChar) {
                        escapedChar = false;
                        continue;
                    }
                    if (c == "\\") {
                        escapedChar = true;
                        continue;
                    }
                    continue;
                }

                switch(commentPrefix) {
                    case "": 
                        if ("#|".includes(c)) {
                            commentPrefix=c;
                            continue;
                        } 
                        break;
                    case "#": 
                        if (c == "|") {
                            commentNum+=1;
                            commentPrefix="";
                            continue;
                        } else {
                            commentPrefix="";
                            break;
                        }
                    case "|": 
                        if (c == "#" && commentNum>0) {
                            commentNum-=1;
                            commentPrefix="";
                            continue;
                        } else {
                            commentPrefix="";
                            break;
                        }
                }

                if (commentNum==0) {
                    switch(c){
                        case '"': if (verifiStr(line, col)) isString = true; break;
                        case "(": if (pushStack(opSatck, colStack, rowStack, 0, col, row, line)) lastOp=-1; break;
                        case "[": if (pushStack(opSatck, colStack, rowStack, 1, col, row, line)) lastOp=-1; break;
                        case "{": if (pushStack(opSatck, colStack, rowStack, 2, col, row, line)) lastOp=-1; break;
                        case ")": if (valueEqual(0, opSatck, col, line)) saveLastValue(); break;
                        case "]": if (valueEqual(1, opSatck, col, line)) saveLastValue(); break;
                        case "}": if (valueEqual(2, opSatck, col, line)) saveLastValue(); break;
                    }
                }
            }
        }
    }
    
    try {
        if (textEditor.document.languageId === 'scheme') {
            var lines = textEditor.document.getText(new vscode.Range(0, 0, pointRow, pointCol)).split("\n");
            var linesLength = lines.length;

            loopBrackets(lines, linesLength);

            var col = colStack.pop();
            indent = col + tabSize;

            if (col >= 0){
                if (lastOp > 0) {
                    indent = lastCol;
                } else {
                    var row = rowStack.pop();
                    var text = textEditor.document.getText(new vscode.Range(row, col, pointRow, pointCol));

                    var identifer = text.match(re);
                    if (identifer && identiSet.has(identifer[1])) {
                        indent = findFirstBraket(text, col, text.length);
                        if (indent == col) {
                            indent += tabSize
                        }
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

function findFirstBraket(text, offset, maxCol) {
    var hadSpace = false;
    var col = 0;
    var newlineIndex = 0;
    var newline = false;

    for (var i=0; i<maxCol; i++) {
        if (' \t'.includes(text[i])) {
            hadSpace = true;
        } else if ("\n\r".includes(text[i])) {
            hadSpace = true;
            newline = true;
            newlineIndex = i;
        } else {
            if (hadSpace) {
                col = i;
                break;
            }
        }
    }
    if (newline) {
        return col - 1 - newlineIndex;
    } else {
        return col + offset;
    }
}

function verifiStr(line, col) {
    if (col>0 && "\\'`".includes(line[col-1])) {
        return false;
    } else {
        return true;
    }
}

function pushStack(opSatck, colStack, rowStack, num, col, row, line) {
    if (col>0 && "\\" == line[col-1]) {
        return false;
    }
    opSatck.push(num);

    if (col>0 && "'`".includes(line[col-1])) {
        col -= 1;
    }
    
    colStack.push(col);
    rowStack.push(row);
    return true;
}

function valueEqual(num, opSatck, col, line) {
    if (col>0 && "\\" == line[col-1]) {
        return false;
    }
    if (opSatck[opSatck.length-1] != num) {
        return false;
    } else {
        return true;
    }
}
