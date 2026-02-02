import wixData from 'wix-data';
import wixBookingsFrontend from 'wix-bookings-frontend';
import { createBookingSession, confirmBooking, getService } from "backend/bookingsv2.jsw";

let formFields; // form fields the selected service requires
let selectedSlot; // service slot that was selected

// When the page loads, query for all services and use the
// results to set the service repeater's data.
$w.onReady(function () {
    wixData.query("Bookings/Services")
        .find()
        .then((results) => {
            $w("#serviceRepeater").data = results.items;
        });
});

// When the service repeater's data is set, populate its items
// with the service data.
export function serviceRepeater_itemReady($item, itemData, index) {
    $item("#serviceName").text = itemData.serviceName;
    $item("#tagLine").text = itemData.tagLine;
    //   $item("#image").src = itemData.imageURL;
}

// When a service is selected, store its form fields for later,
// get the service's available slots, and use the results to set
// the slot repeater's data.
export function serviceRepeaterContainer_click(event) {
    $w("#serviceRepeater").forItems([event.context.itemId], ($item, itemData, index) => {
        formFields = itemData.form.fields;
    });

    // let startRange = new Date($w('#scheduledDate').value.toDateString());
    // let endRange = new Date($w('#scheduledDate').value.toDateString());
    // endRange.setDate(endRange.getDate() + 30);

    // let options = {
    //     startDateTime: startRange,
    //     endDateTime: endRange
    // };

    wixBookingsFrontend.getServiceAvailability(event.context.itemId)
        .then((availability) => {
            $w("#slotRepeater").data = availability.slots;
        });
}

// When the slot repeater's data is set, populate its items
// with the slot data.
export function slotRepeater_itemReady($item, itemData, index) {
    $item("#dateText").text = itemData.startDateTime.toLocaleDateString();
    $item("#timeText").text = itemData.startDateTime.toLocaleTimeString();
}

// When a slot is selected, store it for later, use the stored form
// fields to set form field repeater's data.
export function slotRepeaterContainer_click(event) {
    $w("#slotRepeater").forItems([event.context.itemId], ($item, itemData, index) => {
        selectedSlot = itemData;
    });

    $w("#formFieldRepeater").data = formFields;
}

// When the form field repeater's data is set, populate its items
// with the form fields.
export function formFieldRepeater_itemReady($item, itemData, index) {
    $item("#fieldInput").placeholder = itemData.label;
}

// When the booking button is clicked, grab the form field values,
// build the bookingInfo object, and perform a booking checkout.
export async function bookButton_click(event) {
    let formFieldValues = [];

    $w("#formFieldRepeater").forEachItem(($item, itemData, index) => {
        formFieldValues.push({
            "_id": itemData._id,
            "value": $item("#fieldInput").value
        });
    });

    let bookingInfo = {
        "bookedEntity": {
            "slot": {

            }
        },
        "formFields": formFieldValues,
        "totalParticipants": 1
    };

    console.log(bookingInfo, "BOOKING");

    let options = {};

    let result = await createBookingSession(bookingInfo, options);
    console.log("SESSION CREATE");
    console.log(result, "RESULT CREATE BOOKING");
}