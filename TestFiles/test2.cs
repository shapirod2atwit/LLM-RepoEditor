using System;


// Your replacement function code here

// Step 1: Importing a class
using System.Collections.Generic;

// Step 6: Inheriting from another class
class BaseClass
{
    public void BaseMethod()
    {
        Console.WriteLine("hello");
    }
}

class DerivedClass : BaseClass
{
    public void DerivedMethod()
    {
        Console.WriteLine("DerivedClass's DerivedMethod");
    }
}

class Program
{
    public static int check(){
        return 0;
    }
    // Step 3: Invoking a method
    static void Main(string[] args)
    {
        // Step 2: Overriding a method
        DerivedClass derived = new DerivedClass();

        derived.BaseMethod(); // Calls overridden method in DerivedClass

        // Step 4: Instantiating an object
        List<string> myList = new List<string>();
        myList.Add("Hello, World!");

        // Step 5: Using a field from another class
        Console.WriteLine(myList[0]);
        int val = derived.value;
        int x = check();
    }


}
