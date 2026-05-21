import {
  apiPost,
  createEvent,
  createRoom,
  fetchOrganizerRooms,
  fetchOrganizerEvents,
  fetchRoomBookingDetails,
  fetchOrganizerDashboardInfo, // <-- ADD THIS HERE!
} from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Grab the saved user data from local storage
  const savedUserString = localStorage.getItem("user");

  console.log("Saved user string from localStorage:", savedUserString);
  // 2. Route Protection: Kick them out if they aren't logged in
  if (!savedUserString) {
    console.log("No user session found. Redirecting to login...");
    window.location.href = "./login.html";
    return;
  }

  // 3. Convert the string back into a JavaScript Object
  const currentUser = JSON.parse(savedUserString);

  // 4. Double-check they are actually an Organizer (UserType 2)
  if (currentUser.userType !== 2) {
    alert("Unauthorized. Organizer access only.");
    window.location.href = "./login.html";
    return;
  }

  // 5. Update the UI with their actual name
  updateOrganizerUI(currentUser);

  // Fetch and render rooms immediately
  const actualUserId =
    currentUser.userID ||
    currentUser.userId ||
    currentUser.UserID ||
    currentUser.id ||
    0;
  loadRooms(actualUserId);

  // Fetch and render dashboard metrics!
  loadDashboardMetrics(actualUserId);

  // Fetch and render bookings/events
  loadOrganizerEvents(actualUserId);

  //Fetch and render the Room Occupancy grid!
  loadRoomOccupancy(actualUserId);

  // 6. Attach Event Listener for the Publish Button
  const publishBtn = document.getElementById("publishBtn");
  if (publishBtn) {
    publishBtn.addEventListener("click", (event) =>
      handlePublishEvent(event, currentUser),
    );
  }

  // 7. Attach Event Listener for the Create Room Form
  const addRoomForm = document.getElementById("add-room-form");
  if (addRoomForm) {
    addRoomForm.addEventListener("submit", (event) =>
      handleCreateRoom(event, currentUser),
    );
  }

  // Handle the Custom Add Room Button Submission
  const submitNewRoomBtn = document.getElementById("submit-new-room-btn");

  if (submitNewRoomBtn) {
    submitNewRoomBtn.addEventListener("click", async (event) => {
      event.preventDefault(); // Stop page reload

      console.log("Gathering custom room data...");

      // 1. Grab text and numbers from the Modal
      const title = document.getElementById("modal-input-title").value;
      const location = document.getElementById("modal-input-location").value;
      const capacity =
        parseInt(document.getElementById("modal-input-capacity").value, 10) ||
        0;
      const pricePerDay =
        parseFloat(
          document.getElementById("modal-input-price-per-day").value,
        ) || 0; // <-- NEW PRICE VARIABLE

      // 2. Find which Room Type Radio Button is selected
      let roomTypeID = 1; // Default to Theater
      const typeRadios = document.querySelectorAll(".modal-input-type");
      typeRadios.forEach((radio) => {
        if (radio.checked) {
          roomTypeID = parseInt(radio.value, 10);
        }
      });

      // 3. Map the Checkboxes to 1 or 0
      const wifi = document.getElementById("modal-input-wifi").checked ? 1 : 0;
      const tv = document.getElementById("modal-input-tv").checked ? 1 : 0;
      const kitchen = document.getElementById("modal-input-kitchen").checked
        ? 1
        : 0;

      // 4. Basic Validation
      if (!title || !location) {
        alert("Please provide a Room Title and Location.");
        return;
      }

      // 5. Construct payload exactly as backend requires
      const roomPayload = {
        organizerID: currentUser.userID,
        roomTypeID: roomTypeID,
        title: title,
        location: location,
        maxCapacity: capacity,
        pricePerDay: pricePerDay, // <-- NEW PROPERTY FOR BACKEND
        wifi: wifi,
        television: tv,
        kitchenArea: kitchen,
      };

      console.log("Submitting Custom Room Payload:", roomPayload);

      // 6. Send to API
      const response = await createRoom(roomPayload);

      // 7. Handle Response
      if (response) {
        alert("Room added successfully!");
        document.getElementById("add-room-modal").classList.add("hidden");

        // Clear inputs for next time
        document.getElementById("modal-input-title").value = "";
        document.getElementById("modal-input-location").value = "";
        document.getElementById("modal-input-capacity").value = "";
        document.getElementById("modal-input-price-per-day").value = ""; // <-- CLEAR PRICE

        // Reload rooms so the new one appears instantly
        loadRooms(currentUser.userID || currentUser.userId || currentUser.id);
      } else {
        alert("Failed to add the room. Check the console for details.");
      }
    });
  }
});

