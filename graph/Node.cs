namespace graph{
    public class Node{
    
        string codeBlock { get; }
        Tuple<string, string, string> editObligation { get; }
        //neighbors holds nodes and the relationship between the nodes
        List<Tuple<Node, string>> neighbors { get; }

        //dependency graph Node
        //only stores code block
        #pragma warning disable
        public Node(string codeBlock){
            this.codeBlock = codeBlock;
            this.neighbors = new List<Tuple<Node, string>>();
        }

        //plan graph node
        //stores a codeblock, an instruction, and the completion status
        #pragma warning disable
        public Node(Tuple<string,string,string> editObligation){
            this.editObligation = editObligation;
            this.neighbors = new List<Tuple<Node, string>>();
        }

        public string getCodeBlock(){
          return codeBlock;  
        }

        public List<Tuple<Node,string>> getNeighbors(){
            return neighbors;
        }

        public Tuple<string,string,string> getEditObligation(){
            return editObligation;
        }

    }
}