class DependencyGraph{
    constructor(){
        this.adjList = new Map();
        this.edgeRelations = new Map();
    }

    addNode(n){
        this.adjList.set(n,[]);
    }

    addEdge(n, nn, relation1, relation2){
        this.AdjList.get(n).push(nn);
        this.AdjList.get(nn).push(n);
        this.edgeRelations.set(n, [nn, relation1]);
        this.edgeRelations.set(nn, [n, relation2]);
    }
}