function updateOrganizerUI(user) {
  const profileNameElement = document.querySelector("aside .mt-auto .truncate");

  if (profileNameElement) {
    console.log("Flattened User Object from Storage:", user);

    // Notice we REMOVED the .person part! We access it directly.
    console.log("User firstName:", user.firstName);
    console.log("User lastName:", user.lastName);

    // Safely extract the flattened properties
    const firstName = user.email || "Organizer";
    const lastName = user.lastName || "";

    // Combine them and update the HTML placeholder
    profileNameElement.textContent = `${firstName} ${lastName}`.trim();
  }
}

async function handlePublishEvent(event, currentUser) {
  event.preventDefault(); // Stop any default page reloading

  console.log("Gathering event data...");

  // 1. Grab all values from the DOM
  const title = document.getElementById("input-title").value;
  const description = document.getElementById("input-description").value;
  const startDate = document.getElementById("input-start-date").value;
  const endDate = document.getElementById("input-end-date").value;
  const location = document.getElementById("input-location").value;

  // Convert price and capacity to numbers (default to 0 if left blank)
  const price = parseFloat(document.getElementById("input-price").value) || 0;
  const capacity =
    parseInt(document.getElementById("input-capacity").value, 10) || 0;

  // 2. Basic Validation (Ensure they didn't leave required fields blank)
  if (!title || !startDate || !endDate || !location) {
    alert(
      "Please fill in all essential event details (Title, Dates, Location).",
    );
    return;
  }

  // 3. Construct the exact JSON payload your C# backend expects
  // We dynamically pull the organizerID from the logged-in currentUser
  const eventPayload = {
    organizerID: currentUser.userID,
    title: title,
    description: description,
    startDate: startDate,
    endDate: endDate,
    location: location,
    seatCapacity: capacity,
    ticketPrice: price,
  };

  console.log("Submitting Event Payload:", eventPayload);

  // 4. Send the data to the backend
  const response = await createEvent(eventPayload);

  // 5. Handle the result
  if (response) {
    alert("Event published successfully!");

    // Optional: Switch the user back to the main dashboard tab
    document.getElementById("btn-back-dashboard").click();

    // Optional: Reset the form fields here so it's clean for the next event
    document.getElementById("input-title").value = "";
    // ... (you can reset the rest of the inputs as well)
  } else {
    alert("Failed to create the event. Check the console for details.");
  }
}

async function handleCreateRoom(event, currentUser) {
  event.preventDefault(); // Stop page reload

  console.log("Gathering room data...");

  // 1. Grab values from the DOM
  const title = document.getElementById("input-new-room-title").value;
  const location = document.getElementById("input-new-room-location").value;
  const capacity =
    parseInt(document.getElementById("input-new-room-capacity").value, 10) || 0;
  const roomTypeID =
    parseInt(document.getElementById("input-new-room-type").value, 10) || 0;

  // 2. Map the Checkboxes to 1 or 0 (since your C# backend uses integers for these)
  const wifi = document.getElementById("input-new-room-wifi").checked ? 1 : 0;
  const tv = document.getElementById("input-new-room-tv").checked ? 1 : 0;
  const kitchen = document.getElementById("input-new-room-kitchen").checked
    ? 1
    : 0;
  const pricePerDay =
    parseFloat(document.getElementById("modal-input-price-per-day").value) || 0;

  // 3. Construct the exact JSON payload
  const roomPayload = {
    organizerID: currentUser.userID,
    roomTypeID: roomTypeID,
    title: title,
    location: location,
    maxCapacity: capacity,
    wifi: wifi,
    television: tv,
    kitchenArea: kitchen,
    PricePerDay: pricePerDay, // <-- Make sure this matches the property name your C# backend expects! Case-sensitive. If your C# DTO has "pricePerDay", use that instead. Adjust as needed based on your actual backend model.
  };

  console.log("Submitting Room Payload:", roomPayload);

  // 4. Send to backend
  const response = await createRoom(roomPayload);

  // 5. Handle response
  if (response) {
    alert("Room added successfully!");

    // Close the modal and reset the form
    document.getElementById("add-room-modal").classList.add("hidden");
    document.getElementById("add-room-form").reset();
  } else {
    alert("Failed to add the room. Check the console for details.");
  }
}

