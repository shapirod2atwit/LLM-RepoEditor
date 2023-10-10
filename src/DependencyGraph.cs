namespace graph{
    public class DependencyGraph{
        List<Node> nodes { get; }

        public DependencyGraph(){
            this.nodes = new List<Node>();
        }

        //add new node to graph
        public Node addNode(string codeblock){
            var newNode = new Node(codeblock);
            nodes.Add(newNode);
            return newNode;
        }

        //add neighbor to node
        public void addNeighbor(Node x, Node y, string relationship){
            x.getNeighbors().Add(new Tuple<Node,string>(y, relationship));
        }

        public List<Node> getNodes(){
            return nodes;
        }

    
    }   
}
