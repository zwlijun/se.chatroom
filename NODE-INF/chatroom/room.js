"use strict";

class Chatroom {
	constructor(room, mds){
		/*{7:owner, 6:super, 5:administrator, 4:administrator, 3:administrator, 2:administrator, 1:noraml, 0:deny}*/
		this._room      = room; //{
								//    owner:String, 
								//    id:String, 
								//    name:String, 
								//    maxusers:Number, 
								//    secret:Boolean, 
								//    secretcode:String,
								//    channel:String
								//    ispublic:Boolean
								//}
		this._users     = [];   //[{nickname:String, secrectcode:String, avator:String, flag:String, sid:String/*成功进入后动态设置*/}]
		this._count     = 0;
		this._status    = 1;    //0:关闭， 1:开启
		this._messages  = [];
		this._mds       = mds.mount(this);  //MessageDistributionService@see mds.js
	}

	get room(){
		return this._room;
	}

	get users(){
		return this._users;
	}

	get count(){
		return this._count;
	}

	set status(s){
		this._status = s;
	}

	get status(){
		return this._status;
	}

	get messages(){
		return this._messages;
	}

	get mds(){
		return this._mds;
	}

	permissions(user){
		let flag = user.flag;
		let table = {
			"7": {
				"sa": true,
				"granted": true,
				"alias": "owner"
			},
			"6": {
				"sa": true,
				"granted": true,
				"alias": "super"
			},
			"5": {
				"sa": true,
				"granted": true,
				"alias": "administrator"
			},
			"4": {
				"sa": true,
				"granted": true,
				"alias": "administrator"
			},
			"3": {
				"sa": true,
				"granted": true,
				"alias": "administrator"
			},
			"2": {
				"sa": true,
				"granted": true,
				"alias": "administrator"
			},
			"1": {
				"sa": false,
				"granted": true,
				"alias": "noraml"
			},
			"0": {
				"sa": false,
				"granted": false,
				"alias": "deny"
			}
		};

		if(flag in table){
			return table[flag];
		}

		return table["0"];
	}

	checkUserExisted(user){
		return (null !== this.findUser(user.nickname));
	}

	findUser(nickname){
		let users = this.users;
		let user = null;

		for(var i = 0; i < this.count; i++){
			user = users[i];

			if(user && (nickname === user.nickname)){
				return user;
			}
		}

		return null;
	}

	addUser(user){
		this._users.push(user);
		this._count = this._users.length;
	}

	removeUser(user){
		let users = this._users;
		let size = this._count;

		for(var i = 0; i < size; i++){
			if(user.nickname === users[i].nickname){
				this._users.splice(i, 1);
				this._count = this._users.length;

				break;
			}
		}
	}

	verify(user){
		let room = this.room;

		let secret = room.secret;
		let secrectcode = room.secrectcode;

		if(true === secret){
			return user.secrectcode === secrectcode;
		}

		return true;
	}

	update(user){
		let users = this._users;
		let size = this._count;

		for(var i = 0; i < size; i++){
			if(user.nickname === users[i].nickname){
				this._users.splice(i, 1, user);
				this._count = this._users.length;

				break;
			}
		}
	}

	join(user){
		let p = this.permissions(user);

		if(1 !== this.status){
			return Chatroom.ERROR.CLOSE;
		}

		if(!p.granted){
			return Chatroom.ERROR.DENY;
		}

		if(!this.verify(user)){
			return Chatroom.ERROR.NOT_PASS;
		}

		if(this.checkUserExisted(user)){
			return Chatroom.ERROR.EXISTED;
		}

		if(!p.sa && this.count > this.room.maxusers){
			return Chatroom.ERROR.MAX_USERS;
		}

		this.addUser(user);

		return Chatroom.ERROR.SUCCESS;
	}

	leave(user){
		if(this.checkUserExisted(user)){
			this.removeUser(user);
		}
	}

	pushMessage(head, imsg){
		this._messages.push({
			"head": head,
			"body": imsg
		});
	}

	shiftMessage(){
		return this._messages.shift();
	}
}

Chatroom.ERROR = {
	"SUCCESS": 0,
	"USER_EXISTED": 1000,
	"MAX_USERS": 1001,
	"USER_DENIED": 1002,
	"NOT_PASS": 1003,
	"CLOSE": 1004 
};

module.exports = Chatroom;
