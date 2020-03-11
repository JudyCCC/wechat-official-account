// g是Generator的简写，KOA的中间件需要是Generator 

'use strict'

const sha1 = require('sha1')
const getRawBody = require('raw-body')
const Wechat = require('./wechat')
const util = require('./util')

module.exports = function(opts) {
  // 实例化构造函数
  // const wechat = new Wechat(opts)
  return function *(next) {
    const that = this
    const token = opts.token
    const signature = this.query.signature
    const nonce = this.query.nonce
    const timestamp = this.query.timestamp
    const echostr = this.query.echostr
    const str = [token, timestamp, nonce].sort().join('')
    const sha = sha1(str)
  
    if (this.method === 'GET') {
      if (sha === signature) {
        this.body = echostr + ''
      } else {
        this.body = 'wrong'
      }
    } else if (this.method === 'POST') {
      // 验证是不是微信服务器过来的数据，避免恶意请求
      if (sha !== signature) {
        this.body = 'wrong'
        return false
      }
      // 公众号上一些操作发送过来的原始xml数据，比如关注或者取消关注
      const data = yield getRawBody(this.req, {
        length: this.length, // 限制发送过来数据的长度
        limit: '1mb', // 限制发送过来数据的体积
        encoding: this.charset
      })
      const content = yield util.parseXMLAsync(data)
      const message = util.formatMessage(content.xml)
      if (message.MsgType === 'event') {
        if (message.Event === 'subscribe') {
          const now = new Date().getTime()
          that.status = 200
          that.type = 'application/xml'
          console.log(111)
          // that.body = `
          // <xml>
          //   <ToUserName><![CDATA[${message.FromUserName}]]></ToUserName>
          //   <FromUserName><![CDATA[${message.ToUserName}]]></FromUserName>
          //   <CreateTime>${now}</CreateTime>
          //   <MsgType><![CDATA[text]]></MsgType>
          //   <Content><![CDATA[HI,thank you for your subscribe]]></Content>
          // </xml>`
          that.body = '<xml>' +
         '<ToUserName><![CDATA[' + message.FromUserName + ']]></ToUserName>' +
          '<FromUserName><![CDATA[' + message.ToUserName + ']]></FromUserName>' +
          '<CreateTime>' + now + '</CreateTime>' +
          '<MsgType><![CDATA[text]]></MsgType>' +
          '<Content><![CDATA[HI,thank you for your subscribe]]></Content>' +
        '</xml>'
          console.log(that.body)
          console.log(222)
          return 
        }
      }
    }
  }
}