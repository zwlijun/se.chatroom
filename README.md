# SE.Chatroom
<p>基于NodeJS的聊天室(SE.NodeServer + SE.Builder + Socket.IO + Nginx)</p>

# 体验地址
<p>服务端：<a href="http://chat.seshenghuo.com/koa/chatroom/server">http://chat.seshenghuo.com/koa/chatroom/server</a></p>
<p>客户端：<a href="http://chat.seshenghuo.com/static/v1.0/html/chatroom/index.shtml">http://chat.seshenghuo.com/static/v1.0/html/chatroom/index.shtml</a></p>

# 静态资源库
<p>@see <a href="https://github.com/zwlijun/se.builder">https://github.com/zwlijun/se.builder</a></p>

# 服务APP
<p>@see <a href="https://github.com/zwlijun/se.nodeserver">https://github.com/zwlijun/se.nodeserver</a></p>

# Nginx 配置示例
<pre>
upstream nodeserver{
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
    server 127.0.0.1:3003;
}
    
server {
    listen       80;
    server_name  chat.seshenghuo.com;

    root /data/wwwroot/chatroom/htdocs;

    ssi on;
    ssi_silent_errors on;
    ssi_types text/shtml;

    location /static/v1.0/res {
        concat on;
        concat_types application/javascript;
        concat_max_files 30;
    }

    location ^~ /koa/ {
        proxy_store             off;
        proxy_redirect          off;
        proxy_set_header        Host            $http_host;  
        proxy_set_header        X-Real-IP       $remote_addr; 
        proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for; 
        proxy_next_upstream     http_502 http_504 error timeout invalid_header;
        proxy_pass              http://nodeserver;
        break; 
    }
}
</pre>

# SE.NodeServer配置示例
<pre>
{
    ServerName: "chat.seshenghuo.com",
    ServerAlias: "chat.seshenghuo.com",
    ServerAdmin: "service@seshenghuo.com",
    DocumentRoot: "/data/wwwroot/chatroom/htdocs",
    NodeTemplateRoot: "/data/wwwroot/chatroom/NODE-TEMPLATE",
    NodeModules: {
        root: "/data/wwwroot/chatroom/NODE-INF",
        alias: "node.chat.seshenghuo.com"
    },
    TemplateEngine: "ejs",
    ServerLog: {
        error: "",
        access: ""
    },
    StaticServer: {
        maxage: 15 * 60 * 1000, //15m
        hidden: false,
        index: "index.html",
        defer: false,
        gzip: true
    }
}
</pre>


