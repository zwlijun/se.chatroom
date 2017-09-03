;define(function(require, exports, module){
	var IMessage = function(type, data, private, from, to){
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
		this.type = type;
		this.data = data;
		this.private = true === private;
		this.from = from;
		this.to = to || null;
	};

	IMessage.prototype = {
		wrap: function(obj){
			var tmp = {
				"imsgData": this.data,
				"imsgType": this.type,
				"imsgPrivate": this.private,
				"imsgFrom": this.from,
				"imsgTo": this.to
			};

			var target = $.extend({}, obj, tmp);

			return target;
		}
	};

	IMessage.Types = {
		"TIPS": "tips",
		"TEXT": "text"
	};

	module.exports = IMessage;
});