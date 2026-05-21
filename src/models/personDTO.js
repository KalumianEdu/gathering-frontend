import { ContactDTO } from "./contactDTO.js";

class PersonDTO {
  constructor({
    firstName = "",
    lastName = "",
    dateOfBirth = "",
    contact = {},
  } = {}) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.dateOfBirth = dateOfBirth;
    this.contact = contact instanceof ContactDTO
      ? contact
      : new ContactDTO(contact);
  }

  static fromObject(data = {}) {
    return new PersonDTO({
      firstName: data.firstName || "",
      lastName: data.lastName || "",
      dateOfBirth: data.dateOfBirth || "",
      contact: ContactDTO.fromObject(data.contact || data),
    });
  }

  toJSON() {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      dateOfBirth: this.dateOfBirth,
      contact: this.contact.toJSON(),
    };
  }
}

export { PersonDTO };