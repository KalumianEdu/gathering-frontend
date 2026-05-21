class ContactDTO {
  constructor({
    email = "",
    phoneNumber = "",
    homeAddress = "",
  } = {}) {
    this.email = email;
    this.phoneNumber = phoneNumber;
    this.homeAddress = homeAddress;
  }

  static fromObject(data = {}) {
    return new ContactDTO({
      email: data.email || "",
      phoneNumber: data.phoneNumber || "",
      homeAddress: data.homeAddress || "",
    });
  }

  toJSON() {
    return {
      email: this.email,
      phoneNumber: this.phoneNumber,
      homeAddress: this.homeAddress,
    };
  }
}

export { ContactDTO };