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