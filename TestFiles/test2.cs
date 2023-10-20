using System;


// Your replacement function code here

// Step 1: Importing a class
using System.Collections.Generic;

// Step 6: Inheriting from another class


class BaseClass{
    public void BaseMethod(){
        Console.WriteLine("base method");
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
    }
}
