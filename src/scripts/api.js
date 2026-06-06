// API helper for requests
// Base backend URL for your API.
const API_BASE_URL = "https://gathering.runasp.net";

import { jwtDecode } from "https://cdn.jsdelivr.net/npm/jwt-decode@4.0.0/+esm";
import { User } from "../models/user.js";
import RefreshTokenResponse from "../models/DTOs/Auth/refreshTokenResponse.js";

function getAccessToken() {
  return localStorage.getItem("accessToken");
}
function getRefreshToken() {
  return localStorage.getItem("refreshToken");
}

function getApiBaseUrl() {
  return API_BASE_URL.replace(/\/+$/, "");
}

function buildApiUrl(endpoint) {
  const normalizedEndpoint = endpoint.replace(/^\/+/, "");
  const baseUrl = getApiBaseUrl();

  if (!baseUrl) {
    throw new Error(
      "API_BASE_URL is not configured. Set it in src/api/api.js.",
    );
  }

  return `${baseUrl}/${normalizedEndpoint}`;
}

async function apiGet(endpoint, options = {}, isRetry = false) {
  const url = buildApiUrl(endpoint);
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "GET",

    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
    ...options,
  });

  if (response.status == 401) {
    if (isRetry) {
      localStorage.clear();
      window.location.href = "./login.html"; // Redirect to login page on unauthorized access after retry
      throw new Error("Unauthorized access loop blocked.");
    }
    const currentRefreshToken = await getRefreshToken();
    const email = localStorage.getItem("email");
    await refreshToken(currentRefreshToken, email);

    // Retry the original request exactly ONCE by passing true to isRetry
    return await apiGet(endpoint, options, true);
  } else if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `GET ${url} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response.json();
}

async function apiPost(endpoint, body, options = {}, isRetry = false) {
  const url = buildApiUrl(endpoint);
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },

    body: JSON.stringify(body),
    ...options,
  });
  if (response.status == 401) {
    if (isRetry) {
      localStorage.clear();
      window.location.href = "./login.html";
      throw new Error("Unauthorized access loop blocked.");
    }
    const currentRefreshToken = await getRefreshToken();
    const email = localStorage.getItem("email");
    await refreshToken(currentRefreshToken, email);

    // Retry the original request exactly ONCE by passing true to isRetry
    return await apiPost(endpoint, body, options, true);
  } else if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `POST ${url} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response.json();
}

// Without Authorization header (for login/signup)
async function apiPostNormal(endpoint, body) {
  const url = buildApiUrl(endpoint);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();

    console.log(
      `POST ${url} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response;
}

async function apiPut(endpoint, body, options = {}, isRetry = false) {
  const url = buildApiUrl(endpoint);
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,

      ...options.headers,
    },
    body: JSON.stringify(body),
    ...options,
  });

  if (response.status == 401) {
    if (isRetry) {
      localStorage.clear();
      window.location.href = "./login.html";
      throw new Error("Unauthorized access loop blocked.");
    }
    const currentRefreshToken = await getRefreshToken();
    const email = localStorage.getItem("email");
    await refreshToken(currentRefreshToken, email);

    // Retry the original request exactly ONCE by passing true to isRetry
    return await apiPut(endpoint, body, options, true);
  } else if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `PUT ${url} failed with status ${response.status}: ${errorText}`,
    );
  }

  return response.json();
}

async function apiDelete(endpoint, options = {}, isRetry = false) {
  const url = buildApiUrl(endpoint);
  const token = getAccessToken();

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,

      ...options.headers,
    },
    ...options, // Note: DELETE requests usually do not need a body
  });

  if (response.status == 401) {
    if (isRetry) {
      localStorage.clear();
      window.location.href = "./login.html";
      throw new Error("Unauthorized access loop blocked.");
    }
    const currentRefreshToken = getRefreshToken();
    const email = localStorage.getItem("email");
    await refreshToken(currentRefreshToken, email);

    // Retry the original request exactly ONCE by passing true to isRetry
    return await apiDelete(endpoint, options, true);
  } else if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DELETE ${url} failed with status ${response.status}: ${errorText}`,
    );
  }

  // Handle empty responses gracefully (some DELETE endpoints return nothing)
  const text = await response.text();
  return text ? JSON.parse(text) : { success: true };
}

function decodeToken(token) {
  try {
    const decoded = jwtDecode(token);

    console.log(
      decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"],
    ); // Outputs: 123
    console.log(
      decoded[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ],
    ); // Outputs: "admin"
    return decoded;
  } catch (error) {
    console.error("Invalid token format", error);
  }
}

