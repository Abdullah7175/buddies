import { getAllOrders } from 'backend/orders.jsw';
import wixUsers from 'wix-users';
import { currentMember } from 'wix-members';
import { cancelBooking } from 'backend/bookings.jsw';
import { updateCustomerInfo } from 'backend/bookingsv2.jsw';
import wixWindow from 'wix-window';
import wixBookings from 'wix-bookings';

$w.onReady(function () {
    console.log("My Orders page loaded");
    initElements();
    loadBookings();
});

function initElements() {
    console.log("Initializing elements...");

    // Try to set up submit button if it exists
    try {
        $w('#submitButton').onClick(() => loadBookings());
        console.log("Submit button set up");
    } catch (e) {
        console.log("Submit button not found, continuing...");
    }

    // Try to set up status checkbox if it exists
    try {
        $w('#statusCheckbox').options = [
            { "value": "CONFIRMED", "label": "Confirmed" },
            { "value": "PENDING", "label": "Pending" },
            { "value": "PENDING_CHECKOUT", "label": "Pending Checkout" },
            { "value": "PENDING_APPROVAL", "label": "Pending Approval" },
            { "value": "CANCELED", "label": "Canceled" },
            { "value": "DECLINED", "label": "Declined" }
        ];
        $w('#statusCheckbox').value = ["CONFIRMED", "PENDING", "PENDING_CHECKOUT", "PENDING_APPROVAL"];
        console.log("Status checkbox set up");
    } catch (e) {
        console.log("Status checkbox not found, continuing...");
    }

    // Try to set up date pickers if they exist
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const nextYear = new Date();
        nextYear.setFullYear(nextYear.getFullYear() + 1);

        $w('#dateStart').value = sixMonthsAgo;
        $w('#dateEnd').value = nextYear;
        console.log("Date pickers set up");
    } catch (e) {
        console.log("Date pickers not found, continuing...");
    }

    $w('#sessionsRepeater').onItemReady(($item, data) => {
        console.log("Setting up repeater item:", data);

        let numberKids = "";
        let numberWeeks = "";

        let fullData = data.formInfo.additionalFields || [];

        for (let i = 0; i < fullData.length; i++) {
            var contactDetails = fullData[i];

            if (contactDetails.label == "How many children per week?") {
                numberKids = contactDetails.value;
            }

            if (contactDetails.label == "How many weeks is this for?") {
                numberWeeks = contactDetails.value;
            }
        }

        // Set text elements (try-catch for missing elements)
        try { $item('#sessionDateText').text = data.bookedEntity.singleSession.start.toLocaleString(); } catch(e) { console.log("sessionDateText not found"); }
        try { $item('#sessionClientNameText').text = data.formInfo.contactDetails.firstName; } catch(e) { console.log("sessionClientNameText not found"); }
        try { $item('#sessionServiceText').text = data.bookedEntity.title; } catch(e) { console.log("sessionServiceText not found"); }
        try { $item('#sessionStatusText').text = data.status; } catch(e) { console.log("sessionStatusText not found"); }
        try { $item('#sessionNumberOfKids').text = numberKids ? numberKids : "0"; } catch(e) { console.log("sessionNumberOfKids not found"); }
        try { $item('#sessionNumberOfWeeks').text = numberWeeks ? numberWeeks : "0"; } catch(e) { console.log("sessionNumberOfWeeks not found"); }

        // Determine if this is a Weekend Kits booking (only Weekend Kits can be edited)
        const isWeekendKits = data.bookedEntity.title && data.bookedEntity.title.toLowerCase().includes('weekend');
        console.log("Is Weekend Kits booking:", isWeekendKits, "Status:", data.status);

        // Show/hide edit button based on booking type
        try {
            if (isWeekendKits && data.status === 'CONFIRMED') {
                // @ts-ignore
                $item('#editButton').show();
                // @ts-ignore
                $item('#editButton').onClick(() => onEditBooking(data._id, numberKids, numberWeeks));
                console.log("Edit button shown for booking:", data._id);
            } else {
                // @ts-ignore
                $item('#editButton').hide();
            }
        } catch(e) {
            console.log("Edit button not found in repeater");
        }

        // Show cancel button for active bookings
        try {
            if (data.status === 'CONFIRMED' || data.status === 'PENDING' || data.status === 'PENDING_CHECKOUT') {
                // @ts-ignore
                $item('#cancelButton').show();
                // @ts-ignore
                $item('#cancelButton').onClick(() => onCancelBooking(data._id));
                console.log("Cancel button shown for booking:", data._id);
            } else {
                // @ts-ignore
                $item('#cancelButton').hide();
            }
        } catch(e) {
            console.log("Cancel button not found in repeater");
        }
    });
    $w('#sessionsRepeater').data = [];
}
async function loadBookings() {
    console.log("Loading bookings...");
    try { $w('#errorText').hide(); } catch(e) {}

    try {
        let member = await getMember();
        let idContact = member.contactId;

        console.log("Member contact ID:", idContact);

        // Use custom function to get all orders
        const allOrdersResponse = await getAllOrders();
        console.log("All orders response:", allOrdersResponse);

        const allOrders = allOrdersResponse.items || [];
        console.log("All orders count:", allOrders.length);

        // Debug: show first order structure
        if (allOrders.length > 0) {
            console.log("First order structure:", JSON.stringify(allOrders[0], null, 2));
        }

        // Filter bookings for current user
        let userBookings = allOrders.filter(order => {
            const contactDetails = order.bookingInfo?.formInfo?.contactDetails;
            return contactDetails && contactDetails.contactId === idContact;
        });

        console.log("User bookings found:", userBookings.length);

        // Map the data to match what the repeater expects
        $w('#sessionsRepeater').data = userBookings.map(order => ({
            _id: order._id,
            bookedEntity: {
                singleSession: {
                    start: new Date(order.bookingInfo?.bookedEntity?.singleSession?.start || Date.now())
                },
                title: order.bookingInfo?.bookedEntity?.title || "Unknown Service"
            },
            formInfo: order.bookingInfo?.formInfo || { contactDetails: { firstName: "Unknown" }, additionalFields: [] },
            status: order.bookingInfo?.status || "UNKNOWN"
        }));

        if (userBookings.length === 0) {
            $w('#errorText').show();
            $w('#errorText').text = "No bookings found. Try booking a service first.";
        } else {
            $w('#errorText').hide();
            console.log("Bookings loaded successfully");
        }
    } catch (error) {
        console.error('loadBookings error:', error);
        $w('#errorText').show();
        $w('#errorText').text = "Error loading bookings: " + error.message;
    }
}

