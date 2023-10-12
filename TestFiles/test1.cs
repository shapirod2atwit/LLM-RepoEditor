class test1{
    public class test{
        int a {get;}

        public test(int a){
            this.a = a;
        }

        public virtual int getValue(){
            return a;
        }
    }

    public class testOver: test{
        int b {get;}

        public testOver(int a, int b): base(a){
            this.b = b;
        }

        public override int getValue(){
            return b;
        }
    }
}