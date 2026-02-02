
import wixWindow from 'wix-window';
import { updateCustomerInfo } from 'backend/bookingsv2.jsw';

$w.onReady(function () {
    // Get the data passed from the parent page
    const receivedData = wixWindow.lightbox.getContext();

    if (receivedData) {
        const { bookingId, currentKids, currentWeeks } = receivedData;

        // Set initial values - make sure these element IDs match your Wix lightbox elements
        $w('#numberOfKidsInput').value = currentKids || "0";
        $w('#numberOfWeeksInput').value = currentWeeks || "0";

        // Handle save button click
        $w('#saveButton').onClick(async () => {
            const numberOfKids = $w('#numberOfKidsInput').value;
            const numberOfWeeks = $w('#numberOfWeeksInput').value;

            if (!numberOfKids || !numberOfWeeks) {
                $w('#errorText').text = "Please fill in all fields";
                $w('#errorText').show();
                return;
            }

            try {
                $w('#saveButton').disable();
                $w('#errorText').hide();

                // Update the booking
                await updateCustomerInfo(bookingId, parseInt(numberOfKids), parseInt(numberOfWeeks));

                // Close the lightbox and return the updated values
                wixWindow.lightbox.close({
                    numberOfKids: parseInt(numberOfKids),
                    numberOfWeeks: parseInt(numberOfWeeks)
                });

            } catch (error) {
                console.error("Error updating booking:", error);
                $w('#errorText').text = "Failed to update booking. Please try again.";
                $w('#errorText').show();
                $w('#saveButton').enable();
            }
        });

        // Handle cancel button click
        $w('#cancelButton').onClick(() => {
            wixWindow.lightbox.close();
        });
    } else {
        console.error("No booking data received");
        $w('#errorText').text = "No booking data available";
        $w('#errorText').show();
    }
});