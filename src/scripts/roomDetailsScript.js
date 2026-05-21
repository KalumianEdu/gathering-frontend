import { fetchSpecificRoom, bookRoom } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Session Check - ALLOW GUESTS
  const savedUserString =
    localStorage.getItem("user") || localStorage.getItem("userInfo");
  const currentUser = savedUserString ? JSON.parse(savedUserString) : null;

  // 2. Get Room ID from URL (e.g., roomDetails.html?id=5)
  const urlParams = new URLSearchParams(window.location.search);
  const roomId = urlParams.get("id");

  if (!roomId) {
    alert("No room selected!");
    window.location.href = "./userMain.html";
    return;
  }

  // 3. Load Room Data
  loadRoomDetails(roomId, currentUser);
});

async function loadRoomDetails(roomId, currentUser) {
  try {
    const room = await fetchSpecificRoom(roomId);

    if (!room) {
      alert("Could not load room details. It may have been removed.");
      window.location.href = "./userMain.html";
      return;
    }

    // Safely check for price capitalization
    const pricePerDay = parseFloat(room.pricePerDay || room.PricePerDay || 0);

    // 4. Populate HTML Elements
    document.getElementById("room-title").textContent =
      room.title || "Workspace";
    document.getElementById("room-location").innerHTML =
      `<span class="material-symbols-outlined">location_on</span> ${room.location || "TBD"}`;
    document.getElementById("room-price").textContent =
      `$${pricePerDay.toFixed(2)}`;
    document.getElementById("room-capacity").textContent =
      `${room.maxCapacity || 0} People`;

    // Set Modal Data
    document.getElementById("modal-room-title").textContent = room.title;
    document.getElementById("modal-room-price").textContent =
      `$${pricePerDay.toFixed(2)} / day`;

    // Map Amenities
    const amenitiesContainer = document.getElementById("room-amenities");
    amenitiesContainer.innerHTML = "";
    if (room.wifi === 1)
      amenitiesContainer.innerHTML += `<div class="flex items-center gap-2 text-stone-600"><span class="material-symbols-outlined text-primary">wifi</span> High-Speed WiFi</div>`;
    if (room.television === 1)
      amenitiesContainer.innerHTML += `<div class="flex items-center gap-2 text-stone-600"><span class="material-symbols-outlined text-primary">tv</span> Smart TV / Monitor</div>`;
    if (room.kitchenArea === 1)
      amenitiesContainer.innerHTML += `<div class="flex items-center gap-2 text-stone-600"><span class="material-symbols-outlined text-primary">restaurant</span> Kitchen Access</div>`;
    if (amenitiesContainer.innerHTML === "")
      amenitiesContainer.innerHTML =
        '<p class="text-stone-500">Standard Setup</p>';

    // 5. Modal Logic
    setupBookingModal(roomId, pricePerDay, currentUser);
  } catch (error) {
    console.error("Error fetching room details:", error);
    alert("An error occurred while loading the room.");
  } finally {
    // ==========================================
    // 6. FADE OUT FULL-SCREEN LOADER
    // ==========================================
    // This runs ONLY AFTER the fetch is complete and the DOM is populated
    const globalLoader = document.getElementById("global-loader");
    if (globalLoader) {
      globalLoader.classList.add("opacity-0");
      setTimeout(() => {
        globalLoader.classList.add("hidden");
      }, 500);
    }
  }
}

function setupBookingModal(roomId, pricePerDay, currentUser) {
  const modal = document.getElementById("booking-modal");
  const authModal = document.getElementById("auth-modal"); // NEW: Auth Modal

  const openBtn = document.getElementById("open-booking-modal");
  const closeBtn = document.getElementById("close-modal");
  const closeAuthBtn = document.getElementById("close-auth-modal-btn"); // NEW: Close Auth Modal

  const startInput = document.getElementById("booking-start");
  const endInput = document.getElementById("booking-end");
  const totalPriceDisplay = document.getElementById("modal-total-price");
  const submitBtn = document.getElementById("submit-booking");

  // Open logic - CHECK AUTH HERE
  openBtn.addEventListener("click", () => {
    if (!currentUser) {
      // User is NOT logged in
      if (authModal) authModal.classList.remove("hidden");
    } else {
      // User IS logged in
      if (modal) modal.classList.remove("hidden");
    }
  });

  // Close logic
  closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

  if (closeAuthBtn) {
    closeAuthBtn.addEventListener("click", () =>
      authModal.classList.add("hidden"),
    );
  }

  // Prevent past dates
  const today = new Date().toISOString().split("T")[0];
  startInput.min = today;

  // Live Price Calculator
  function calculateTotal() {
    if (startInput.value && endInput.value) {
      const start = new Date(startInput.value);
      const end = new Date(endInput.value);

      // Calculate difference in days
      const timeDifference = end.getTime() - start.getTime();
      let days = Math.ceil(timeDifference / (1000 * 3600 * 24));

      // If they book just for today, count it as 1 day
      if (days <= 0) days = 1;

      const total = days * pricePerDay;
      totalPriceDisplay.textContent = `$${total.toFixed(2)}`;
      return total;
    }
    totalPriceDisplay.textContent = "$0.00";
    return 0;
  }

  startInput.addEventListener("change", () => {
    endInput.min = startInput.value; // End date cannot be before start date
    calculateTotal();
  });
  endInput.addEventListener("change", calculateTotal);

  // Submit Booking to Backend
  submitBtn.addEventListener("click", async () => {
    // 1. Validate inputs
    if (!startInput.value || !endInput.value) {
      alert("Please select both a start and end date.");
      return;
    }

    // 2. Grab the credit card fields
    const cardName = document.getElementById("card-name").value;
    const cardNumber = document.getElementById("card-number").value;
    const cardExpiry = document.getElementById("card-expiry").value;
    const cardCvv = document.getElementById("card-cvv").value;

    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) {
      alert(
        "Please complete all Credit Card payment details before confirming.",
      );
      return;
    }

    // 3. Calculate total 'days' for the backend
    const start = new Date(startInput.value);
    const end = new Date(endInput.value);
    const timeDifference = end.getTime() - start.getTime();
    let calculatedDays = Math.ceil(timeDifference / (1000 * 3600 * 24));

    if (calculatedDays <= 0) calculatedDays = 1;

    // 4. Calculate total price
    const calculatedTotal = calculatedDays * pricePerDay;

    // Safely grab user ID
    const actualUserId =
      currentUser.userID ||
      currentUser.userId ||
      currentUser.id ||
      currentUser.person?.personId;

    // 5. Build Payload
    const bookingPayload = {
      endDate: endInput.value,
      userID: parseInt(actualUserId),
      roomID: parseInt(roomId),
      totalPrice: parseFloat(calculatedTotal.toFixed(2)),
      days: parseInt(calculatedDays),
    };

    const response = await bookRoom(bookingPayload);

    if (response) {
      alert("Room reserved successfully!");
      window.location.href = "./userBooking.html";
    } else {
      alert(
        "Failed to book the room. It might already be reserved for these dates.",
      );
    }
  });
}
