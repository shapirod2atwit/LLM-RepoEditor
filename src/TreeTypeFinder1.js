class Car {
   constructor(brand) {
    this.carname = brand;
   }
   present() {
    return 'I have a ' + this.carname;
   }
}

//inheritance example
class Model extends Car {
   constructor(brand, mod) {
    super(brand);
    this.model = mod;
   }
   //override example
   present() {
    return super.present() + ', it is a ' + this.model;
   }
}