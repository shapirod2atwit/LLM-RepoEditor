const Parser = require('tree-sitter');
const csharp = require('tree-sitter-c-sharp');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
parser.setLanguage(csharp);

//arr to store all abstract syntax trees
var ASTs = [];

//put the path to the repository here
const target = "./TestFiles";//currently learning what nodes are called for later parsing

createASTs(target);

function createASTs(folder){
// Loop through all the files in the directory
    fs.readdir(folder, async function (err, files) {
        if (err) {
            console.error("Could not list the directory.", err);
            process.exit(1);
        }
    
        files.forEach(function (file, index) {
            //make complete path of file
            var currentPath = path.join(folder, file);
            //get file extension type
            var type = path.extname(currentPath);
        
            //check is the file is a file or directory
            fs.stat(currentPath, function (error, stat) {
                if (error) {
                    console.error("Error stating file.", error);
                    return;
                }
        
                //only check for js files right now
                if (stat.isFile() && type==".cs"){
                    //convert file to string
                    var sourceCode = fs.readFileSync(currentPath).toString();
                    //create ast and push ast array
                    ASTs.push(parser.parse(sourceCode));
                    //console.log("'%s' AST has been added to AST list.", currentPath);
                    if(currentPath === 'TestFiles\\test1.cs'){
                        var tree = ASTs.pop();
                        traverseTree(tree.rootNode, processNode);
                    }
                
                }else if(stat.isDirectory()){
                    //since the current path is a directory
                    //it needs to be checked it contains any files
                    createASTs(currentPath);
                }
            });
        });
    });
}


function traverseTree(node, callback) {
    // Call the callback function on the current node
    callback(node);
  
    // Recursively traverse child nodes
    for (let i = 0; i < node.childCount; i++) {
      traverseTree(node.child(i), callback);
    }
  }
  
  //callback function
  function processNode(node) {
    //print node if not a syntax node
    console.log(node);
  }