async function loadRooms(organizerId) {
  const container = document.getElementById("rooms-grid-container");
  const statTotalRooms = document.getElementById("stat-total-rooms");

  if (!container) return;

  // Show a loading state
  container.innerHTML = `<p class="col-span-full text-center text-stone-500 py-10">Loading your rooms...</p>`;

  // Fetch the data
  const rooms = await fetchOrganizerRooms(organizerId);

  // Update the stat counter
  if (statTotalRooms) {
    statTotalRooms.textContent = rooms.length;
  }

  container.innerHTML = ""; // Clear loading text

  // Loop through each room and build a card
  rooms.forEach((room, index) => {
    // Map Room Type ID to a text label and icon
    let typeName = "Room";
    let typeIcon = "meeting_room";

    if (room.roomTypeID === 1) {
      typeName = "Theater";
      typeIcon = "theater_comedy";
    } else if (room.roomTypeID === 2) {
      typeName = "Workshop";
      typeIcon = "brush";
    } else if (room.roomTypeID === 3) {
      typeName = "Classroom";
      typeIcon = "school";
    } else if (room.roomTypeID === 4) {
      typeName = "Boardroom";
      typeIcon = "table_restaurant";
    }

    // Map Amenities to HTML icons
    let amenitiesHtml = "";
    if (room.wifi === 1)
      amenitiesHtml += `<span class="material-symbols-outlined text-primary text-sm">wifi</span>`;
    if (room.television === 1)
      amenitiesHtml += `<span class="material-symbols-outlined text-primary text-sm">tv</span>`;
    if (room.kitchenArea === 1)
      amenitiesHtml += `<span class="material-symbols-outlined text-primary text-sm">restaurant</span>`;

    // If no amenities, show a dash
    if (amenitiesHtml === "")
      amenitiesHtml = `<span class="text-xs text-stone-400">Standard Setup</span>`;

    // Randomize placeholder image slightly for visual variety
    const imgUrl =
      "https://www.dbb.com/wp-content/uploads/2025/06/M-13-scaled.jpg";

    const cardHtml = `
          <div class="group bg-white rounded-xl overflow-hidden custom-shadow border border-transparent hover:border-primary/20 transition-all">
            <div class="h-48 relative overflow-hidden">
              <img alt="${
                room.title
              }" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="${imgUrl}" />
              <div class="absolute top-4 right-4 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                Available
              </div>
            </div>
            <div class="p-6 flex flex-col h-[calc(100%-12rem)]">
              <div class="flex justify-between items-start mb-4">
                <div>
                  <h3 class="text-xl font-bold text-on-surface mb-1">${
                    room.title
                  }</h3>
                  <p class="text-sm text-on-surface-variant flex items-center gap-1">
                    <span class="material-symbols-outlined text-sm">location_on</span>
                    ${room.location}
                  </p>
                </div>
                <button class="text-on-surface-variant hover:text-primary">
                  <span class="material-symbols-outlined">more_vert</span>
                </button>
              </div>
              
              <div class="grid grid-cols-3 gap-2 mb-6">
                <div class="bg-surface-container p-2 rounded-lg text-center">
                  <p class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Capacity</p>
                  <p class="text-sm font-bold text-primary">${
                    room.maxCapacity
                  }</p>
                </div>
                <div class="bg-surface-container p-2 rounded-lg text-center">
                  <p class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Setup</p>
                  <p class="text-sm font-bold text-primary flex items-center justify-center gap-1">
                    <span class="material-symbols-outlined text-[14px]">${typeIcon}</span> ${typeName}
                  </p>
                </div>
                <div class="bg-surface-container p-2 rounded-lg text-center">
                  <p class="text-[10px] uppercase tracking-wider text-on-surface-variant font-bold mb-1">Price/Day</p>
                  <p class="text-sm font-bold text-primary">$${
                    room.PricePerDay || room.pricePerDay || 0
                  }</p>
                </div>
              </div>

              <div class="mt-auto pt-4 border-t border-stone-100 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  ${amenitiesHtml}
                </div>
                <button class="text-sm font-bold text-primary hover:underline">Edit Details</button>
              </div>
            </div>
          </div>
        `;

    container.insertAdjacentHTML("beforeend", cardHtml);
  });

  // AFTER looping through all real rooms, append the "Add New Room" card at the very end
  const addRoomCardHtml = `
      <button id="add-room-card-btn" class="group border-2 border-dashed border-outline-variant rounded-xl flex flex-col items-center justify-center p-8 hover:border-primary hover:bg-primary-fixed/30 transition-all min-h-[400px]">
        <div class="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-colors">
          <span class="material-symbols-outlined text-3xl">add_home</span>
        </div>
        <h3 class="text-xl font-bold text-on-surface mb-1">Add New Room</h3>
        <p class="text-on-surface-variant text-center px-4">Register a new physical space to start scheduling events.</p>
      </button>
    `;
  container.insertAdjacentHTML("beforeend", addRoomCardHtml);

  // Because we just re-injected the Add Room card, we must re-attach its click listener!
  document.getElementById("add-room-card-btn").addEventListener("click", () => {
    document.getElementById("add-room-modal").classList.remove("hidden");
  });
}

