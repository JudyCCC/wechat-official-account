'use strict'

const Promise = require('bluebird')
const request = Promise.promisify(require('request'))

const prefix = 'https://api.weixin.qq.com/cgi-bin/'
const api = {
  accessToken: `${prefix}token?grant_type=client_credential`
}

/**
 * 构造对象生成实例并初始化
 * @param {*} opts 
 * 先读取文件，看access_token是否过期
 * 如果过期，重新从微信服务器获取，然后写入新的票据信息
 */
function Wechat(opts) {
  const that = this
  // 把数据及方法暴露到自身的属性上
  this.appID = opts.appID
  this.appSecret = opts.appSecret
  this.getAccessToken = opts.getAccessToken
  this.saveAccessToken = opts.saveAccessToken
  this.getAccessToken().then(function(data) {
    // 获取token
    try {
      // 获取到token，往下验证合法性
      data = JSON.parse(data)
    } catch (e) {
      // 没有获取到token，更新token，返回的是一个Promise，直接进入then
      return that.updateAccessToken(data)
    }
    // 就算拿到票据也要验证合法性
    if(that.isValidAccessToken(data)) {
      // 如果合法，向下传递
      Promise.resolve(data)
    } else {
      // 如果不合法，重新更新
      return that.updateAccessToken()
    }
  }).then(function(data) {
    that.access_token = data.access_token
    that.expires_in = data.expires_in
    that.saveAccessToken(data)
  })
}

Wechat.prototype.isValidAccessToken = function(data) {
  if (!data || !data.access_token || !data.expires_in) {
    return false
  }
  const access_token = data.access_token
  const expires_in = data.expires_in
  const now = (new Date().getTime())
  if (now < expires_in) {
    return true
  }
  return false
}

/**
 * 希望更新access_token后继续往下
 * 所以内部封装Promise
 */
Wechat.prototype.updateAccessToken = function() {
  const appID = this.appID
  const appSecret = this.appSecret
  // 从微信服务器拿新token
  const url = `${api.accessToken}&appid=${appID}&secret=${appSecret}`
  console.log(url)
  return new Promise(function(resolve, reject) {
    // request是一个发送请求的库
    request({url, json: true}).then(function(response) {
      const data = response.body
      // const data = response[1]
      const now = (new Date().getTime())
      // 减去20秒是考虑到刷新以及服务器的延迟
      const expires_in = now + (data.expires_in - 20) * 1000
      // 把新的票据有效时间赋值给data
      data.expires_in = expires_in
      resolve(data)
    })
  })
}

module.exports = Wechat