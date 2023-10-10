using graph;
public class Program{

    public static void Main(){
        DependencyGraph x = new DependencyGraph();

        Node y = x.addNode("int x = 1");

        Console.WriteLine(x.getNodes()[0].getCodeBlock());
    }
}