async function loadOrganizerEvents(organizerId) {
  const container = document.getElementById("events-portfolio-container");
  if (!container) return;

  // Show loading state
  container.innerHTML = `<p class="text-stone-500 text-sm py-4 text-center">Loading your events...</p>`;

  // Fetch the data from your API
  const events = await fetchOrganizerEvents(organizerId);

  // Clear container
  container.innerHTML = "";

  if (!events || events.length === 0) {
    container.innerHTML = `
            <div class="bg-surface-container-low p-6 rounded-xl border border-dashed border-outline-variant text-center">
                <p class="text-stone-500 text-sm">No events found. Go to Create Event to host your first gathering!</p>
            </div>`;
    return;
  }

  // Loop through each event and generate a card
  events.forEach((event) => {
    // Format the date (e.g., "Apr 23, 2026")
    const dateObj = new Date(event.startDate);
    const formattedDate = dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Determine dynamic styles based on capacity
    const isFull = event.seatReserved >= event.seatCapacity;
    const borderClass = isFull ? "border-error" : "border-primary";
    const textClass = isFull ? "text-error" : "text-primary";

    const badgeHtml = isFull
      ? `<span class="text-xs font-bold text-error px-2 py-0.5 bg-error/10 rounded">Sold Out</span>`
      : `<span class="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">Active</span>`;

    const cardHtml = `
            <div class="bg-white p-5 rounded-xl border-l-4 ${borderClass} shadow-md hover:shadow-lg transition-all cursor-pointer group">
                <div class="flex justify-between items-start mb-2">
                    ${badgeHtml}
                    <span class="material-symbols-outlined text-stone-300 group-hover:text-primary transition-colors">more_vert</span>
                </div>
                <h3 class="font-headline text-lg text-on-surface mb-1 truncate" title="${event.title}">
                    ${event.title}
                </h3>
                <p class="text-sm text-stone-500 font-body mb-4 truncate" title="${event.location}">
                    ${formattedDate} • ${event.location}
                </p>
                <div class="flex items-center justify-between">
                    <div class="text-xs">
                        <p class="text-stone-400 font-bold uppercase tracking-tighter">Tickets Sold</p>
                        <p class="text-lg font-headline ${textClass}">${event.seatReserved}/${event.seatCapacity}</p>
                    </div>
                    <button class="bg-surface border border-outline-variant text-on-surface px-4 py-2 rounded-lg text-sm font-bold hover:bg-stone-50 transition-colors">
                        View Details
                    </button>
                </div>
            </div>
        `;

    container.insertAdjacentHTML("beforeend", cardHtml);
  });
}