async function onEditBooking(bookingId, currentKids, currentWeeks) {
    console.log("Edit booking: ", bookingId);

    try {
        // Open the existing edit lightbox
        const result = await wixWindow.openLightbox("Edit Order", {
            bookingId,
            currentKids,
            currentWeeks,
        });

        // If user saved changes, refresh the bookings list
        if (result && result.numberOfKids !== undefined && result.numberOfWeeks !== undefined) {
            loadBookings(); // Refresh the list to show updated data
        }
    } catch (error) {
        console.error("Error editing booking:", error);
        // Show error message to user
        $w('#errorText').text = "Failed to open edit form. Please try again.";
        $w('#errorText').show();
    }
}

async function onCancelBooking(bookingId) {
    console.log("Cancel booking: ", bookingId);

    try {
        $w('#errorText').hide();
        await cancelBooking(bookingId);
        loadBookings(); // Refresh the list
    } catch (error) {
        console.error("Error cancelling booking:", error);
        $w('#errorText').text = "Failed to cancel booking. Please try again.";
        $w('#errorText').show();
    }
}

async function isUserAdmin() {
    try {

        let user = wixUsers.currentUser;
        if (!user.loggedIn) {
            console.log('Member is not logged in');
            return false;
        }

        let roles = await user.getRoles();
        if (roles.find(role => role.name == "Admin")) {
            return true;
        } else {
            console.log('Member is not an Admin');
            return false;
        }

    } catch (error) {
        console.error('isUserAdmin error - ' + error.message);
        return false;
    }
}

export async function getMember() {

    let options = {
        "fieldsets": ['FULL']
    };

    let infoMember = null;
    await currentMember.getMember(options)
        .then((member) => {
            infoMember = member;
        })
        .catch((error) => {
            console.error(error);
        });

    return infoMember;
}