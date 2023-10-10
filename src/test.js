const Parser = require('tree-sitter');
//add more language parsers later
const JavaScript = require('tree-sitter-javascript');
const fs = require('fs');
const path = require('path');

const parser = new Parser();
parser.setLanguage(JavaScript);

//arr to store all abstract syntax trees
var ASTs = [];

//put the path to the repository here
const target = "./src";

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
                if (stat.isFile() && type==".js"){
                    //convert file to string
                    var sourceCode = fs.readFileSync(currentPath).toString();
                    //create ast and push ast array
                    ASTs.push(parser.parse(sourceCode));
                    console.log("'%s' AST has been added to AST list.", currentPath);
                    console.log(ASTs.pop().rootNode.toString());
                
                }else if(stat.isDirectory()){
                    //recursive call to find any files in folders
                    createASTs(currentPath);
                }
            });
        });
    });
}
