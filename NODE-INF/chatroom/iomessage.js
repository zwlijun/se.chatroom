"use strict";

class IOMessage {
	constructor(){
		this.head = {};
		this.body = {};
	}

	setHead(head){
		this.head = head || {};
	}

	getHead(){
		return this.head;
	}

	setBody(body){
		this.body = body || {};
	}

	getBody(){
		return this.body;
	}

	format(){
		return {
			"head": this.getHead(),
			"body": this.getBody()
		};
	}
};

module.exports = IOMessage;