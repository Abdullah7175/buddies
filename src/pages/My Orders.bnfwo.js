// Velo API Reference: https://www.wix.com/velo/reference/api-overview/introduction

// $w.onReady(function () {

	// Write your Javascript code here using the Velo framework API

	// Print hello world:
	// console.log("Hello world!");

	// Call functions on page elements, e.g.:
	// $w("#button1").label = "Click me!";

	// Click "Run", or Preview your site, to execute your code

// });
import wixData from 'wix-data';

export async function getAllItems(nameCollection, limit) {

    let options = {
        "suppressAuth": true
    };

    let results = await wixData.query(nameCollection)
        .limit(limit)
        .find(options);
    let allItems = results.items;
    while (results.hasNext()) {
        results = await results.next();
        allItems = allItems.concat(results.items);
    }

    return allItems;
}

export function getOrders() {
    let products = getAllItems("Stores/Orders", 100);

    return products;
}