async function loadRoomOccupancy(organizerId) {
  const container = document.getElementById("room-occupancy-container");
  if (!container) return;

  // Show loading state
  container.innerHTML = `<p class="col-span-full text-stone-500 text-sm py-4">Loading room statuses...</p>`;

  // Fetch all rooms for this organizer
  const rooms = await fetchOrganizerRooms(organizerId);

  container.innerHTML = ""; // Clear loading text

  if (!rooms || rooms.length === 0) {
    container.innerHTML = `
            <div class="col-span-full bg-surface-container-low p-6 rounded-xl border border-dashed border-outline-variant text-center">
                <p class="text-stone-500 text-sm">No rooms found. Go to 'Manage Rooms' to add your first space!</p>
            </div>`;
    return;
  }

  // Use a for...of loop so we can AWAIT the booking details for occupied rooms
  for (const room of rooms) {
    const isAvailable = room.available != 0; // true if available, false if occupied
    let bookingDetailsHtml = "";

    if (isAvailable) {
      // Render the empty Available state
      bookingDetailsHtml = `
          <div class="mt-6 h-32 flex flex-col items-center justify-center border-2 border-dashed border-stone-200 rounded-lg group-hover:border-primary/30 transition-colors">
            <span class="material-symbols-outlined text-stone-300 mb-1" data-icon="error_outline">error_outline</span>
            <p class="text-stone-400 text-sm font-body text-center px-4">
              No One Has Reserved Yet
            </p>
          </div>
        `;
    } else {
      // Room is occupied! Let's fetch the details using the new API.
      // Safely check capitalization of the Room ID
      const roomId = room.roomID || room.RoomID || room.id;
      const booking = await fetchRoomBookingDetails(roomId);

      if (booking) {
        // Format data safely (handling C# Capitalization)
        const startDate = new Date(
          booking.StartDate || booking.startDate,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const endDate = new Date(
          booking.EndDate || booking.endDate,
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const days = booking.Days || booking.days || 1;
        const firstName =
          booking.user.person.firstName || booking.firstName || "Guest";
        const lastName = booking.user.person.lastName || booking.lastName || "";
        const email =
          booking.user.person.contact.email ||
          booking.email ||
          "No email provided";

        // Generate initials for an automatic Avatar circle
        const initials =
          `${firstName.charAt(0)}${lastName ? lastName.charAt(0) : ""}`.toUpperCase();

        // Render the Occupied User Details state
        bookingDetailsHtml = `
              <div class="mt-6 pt-6 border-t border-stone-200/50">
                <p class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
                  Current Reservation
                </p>
                <div class="flex items-center gap-4 bg-white/50 p-3 rounded-lg">
                  <div class="w-10 h-10 shrink-0 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
                     ${initials}
                  </div>
                  <div class="min-w-0">
                    <p class="font-bold text-on-surface truncate">
                      ${firstName} ${lastName}
                    </p>
                    <p class="text-xs text-stone-500 truncate">
                      ${email}
                    </p>
                  </div>
                </div>
                <div class="mt-3 flex flex-col gap-1 text-primary font-bold text-sm">
                  <div class="flex items-center gap-2">
                     <span class="material-symbols-outlined text-sm">event</span>
                     ${startDate} - ${endDate}
                  </div>
                  <div class="flex items-center gap-2 text-stone-500 text-xs">
                     <span class="material-symbols-outlined text-[14px]">schedule</span>
                     Duration: ${days} day(s)
                  </div>
                </div>
              </div>
            `;
      } else {
        // Fallback in case the booking API fails but the room says occupied
        bookingDetailsHtml = `<div class="mt-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm text-center">Booking details temporarily unavailable.</div>`;
      }
    }

    // Build the main card and inject the interior HTML we just created
    const cardHtml = `
        <div class="bg-surface-container-low rounded-xl p-6 shadow-[0_4px_20px_rgba(46,50,48,0.06)] border border-outline-variant/20 group hover:shadow-lg transition-all duration-300">
          <div class="flex justify-between items-start mb-4">
            <div class="overflow-hidden">
              <h3 class="text-xl font-headline text-on-surface truncate pr-2" title="${room.title}">
                ${room.title}
              </h3>
              <p class="text-stone-400 text-sm font-body mt-1">
                Capacity: ${room.maxCapacity} People
              </p>
            </div>
            <span class="flex shrink-0 items-center gap-1.5 px-3 py-1 font-bold rounded-full text-xs uppercase tracking-wider
                ${isAvailable ? "bg-primary-fixed text-primary" : "bg-red-100 text-red-600"}">
                <span class="w-1.5 h-1.5 rounded-full ${isAvailable ? "bg-primary" : "bg-red-500"}"></span>
                ${isAvailable ? "Available" : "Occupied"}
            </span>
          </div>
          
          ${bookingDetailsHtml}
          
        </div>
    `;

    container.insertAdjacentHTML("beforeend", cardHtml);
  }
}

async function loadDashboardMetrics(organizerId) {
  // 1. Fetch data from backend
  const data = await fetchOrganizerDashboardInfo(organizerId);

  if (!data) return; // If API fails, leave the UI at 0

  // 2. Safely extract properties (handling Capital vs Lowercase)
  const totalEvents = data.TotalEvents || data.totalEvents || 0;
  const totalRooms = data.TotalRooms || data.totalRooms || 0;

  // 3. Do the Math for Grand Totals
  const totalBookings =
    (data.TotalEventBooking || data.totalEventBooking || 0) +
    (data.TotalRoomBooking || data.totalRoomBooking || 0);

  const totalRevenue =
    (data.TotalEventBookingPrice || data.totalEventBookingPrice || 0) +
    (data.TotalRoomBookingPrice || data.totalRoomBookingPrice || 0);

  // 4. Update the HTML Elements
  const statEvents = document.getElementById("stat-dash-events");
  const statRooms = document.getElementById("stat-dash-rooms");
  const statBookings = document.getElementById("stat-dash-bookings");
  const statRevenue = document.getElementById("stat-dash-revenue");

  if (statEvents) statEvents.textContent = totalEvents;
  if (statRooms) statRooms.textContent = totalRooms;
  if (statBookings) statBookings.textContent = totalBookings;
  if (statRevenue) statRevenue.textContent = `$${totalRevenue.toFixed(2)}`;
}
