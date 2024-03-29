class DependencyGraph{
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

    //dependency graph is undirected
    addEdge(n, nn, relation1, relation2){
        this.AdjList.get(n).push(nn);
        this.AdjList.get(nn).push(n);
        this.edgeRelations.set(n, [nn, relation1]);
        this.edgeRelations.set(nn, [n, relation2]);
    }
}