async function refreshToken(currentRefreshToken, currentEmail) {
  const response = await apiPostNormal("api/Auth/refresh", {
    refreshToken: currentRefreshToken,
    email: currentEmail,
  });
  var newTokens = await response.json();
  // Assuming the response contains the new access token and refresh token
  console.log("Received new tokens from refresh:", newTokens);
  localStorage.setItem("accessToken", newTokens["accessToken"]);
  localStorage.setItem("refreshToken", newTokens["refreshToken"]);
}
async function fetchUserInfoWithLocalStorageID() {
  const userID = localStorage.getItem("userID");

  try {
    const data = await apiPost("/GatheringApi/get/user/info/" + userID, {});
    // We reach into the nested JSON (data.person...) to grab the specific strings
    // and pass them as a flat list into your class constructor.
    const userInfo = new User(
      null, // contactID
      data.person?.contact?.email, // email
      data.person?.contact?.phoneNumber, // phoneNumber
      data.person?.contact?.homeAddress, // homeAddress
      null, // personID
      data.person?.firstName, // firstName
      data.person?.lastName, // lastName
      data.person?.dateOfBirth, // dateOfBirth
      userID, // userID
      data.userName, // username
      data.userTypeId, // userType
    );

    localStorage.setItem("user", JSON.stringify(userInfo));
    localStorage.setItem("email", userInfo.email); // Store email for token refresh
  } catch (error) {
    console.error("Error fetching detailed user info:", error);
  }
}

async function fetchUserInfo(userId) {
  try {
    const data = await apiPost("GatheringApi/user/info", { userid: userId });

    // We reach into the nested JSON (data.person...) to grab the specific strings
    // and pass them as a flat list into your class constructor.
    const userInfo = new User(
      null, // contactID
      data.person?.contact?.email, // email
      data.person?.contact?.phoneNumber, // phoneNumber
      data.person?.contact?.homeAddress, // homeAddress
      null, // personID
      data.person?.firstName, // firstName
      data.person?.lastName, // lastName
      data.person?.dateOfBirth, // dateOfBirth
      userId, // userID
      data.userName, // username
      data.userTypeId, // userType
    );
    localStorage.setItem("userInfo", JSON.stringify(userInfo));

    return userInfo;
  } catch (error) {
    console.error("Error fetching detailed user info:", error);
    return null;
  }
}

// Add this right above your export statement in api.js
async function createEvent(eventData) {
  try {
    const data = await apiPost("GatheringApi/create/event", eventData);
    return data;
  } catch (error) {
    console.error("Error creating event:", error);
    return null;
  }
}

// Add this to your export statement at the bottom
async function fetchSystemTotals() {
  try {
    // Note: Ensure the endpoint path matches your C# routing exactly
    // Based on your description: 'get/all/totals'
    const data = await apiGet("GatheringApi/get/all/totals");
    return data;
  } catch (error) {
    console.error("Error fetching system totals:", error);
    return null;
  }
}

async function getWaitingApplicationApi() {
  try {
    const data = await apiGet("/GatheringApi/get/all/organizer/applications");
    return data;
  } catch (error) {
    console.error("Error fetching waiting applications:", error);
    return []; // Return an empty array if it fails so the UI doesn't crash
  }
}

async function approveOrganizer(userId) {
  try {
    // We attach the ID directly to the end of the URL like ?id=2
    // We also send an empty object {} for the body
    const urlWithId = `/GatheringApi/approve/organizer?id=${parseInt(userId)}`;

    const data = await apiPut(urlWithId, {});
    return data;
  } catch (error) {
    console.error("Error approving organizer:", error);
    return null;
  }
}

async function declineOrganizer(userId) {
  try {
    // We attach the ID directly to the URL just like we did for Approve
    const urlWithId = `/GatheringApi/decline/organizer?id=${parseInt(userId)}`;

    const data = await apiDelete(urlWithId);
    return data;
  } catch (error) {
    console.error("Error declining organizer:", error);
    return null;
  }
}

