import { getAllOrders } from 'backend/orders.jsw';
import wixUsers from 'wix-users';
import { currentMember } from 'wix-members';
import { cancelBooking } from 'backend/bookings.jsw';
import { updateCustomerInfo } from 'backend/bookingsv2.jsw';
import wixWindow from 'wix-window';
import wixBookings from 'wix-bookings';

$w.onReady(function () {
    initElements();
    loadBookings();
});

function initElements() {

    $w('#submitButton').onClick(() => loadBookings());

    // Set up status filter with only active bookings by default
    $w('#statusCheckbox').options = [
        { "value": "CONFIRMED", "label": "Confirmed" },
        { "value": "PENDING", "label": "Pending" },
        { "value": "PENDING_CHECKOUT", "label": "Pending Checkout" },
        { "value": "PENDING_APPROVAL", "label": "Pending Approval" },
        { "value": "CANCELED", "label": "Canceled" },
        { "value": "DECLINED", "label": "Declined" }
    ];

    // Default to showing confirmed and pending bookings
    $w('#statusCheckbox').value = ["CONFIRMED", "PENDING", "PENDING_CHECKOUT", "PENDING_APPROVAL"];

    // Set date range to last 6 months by default
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);

    $w('#dateStart').value = sixMonthsAgo;
    $w('#dateEnd').value = nextYear;

    $w('#sessionsRepeater').onItemReady(($item, data) => {
       

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

        $item('#sessionDateText').text = data.bookedEntity.singleSession.start.toLocaleString();
        $item('#sessionClientNameText').text = data.formInfo.contactDetails.firstName;
        $item('#sessionServiceText').text = data.bookedEntity.title;
        $item('#sessionStatusText').text = data.status;
        $item('#sessionNumberOfKids').text = numberKids ? numberKids : "0";
        $item('#sessionNumberOfWeeks').text = numberWeeks ? numberWeeks : "0";

        // Determine if this is a Weekend Kits booking (only Weekend Kits can be edited)
        const isWeekendKits = data.bookedEntity.title && data.bookedEntity.title.toLowerCase().includes('weekend');

        // Show/hide edit button based on booking type
        if (isWeekendKits && data.status === 'CONFIRMED') {
            // @ts-ignore
            $item('#editButton').show();
            // @ts-ignore
            $item('#editButton').onClick(() => onEditBooking(data._id, numberKids, numberWeeks));
        } else {
            // @ts-ignore
            $item('#editButton').hide();
        }

        // Show cancel button for active bookings
        if (data.status === 'CONFIRMED' || data.status === 'PENDING' || data.status === 'PENDING_CHECKOUT') {
            // @ts-ignore
            $item('#cancelButton').show();
            // @ts-ignore
            $item('#cancelButton').onClick(() => onCancelBooking(data._id));
        } else {
            // @ts-ignore
            $item('#cancelButton').hide();
        }
    });
    $w('#sessionsRepeater').data = [];
}
async function loadBookings() {
    $w('#errorText').hide();
    if (!($w('#dateStart').valid && $w('#dateEnd').valid && $w('#statusCheckbox').valid)) {
        $w('#errorText').show();
        $w('#errorText').text = "Error in form fields";
        return;
    }

    $w('#submitButton').disable();
    const dateStart = $w('#dateStart').value;
    const dateEndTemp = $w('#dateEnd').value;
    const dateEnd = new Date(dateEndTemp.getTime() + 60 * 60 * 24 * 1000); // adding one day to the end date so bookings on that date also pass the filter
    const statuses = $w('#statusCheckbox').value;

    let member = await getMember();
    let idContact = member.contactId;

    try {
        // Use custom function to get all orders (fallback since frontend API doesn't have queryBookings)
        const allOrdersResponse = await getAllOrders();
        const bookingsResult = { items: allOrdersResponse.items || [] };
        let userBookings = bookingsResult.items || [];

        // Filter by status and date range manually
        userBookings = userBookings.filter(booking => {
            const bookingDate = new Date(booking.bookedEntity.singleSession.start);
            return statuses.includes(booking.status) &&
                   bookingDate >= dateStart &&
                   bookingDate <= dateEnd;
        });

        // Sort by date (newest first)
        userBookings.sort((a, b) => {
            const dateA = new Date(a.bookedEntity.singleSession.start);
            const dateB = new Date(b.bookedEntity.singleSession.start);
            return dateB.getTime() - dateA.getTime();
        });

        $w('#sessionsRepeater').data = userBookings.map(booking => ({
            _id: booking._id,
            bookedEntity: booking.bookedEntity,
            formInfo: booking.formInfo,
            status: booking.status,
            createdDate: booking.createdDate
        }));

        if (userBookings.length === 0) {
            $w('#errorText').show();
            $w('#errorText').text = "No bookings found for the selected criteria. Try adjusting your filters.";
        } else {
            $w('#errorText').hide();
        }
    } catch (error) {
        console.error('loadBookings error - ' + error.message);
        $w('#errorText').show();
        $w('#errorText').text = "Error loading bookings. Please try again.";
    } finally {
        $w('#submitButton').enable();
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