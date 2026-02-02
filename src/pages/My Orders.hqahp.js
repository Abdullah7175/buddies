import { getAllOrders } from 'backend/orders.jsw';
import wixUsers from 'wix-users';
import { currentMember } from 'wix-members';
import { cancelBooking } from 'backend/bookings.jsw';
import { updateCustomerInfo } from 'backend/bookingsv2.jsw';
import wixWindow from 'wix-window';

$w.onReady(function () {
    initElements();
    loadBookings();
});

function initElements() {

    $w('#submitButton').onClick(() => loadBookings());

    $w('#statusCheckbox').options = [
        { "value": "CONFIRMED", "label": "CONFIRMED" },
        { "value": "CANCELED", "label": "CANCELED" },
        { "value": "PENDING", "label": "PENDING" },
        { "value": "PENDING_CHECKOUT", "label": "PENDING CHECKOUT" },
        { "value": "PENDING_APPROVAL", "label": "PENDING APPROVAL" },
        { "value": "DECLINED", "label": "DECLINED" }
    ];

    $w('#statusCheckbox').value = ["CONFIRMED", "CANCELED", "PENDING", "PENDING_CHECKOUT", "PENDING_APPROVAL", "DECLINED"];
    $w('#dateStart').value = new Date("2023-01-01T17:00:00.000Z");
    $w('#dateEnd').value = new Date("2023-12-12T17:00:00.000Z");

    $w('#sessionsRepeater').onItemReady(($item, data) => {
       

        let numberKids = "";
        let numberWeeks = "";

        let fullData = data.formInfo.additionalFields;

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

        // Add Edit and Cancel buttons and their handlers
        $item('#editButton').onClick(() => onEditBooking(data._id, numberKids, numberWeeks));
        $item('#cancelButton').onClick(() => onCancelBooking(data._id));
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

    getAllOrders().then((allOrders) => {
        let userBookings = allOrders.items.filter(order => {
            const contactDetails = order.bookingInfo.formInfo.contactDetails;
            return contactDetails && contactDetails.contactId === idContact && statuses.includes(order.bookingInfo.status);
        });

        $w('#sessionsRepeater').data = userBookings.map(order => ({
            _id: order._id,
            ...order.bookingInfo,
            status: order.bookingInfo.status,
            bookedEntity: {
                singleSession: {
                    start: new Date(order.bookingInfo.bookedEntity.singleSession.start),
                },
                title: order.bookingInfo.bookedEntity.title,
            },
        }));
        if (userBookings.length === 0) {
            $w('#errorText').show();
            $w('#errorText').text = "No bookings found";
        }
    }).catch((error) => {
        console.error('loadBookings error - ' + error.message);
    }).finally(() => {
        $w('#submitButton').enable();
    });
}

async function onEditBooking(bookingId, currentKids, currentWeeks) {
    console.log("Edit booking: ", bookingId);
    // Implement lightbox or navigation to an edit form
    const { numberOfKids, numberOfWeeks } = await wixWindow.openLightbox("EditBookingLightbox", {
        bookingId,
        currentKids,
        currentWeeks,
    });

    if (numberOfKids !== undefined && numberOfWeeks !== undefined) {
        // Call backend function to update booking
        try {
            await updateCustomerInfo(bookingId, numberOfKids, numberOfWeeks);
            loadBookings(); // Refresh the list
        } catch (error) {
            console.error("Error updating booking:", error);
        }
    }
}

async function onCancelBooking(bookingId) {
    console.log("Cancel booking: ", bookingId);
    try {
        await cancelBooking(bookingId);
        loadBookings(); // Refresh the list
    } catch (error) {
        console.error("Error cancelling booking:", error);
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