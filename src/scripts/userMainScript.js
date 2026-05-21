import { fetchAllEvents, fetchAllRooms } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  console.log("Home Page DOM loaded.");

  // -- Load dynamic data for EVERYONE --
  loadEvents();
  loadRooms();

  // 1. Check for saved user session
  const savedUserString = localStorage.getItem("user");

  const authActions = document.getElementById("auth-actions");
  const userActions = document.getElementById("user-actions");

  if (!savedUserString) {
    console.log("No session found. Viewing as guest.");
    // Show Login/Signup, Hide Profile Menu
    if (authActions) authActions.classList.remove("hidden");
    if (userActions) userActions.classList.add("hidden");
    return; // Exit here so we don't try to bind user-specific listeners
  }

  // 2. User IS logged in
  if (authActions) authActions.classList.add("hidden");
  if (userActions) userActions.classList.remove("hidden");

  const currentUser = JSON.parse(savedUserString);
  console.log("Welcome User:", currentUser);

  // 3. Update the UI with the User's Name
  updateUserUI(currentUser);

  // Show organizer-specific navigation only for organizer users.
  const switchToOrganizerBtn = document.getElementById(
    "switch-to-organizer-btn",
  );
  const userRole = Number(
    currentUser.userType ||
      currentUser.userTypeId ||
      currentUser.userRole ||
      localStorage.getItem("userRole"),
  );
  const isOrganizer = userRole === 2;

  if (switchToOrganizerBtn) {
    if (isOrganizer) {
      switchToOrganizerBtn.classList.remove("hidden");
      switchToOrganizerBtn.style.display = "inline-flex";
      switchToOrganizerBtn.addEventListener("click", () => {
        window.location.href = "./organizerMain.html";
      });
    } else {
      switchToOrganizerBtn.classList.add("hidden");
      switchToOrganizerBtn.style.display = "none";
      switchToOrganizerBtn.removeAttribute("href");
    }
  }

  // 4. Navigation Bindings (My Bookings)
  const btnMyBookings = document.getElementById("my-bookings-btn");
  if (btnMyBookings) {
    btnMyBookings.addEventListener("click", () => {
      window.location.href = "./userBooking.html";
    });
  }

  // 5. Profile Menu Toggle Logic
  const profileMenuBtn = document.getElementById("profile-menu-btn");
  const profileMenu = document.getElementById("profile-menu");

  if (profileMenuBtn && profileMenu) {
    profileMenuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      profileMenu.classList.toggle("hidden");
    });

    // Close menu if clicking anywhere else on the screen
    document.addEventListener("click", (e) => {
      if (
        !profileMenuBtn.contains(e.target) &&
        !profileMenu.contains(e.target)
      ) {
        profileMenu.classList.add("hidden");
      }
    });
  }

  // 6. Secure Logout Logic
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      console.log("Logging out...");

      // Clear all storage
      sessionStorage.clear();
      localStorage.clear();

      // Reload the page to revert back to guest view
      window.location.reload();
    });
  }
});

// --- Helper Functions ---

function updateUserUI(user) {
  const nameDisplay = document.getElementById("user-display-name");

  if (nameDisplay && user) {
    const firstName = user.firstName || "User";
    const lastName = user.lastName || "";
    nameDisplay.textContent = `${firstName} ${lastName}`.trim();
  }
}

// --- Dynamic Loading Functions ---

async function loadEvents() {
  const eventsContainer = document.getElementById("events-container");
  if (!eventsContainer) return;

  const events = await fetchAllEvents();
  eventsContainer.innerHTML = ""; // Clear out any loading state

  if (!events || events.length === 0) {
    eventsContainer.innerHTML = `<p class="col-span-3 text-secondary">No upcoming events found.</p>`;
    return;
  }

  events.forEach((event) => {
    const title = event.eventName || event.title || "Untitled Event";
    const price = event.price ? `$${event.price}` : "Free";
    const location = event.location || "TBD";
    const date = event.startDate
      ? new Date(event.startDate).toLocaleDateString() +
        " - " +
        new Date(event.endDate).toLocaleDateString()
      : "Date TBD";

    const imageUrl = `https://media.licdn.com/dms/image/v2/D4E12AQGEKqyHHKGuzg/article-cover_image-shrink_720_1280/B4EZr9fMa8KoAI-/0/1765189412007?e=2147483647&v=beta&t=cFTffaWSsKGd4SWN359rEODdxoQHLshXOekuIipUR6E`;

    const cardHTML = `
           <div class="group cursor-pointer" onclick="window.location.href='./eventDetails.html?id=${event.eventID || event.id}'">
                <div class="relative aspect-[7/5] rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <img alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imageUrl}"/>
                    <div class="absolute top-4 right-4 bg-gradient-to-r from-primary to-primary-container text-on-primary px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                        ${event.ticketPrice > 0 ? `$${event.ticketPrice}` : "Free"}
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold group-hover:text-primary transition-colors">${title}</h3>
                        
                    </div>
                    <p class="text-secondary font-body">${location}, ${date}</p>
                </div>
            </div>
        `;
    eventsContainer.insertAdjacentHTML("beforeend", cardHTML);
  });
}

async function loadRooms() {
  const roomsContainer = document.getElementById("rooms-container");
  if (!roomsContainer) return;

  const rooms = await fetchAllRooms();
  roomsContainer.innerHTML = "";

  if (!rooms || rooms.length === 0) {
    roomsContainer.innerHTML = `<p class="col-span-3 text-secondary">No available rooms found.</p>`;
    return;
  }

  rooms.forEach((room) => {
    const id = room.roomID || room.RoomID || room.id;
    const title = room.title || room.name || "Conference Room";
    const priceValue = room.pricePerDay || room.PricePerDay;
    const price = priceValue ? `$${priceValue}/day` : "Ask for pricing";
    const capacity = room.maxCapacity || "?";
    const location = room.location || "Main Campus";

    const imageUrl =
      "https://www.dbb.com/wp-content/uploads/2025/06/M-13-scaled.jpg";

    const cardHTML = `
            <div class="group cursor-pointer" onclick="window.location.href='./roomDetails.html?id=${id}'">
                <div class="relative aspect-video rounded-2xl overflow-hidden mb-4 shadow-sm">
                    <img alt="${title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imageUrl}"/>
                    <div class="absolute top-4 right-4 bg-gradient-to-r from-tertiary to-tertiary-container text-on-tertiary px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-1">
                        <span class="material-symbols-outlined text-xs">schedule</span>
                        ${price}
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-between items-start">
                        <h3 class="text-xl font-bold group-hover:text-primary transition-colors">${title}</h3>
                        <div class="flex items-center gap-1 text-sm text-secondary">
                            <span class="material-symbols-outlined text-sm">group</span> ${capacity}
                        </div>
                    </div>
                    <p class="text-secondary font-body">${location}</p>
                </div>
            </div>
        `;
    roomsContainer.insertAdjacentHTML("beforeend", cardHTML);
  });
}
