import {IInsightFacade, InsightError, NotFoundError} from "../controller/IInsightFacade";


export function parseQuery (query: any): Promise<any[]> {
	if (!(Object.prototype.hasOwnProperty.call(query, "WHERE")
		&& Object.prototype.hasOwnProperty.call(query, "OPTIONS"))) {
		return Promise.reject(new InsightError("WHERE or OPTIONS not correct"));
	}
	console.log("made past first check");
	const whereObj = query["WHERE"];
	const optionObj = query["OPTIONS"];
	console.log(whereObj, optionObj);
	if (Object.keys(whereObj).length === 0) {
		return Promise.resolve([]);
	} else if (Object.keys(whereObj).length > 1) {
		return Promise.reject(new InsightError("Too many objects in WHERE"));
	}
	console.log(recursiveAppend(whereObj));
	return Promise.resolve(recursiveAppend(whereObj));
}

function recursiveAppend (query: any): Promise<any[]> {
	let orderArr = [];
	console.log("object keys:");
	console.log (Object.keys(query));
	if (Object.keys(query)[0] === "IS"
		|| Object.keys(query)[0] === "GT"
		|| Object.keys(query)[0] === "LT"
		|| Object.keys(query)[0] === "EQ") {
		return Promise.resolve(Object.keys(query));
	// }
	// else if (Object.keys(query)[0] === "NOT") {
	// 	for (let item in query["NOT"]) {
	// 		orderArr.push(recursiveAppend(item));
	// 	}
	// 	// orderArr.push(recursiveAppend(Object.keys(query)));
	// 	// return orderArr
	// } else if (Object.keys(query)[0] === "AND") {
	// 	for (let item in query["AND"]) {
	// 		orderArr.push(recursiveAppend(item));
	// 	}
	} else if (Object.keys(query)[0] === "OR"
				|| Object.keys(query)[0] === "AND"
				|| Object.keys(query)[0] === "NOT") {
		console.log("in or and not");
		// console.log(Object.values(query));
		console.log(Object.values(query)[0]);
		let values = Object.values(query)[0] as any[];
		for (let item of values) {
			console.log(item);
			orderArr.push(recursiveAppend(item));
		}
	} else {
		return Promise.reject(new InsightError("Unrecognizable key in WHERE"));
	}
	console.log("recursion");
	console.log(orderArr);
	return Promise.resolve(orderArr);
}
// to do: keep testing the list return by creating a new folder to place json files so i can test queries

