import wixLocation from 'wix-location';
import wixBookings from 'wix-bookings';

$w.onReady(function () {
    // Get booking details from URL parameters or context
    const bookingId = wixLocation.query.bookingId;

    if (bookingId) {
        // Load booking details to determine the service type
        wixBookings.getBooking(bookingId)
            .then(booking => {
                const serviceTitle = booking.bookedEntity.title;

                // Check if this is a Weekend Kits booking
                if (serviceTitle && serviceTitle.toLowerCase().includes('weekend')) {
                    // Show Weekend Buddy Pack button and hide other elements
                    $w('#weekendBuddyPackButton').show();
                    $w('#standardConfirmation').hide();

                    // Set up the button click handler
                    $w('#weekendBuddyPackButton').onClick(() => {
                        // Redirect to the Weekend Buddy Pack product page
                        wixLocation.to('/product-page/weekend-buddy-pack');
                    });
                } else {
                    // Show standard confirmation for other services
                    $w('#weekendBuddyPackButton').hide();
                    $w('#standardConfirmation').show();
                }
            })
            .catch(error => {
                console.error('Error loading booking details:', error);
                // Show standard confirmation as fallback
                $w('#weekendBuddyPackButton').hide();
                $w('#standardConfirmation').show();
            });
    } else {
        // No booking ID, show standard confirmation
        $w('#weekendBuddyPackButton').hide();
        $w('#standardConfirmation').show();
    }
});