class Contact {
    constructor(contactID, email, phoneNumber, homeAddress) {
        this.contactID = contactID; // integer
        this.email = email;
        this.phoneNumber = phoneNumber;
        this.homeAddress = homeAddress;
    }
    
    getContactInfo() {
        return `Email: ${this.email}, Phone: ${this.phoneNumber}, Address: ${this.homeAddress}`;
    }   
}

export { Contact };