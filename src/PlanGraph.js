class PlanGraph{
    constructor(){
        //keep track of adjacent nodes
        this.adjList = new Map();
        //keep track of relationships between nodes
        this.edgeRelations = new Map();
    }

    //add node to graph
    addNode(n){
        this.adjList.set(n,[]);
    }

    //plan graph is directed
    addEdge(n, nn, relation){
        this.AdjList.get(n).push(nn);
        this.edgeRelations.set(n, [nn, relation]);
    }
}