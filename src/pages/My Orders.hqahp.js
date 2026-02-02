import { getAllOrders } from 'backend/orders.jsw';
import wixUsers from 'wix-users';
import { currentMember } from 'wix-members';
import { cancelBooking } from 'backend/bookings.jsw';
import { updateCustomerInfo } from 'backend/bookingsv2.jsw';
import wixWindow from 'wix-window';
import wixBookings from 'wix-bookings';
import { orders } from 'wix-ecom-backend';

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
        // Set up options for both orders and bookings
        $w('#statusCheckbox').options = [
            { "value": "APPROVED", "label": "Approved" },
            { "value": "PAID", "label": "Paid" },
            { "value": "CONFIRMED", "label": "Confirmed" },
            { "value": "PENDING", "label": "Pending" },
            { "value": "PENDING_CHECKOUT", "label": "Pending Checkout" },
            { "value": "PENDING_APPROVAL", "label": "Pending Approval" },
            { "value": "CANCELED", "label": "Canceled" },
            { "value": "DECLINED", "label": "Declined" },
            { "value": "FULFILLED", "label": "Fulfilled" }
        ];
        $w('#statusCheckbox').value = ["APPROVED", "PAID", "CONFIRMED", "PENDING", "PENDING_CHECKOUT", "PENDING_APPROVAL"];
        console.log("Status checkbox set up with options:", $w('#statusCheckbox').options);
    } catch (e) {
        console.log("Status checkbox not found, continuing...", e);
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

        // For orders, we don't have the same additional fields structure as bookings
        // We'll extract product information differently
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
        try { $item('#sessionDateText').text = data.createdDate ? new Date(data.createdDate).toLocaleString() : "Unknown Date"; } catch(e) { console.log("sessionDateText not found"); }
        try { $item('#sessionClientNameText').text = data.formInfo.contactDetails.firstName; } catch(e) { console.log("sessionClientNameText not found"); }
        try { $item('#sessionServiceText').text = data.bookedEntity.title + (data.orderNumber ? ` (#${data.orderNumber})` : ""); } catch(e) { console.log("sessionServiceText not found"); }
        try { $item('#sessionStatusText').text = data.status; } catch(e) { console.log("sessionStatusText not found"); }
        try { $item('#sessionNumberOfKids').text = numberKids ? numberKids : "N/A"; } catch(e) { console.log("sessionNumberOfKids not found"); }
        try { $item('#sessionNumberOfWeeks').text = numberWeeks ? numberWeeks : "N/A"; } catch(e) { console.log("sessionNumberOfWeeks not found"); }

        // For orders, show different information and actions
        const isWeekendKits = data.bookedEntity.title && data.bookedEntity.title.toLowerCase().includes('weekend');
        console.log("Order:", data._id, "Title:", data.bookedEntity.title, "Status:", data.status);

        // Hide edit button for orders (orders are typically not editable like bookings)
        try {
            // @ts-ignore
            $item('#editButton').hide();
        } catch(e) {
            console.log("Edit button not found in repeater");
        }

        // Show cancel button for cancellable orders
        try {
            if (data.status === 'APPROVED' || data.status === 'PAID') {
                // @ts-ignore
                $item('#cancelButton').show();
                // @ts-ignore
                $item('#cancelButton').onClick(() => onCancelOrder(data._id));
                console.log("Cancel button shown for order:", data._id);
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

        // Handle both new Orders API format and old fallback format
        let allOrders = [];
        if (allOrdersResponse.orders) {
            // New Orders API format
            allOrders = allOrdersResponse.orders;
        } else if (allOrdersResponse.items) {
            // Old wixData format or fallback
            allOrders = allOrdersResponse.items;
        }

        console.log("All orders count:", allOrders.length);

        // Debug: show first order structure
        if (allOrders.length > 0) {
            console.log("First order structure:", JSON.stringify(allOrders[0], null, 2));
        }

        // Filter orders for current user
        let userOrders = allOrders.filter(order => {
            // Try different possible buyer/contact ID fields
            const buyerContactId = order.buyerInfo?.contactId;
            const contactDetails = order.billingInfo?.contactDetails;
            const buyerEmail = order.buyerInfo?.email;

            return buyerContactId === idContact ||
                   (contactDetails && contactDetails.contactId === idContact) ||
                   (buyerEmail && buyerEmail === member.loginEmail);
        });

        console.log("User orders found:", userOrders.length);

        // If no orders found, try to fall back to bookings API
        if (userOrders.length === 0) {
            console.log("No orders found, trying bookings API...");
            try {
                const bookingsResult = await wixBookings.queryBookings();
                const bookings = bookingsResult.items || [];
                const memberBookings = bookings.filter(booking => {
                    // Filter by contact ID if available
                    return true; // For now, show all bookings
                });

                console.log("Bookings found:", memberBookings.length);

                userOrders = memberBookings.map(booking => ({
                    _id: booking._id,
                    _createdDate: booking.createdDate,
                    status: booking.status,
                    bookedEntity: booking.bookedEntity,
                    formInfo: booking.formInfo
                }));
            } catch (bookingError) {
                console.log("Bookings API also failed:", bookingError);
            }
        }

        // Map the data to match what the repeater expects
        console.log("Mapping orders for repeater:", userOrders.length);
        $w('#sessionsRepeater').data = userOrders.map(order => ({
            _id: order._id,
            // For orders, we don't have booking-specific fields, so we'll map e-commerce order data
            bookedEntity: {
                singleSession: {
                    start: new Date(order._createdDate || Date.now())
                },
                title: order.lineItems?.[0]?.productName?.original || "Order"
            },
            formInfo: {
                contactDetails: {
                    firstName: order.billingInfo?.contactDetails?.firstName || order.buyerInfo?.firstName || "Unknown"
                },
                additionalFields: [
                    // Map order items to additional fields format for compatibility
                    ...(order.lineItems || []).map(item => ({
                        label: "Product",
                        value: item.productName?.original || "Unknown Product"
                    }))
                ]
            },
            status: order.status || "UNKNOWN",
            createdDate: order._createdDate,
            orderNumber: order.number
        }));

        if (userOrders.length === 0) {
            $w('#errorText').show();
            $w('#errorText').text = "No orders or bookings found. Try placing an order or booking a service first.";
        } else {
            $w('#errorText').hide();
            console.log("Orders/bookings loaded successfully:", userOrders.length);
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

async function onCancelOrder(orderId) {
    console.log("Cancel order: ", orderId);

    if (!confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
        return;
    }

    try {
        $w('#errorText').hide();
        await orders.cancelOrder(orderId);
        loadBookings(); // Refresh the list
    } catch (error) {
        console.error("Error cancelling order:", error);
        $w('#errorText').text = "Failed to cancel order. Please try again.";
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