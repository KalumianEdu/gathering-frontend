import { PersonDTO } from "./personDTO.js";

class CreateUserDTO {
  constructor({
    userName = "",
    password = "",
    person = null,
    firstName = "",
    lastName = "",
    dateOfBirth = "",
    email = "",
    phoneNumber = "",
    homeAddress = "",
    userTypeId = 0,
  } = {}) {
    this.userName = userName;
    this.password = password;

    const personData = person || {
      firstName,
      lastName,
      dateOfBirth,
      contact: {
        email,
        phoneNumber,
        homeAddress,
      },
    };

    this.person = personData instanceof PersonDTO
      ? personData
      : new PersonDTO(personData);
    this.userTypeId = userTypeId;
  }

  static fromObject(data = {}) {
    return new CreateUserDTO({
      userName: data.username || data.userName || "",
      password: data.password || "",
      person: PersonDTO.fromObject(data.person || data),
      userTypeId: data.userTypeId || 0,
    });
  }

  toJSON() {
    return {
      userName: this.userName,
      password: this.password,
      person: this.person.toJSON(),
      userTypeId: this.userTypeId,
    };
  }
}

export { CreateUserDTO };