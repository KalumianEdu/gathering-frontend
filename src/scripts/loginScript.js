import { login, fetchUserInfoWithLocalStorageID } from "./api.js";

// 1. Core API Logic
async function handleLogin(email, password) {
  // 1. Authenticate the user
  await login(email, password);

  const accessToken = localStorage.getItem("accessToken");

  if (accessToken == null) {
    alert("Invalid email or password");
    return false;
  }

  // 2. Fetch their detailed profile using their new ID
  // Note: Ensure 'loggedInUser.id' or 'loggedInUser.UserID' matches the exact property name returned by your login API

  // CRITICAL FIX: Wrap this in a try/catch to prevent redirecting on failure
  try {
    await fetchUserInfoWithLocalStorageID();
  } catch (error) {
    alert("Failed to load user profile. Please try logging in again.");
    return false; // Stop the function here! No redirect!
  }
  // 5. Handle Redirection
  const redirectPages = {
    1: "./adminMain.html",
    2: "./organizerMain.html",
    3: "./userMain.html",
  };

  const userRole = Number(localStorage.getItem("userRole"));
  // Ensure you are using the correct case for userType (e.g., UserType vs userType)
  const pageToRedirect = redirectPages[userRole];

  console.log("Redirecting to", pageToRedirect);

  if (pageToRedirect) {
    window.location.href = pageToRedirect;
  } else {
    alert("Unknown user type");

    return false;
  }

  return true;
}

// 2. Form Submission Handler
async function handleLoginFromForm(event) {
  event.preventDefault(); // This stops the page from reloading

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  if (!email || !password) {
    alert("Please fill in all fields");
    return;
  }

  console.log("Email:", email);
  console.log("Password:", password);

  // Call the core logic
  await handleLogin(email, password);
}

// 3. Modal Functions
function openSignupModal(event) {
  event.preventDefault();
  document.getElementById("signup-modal").classList.remove("hidden");
}

function closeSignupModal() {
  document.getElementById("signup-modal").classList.add("hidden");
}

function handleSignup(userType) {
  if (userType === "organizer") {
    window.location.href = "./organizeSignup.html";
  } else {
    window.location.href = "./signup.html";
  }
}

// 4. Attach Event Listeners on DOM Load
document.addEventListener("DOMContentLoaded", function () {
  // Attach to the form's submit event (handles both clicking the button and pressing Enter)
  const form =
    document.getElementById("login-form") || document.querySelector("form");
  if (form) {
    form.addEventListener("submit", handleLoginFromForm);
  }

  // Close modal if clicking the background overlay
  const signupModal = document.getElementById("signup-modal");
  if (signupModal) {
    signupModal.addEventListener("click", function (e) {
      if (e.target === signupModal) {
        closeSignupModal();
      }
    });
  }
});

// 5. Expose Modal Functions to Global Scope
// Since your HTML still has `onclick="openSignupModal(event)"`, we must attach these to `window`
window.openSignupModal = openSignupModal;
window.closeSignupModal = closeSignupModal;
window.handleSignup = handleSignup;
