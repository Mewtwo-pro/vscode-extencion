import * as vscode from 'vscode';
let myvar = 0;
let miInput: vscode.InputBox | undefined;
let my_numero = 0;

let matches: {label:string,pos:number}[] = [];
const jumpDecoration =
    vscode.window.createTextEditorDecorationType({
        after:{
            margin:'0 0 0 5px'
        }
    });

function clearLabels(
    editor:vscode.TextEditor
){
    editor.setDecorations(
        jumpDecoration,
        []
    );

    matches=[];
}
function renderLabels(
    editor: vscode.TextEditor,
    query: string
) {

    clearLabels(editor);
    if (!query) return;
    const labels = 
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const decorations:
    vscode.DecorationOptions[]=[];
    matches=[];
    // Solo recorrer regiones visibles
    for(const visibleRange of editor.visibleRanges){
        const visibleText =
            editor.document.getText(
                visibleRange
            );

        let index=0;

        while(true){

            index=
                visibleText
                .toLowerCase()
                .indexOf(
                    query.toLowerCase(),
                    index
                );

            if(index===-1) break;

            // convertir índice local a global
            const startOffset =
                editor.document.offsetAt(
                    visibleRange.start
                );

            const globalOffset =
                startOffset + index;

            const position =
                editor.document.positionAt(
                    globalOffset
                );

            const label =
                labels[matches.length];

            if(!label) break;

            matches.push({
                label,
                pos:globalOffset
            });

            decorations.push({

                range:new vscode.Range(
                    position,
                    position
                ),

                renderOptions:{
                    after:{
                        contentText:
                            `[${label}]`
                    }
                }

            });

            index++;

        }

    }

    editor.setDecorations(
        jumpDecoration,
        decorations
    );

}

function insertCharAndSuggest(editor: vscode.TextEditor, position: vscode.Position, char: string) {
  // Inserta el carácter en la position indicada
  return editor.edit(editBuilder => {
    editBuilder.insert(position, char);
  }).then(() => {
    // Una vez aplicada la edición, dispara el autocompletado
    vscode.commands.executeCommand('editor.action.triggerSuggest');
  });
}
function next_buscar(searchTerm: string) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) return;
        const document = editor.document;
        const text = document.getText();
        const startPos = editor.selection.active;
        const startIndex = document.offsetAt(startPos);

        // Buscar el término en el texto desde la posición actual
        const index = text.indexOf(searchTerm, startIndex + 1);

        if (index !== -1) {
            const startPosition = document.positionAt(index);
            const endPosition = document.positionAt(index + searchTerm.length);
            
            // Crear nueva selección y mover el cursor
            const newSelection = new vscode.Selection(startPosition, endPosition);
            editor.selection = newSelection;
            
            // Hacer scroll hasta la palabra encontrada
            editor.revealRange(newSelection, vscode.TextEditorRevealType.InCenter);
        } else {
            vscode.window.showInformationMessage("No se encontraron más coincidencias de 'maria'.");
        }
}
function insertChar(editor: vscode.TextEditor, position: vscode.Position, char: string) {
  // Inserta el carácter en la position indicada
  return editor.edit(editBuilder => {
    editBuilder.insert(position, char);
  })
}
let myStatus: vscode.StatusBarItem;

export function activate(context: vscode.ExtensionContext) {
    myStatus = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    myStatus.text = "MODE = 1";
    myStatus.tooltip = "Mi modo personalizado";
    myStatus.show();
    context.subscriptions.push(myStatus);
const toggleCommand = vscode.commands.registerCommand("myExtension.toggleCommand", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      myvar = 1
      my_numero = 0
      myStatus.text = `MODE = ${myvar}`;
    });
const aCommand = vscode.commands.registerCommand("myExtension.aCommand" , async () =>{
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for(const selection of selections){
      const position = selection.active;
      if (myvar == 0){
        insertCharAndSuggest(editor ,position, 'a')
      }else if (myvar == 3){    
        insertChar(editor ,position, ':')
        if (my_numero == 0){
          myvar = 0;
        }else{
          myvar = 4;
        }
      }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'A')
      }else{
          myvar = 0
          my_numero = 0
      }
      myStatus.text = `MODE = ${myvar}`;      
    }
})
const bCommand = vscode.commands.registerCommand("myExtension.bCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'b');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '9');
        } else if (myvar == 3) {
            insertChar(editor, position, '>');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'B')
        }
        myStatus.text = `MODE = ${myvar}`;
    }
    
});


