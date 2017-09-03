"use strict";

const IOMessage = require("./iomessage");

class MessageDistributionService {
	constructor(){
		this.chatroom = null;
	}

	mount(chatroom){
		this.chatroom = chatroom;

		return this;
	}

	fork(io){
		let chatroom = this.chatroom;

		setInterval(function(){
			let message = chatroom.shiftMessage();

			/**
			 * {
			 *  roomId:String			房间ID
			 * 	data:Object       		消息数据(根据不同的消息处理)
			 * 	type:String   			消息类型
			 * 	private:Boolean     	是否为私有消息
			 * 	from:String         	消息发送者昵称
			 * 	to:String				消息接收者昵称(只有私有消息才有值)
			 * 	random:Number      		消息随机序号
			 * 	timestamp:Number		消息发送的时间戳
			 * }
			 */
			if(message){
				let head = message.head;
				let body = message.body;

				let msg = new IOMessage();

				msg.setHead(head);
				msg.setBody(body);

				if(true === body.private){
					let target = chatroom.findUser(body.to);

					io.to(target.sid).emit('message', msg);
				}else{
					io.in(head.roomId).emit("message", msg);
				}
			}
		}, 1);
	}
}

module.exports = MessageDistributionService;