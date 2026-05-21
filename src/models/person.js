import { Contact } from "./contact.js";

class Person extends Contact{
    constructor(contactID, email, phoneNumber, homeAddress, personID, firstName, lastName, dateOfBirth) {
        super(contactID, email, phoneNumber, homeAddress);
        this.personID = personID;
        this.firstName = firstName;
        this.lastName = lastName;
        this.dateOfBirth = dateOfBirth;
    }

    getFullName() {
        return `${this.firstName} ${this.lastName}`;
    }   

}

export { Person };