const cCommand = vscode.commands.registerCommand("myExtension.cCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'c');
        } else if (myvar == 3) {
            insertChar(editor, position, '""');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'C')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});

const tabCommand = vscode.commands.registerCommand("myExtension.tabCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for (const selection of selections){
        const position = selection.active;    
        if (myvar == 0 || myvar == 4 ) {
            myvar = 3            
        }else if (myvar == 3){
            myvar = 5;
        }else if (myvar == 5){
            myvar = 0
        }
    }
    myStatus.text = `MODE = ${myvar}`;
    
})
const dCommand = vscode.commands.registerCommand("myExtension.dCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'd');
        } else if (myvar == 3) {
            insertChar(editor, position, '=');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
      }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'D')
      }
        myStatus.text = `MODE = ${myvar}`;
    }
});


const eCommand = vscode.commands.registerCommand("myExtension.eCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'e');
        } else if (myvar == 3) {
            insertChar(editor, position, '$');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'E')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const fCommand = vscode.commands.registerCommand("myExtension.fCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'f');
        } else if (myvar == 3) {
            insertChar(editor, position, '/');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'F')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const gCommand = vscode.commands.registerCommand("myExtension.gCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'g');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '0');
        } else if (myvar == 3) {
            insertChar(editor, position, '{}');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'G')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
const backspaceCommand = vscode.commands.registerCommand("myExtension.backspaceCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 5 || myvar == 0 || myvar == 4) {
            vscode.commands.executeCommand('deleteLeft');
        }else if (myvar == 1){
            vscode.commands.executeCommand('redo'); 
        }else if (myvar ==  3){
            myvar = 4
            my_numero = 1
        }
        myStatus.text = `MODE = ${myvar}`;
    }
});
const spaceCommand = vscode.commands.registerCommand("myExtension.spaceCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0 || myvar == 5 || myvar == 4) {
            insertChar(editor ,position, ' ')
        }else if (myvar == 1){
            vscode.commands.executeCommand('undo'); 
        } else if (myvar == 3) {
            const document = editor.document;
            const selection = editor.selection;
            const position = selection.active;

            const lineText = document.lineAt(position.line).text;
            const indentMatch = lineText.match(/^\s*/);
            const indent = indentMatch ? indentMatch[0] : "";

            // 1. Definimos la nueva posición (una línea abajo, al final de la indentación)
            const newPosition = new vscode.Position(position.line + 1, indent.length);

            editor.edit(editBuilder => {
                editBuilder.insert(new vscode.Position(position.line, lineText.length), "\n" + indent);
            }).then(success => {
                if (success) {
                    // 2. Movemos el cursor a la nueva posición
                    editor.selection = new vscode.Selection(newPosition, newPosition);
                    
                    // 3. (Opcional) Hacemos scroll si la nueva línea queda fuera de vista
                    editor.revealRange(new vscode.Range(newPosition, newPosition));
                }
            });
            myvar = 0;
        }
    }
        myStatus.text = `MODE = ${myvar}`;
});