async function fetchPaginatedUsers(pageNumber, pageSize) {
  try {
    // We attach the parameters directly to the URL string for a GET request
    const url = `GatheringApi/get/some/users/list?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    const data = await apiGet(url);
    return data;
  } catch (error) {
    console.error("Error fetching paginated users:", error);
    return null;
  }
}
async function createRoom(roomData) {
  console.log("Calling create room API with", roomData);
  try {
    const data = await apiPost("GatheringApi/create/room", roomData);
    return data;
  } catch (error) {
    console.error("Error creating room:", error);
    return null;
  }
}

async function fetchOrganizerRooms(organizerId) {
  try {
    const data = await apiGet(`GatheringApi/get/all/rooms/${organizerId}`);
    return data;
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return []; // Return empty array on failure so UI doesn't break
  }
}

async function fetchAllEvents() {
  try {
    const data = await apiGet("/GatheringApi/get/all/events");
    return data;
  } catch (error) {
    console.error("Error fetching all events:", error);
    return [];
  }
}

async function fetchAllRooms() {
  try {
    const data = await apiGet("/GatheringApi/get/all/rooms");
    return data;
  } catch (error) {
    console.error("Error fetching all rooms:", error);
    return [];
  }
}

async function fetchSpecificEvent(eventId) {
  try {
    const data = await apiGet(`GatheringApi/get/specific/event/${eventId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching event ${eventId}:`, error);
    return null;
  }
}

async function bookEvent(bookingData) {
  console.log("Calling book event API with", bookingData);
  try {
    const data = await apiPost("GatheringApi/book/event", bookingData);
    return data;
  } catch (error) {
    console.error("Error booking event:", error);
    return null;
  }
}

async function fetchOrganizerEvents(organizerId) {
  try {
    // Note: Using exact spelling from your backend endpoint
    const data = await apiGet(
      `GatheringApi/get/all/organizer/event/${organizerId}`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching organizer events:", error);
    return []; // Return empty array on failure so UI doesn't break
  }
}

// Add this inside api.js
async function fetchUserBookings(userId) {
  try {
    // Replace this URL with your actual endpoint route if it differs!
    const data = await apiGet(
      `/GatheringApi/get/all/user/booking/event/${parseInt(userId)}`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching user bookings:", error);
    return [];
  }
}

// Add these right above your export statement in api.js
async function fetchSpecificRoom(roomId) {
  try {
    const data = await apiGet(`GatheringApi/get/specific/room/${roomId}`);
    return data;
  } catch (error) {
    console.error(`Error fetching room ${roomId}:`, error);
    return null;
  }
}

async function bookRoom(bookingData) {
  console.log("Calling book room API with", bookingData);
  try {
    const data = await apiPost("GatheringApi/book/room", bookingData);
    return data;
  } catch (error) {
    console.error("Error booking room:", error);
    return null;
  }
}

// Add this right above your export statement in api.js
async function fetchRoomBookingDetails(roomId) {
  try {
    const data = await apiGet(
      `GatheringApi/get/room/booking/details/${roomId}`,
    );
    return data;
  } catch (error) {
    console.error(`Error fetching booking details for room ${roomId}:`, error);
    return null; // Return null if it fails so the UI doesn't crash
  }
}

// Add this near your other fetch functions in api.js
async function fetchUserRoomBookings(userId) {
  try {
    const data = await apiGet(
      `/GatheringApi/get/all/user/booking/room/${parseInt(userId)}`,
    );
    return data;
  } catch (error) {
    console.error("Error fetching user room bookings:", error);
    return [];
  }
}

// Add this near your other fetch functions in api.js
async function fetchOrganizerDashboardInfo(organizerId) {
  const data = await apiGet(
    `GatheringApi/get/all/organizer/dashboard/info/${parseInt(organizerId)}`,
  );
  return data;
}

// CRITICAL: Remember to add fetchOrganizerDashboardInfo to your export { ... } at the bottom!
// CRITICAL: Remember to add fetchUserRoomBookings to your export { ... } at the bottom!
// Don't forget to add fetchUserBookings to your export list at the bottom!
export {
  apiGet,
  apiPost,
  login,
  signupOrganizer,
  fetchUserInfo,
  createEvent,
  fetchSystemTotals,
  getWaitingApplicationApi,
  approveOrganizer,
  declineOrganizer,
  fetchPaginatedUsers,
  createRoom,
  fetchOrganizerRooms,
  fetchAllEvents,
  fetchAllRooms,
  fetchSpecificEvent,
  bookEvent,
  fetchOrganizerEvents,
  fetchUserBookings,
  fetchSpecificRoom,
  bookRoom,
  fetchRoomBookingDetails,
  fetchUserRoomBookings,
  fetchOrganizerDashboardInfo,
  fetchUserInfoWithLocalStorageID,
};

// Example usage:
// apiGet("users")
//   .then(data => console.log(data))
//   .catch(error => console.error(error));
//
// apiPost("GatheringApi/signup", { email: "hello@gathering.com" })
//   .then(data => console.log(data))
//   .catch(error => console.error(error));

// Add this to api.js
async function signupOrganizer(organizerData) {
  console.log("Calling organizer signup API with", organizerData);
  try {
    const data = await apiPostNormal(
      "api/Auth/organizer/signup",
      organizerData,
    );
    return data;
  } catch (error) {
    console.error("Error during organizer signup:", error);
    return null;
  }
}

// Update your export statement at the bottom (or top) of the file to include it:
// export { apiGet, apiPost, login, signupOrganizer };

async function login(email, password) {
  try {
    const response = await apiPostNormal("api/Auth/login", {
      email,
      password,
    });

    var tokens = await response.json();

    // store in localStorage
    // localStorage.setItem("user", JSON.stringify(user));
    //// Here you need to do a parallel .
    localStorage.setItem("accessToken", tokens["accessToken"]);
    localStorage.setItem("refreshToken", tokens["refreshToken"]);

    const decodedToken = decodeToken(tokens["accessToken"]);
    localStorage.setItem(
      "userID",
      decodedToken[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
      ],
    );
    localStorage.setItem(
      "userRole",
      decodedToken[
        "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
      ],
    );
  } catch (error) {
    console.error("Error:", error);
  }
}
