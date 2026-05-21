// Signup API wrapper
// Uses the shared API helper in src/api/api.js.
import { apiPost } from "./api.js";

async function signupUser(userData) {
  // Validate userData before sending
  if (!userData || typeof userData !== 'object') {
    throw new Error('Invalid user data provided.');
  }

  if (!userData.userName || userData.userName.toString().trim() === '') {
    throw new Error('Username is required and cannot be empty.');
  }

  if (!userData.password || userData.password.toString().trim() === '') {
    throw new Error('Password is required and cannot be empty.');
  }

  if (!userData.person || typeof userData.person !== 'object') {
    throw new Error('Person data is required.');
  }

  const personFields = [
    { key: 'firstName', label: 'First Name' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'dateOfBirth', label: 'Date of Birth' },
  ];

  for (const field of personFields) {
    if (!userData.person[field.key] || userData.person[field.key].toString().trim() === '') {
      throw new Error(`${field.label} is required and cannot be empty.`);
    }
  }

  if (!userData.person.contact || typeof userData.person.contact !== 'object') {
    throw new Error('Contact data is required.');
  }

  const contactFields = [
    { key: 'email', label: 'Email' },
    { key: 'phoneNumber', label: 'Phone Number' },
    { key: 'homeAddress', label: 'Home Address' },
  ];

  for (const field of contactFields) {
    if (!userData.person.contact[field.key] || userData.person.contact[field.key].toString().trim() === '') {
      throw new Error(`${field.label} is required and cannot be empty.`);
    }
  }

  const requestBody = userData && typeof userData.toJSON === "function"
    ? userData.toJSON()
    : userData;

  return apiPost("/GatheringApi/signup", requestBody);
}

export { signupUser };

// Example usage:
// signupUser({
//   username: "johndoe",
//   firstName: "John",
//   lastName: "Doe",
//   phone: "123-456-7890",
//   email: "john@example.com",
//   dob: "1990-01-01",
//   password: "securePassword123"
// })
//   .then(response => console.log(response))
//   .catch(error => console.error(error));
