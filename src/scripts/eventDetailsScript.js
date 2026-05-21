import { fetchSpecificEvent, bookEvent } from "./api.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Get User ID
  const savedUserString = localStorage.getItem("user");
  const currentUser = savedUserString ? JSON.parse(savedUserString) : null;

  // 2. Get the Event ID from the URL
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get("id");

  if (!eventId) {
    alert("No event specified!");
    window.location.href = "./userMain.html";
    return;
  }

  // ==========================================
  // 3. WAIT FOR BACKEND DATA TO LOAD
  // ==========================================
  try {
    const eventData = await fetchSpecificEvent(eventId);

    if (!eventData) {
      alert("Failed to load event details. It may have been removed.");
      window.location.href = "./userMain.html";
      return; // Stop execution if no data
    }

    // 4. Populate the Main UI
    const loadingState = document.getElementById("loading-state");
    if (loadingState) loadingState.classList.add("hidden"); // Hide the old inline text loader

    document.getElementById("event-content").classList.remove("hidden");

    document.getElementById("detail-title").textContent =
      eventData.eventName || eventData.title;
    document.getElementById("detail-date").textContent = eventData.startDate
      ? new Date(eventData.startDate).toLocaleString() +
        " - " +
        new Date(eventData.endDate).toLocaleString()
      : "TBD";
    document.getElementById("detail-location").textContent =
      eventData.location || "TBD";

    // Save base price to calculate total later
    const basePrice = eventData.ticketPrice || 0;
    document.getElementById("detail-price").textContent = basePrice
      ? `$${basePrice}`
      : "Free";
    document.getElementById("detail-description").textContent =
      eventData.description || "No description provided.";

    // Capacity & Sold Out Logic
    const maxCapacity = eventData.maxCapacity || eventData.seatCapacity || 0;
    const seatsReserved =
      eventData.seatReserved || eventData.seatsReserved || 0;
    const capacityTextElement = document.getElementById("detail-capacity-text");
    const bookBtn = document.getElementById("book-now-btn");
    const qtyInput = document.getElementById("ticket-quantity");

    if (maxCapacity > 0) {
      const availableSeats = maxCapacity - seatsReserved;
      capacityTextElement.textContent = `${seatsReserved} / ${maxCapacity} Spots Booked (${availableSeats} left!)`;
      if (qtyInput) qtyInput.max = availableSeats; // Prevent booking more than available

      if (seatsReserved >= maxCapacity) {
        capacityTextElement.textContent = `Sold Out (${maxCapacity} / ${maxCapacity} booked)`;
        capacityTextElement.classList.add("text-red-600");
        bookBtn.textContent = "Event Sold Out";
        bookBtn.disabled = true;
        bookBtn.classList.remove("hover:opacity-90", "bg-[#4a7c59]");
        bookBtn.classList.add("bg-stone-400", "cursor-not-allowed");
      }
    } else {
      capacityTextElement.textContent = "Unlimited Capacity";
    }

    document.getElementById("detail-image").src =
      `https://picsum.photos/seed/event-${eventId}/1200/400`;

    // --- 5. MODAL & BOOKING LOGIC ---
    const bookingModal = document.getElementById("booking-modal");
    const authModal = document.getElementById("auth-modal");
    const closeModalBtn = document.getElementById("close-modal-btn");
    const closeAuthModalBtn = document.getElementById("close-auth-modal-btn");
    const totalDisplay = document.getElementById("modal-total-price");
    const bookingForm = document.getElementById("booking-form");

    const updateModalTotal = () => {
      if (!qtyInput) return;
      const qty = parseInt(qtyInput.value) || 1;
      totalDisplay.textContent =
        basePrice === 0 ? "Free" : `$${(basePrice * qty).toFixed(2)}`;
    };

    bookBtn.addEventListener("click", () => {
      if (!currentUser) {
        if (authModal) authModal.classList.remove("hidden");
      } else {
        updateModalTotal(); // update total right before opening
        if (bookingModal) bookingModal.classList.remove("hidden");
      }
    });

    if (closeAuthModalBtn) {
      closeAuthModalBtn.addEventListener("click", () => {
        authModal.classList.add("hidden");
      });
    }

    closeModalBtn.addEventListener("click", () => {
      bookingModal.classList.add("hidden");
    });

    if (qtyInput) {
      qtyInput.addEventListener("input", updateModalTotal);
    }

    bookingForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const submitBtn = document.getElementById("confirm-booking-btn");
      const originalText = submitBtn.textContent;
      submitBtn.textContent = "Processing...";
      submitBtn.disabled = true;

      const payload = {
        UserID: parseInt(currentUser.userID || currentUser.userId),
        EventID: parseInt(eventId),
        TicketQuantity: parseInt(qtyInput.value),
        Status: "Confirmed",
        TicketPrice: parseFloat(basePrice),
      };

      const result = await bookEvent(payload);

      if (result) {
        alert("Booking Successful! Check your email for tickets.");
        window.location.href = "./userMain.html";
      } else {
        alert("Failed to process booking. Please try again.");
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
    });
  } catch (error) {
    console.error("Error fetching event details:", error);
    alert("An error occurred while loading the event.");
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
});
