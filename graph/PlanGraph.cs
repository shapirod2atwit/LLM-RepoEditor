namespace graph{
    public class PlanGraph{
        List<Node> nodes { get; }

        public PlanGraph(){
            this.nodes = new List<Node>();
        }

        //add new node to graph
        public Node addNode(string codeblock, string instruction, string status){
            var newNode = new Node(new Tuple<string, string, string>(codeblock, instruction, status));
            nodes.Add(newNode);
            return newNode;
        }

        //add neighbor to node
        public void addNeighbor(Node x, Node y, string relationship){
            x.getNeighbors().Add(new Tuple<Node,string>(y, relationship));
        }
    }
}