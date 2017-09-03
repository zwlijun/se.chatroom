;define(function(require, exports, module){
    var FormUtil   = require("mod/se/form");
    var DateUtil   = require("mod/se/dateutil");

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

    //----------------------------------------------------------------------
    var client = null;
    var IO = function(){
        var PORT = 4000;
        var URL = Request.parseURL(document.URL, false);
        
        client = io(URL.host + ":" + PORT);

        client.on("connect", function(){
            ChatroomLogic.connected = true;
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
        client.on("created", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            var room = head.room;

            ChatroomLogic.room = room;

            var msg = new IOMessage();

            msg.setHead({
                "user": {
                    "nickname": room.owner,
                    "flag": "7",
                    "avator": "",
                    "secretcode": room.secretcode
                },
                "roomId": room.id
            });

            msg.setBody({
                "message": room.owner + "申请加入" + room.name || room.id
            });

            client.emit("applyJoin", msg.format());

            CMD.fireError("0x01", "创建成功", ErrorTypes.SUCCESS);
        });

        client.on("welcome", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            var type = IMessage.Types.TIPS;
            var data = {
                "tips": "`" + head.user.nickname + "`进入房间"
            };
            var private = false;
            var from = "system";
            var to = null;
            var imsg = new IMessage(type, data, private, from, to);
            var content = IMessageFormater.format("tips", imsg.wrap({}));

            if(content){
                IMessagePrinter.print("message", content, true, true);
            }

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

            console.log(iomsg)
        });

        client.on("joined", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            ChatroomLogic.ready = true;
            ChatroomLogic.head = head;
            ChatroomLogic.user = head.user;
        });

        client.on("leaved", function(iomsg){
            var head = iomsg.head;
            var body = iomsg.body;

            ChatroomLogic.ready = false;
            ChatroomLogic.head = null;
            ChatroomLogic.user = null;
            ChatroomLogic.room = null;
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
        create: function(data, node, e, type){
            var args = (data || "").split(",");
            var formName = args[0];

            if(true !== ChatroomLogic.connected){
                CMD.fireError("0x01", "服务尚未连接，请稍候", ErrorTypes.INFO);

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

                    ChatroomLogic.create(formData);
                }
            });

            checker.check();
        },
        sendMessage: function(data, node, e, type){
            var args = (data || "").split(",");
            var formName = args[0];

            if(true !== ChatroomLogic.connected){
                CMD.fireError("0x01", "服务尚未连接，请稍候", ErrorTypes.INFO);

                return ;
            }

            if(true !== ChatroomLogic.ready || null === ChatroomLogic.room || null === ChatroomLogic.head || null === ChatroomLogic.user){
                CMD.fireError("0x01", "当前状态不允许发送消息", ErrorTypes.INFO);

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
                    
                    var room = ChatroomLogic.room;

                    var type = IMessage.Types.TEXT;
                    var data = {
                        content: Request.filterScript((formData.textMessage).replace(/[\r\n]+/gm, "@BR@")).replace(/(@BR@)/gm, "<br />")
                    };
                    var private = false;
                    var from = room.owner;
                    var to = formData.to || null;

                    var imsg = new IMessage(type, data, private, from, to);

                    var head = ChatroomLogic.head;
                    var msg = new IOMessage();

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
        room: null,
        head: null,
        user: null,
        connected: false,
        create: function(formData){
            var prefix = "chatroom_";
            var items = [
                ["owner", "房主"],
                ["id", ""], 
                ["name", ""], 
                ["maxusers", 100], 
                ["secret", false], 
                ["secretcode", ""],
                ["channel", "公共频道"],
                ["ispublic", true]
            ];
            var item = null;
            var key = null;
            var defaultValue = null;
            var el = null;
            var obj = {};

            for(var i = 0; i < items.length; i++){
                item = items[i];
                key = item[0];
                defaultValue = item[1];

                el = prefix + key;

                if(el in formData){
                    obj[key] = formData[el];
                }else{
                    obj[key] = defaultValue;
                }
            }

            var msg = new IOMessage();

            msg.setHead({
                room: obj
            });

            msg.setBody({
                "message": "申请聊天室"
            });

            console.log(msg);

            client.emit("create", msg.format());
        }
    };
    
    var Logic = {
        init: function(){
            IO();

            Util.source(ChatRoomSchema);

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