const hCommand = vscode.commands.registerCommand("myExtension.hCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'h');
        } else if (myvar == 3) {
            insertChar(editor, position, '?');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'H')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const iCommand = vscode.commands.registerCommand("myExtension.iCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'i');
        } else if (myvar == 3) {
            insertChar(editor, position, '+');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 1){
            myvar = 2;
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'I')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const jCommand = vscode.commands.registerCommand("myExtension.jCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'j');
        } else if (myvar == 1) {
           myvar = 0        
           await vscode.commands.executeCommand(
           'myExtension.showInput'
           );
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '3');
        } else if (myvar == 3) {
            insertChar(editor, position, '``');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'J')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const kCommand = vscode.commands.registerCommand("myExtension.kCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'k');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '2');
        } else if (myvar == 3) {
            insertChar(editor, position, '_');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'K')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const lCommand = vscode.commands.registerCommand("myExtension.lCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'l');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '1');
        } else if (myvar == 3) {
            insertChar(editor, position, "''");
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'L')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const mCommand = vscode.commands.registerCommand("myExtension.mCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'm');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '8');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('workbench.action.nextEditor');        
        } else if (myvar == 3) {
            insertChar(editor, position, '\\');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'M')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const nCommand = vscode.commands.registerCommand("myExtension.nCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'n');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '7');
        } else if (myvar == 3) {
            insertChar(editor, position, '>');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'N')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const oCommand = vscode.commands.registerCommand("myExtension.oCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'o');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '5');
        } else if (myvar == 3) {
            insertChar(editor, position, '@');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'O')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const pCommand = vscode.commands.registerCommand("myExtension.pCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'p');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '4');
        } else if (myvar == 3) {
            insertChar(editor, position, '[]');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'P')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const qCommand = vscode.commands.registerCommand("myExtension.qCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'q');
        } else if (myvar == 3) {
            insertChar(editor, position, '#');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'Q')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const rCommand = vscode.commands.registerCommand("myExtension.rCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'r');
        } else if (myvar == 3) {
            insertChar(editor, position, '()');
            vscode.commands.executeCommand('cursorLeft');
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'R')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const sCommand = vscode.commands.registerCommand("myExtension.sCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
    const selections = editor.selections;
    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 's');
        }else if (myvar == 1){
            vscode.commands.executeCommand('workbench.action.files.save');
        } else if (myvar == 3) {
            insertChar(editor, position, '.');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'S')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const tCommand = vscode.commands.registerCommand("myExtension.tCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 't');
        } else if (myvar == 3) {
            insertChar(editor, position, '-');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
        insertCharAndSuggest(editor ,position, 'T')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const uCommand = vscode.commands.registerCommand("myExtension.uCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'u');
        } else if (myvar == 4) {
            insertCharAndSuggest(editor, position, '6');
        } else if (myvar == 3) {
            insertChar(editor, position, ';');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar === 1) {
            vscode.commands.executeCommand('editor.action.clipboardCopyAction');
        }else if (myvar === 2) {
            vscode.commands.executeCommand('editor.action.clipboardCopyAction');
            vscode.commands.executeCommand('cancelSelection');
            myvar = 1
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'U')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const vCommand = vscode.commands.registerCommand("myExtension.vCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'v');
        } else if (myvar == 3) {
            insertChar(editor, position, '*');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'V')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const wCommand = vscode.commands.registerCommand("myExtension.wCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;
        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'w');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        } else if (myvar == 3) {
            insertChar(editor, position, ',');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'W')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const xCommand = vscode.commands.registerCommand("myExtension.xCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'x');
        } else if (myvar == 1) {
            vscode.commands.executeCommand('editor.action.deleteLines');
        } else if (myvar == 3) {
            insertChar(editor, position, '&');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'X')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const yCommand = vscode.commands.registerCommand("myExtension.yCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'y');
        } else if (myvar == 3) {
            insertChar(editor, position, '%');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'Y')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});


const zCommand = vscode.commands.registerCommand("myExtension.zCommand", async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;

    const selections = editor.selections;

    for (const selection of selections) {
        const position = selection.active;

        if (myvar == 0) {
            insertCharAndSuggest(editor, position, 'z');
        } else if (myvar == 3) {
            insertChar(editor, position, '<');

            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else if (myvar == 5){   
            insertCharAndSuggest(editor ,position, 'Z')
        }        
        myStatus.text = `MODE = ${myvar}`;
    }
});
//editor.action.nextMatchFindAction
const showInput = vscode.commands.registerCommand(
    'myExtension.showInput',
    async () => {

        miInput = vscode.window.createInputBox();

        const input = miInput; // referencia fija

        await vscode.commands.executeCommand(
            'setContext',
            'miInputFocus',
            true
        );

        input.placeholder = "Escribe algo...";

        input.onDidHide(async () => {

            await vscode.commands.executeCommand(
                'setContext',
                'miInputFocus',
                false
            );
   const editor =
        vscode.window.activeTextEditor;

    if(editor){
        clearLabels(editor);
    }
            input.dispose();
            miInput = undefined;
        });
input.onDidChangeValue((text) => {

    const editor =
        vscode.window.activeTextEditor;

    if (!editor) return;

    // texto vacío → limpiar todo
    if (!text.trim()) {
        clearLabels(editor);
        return;
    }

    // separar solo en dos partes
    const [query, jump] =
        text.split(" ", 2);

    renderLabels(
        editor,
        query
    );

    if (jump) {

        const match =
            matches.find(
                m => m.label === jump.toLowerCase()
            );

        if (match) {

            const pos =
                editor.document.positionAt(
                    match.pos
                );

            editor.selection =
                new vscode.Selection(
                    pos,
                    pos
                );

            editor.revealRange(
                new vscode.Range(
                    pos,
                    pos
                )
            );

            clearLabels(editor);

            input.hide();
        }
    }

});
        input.show();
    }
);
const aKey = vscode.commands.registerCommand(
    'myExtension.aKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'a';
        } else if (myvar == 5 && miInput){
            miInput.value += 'A';
        } else if (myvar === 3 && miInput) {
            miInput.value += ':';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }else {
           my_numero = 0
           myvar = 0
        }
    }
);
const toggleKey = vscode.commands.registerCommand(
    'myExtension.toggleKey',
    () => {
        if (miInput){
            myvar = 0
            my_numero = 0
        }
    }
)

