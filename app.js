'use strict'

const Koa = require('koa')
const ejs = require('ejs')
const heredoc = require('heredoc')
const crypto = require('crypto')
const config = require('./config')
const reply = require('./wx/reply')
const wechat = require('./wechat/g')
const Wechat = require('./wechat/wechat')

const app  = new Koa()

// 直接用中间件生成html

const tpl = heredoc(function() {/*
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>猜电影</title>

  </head>
  <body>
    <h1>点击标题，开始录音翻译</h1>
    <p id="title"></p>
    <div id="poster"></div>
    <script src="https://zeptojs.com/zepto-docs.min.js"></script>
    <script src="http://res.wx.qq.com/open/js/jweixin-1.6.0.js"></script>
    <script>
    wx.config({
      debug: true, // 开启调试模式,调用的所有api的返回值会在客户端alert出来，若要查看传入的参数，可以在pc端打开，参数信息会通过log打出，仅在pc端时才会打印。
      appId: 'wxb7b521eab48bd39a', // 必填，公众号的唯一标识
      timestamp: '<%= timestamp %>', // 必填，生成签名的时间戳
      nonceStr: '<%= noncestr %>', // 必填，生成签名的随机串
      signature: '<%= signature %>',// 必填，签名
      jsApiList: [
         'startRecord',
         'stopRecord',
         'onVoiceRecordEnd',
         'translateVoice'
      ] // 必填，需要使用的JS接口列表
    })
    </script>
    </body>
  </html>
*/})

const createNonce = function() {
  return Math.random().toString(36).substr(2,15)
}

const createTimestamp = function() {
  return parseInt(new Date().getTime() / 1000, 10) + ''
}

const _sign = function(noncestr, ticket, timestamp, url) {
  const params = [
    `noncestr=${noncestr}`,
    `jsapi_ticket=${ticket}`
    `timestamp=${timestamp}`
    `url=${url}`
  ]
  const str = params.sort().join('&')
  // 使用crypto加密
  const shasum = crypto.createHash('sha1')
  shasum.update(str)
  return shasum.digest('hex')
}

function sign(ticket, url) {
  const noncestr = createNonce()
  const timestamp = createTimestamp()
  const signature = _sign(noncestr, ticket, timestamp, url)

  return {
    noncestr,
    timestamp,
    signature
  }
}

app.use(function *(next) {
  if (this.url.indexOf('/movie') > -1) {
    const wechatApi = new Wechat(config.wechat)
    const data = yield wechatApi.fetchAccessToken()
    const access_token = data.access_token
    const ticketData = yield wechatApi.fetchTicket(access_token)
    const ticket = data.ticket
    // const ticket = ticketData.ticket
    const url = this.href
    const params = sign(ticket, url)
    console.log(params)
    this.body = ejs.render(tpl, params)
    return next 
  }
  yield next
})

app.use(wechat(config.wechat, reply.reply))

app.listen(1234)
console.log('listening: 1234')