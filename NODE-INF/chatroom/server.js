"use strict";
//TODO
const SocketServer  				= require("socket.io");
const IOMessage    				 	= require("./iomessage");
const Chatroom          			= require("./room");
const MessageDistributionService	= require("./mds");

const CHAT_ROOM_CONF = {
	PORT: 4000
};

let ss = null;

ss = new SocketServer(CHAT_ROOM_CONF.PORT);

let ChatroomPool = {
	rooms: {},
	contain: function(room){
		var id = room.id;

		return ChatroomPool.containKey(id);
	},
	containKey: function(id){
		return (null !== ChatroomPool.get(id));
	},
	put: function(room){
		if(ChatroomPool.contain(room)){
			return ;
		}
		let id = room.id;
		let crp = (ChatroomPool.rooms[id] = new Chatroom(room, new MessageDistributionService()));
	},
	get: function(id){
		if(id in ChatroomPool.rooms){
			return ChatroomPool.rooms[id] || null;
		}

		return null;
	},
	all: function(){
		return ChatroomPool.rooms;
	},
	publics: function(){
		let rooms = ChatroomPool.all();
		let channels = {};
		let chatroom = null;
		let room = null;
		let channel = null;

		for(let id in rooms){
			chatroom = ChatroomPool.get(id);
			room = chatroom.room;
			channel = room.channel;

			if(true === room.ispublic){
				if(!(channel in channels)){
					channels[channel] = [];
				}

				channels[channel].push({
					"id": room.id,
					"name": room.name,
					"maxusers": room.maxusers,
					"secret": true === room.secret ? 1 : 0,
					"channel": channel,
					"count": chatroom.count
				});
			}
		}

		console.log(channels);

		return channels;
	},
	remove: function(room){
		if(ChatroomPool.contain(room)){
			delete ChatroomPool.rooms[room.id];
		}
	},
	removeAll: function(){
		var rooms = ChatroomPool.all();

		for(var id in rooms){
			ChatroomPool.remove(ChatroomPool.get(id));
		}
	}
};


