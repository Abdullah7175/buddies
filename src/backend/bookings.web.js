import wixWindowFrontend from 'wix-window-frontend';
import wixLocationFrontend from 'wix-location-frontend';
import { cancelBooking } from 'backend/bookings.jsw';

$w.onReady(async function () {

});

export async function confirmButton_click(event) {
    let receivedData = wixWindowFrontend.lightbox.getContext();
    console.log("ID " + receivedData._id);
    let bookingId = receivedData._id;
    let response = await cancelBooking(bookingId);
    console.log("RES " + response);
    setTimeout(() => {
        wixLocationFrontend.to("https://www.backpackbuddiesatl.org/product-page/weekend-buddy-pack"); // Placeholder: Replace with actual product page URL

        wixWindowFrontend.lightbox.close({
            lightBoxSend: "Refresh",
        });
    }, 3000);
}

export function cancelOrder_click() {
    wixWindowFrontend.lightbox.close();
}