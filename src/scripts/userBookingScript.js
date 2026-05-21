import { fetchUserBookings, fetchUserRoomBookings } from "./api.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("My Bookings DOM loaded.");

    const savedUserString = localStorage.getItem("userInfo") || localStorage.getItem("user");
    
    if (!savedUserString) {
        console.log("No session found. Redirecting to login...");
        window.location.href = "./login.html";
        return;
    }

    const currentUser = JSON.parse(savedUserString);
    
    // Check if standard user
    if (currentUser.userType != 3) {
        alert("Unauthorized. User access only.");
        window.location.href = "./login.html";
        return;
    }

    console.log("Welcome to Bookings, User:", currentUser);

    // 1. Update UI and Bind Navigation
    updateUserUI(currentUser);
    setupNavigation();
    
    /// 2. Load the actual bookings from the database!
    // Safely hunt down the ID based on your Gathering C# backend structure
    const actualUserId = currentUser.userID || currentUser.userId || currentUser.UserID || currentUser.id || 0;

    if (!actualUserId) {
        console.error("CRITICAL ERROR: Could not find the User ID inside this object:", currentUser);
        alert("Session error: Could not find your User ID. Please log in again.");
        return;
    }

    console.log("Fetching bookings for User ID:", actualUserId);
    loadAndRenderBookings(actualUserId);

    loadAndRenderRoomBookings(actualUserId);

});

// --- NEW ROOM BOOKING LOGIC ---

