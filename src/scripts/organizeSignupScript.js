import { signupOrganizer } from "./api.js";

async function handleOrganizerSignup(event) {
  event.preventDefault(); // Stop the page from reloading

  // 1. Grab all the values from the form
  const fullName = document.getElementById("fullName").value;
  const lastName = document.getElementById("lastName").value;
  const dateOfBirth = document.getElementById("dateOfBirth").value;
  const phoneNumber = document.getElementById("phoneNumber").value;
  const email = document.getElementById("email").value;
  const homeAddress = document.getElementById("homeAddress").value;
  const userName = document.getElementById("userName").value;
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirmPassword").value;
  const aboutOrganizer = document.getElementById("aboutOrganizer").value;

  // 2. Basic Validation
  if (password !== confirmPassword) {
    alert("Passwords do not match. Please try again.");
    return;
  }

  if (!terms) {
    alert("You must agree to the Terms of Service.");
    return;
  }

  // 3. Construct the exact JSON payload the backend expects
  const signupPayload = {
    fullName: fullName,
    lastName: lastName,
    dateOfBirth: dateOfBirth,
    phoneNumber: phoneNumber,
    email: email,
    homeAddress: homeAddress,
    userName: userName,
    password: password,
    aboutOrganizer: aboutOrganizer
  };

  console.log("Submitting Payload:", signupPayload);

  // 4. Send the data via the API helper
  const response = await signupOrganizer(signupPayload);

  // 5. Handle the response
  if (response) {
    alert("Application submitted successfully! Please log in.");
    // Redirect the user to the login page
    window.location.href = "./login.html"; 
  } else {
    alert("Registration failed. Please check your information or try again later.");
  }
}

// 6. Attach the event listener when the DOM loads
document.addEventListener("DOMContentLoaded", function () {
  console.log("Organizer Signup DOM loaded, attaching listeners...");
  
  const form = document.getElementById("organizer-signup-form");
  if (form) {
    form.addEventListener("submit", handleOrganizerSignup);
  } else {
    console.error("Could not find the organizer-signup-form element.");
  }
});