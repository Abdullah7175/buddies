import { Permissions, webMethod } from "wix-web-module";
import { bookings } from "wix-bookings-backend";

export const updateCustomerInfo = webMethod(Permissions.Anyone, async (bookingId) => {
    const formInfo = {
        contactDetails: {
            firstName: "Fred",
            lastName: "Thompson",
            email: "fred@thompson.com",
            phone: "5558707",
        },
        paymentSelection: [{
            rateLabel: "General",
            numberOfParticipants: 3,
        }, ],
        additionalFields: [{
            value: "A Message from Fred",
            _id: "00000000-0000-0000-0000-000000000008",
        }, ],
    };

    return bookings
        .updateCustomerInfo(bookingId, formInfo)
        .then((booking) => {
            return booking;
        })
        .catch((error) => {
            return error;
        });
});