let Server = {
	listen: function(){
		ss.on("connect", function(socket){
			console.log("[" + socket.id + "]connected....");

			//接收客户端的创建申请
			socket.on("create", function(iomsg){
				let head = iomsg.head;
				let body = iomsg.body;

				let room = head.room;

				ChatroomPool.put(room);

				let msg = new IOMessage();

				msg.setHead(head);
				msg.setBody({
					"code": 0,
					"message": "success"
				});

				//加入到聊天室
				socket.join(room.id);

				//获取房间实例
				let chatroom = ChatroomPool.get(room.id);
				chatroom.mds.fork(ss); //消息分发服务

				//告诉客户端已经创建成功
				socket.emit("created", msg.format());

				//将创建的聊天室push到所有客户端
				let roomsMsg = new IOMessage();

				roomsMsg.setHead({});
				roomsMsg.setBody({
					"code": 0,
					"message": "push rooms to client",
					"rooms": ChatroomPool.publics()
				});

				ss.emit("rooms", roomsMsg.format());

				console.log("create......");
				console.dir(iomsg);
			});

			//申请加入
			socket.on("applyJoin", function(iomsg){
				console.log("join......1");
				let head = iomsg.head;
				let body = iomsg.body;

				let user = head.user;
				let roomId = head.roomId;
				
				console.log("join......2");

				//加入到聊天室
				socket.join(roomId);

				let chatroom = ChatroomPool.get(roomId);
				let msg = new IOMessage();

				user.sid = socket.id;

				msg.setHead({
					"user": user,
					"roomId": roomId
				});

				//缓存HEAD信息
				socket.ctx = msg.head;
				console.log("join......" + roomId);
				console.log("join......3");

				if(null !== chatroom){
					let ret = chatroom.join(user);
					let room = chatroom.room;

					chatroom.update(user);
					
					switch(ret){
						case Chatroom.ERROR.SUCCESS:
							msg.setBody({
								"code": ret,
								"message": "欢迎" + user.nickname + "加入" + room.name,
								"count": chatroom.count
							});

							console.log("join......4");
							ss.in(roomId).emit("welcome", msg.format());
							socket.emit("joined", msg.format());
							console.log("join......5");
						break;
						case Chatroom.ERROR.USER_EXISTED:
							msg.setBody({
								"code": ret,
								"message": "用户" + user.nickname + "已经存在了"
							});

							console.log("join......6");
							socket.emit("userexisted", msg.format());
							console.log("join......7");
						break;
						case Chatroom.ERROR.MAX_USERS:
							msg.setBody({
								"code": ret,
								"message": "房间已满"
							});

							console.log("join......8");
							socket.emit("maxusers", msg.format());
							console.log("join......9");
						break;
						case Chatroom.ERROR.USER_DENIED:
							msg.setBody({
								"code": ret,
								"message": "拒绝访问"
							});

							console.log("join......10");
							socket.emit("userdenied", msg.format());
							console.log("join......11");
						break;
						case Chatroom.ERROR.NOT_PASS:
							msg.setBody({
								"code": ret,
								"message": "口令验证不通过"
							});

							console.log("join......12");
							socket.emit("notpass", msg.format());
							console.log("join......13");
						break;
						case Chatroom.ERROR.CLOSE:
							msg.setBody({
								"code": ret,
								"message": "聊天室不存在或已经关闭"
							});

							console.log("join......14");
							socket.emit("close", msg.format());
							console.log("join......15");
						break;
					}
				}else{
					msg.setBody({
						"code": Chatroom.ERROR.CLOSE,
						"message": "聊天室不存在或已经关闭"
					});

					console.log("join......16");
					socket.emit("close", msg.format());
					console.log("join......17");
				}

				console.log("applyJoin......");
				console.log(iomsg);
			});

			//消息处理
			socket.on("message", function(iomsg){
				let head = iomsg.head;
				let body = iomsg.body;

				let roomId = head.roomId;
				let chatroom = ChatroomPool.get(roomId);

				/**
				 * {
				 * 	code:Number      			错误码
				 * 	message:String   			错误信息
				 * 	imsgData:Object       		消息数据(根据不同的消息处理)
				 * 	imsgType:String   			消息类型
				 * 	imsgPrivate:Boolean     	是否为私有消息
				 * 	imsgFrom:String         	消息发送者昵称
				 * 	imsgTo:String				消息接收者昵称(只有私有消息才有值)
				 * 	*imsgRandom:Number      	消息随机序号
				 * 	*imsgTimestamp:Number		消息发送的时间戳
				 * }
				 */
				let now = Date.now();
				let imsg = {
					"data": body.imsgData,
					"type": body.imsgType,
					"private": body.imsgPrivate,
					"from": body.imsgFrom,
					"to": body.imsgTo,
					"timestamp": now,
					"random": Math.floor(Math.random() * 100000000000)
				};

				chatroom.pushMessage(head, imsg);

				console.log(iomsg);
			});

			//用户离开
			socket.on("leave", function(iomsg){
				let head = iomsg.head;
				let body = iomsg.body;

				let user = head.user;
				let roomId = head.roomId;
				let chatroom = ChatroomPool.get(roomId);

				if(null !== chatroom){
					chatroom.leave(user);
				}

				let msg = new IOMessage();

				msg.setHead(head);
				msg.setBody({
					"code": 0,
					"message": user.nickname + "离开了",
					"count": chatroom.count
				})

				ss.in(roomId).emit("goodbay", msg);
				socket.emit("leaved", msg);

				console.log("user leave");
			});

			//获取房间列表
			socket.on("fetch", function(iomsg){
				let msg = new IOMessage();

				msg.setHead({});
				msg.setBody({
					"code": 0,
					"message": "push rooms to client",
					"rooms": ChatroomPool.publics()
				});

				socket.emit("rooms", msg.format());
			});

			//用户断开连接(离开)
			socket.on("disconnect", function(){
				let ctx = socket.ctx;

				if(ctx){
					let user = ctx.user;
					let roomId = ctx.roomId;
					let chatroom = ChatroomPool.get(roomId);

					if(null !== chatroom){
						chatroom.leave(user);
					}

					let msg = new IOMessage();

					msg.setHead(ctx);
					msg.setBody({
						"code": 0,
						"message": user.nickname + "离开了",
						"count": chatroom.count
					})

					ss.in(roomId).emit("goodbay", msg);
					
				}

				console.log("user leave");
			});
		});

		ss.on("disconnect", function(){
			console.log("server shutdown or disconnect...");
			let msg = new IOMessage();

			msg.setHead({});
			msg.setBody({
				"code": 9999,
				"message": "服务器已闭或断开"
			});

			ss.emit("shutdown", msg.format());

			console.log("shutdown.....");
		});
	},
	start: function(){
		Server.listen();
	}
};

module.exports = {
	start: function(){
		Server.start();
	}
};