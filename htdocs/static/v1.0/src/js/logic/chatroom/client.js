;define(function(require, exports, module){
    var FormUtil   = require("mod/se/form");
    var DateUtil   = require("mod/se/dateutil");
    var LayerBox   = require("mod/ui/layerbox");

    var IOMessage  = require("logic/chatroom/mod/iomessage");
    var IMessage   = require("logic/chatroom/mod/imsg");

    var ErrorTypes = null;
    var RespTypes = null;
    var ResponseProxy = null;
    var DataCache =  null;
    var CMD = null;
    var Util = null;
    var DataType = null;
    var TemplateEngine = null;
    var Request = null;
    var Persistent = null;
    var Session = null;

    var SITE_NAME = "SE生活 - 聊天室";

    //----------------------------------------------------------------------
    var client = null;
    var IO = function(){
        var PORT = 4000;
        var URL = Request.parseURL(document.URL, false);
        
        client = io(URL.host + ":" + PORT);

        client.on("connect", function(){
            ChatroomLogic.connected = true;
            var msg = new IOMessage();

            msg.setHead({});
            msg.setBody({
                "message": "fetch chatroom list"
            });

            client.emit("fetch", msg.format());
            console.log("connected....")
        });
        client.on("disconnect", function(){
            ChatroomLogic.connected = false;

            CMD.fireError("0x01", "服务器已断开", ErrorTypes.ERROR);
        });
        client.on("shutdown", function(iomsg){
            //服务器断开 重新申请创建聊天室
            
            console.log("disconnect....");
            console.log(iomsg);

            Util.fireAction("#applyRoom", "click", null);
        });
        client.on("rooms", function(iomsg){
            //TODO 
            var head = iomsg.head;
            var body = iomsg.body;

            var rooms = body.rooms || {};

            ChatroomLogic.channelsEngine.render(false, "tpl_channels", rooms, {
                callback: function(o){
                    $("#render_channels").html(o.result);
                }
            });

            console.log("rooms...")
        });

        client.on("welcome", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            var type = IMessage.Types.TIPS;
            var data = {
                "tips": "“" + head.user.nickname + "”进入房间"
            };
            var private = false;
            var from = "system";
            var to = null;
            var imsg = new IMessage(type, data, private, from, to);
            var content = IMessageFormater.format("tips", imsg.wrap({}));

            if(content){
                IMessagePrinter.print("message", content, true, true);
            }

            $("#room_" + head.roomId + "_users").html(body.count);

            console.log(iomsg)
        });

        client.on("goodbay", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            var type = IMessage.Types.TIPS;
            var data = {
                "tips": "`" + head.user.nickname + "`离开了房间"
            };
            var private = false;
            var from = "system";
            var to = null;
            var imsg = new IMessage(type, data, private, from, to);
            var content = IMessageFormater.format("tips", imsg.wrap({}));

            if(content){
                IMessagePrinter.print("message", content, true, true);
            }

            $("#room_" + head.roomId + "_users").html(body.count);

            console.log(iomsg)
        });

        client.on("joined", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            ChatroomLogic.ready = true;
            ChatroomLogic.head = head;
            ChatroomLogic.user = head.user;

            ChatroomLogic.clear();

            var itemNode = $("#room_" + head.roomId);
            var siblings = itemNode.siblings("li");
            var cache = itemNode.attr("data-cache");
            var code = itemNode.find("code");
            var args = cache.split(",");

            code.addClass("exit")
                .attr("data-action-click", "chatroom://exit#" + cache)
                .html("退出");

            siblings.removeClass("on");

            itemNode.addClass("joined")
                    .addClass("on");

            ChatroomLogic.currentRoomId = args[0];

            document.title = args[1] + " - " + SITE_NAME;
        });

        client.on("leaved", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            var itemNode = $("#room_" + head.roomId);
            var siblings = itemNode.siblings("li");
            var cache = itemNode.attr("data-cache");
            var code = itemNode.find("code");
            var args = cache.split(",");

            code.removeClass("exit")
                .attr("data-action-click", "chatroom://join#" + cache)
                .html("加入");

            itemNode.removeClass("joined");

            if(itemNode.hasClass("on")){
                itemNode.removeClass("on");

                ChatroomLogic.currentRoomId = null;

                document.title = SITE_NAME;
            }
        });

        client.on("message", function(iomsg){
            var user = ChatroomLogic.user;

            iomsg.body.datetime = DateUtil.format(new Date(iomsg.body.timestamp), "%h:%m:%s");
            iomsg.body.self = (user && user.nickname == iomsg.body.from);

            var content = IMessageFormater.format("message", iomsg);

            if(content){
                IMessagePrinter.print("message", content, true, true);
            }

            console.log(iomsg)
        });

        client.on("userexisted", function(iomsg){
            ChatroomLogic.ready = false;

            var head = iomsg.head;
            var body = iomsg.body;

            CMD.fireError("0x01", body.message, ErrorTypes.INFO);
        });
        
        client.on("maxusers", function(iomsg){
            ChatroomLogic.ready = false;

            var head = iomsg.head;
            var body = iomsg.body;

            CMD.fireError("0x01", body.message, ErrorTypes.INFO);
        });

        client.on("userdenied", function(iomsg){
            ChatroomLogic.ready = false;

            var head = iomsg.head;
            var body = iomsg.body;

            CMD.fireError("0x01", body.message, ErrorTypes.INFO);
        });

        client.on("notpass", function(iomsg){
            ChatroomLogic.ready = false;

            var head = iomsg.head;
            var body = iomsg.body;

            CMD.fireError("0x01", body.message, ErrorTypes.INFO);
        });

        client.on("close", function(iomsg){
            ChatroomLogic.ready = false;

            var head = iomsg.head;
            var body = iomsg.body;

            CMD.fireError("0x01", body.message, ErrorTypes.INFO);
        });
    };
    //----------------------------------------------------------------------
    
    var ChatRoomSchema = {
        "schema": "chatroom",
        unfold: function(data, node, e, type){
            e.stopPropagation();

            node.toggleClass("unfold");
        },
        exit: function(data, node, e, type){
            e.stopPropagation();

            var args = (data || "").split(",");
            var roomId = args[0];
            var roomName = args[1]
            var secret = "1" === args[2];

            var lb = LayerBox.newLayerBox("exit");

            var opts = {
                "text": "确定要离开“" + roomName + "”吗？",
                "skin": "chatroom",
                "type": LayerBox.Types.CONFIRM,
                "btns": [
                    {
                        "label": "再聊会", 
                        "skin": "", 
                        "handler": {
                            callback: function(layerbox, index, name){
                                layerbox.hide();
                            }
                        }
                    },
                    {
                        "label": "确定", 
                        "skin": "", 
                        "handler": {
                            callback: function(layerbox, index, name, sec, id, rname){
                                var msg = new IOMessage();

                                var user = ChatroomLogic.user;

                                msg.setHead({
                                    "user": user,
                                    "roomId": id
                                });

                                msg.setBody({
                                    "message": user.nickname + "离开了房间" + rname
                                });

                                client.emit("leave", msg.format());

                                layerbox.hide();
                            },
                            args: [secret, roomId, roomName]
                        }
                    }
                ]
            };

            lb.conf(opts).show();
        },
        join: function(data, node, e, type){
            e.stopPropagation();

            var args = (data || "").split(",");
            var roomId = args[0];
            var roomName = args[1]
            var secret = "1" === args[2];

            var content = ''
                        + '<div class="joinform">'
                        + '<input type="text" name="join_nickname" id="join_nickname" placeholder="请输入昵称">';

            if(secret){
                //TODO
                content += '<input type="text" name="join_secretcode" id="join_secretcode" placeholder="请输入口令">'
            }

            content += '</div>';

            var lb = LayerBox.newLayerBox("join");

            var opts = {
                "text": content,
                "skin": "chatroom",
                "type": LayerBox.Types.CONFIRM,
                "btns": [
                    {
                        "label": "取消", 
                        "skin": "", 
                        "handler": {
                            callback: function(layerbox, index, name){
                                layerbox.hide();
                            }
                        }
                    },
                    {
                        "label": "确定", 
                        "skin": "", 
                        "handler": {
                            callback: function(layerbox, index, name, sec, id, rname){
                                var nickname = $("#join_nickname");
                                var secretcode = $("#join_secretcode");

                                var trim = function(str){
                                    return str.replace(/^([\s]+)|([\s]+)$/, "");
                                };
                                var nn = trim(nickname.val());
                                var sc = "";

                                if(nn.length == 0){
                                    CMD.fireError("0x01", "请输入昵称", ErrorTypes.INFO);

                                    return ;
                                }

                                if(sec){
                                    sc = trim(secretcode.val());

                                    if(sc.length == 0){
                                        CMD.fireError("0x01", "请输入口令", ErrorTypes.INFO);

                                        return ;
                                    }
                                }

                                var msg = new IOMessage();

                                msg.setHead({
                                    "user": {
                                        "nickname": nn,
                                        "flag": "1",
                                        "avator": "",
                                        "secretcode": sc
                                    },
                                    "roomId": id
                                });

                                msg.setBody({
                                    "message": nn + "申请加入" + rname
                                });

                                client.emit("applyJoin", msg.format());

                                layerbox.hide();
                            },
                            args: [secret, roomId, roomName]
                        }
                    }
                ]
            };

            lb.conf(opts).show();
        },
        change: function(data, node, e, type){
            e.stopPropagation();

            var args = (data || "").split(",");
            var roomId = args[0];
            var roomName = args[1]
            var secret = "1" === args[2];

            var siblings = node.siblings("li");

            if(node.hasClass("joined")){
                if(!node.hasClass("on")){
                    siblings.removeClass("on");
                    node.addClass("on");

                    ChatroomLogic.currentRoomId = roomId;
                    ChatroomLogic.clear();

                    document.title = roomName + " - " + SITE_NAME;
                }
            }else{
                CMD.fireError("0x01", "需要先加入才能切换", ErrorTypes.INFO);
            }
        },
        sendMessage: function(data, node, e, type){
            e.stopPropagation();

            var args = (data || "").split(",");
            var formName = args[0];

            if(true !== ChatroomLogic.connected){
                CMD.fireError("0x01", "服务尚未连接，请稍候", ErrorTypes.INFO);

                return ;
            }

            if(true !== ChatroomLogic.ready || null === ChatroomLogic.user || null === ChatroomLogic.head || null === ChatroomLogic.currentRoomId){
                CMD.fireError("0x01", "hi，需要进组织才能发言哦~", ErrorTypes.INFO);

                return ;
            }

            var checker = FormUtil.getInstance(formName);

            checker.set("tips", {
                callback: function(el, msg, checkType){
                    CMD.fireError("0x01", msg, ErrorTypes.INFO);
                }
            });
            checker.set("submit", {
                callback: function(submitEvent){
                    submitEvent.preventDefault();
                }
            });
            checker.set("done", {
                callback: function(result){
                    var formData = result.data;
                    
                    var user = ChatroomLogic.user;

                    var type = IMessage.Types.TEXT;
                    var data = {
                        content: Request.filterScript((formData.textMessage).replace(/[\r\n]+/gm, "@BR@")).replace(/(@BR@)/gm, "<br />")
                    };
                    var private = false;
                    var from = user.nickname;
                    var to = formData.to || null;

                    var imsg = new IMessage(type, data, private, from, to);

                    var head = ChatroomLogic.head;
                    var msg = new IOMessage();

                    head.roomId = ChatroomLogic.currentRoomId;

                    msg.setHead(head);
                    msg.setBody(imsg.wrap({
                        "code": 0,
                        "message": head.user.nickname + "发送了一条消息"
                    }));

                    client.emit("message", msg);

                    result.form.reset();
                }
            });

            checker.check();
        }
    };

    var IMessagePrinter = {
        print: function(name, items, isAppend, isScrollIntoView){
            var render = $("#render_" + name);

            var content = DataType.isArray(items) ? items.join("") : items;

            if(false === isAppend){
                render.html(content);
            }else{
                render.append(content);
            }

            IMessagePrinter.scrollIntoView(name, isScrollIntoView);
        },
        scrollIntoView: function(name, isScrollIntoView){
            Util.delay(200, {
                callback: function(et, _name, _is){
                    var render = $("#render_" + _name);
                    var viewer = render[0];

                    if(viewer){
                        viewer.scrollIntoView(false === _is ? true : false);
                    }
                },
                args: [name, isScrollIntoView]
            });
        }
    };

    var IMessageFormater = {
        engine: null,
        format: function(name, data){
            console.log(data);
            var tpl = "tpl_" + name;
            var engine = IMessageFormater.engine;

            if($("#" + tpl).length != 0 && data){
                var message = engine.render(false, tpl, data, {
                    callback: function(o){
                        return o.result;
                    }
                });

                return message.local;
            }else{
                return "";
            }
        }
    };  

    var ChatroomLogic = {
        ready: false,
        user: null,
        head: null,
        connected: false,
        currentRoomId: null,
        channelsEngine: null,
        clear: function(){
            $("#render_message").html("");
        }
    };  

    var Logic = {
        init: function(){
            IO();

            Util.source(ChatRoomSchema);

            ChatroomLogic.channelsEngine = TemplateEngine.getTemplate("channels_render", {
                "root": "channels",
                "start": "<~",
                "close": "~>"
            });

            IMessageFormater.engine = TemplateEngine.getTemplate("imessage_render", {
                "root": "io",
                "start": "<~",
                "close": "~>"
            });
        }
    };

    var Bridge = {
        plugin: null,
        connect: function(target){
            Bridge.plugin = target;

            var expando = target.expando;

            ErrorTypes      = expando["errors"];
            RespTypes       = expando["types"];
            Request         = expando["request"];
            ResponseProxy   = expando["response"];
            DataCache       = expando["cache"];
            CMD             = expando["cmd"];
            Util            = expando["util"];
            DataType        = expando["typeof"];
            TemplateEngine  = expando["template"];
            Persistent      = expando["persistent"];
            Session         = expando["session"];

            //业务初始化入口
            Logic.init();
        }
    };

    module.exports = {
        "version": "R16B0408",
        "connect": Bridge.connect
    }
});