const bKey = vscode.commands.registerCommand(
    'myExtension.bKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'b';
        } else if (myvar === 4 && miInput) {
            miInput.value += '9';
        } else if (myvar == 5 && miInput){
            miInput.value += 'B';
        } else if (myvar === 3 && miInput) {
            miInput.value += '>';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const cKey = vscode.commands.registerCommand(
    'myExtension.cKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'c';
        } else if (myvar == 5 && miInput){
            miInput.value += 'C';
        } else if (myvar === 3 && miInput) {
            miInput.value += '"';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const dKey = vscode.commands.registerCommand(
    'myExtension.dKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'd';
        } else if (myvar == 5 && miInput){
            miInput.value += 'D';
        } else if (myvar === 3 && miInput) {
            miInput.value += '=';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const eKey = vscode.commands.registerCommand(
    'myExtension.eKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'e';
        } else if (myvar == 5 && miInput){
            miInput.value += 'E';
        } else if (myvar === 3 && miInput) {
            miInput.value += '$';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const fKey = vscode.commands.registerCommand(
    'myExtension.fKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'f';
        } else if (myvar == 5 && miInput){
            miInput.value += 'F';
        } else if (myvar === 3 && miInput) {
            miInput.value += '/';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const gKey = vscode.commands.registerCommand(
    'myExtension.gKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'g';
        } else if (myvar == 5 && miInput){
            miInput.value += 'G';
        } else if (myvar === 4 && miInput) {
            miInput.value += '0';
        } else if (myvar === 3 && miInput) {
            miInput.value += '{}';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const hKey = vscode.commands.registerCommand(
    'myExtension.hKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'h';
        } else if (myvar == 5 && miInput){
            miInput.value += 'H';
        } else if (myvar === 3 && miInput) {
            miInput.value += '?';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const iKey = vscode.commands.registerCommand(
    'myExtension.iKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'i';
        } else if (myvar == 5 && miInput){
            miInput.value += 'I';
        } else if (myvar === 3 && miInput) {
            miInput.value += '+';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const jKey = vscode.commands.registerCommand(
    'myExtension.jKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'j';
        } else if (myvar == 5 && miInput){
            miInput.value += 'J';
        } else if (myvar === 4 && miInput) {
            miInput.value += '3';
        } else if (myvar === 3 && miInput) {
            miInput.value += '``';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const kKey = vscode.commands.registerCommand(
    'myExtension.kKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'k';
        } else if (myvar == 5 && miInput){
            miInput.value += 'K';
        } else if (myvar === 4 && miInput) {
            miInput.value += '2';
        } else if (myvar === 3 && miInput) {
            miInput.value += '_';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const lKey = vscode.commands.registerCommand(
    'myExtension.lKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'l';
        } else if (myvar == 5 && miInput){
            miInput.value += 'L';
        } else if (myvar === 4 && miInput) {
            miInput.value += '1';
        } else if (myvar === 3 && miInput) {
            miInput.value += "'";
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const mKey = vscode.commands.registerCommand(
    'myExtension.mKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'm';
        } else if (myvar == 5 && miInput){
            miInput.value += 'M';
        } else if (myvar === 3 && miInput) {
            miInput.value += '\\';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const nKey = vscode.commands.registerCommand(
    'myExtension.nKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'n';
        } else if (myvar == 5 && miInput){
            miInput.value += 'N';
        } else if (myvar === 4 && miInput) {
            miInput.value += '8';
        } else if (myvar === 3 && miInput) {
            miInput.value += '>';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const oKey = vscode.commands.registerCommand(
    'myExtension.oKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'o';
        } else if (myvar == 5 && miInput){
            miInput.value += 'O';
        } else if (myvar === 4 && miInput) {
            miInput.value += '5';
        } else if (myvar === 3 && miInput) {
            miInput.value += '@';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const pKey = vscode.commands.registerCommand(
    'myExtension.pKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'p';
        } else if (myvar == 5 && miInput){
            miInput.value += 'P';
        } else if (myvar === 4 && miInput) {
            miInput.value += '4';
        } else if (myvar === 3 && miInput) {
            miInput.value += '[]';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const qKey = vscode.commands.registerCommand(
    'myExtension.qKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'q';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Q';
        } else if (myvar === 3 && miInput) {
            miInput.value += '#';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const rKey = vscode.commands.registerCommand(
    'myExtension.rKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'r';
        } else if (myvar == 5 && miInput){
            miInput.value += 'R';
        } else if (myvar === 3 && miInput) {
            miInput.value += '()';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const sKey = vscode.commands.registerCommand(
    'myExtension.sKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 's';
        } else if (myvar == 5 && miInput){
            miInput.value += 'S';
        } else if (myvar === 3 && miInput) {
            miInput.value += '.';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const tKey = vscode.commands.registerCommand(
    'myExtension.tKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 't';
        } else if (myvar == 5 && miInput){
            miInput.value += 'T';
        } else if (myvar === 3 && miInput) {
            miInput.value += '-';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const uKey = vscode.commands.registerCommand(
    'myExtension.uKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'u';
        } else if (myvar == 5 && miInput){
            miInput.value += 'U';
        } else if (myvar === 4 && miInput) {
            miInput.value += '6';
        } else if (myvar === 3 && miInput) {
            miInput.value += ';';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const vKey = vscode.commands.registerCommand(
    'myExtension.vKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'v';
        } else if (myvar == 5 && miInput){
            miInput.value += 'V';
        } else if (myvar === 3 && miInput) {
            miInput.value += '*';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const wKey = vscode.commands.registerCommand(
    'myExtension.wKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'w';
        } else if (myvar == 5 && miInput){
            miInput.value += 'W';
        } else if (myvar === 3 && miInput) {
            miInput.value += ',';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const xKey = vscode.commands.registerCommand(
    'myExtension.xKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'x';
        } else if (myvar == 5 && miInput){
            miInput.value += 'X';
        } else if (myvar === 3 && miInput) {
            miInput.value += '&';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const yKey = vscode.commands.registerCommand(
    'myExtension.yKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'y';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Y';
        } else if (myvar === 3 && miInput) {
            miInput.value += '%';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);


const zKey = vscode.commands.registerCommand(
    'myExtension.zKey',
    () => {
        if (myvar === 0 && miInput) {
            miInput.value += 'z';
        } else if (myvar == 5 && miInput){
            miInput.value += 'Z';
        } else if (myvar === 3 && miInput) {
            miInput.value += '<';
            if (my_numero == 0) {
                myvar = 0;
            } else {
                myvar = 4;
            }
        }
    }
);
const spaceKey = vscode.commands.registerCommand(
    'myExtension.spaceKey',
    () => {
    
        if (myvar === 0 && miInput) {
            myvar = 1;
            const texto = miInput.value;
            miInput.hide();
            next_buscar(texto)
        }

    }
);
    const tabKey = vscode.commands.registerCommand(
        'myExtension.tabKey',
        () => {
            if (myvar == 0 && miInput) {
                myvar = 3;
            }else if( myvar == 3 && miInput){
                myvar = 5
            }
        }
    );
    const enterKey = vscode.commands.registerCommand(
        'myExtension.enterKey',
        () => {
            if (miInput) {
                my_numero = 1;
                myvar = 4
            }
        }
    );

    context.subscriptions.push(
        showInput,
        dKey,
        tabKey
    );
}