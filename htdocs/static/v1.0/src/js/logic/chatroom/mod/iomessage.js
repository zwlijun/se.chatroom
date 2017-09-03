;define(function(require, exports, module){
	var IOMessage = function(){
        this.head = {};
        this.body = {};
    };

    IOMessage.prototype = {
        setHead: function(head){
            this.head = head || {};
        },
        getHead: function(){
            return this.head;
        },
        setBody: function(body){
            this.body = body || {};
        },
        getBody: function(){
            return this.body;
        },
        format: function(){
        	return {
        		"head": this.getHead(),
        		"body": this.getBody()
        	}
        }
    };

    module.exports = IOMessage;
});