async function loadAndRenderRoomBookings(userId) {
    const roomBookings = await fetchUserRoomBookings(userId);
    
    const activeGrid = document.getElementById("active-rooms-grid");
    const inactiveGrid = document.getElementById("inactive-rooms-grid");

    if (activeGrid) activeGrid.innerHTML = "";
    if (inactiveGrid) inactiveGrid.innerHTML = "";

    // Safely extract array
    const bookingsArray = Array.isArray(roomBookings) ? roomBookings : (roomBookings.$values || []);

    if (bookingsArray.length === 0) {
        if (activeGrid) activeGrid.innerHTML = `<p class="text-stone-500 italic col-span-full">You have no active room reservations.</p>`;
        return;
    }

    bookingsArray.forEach(booking => {
        // Safely extract dates & properties (Handling C# Capitalization)
        const startDate = new Date(booking.StartDate || booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endDate = new Date(booking.EndDate || booking.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const status = booking.Status || booking.status || "Active";
        const days = booking.Days || booking.days || 1;
        const totalPrice = booking.TotalPrice || booking.totalPrice || 0;
        const typeRoom = booking.room.roomTypeID == 1 ? "Theater" : booking.room.roomTypeID == 2 ? "Workspace" : booking.room.roomTypeID == 3 ? "Classroom" : booking.room.roomTypeID == 4 ? "Boardroom" : "Other Type";
        
        // Handle if Room Name is nested or flat
        const roomName = booking.room?.title || booking.RoomName || booking.Title || `Workspace #${booking.RoomID || booking.roomId}`;

        if (status.toLowerCase().trim() === "active") {
            // Render ACTIVE Room Card
            const activeHtml = `
                <div class="md:col-span-6 bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-primary/30 flex flex-col md:flex-row h-full group hover:shadow-md transition-all">
                    <div class="md:w-2/5 relative h-48 md:h-auto bg-stone-200">
                        <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://www.dbb.com/wp-content/uploads/2025/06/M-13-scaled.jpg" />
                        <div class="absolute top-4 left-4 bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-lg font-label text-xs font-bold uppercase tracking-wider shadow-sm">${typeRoom}</div>
                    </div>
                    <div class="md:w-3/5 p-6 flex flex-col justify-between">
                        <div>
                            <h3 class="text-xl font-bold mb-3">${roomName}</h3>
                            <div class="space-y-3 mb-4 bg-white/50 p-3 rounded-lg border border-stone-200/50">
                                <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                                    <span class="material-symbols-outlined text-[16px] text-primary">event</span>
                                    <span class="font-bold">${startDate} to ${endDate}</span>
                                </div>
                                <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                                    <span class="material-symbols-outlined text-[16px] text-primary">schedule</span>
                                    <span>Duration: ${days} day(s)</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex justify-between items-center mt-2 pt-4 border-t border-outline-variant/30">
                            <span class="text-xs font-bold text-stone-500 uppercase">Paid: $${totalPrice.toFixed(2)}</span>
                            <button class="text-primary font-bold text-sm hover:underline">View QR Code</button>
                        </div>
                    </div>
                </div>
            `;
            if (activeGrid) activeGrid.insertAdjacentHTML("beforeend", activeHtml);

        } else {
            // Render INACTIVE/CANCELLED Room Card
            const inactiveHtml = `
                <div class="bg-surface-container/20 border border-outline-variant/40 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                    <div class="flex items-center gap-4 w-full md:w-auto">
                        <div class="w-12 h-12 rounded-full bg-surface-variant flex items-center justify-center text-stone-500">
                            <span class="material-symbols-outlined">meeting_room</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg text-stone-600">${roomName}</h4>
                            <p class="text-sm text-stone-500">Reserved for ${startDate}</p>
                        </div>
                    </div>
                    <div class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                        <div class="flex items-center gap-2 text-sm text-stone-500 bg-stone-100 px-3 py-1 rounded-full border border-stone-200">
                            <span class="material-symbols-outlined text-sm">history</span>
                            ${status}
                        </div>
                    </div>
                </div>
            `;
            if (inactiveGrid) inactiveGrid.insertAdjacentHTML("beforeend", inactiveHtml);
        }
    });
}
// --- API & Rendering Logic ---

async function loadAndRenderBookings(userId) {
    // Fetch data from backend
    const bookings = await fetchUserBookings(userId);
    
    if (!bookings || bookings.length === 0) {
        console.log("No bookings found for this user.");
        return; 
    }

    const confirmedGrid = document.getElementById("confirmed-bookings-grid");
    const activityGrid = document.getElementById("recent-activity-grid");

    // Clear out the hardcoded HTML templates
    if (confirmedGrid) confirmedGrid.innerHTML = "";
    if (activityGrid) activityGrid.innerHTML = "";

    bookings.forEach(booking => {
        // FORMAT DATES: Read directly from the 'booking' object now!
        const startDate = new Date(booking.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const bookingDate = new Date(booking.bookingDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

        if (booking.paymentStatus === "Cancelled") {
            // Render as Cancelled in the Recent Activity Section
            const cancelledHtml = `
                <div class="bg-surface-container/20 border border-dashed border-outline-variant/40 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                    <div class="flex items-center gap-4 w-full md:w-auto">
                        <div class="w-12 h-12 rounded-full bg-error-container/50 flex items-center justify-center text-error">
                            <span class="material-symbols-outlined">cancel</span>
                        </div>
                        <div>
                            <h4 class="font-bold text-lg">${booking.title}</h4>
                            <p class="text-sm text-on-surface-variant">Cancelled on ${bookingDate}</p>
                        </div>
                    </div>
                    <div class="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                        <div class="flex items-center gap-2 text-sm text-error bg-error-container px-3 py-1 rounded-full">
                            <span class="material-symbols-outlined text-sm">block</span>
                            Cancelled
                        </div>
                        <div class="flex gap-2">
                            <span class="bg-surface-variant text-on-surface px-2 py-1 rounded-md text-xs font-bold">Qty: ${booking.quantity}</span>
                        </div>
                    </div>
                </div>
            `;
            if (activityGrid) activityGrid.insertAdjacentHTML("beforeend", cancelledHtml);
            
        } else {
            // Render as Confirmed (Active, Paid, etc.)
            const confirmedHtml = `
                <div class="md:col-span-6 bg-surface-container rounded-xl overflow-hidden shadow-[0_4px_20px_rgba(46,50,48,0.06)] flex flex-col md:flex-row h-full group transition-all hover:shadow-lg">
                    <div class="md:w-2/5 relative h-48 md:h-auto bg-primary-fixed-dim">
                        <img class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://picsum.photos/seed/${booking.eventID}/400/300" />
                        <div class="absolute top-4 left-4 bg-primary text-on-primary px-3 py-1 rounded-lg font-label text-sm">Event</div>
                    </div>
                    <div class="md:w-3/5 p-6 flex flex-col justify-between">
                        <div>
                            <h3 class="text-xl font-bold mb-2 truncate">${booking.title}</h3>
                            <p class="text-sm text-on-surface-variant mb-4 line-clamp-2">${booking.description}</p>
                            <div class="space-y-2 mb-4">
                                <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                                    <span class="material-symbols-outlined text-[16px] text-primary">calendar_today</span>
                                    <span class="font-label">${startDate}</span>
                                </div>
                                <div class="flex items-center gap-2 text-on-surface-variant text-sm">
                                    <span class="material-symbols-outlined text-[16px] text-primary">location_on</span>
                                    <span class="font-label truncate">${booking.location}</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-2 justify-between items-center mt-2 pt-4 border-t border-outline-variant/30">
                            <div class="flex gap-2">
                                <div class="bg-primary-fixed text-on-primary-fixed px-3 py-1 rounded-lg font-bold text-sm">Qty: ${booking.quantity}</div>
                                <div class="bg-surface-variant text-on-surface px-3 py-1 rounded-lg font-bold text-sm">$${booking.totalPrice}</div>
                            </div>
                            <span class="bg-tertiary-container/30 text-on-tertiary-container px-3 py-1 rounded-lg font-label text-xs font-bold uppercase">${booking.paymentStatus}</span>
                        </div>
                    </div>
                </div>
            `;
            if (confirmedGrid) confirmedGrid.insertAdjacentHTML("beforeend", confirmedHtml);
        }
    });
}

// --- Helper Functions ---

function setupNavigation() {
    const exploreLink = document.getElementById("explore-link");
    if (exploreLink) {
        exploreLink.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "./userMain.html";
        });
    }

    const profileMenuBtn = document.getElementById("profile-menu-btn");
    const profileMenu = document.getElementById("profile-menu");
    
    if (profileMenuBtn && profileMenu) {
        profileMenuBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            profileMenu.classList.toggle("hidden");
        });
        
        document.addEventListener("click", (e) => {
            if (!profileMenuBtn.contains(e.target) && !profileMenu.contains(e.target)) {
                profileMenu.classList.add("hidden");
            }
        });
    }

    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.clear();
            localStorage.clear();
            window.location.replace("./login.html");
        });
    }
}

function updateUserUI(user) {
    const nameDisplay = document.getElementById("user-display-name");
    if (nameDisplay && user) {
        // Handle if user details are nested inside 'person'
        const firstName = user.firstName || (user.person && user.person.firstName) || "User";
        const lastName = user.lastName || (user.person && user.person.lastName) || "";
        nameDisplay.textContent = `${firstName} ${lastName}`.trim();
    }
}