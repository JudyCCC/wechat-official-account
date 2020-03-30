'use strict'

const Koa = require('koa')
const config = require('./config')
const reply = require('./wx/reply')
const wechat = require('./wechat/g')

const app  = new Koa()

app.use(wechat(config.wechat, reply.reply))

app.listen(1234)
console.log('listening: 1234')