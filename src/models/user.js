import { Person } from "./person.js";
class User extends Person{
  constructor(contactID, email, phoneNumber, homeAddress, 
    personID, firstName, lastName, dateOfBirth, 
    userID, username, userType
  ) {
    super(contactID, email, phoneNumber, homeAddress, personID, firstName, lastName, dateOfBirth);
    this.userID = userID;
    this.username = username;
    this.userType = userType; // integer (1=Admin, 2=Organizer, 3=Regular User)
  }



  // Example method
  getUserType() {
    
    return this.userType;
  }

  getUserInfo() {

    return `${this.username} (ID: ${this.userID})`;

  }

}

export { User };