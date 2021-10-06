import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, NotFoundError} from "./IInsightFacade";
import JSZip from "jszip";
import fs from "fs-extra";
import {persistDir} from "../../test/TestUtil";
// import {parseQuery} from "../performQuery/parseQuery";
import {is, and, or, lessThan, greaterThan, equalTo} from "../performQuery/logic";
/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {

	private datasetContents;
	private datasetKind;
	private datasetSize;
	private persistDir = "./data";

	constructor() {
		this.datasetContents =  new Map<string, Map<string, any[]>>();
		this.datasetKind = new Map<string, InsightDatasetKind>();
		this.datasetSize = new Map<string, number>();
		// console.trace("InsightFacadeImpl::init()");
	}

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if(id.includes("_")
			|| this.datasetContents.has(id)
			|| !id.replace(/\s/g, "").length) {
			return Promise.reject(new InsightError("id contains an underscore"));
		}
		const jsZip = new JSZip();
		let courseSections = new Map<string, any[]>();
		let size = 0;

		await jsZip.loadAsync(content, {base64: true});
		for (const filename of Object.keys(jsZip.files)) {
			let fileData = await jsZip.files[filename].async("string");
			try {
				let data = JSON.parse(fileData);
				size += data.result.length;
				let coursePath = filename.split("/");
				courseSections.set(coursePath[coursePath.length - 1], data);
			} catch (e) {
				// do nothing
			}
		}

		// add dataset to our internal data structures
		this.datasetContents.set(id, courseSections);
		this.datasetKind.set(id, kind);
		this.datasetSize.set(id, size);

		// add dataset to hard disk
		this.saveToDisk(this.datasetContents.get(id) as Map<string, any[]>, this.persistDir + "/" + id + "/");
		return Promise.resolve(Array.from(this.datasetContents.keys()));
	}

	public removeDataset(id: string): Promise<string> {
		if(id.includes("_")
			|| !id.replace(/\s/g, "").length) {
			return Promise.reject(new InsightError("id contains an underscore or is all white spaces"));
		}
		if(!this.datasetContents.has(id)) {
			return Promise.reject(new NotFoundError("id has not been added yet"));
		}

		// delete key, value pair from corresponding maps
		this.datasetContents.delete(id);
		this.datasetKind.delete(id);
		this.datasetSize.delete(id);

		// remove from hard disk
		fs.removeSync(persistDir + "/" + id);
		return Promise.resolve(id);
	}

	public performQuery(query: any): Promise<any[]> {
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
		console.log(this.recursiveAppend(whereObj));
		return Promise.resolve(this.recursiveAppend(whereObj));
		// return parseQuery(query);
		// return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		let datasets = [];
		for (let [key] of this.datasetContents) {
			let dataset = {
				id: key,
				kind: this.datasetKind.get(key),
				numRows: this.datasetSize.get(key),
			};
			datasets.push(dataset);
		}
		return Promise.resolve(datasets as InsightDataset[]);
	}

	private saveToDisk(data: Map<string, any[]>, path: string): void {
		for (let [key, value] of data) {
			fs.outputJson(path + key + ".json", value, (err) => {
				if (err) {
					throw err;
				}
				// console.log("JSON data is saved."); // commented out to run tests
			});
		}
		return;
	}
	private recursiveAppend (query: any): Promise<any[]> {
		let orderArr = [];
		console.log("object keys:");
		console.log (Object.keys(query));
		if (Object.keys(query)[0] === "IS"){
			let temp = Object.values(query)[0] as any;
			if (!(Object.keys(temp).length === 1)){
				return Promise.reject(new InsightError("Too many keys inside IS"));
			}
			let dsID = Object.keys(temp)[0] as string;
			let courseID = dsID.split("_", 1)[0];
			// check course ID exists
			let skey = dsID.split("_", 1)[1];
			// check skey is legitimate skey
			// return Promise.resolve(is(this.datasetContents.get(courseID), skey, Object.values(temp)[0] as string));
			// let dsInfo = Object.values();
		} else if (Object.keys(query)[0] === "GT") {
			//
		} else if (Object.keys(query)[0] === "LT") {
			//
		} else if (Object.keys(query)[0] === "EQ") {
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
				orderArr.push(this.recursiveAppend(item));
			}
		} else {
			return Promise.reject(new InsightError("Unrecognizable key in WHERE"));
		}
		console.log("recursion");
		console.log(orderArr);
		return Promise.resolve(orderArr);
	}

}
