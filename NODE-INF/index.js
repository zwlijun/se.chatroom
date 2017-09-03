"use strict";
//TODO

const KOARouter        = require("koa-router");
const KOAMount         = require("koa-mount");

const ChatroomServer   = require("./chatroom/server");

//设置路由
let kr = new KOARouter();

var Logic = {
	defineRoute: function(server){
		kr.get("/chatroom/server", async function(ctx, next){
			await ctx.render('./chatroom/server.html');
		});
	},
	init: function(server){
		Logic.defineRoute(server);
		server.use(KOAMount("/koa", kr.middleware()));

		ChatroomServer.start(server);
	}
};

module.exports = {
	"mount": Logic.init
}